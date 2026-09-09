import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountStatus,
  AssetStatus,
  ContentType,
  CourseEligibilityMode,
  CourseVersionStatus,
  QuizResult,
  QuizType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

interface StudentActor {
  id: string;
  role: UserRole;
  accountStatus: AccountStatus;
  majorId: string | null;
}

export interface CourseEntry {
  versionId: string;
  preTestId: string | null;
  postTestId: string | null;
  contentUnlocked: boolean;
}

export interface PublishedCourseContent {
  versionId: string;
  title: string;
  description: string | null;
  languageCode: string;
  contentItems: Array<{
    id: string;
    contentType: ContentType;
    title: string | null;
    textBody: string | null;
    position: number;
    section: { id: string; title: string; position: number } | null;
    media: {
      assetId: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    } | null;
  }>;
}

export interface EligibleCourseSummary {
  courseId: string;
  eligibilityMode: CourseEligibilityMode;
  versionId: string;
  title: string;
  description: string | null;
  languageCode: string;
  publishedAt: Date | null;
  coverAssetId: string | null;
  enrollments: number;
  enrolled: boolean;
  progress: number;
  categories: Array<{ id: string; slug: string; name: string }>;
}

@Injectable()
export class CourseAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async listEligibleCourses(
    student: StudentActor,
    categoryId?: string,
  ): Promise<EligibleCourseSummary[]> {
    this.requireActiveStudent(student);
    const courses = await this.prisma.course.findMany({
      where: {
        archivedAt: null,
        OR: student.majorId
          ? [
              { eligibilityMode: CourseEligibilityMode.OPEN },
              {
                eligibilityMode: CourseEligibilityMode.LIMITED,
                allowedMajors: { some: { majorId: student.majorId } },
              },
            ]
          : [{ eligibilityMode: CourseEligibilityMode.OPEN }],
        versions: { some: { status: CourseVersionStatus.PUBLISHED } },
        ...(categoryId ? { categories: { some: { categoryId } } } : {}),
      },
      select: {
        id: true,
        eligibilityMode: true,
        versions: {
          where: { status: CourseVersionStatus.PUBLISHED },
          take: 1,
          select: {
            id: true,
            title: true,
            description: true,
            languageCode: true,
            publishedAt: true,
            coverAsset: { select: { id: true, status: true } },
            quizzes: {
              where: { quizType: { in: [QuizType.PRE_TEST, QuizType.POST_TEST] } },
              select: {
                quizType: true,
                attempts: {
                  where: { studentId: student.id, submittedAt: { not: null } },
                  select: { result: true },
                },
              },
            },
          },
        },
        enrollments: {
          where: { studentId: student.id },
          take: 1,
          select: { studentId: true },
        },
        categories: {
          select: {
            category: { select: { id: true, slug: true, name: true } },
          },
        },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return courses.flatMap((course) => {
      const version = course.versions[0];
      return version
        ? [
            {
              courseId: course.id,
              eligibilityMode: course.eligibilityMode,
              versionId: version.id,
              title: version.title,
              description: version.description,
              languageCode: version.languageCode,
              publishedAt: version.publishedAt,
              coverAssetId:
                version.coverAsset?.status === AssetStatus.READY ? version.coverAsset.id : null,
              enrollments: course._count.enrollments,
              enrolled: course.enrollments.length > 0,
              progress: this.progressFor(version.quizzes, course.enrollments.length > 0),
              categories: course.categories.map(({ category }) => category),
            },
          ]
        : [];
    });
  }

  private progressFor(
    quizzes: Array<{ quizType: QuizType; attempts: Array<{ result: QuizResult | null }> }>,
    enrolled: boolean,
  ): number {
    if (!enrolled) return 0;
    const preTestCompleted = quizzes.some(
      (quiz) =>
        quiz.quizType === QuizType.PRE_TEST &&
        quiz.attempts.some((attempt) => attempt.result === QuizResult.COMPLETED),
    );
    const postTestPassed = quizzes.some(
      (quiz) =>
        quiz.quizType === QuizType.POST_TEST &&
        quiz.attempts.some((attempt) => attempt.result === QuizResult.PASS),
    );
    return postTestPassed ? 100 : preTestCompleted ? 50 : 10;
  }

  async enterCourse(student: StudentActor, courseId: string): Promise<CourseEntry> {
    this.requireActiveStudent(student);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        archivedAt: true,
        eligibilityMode: true,
        allowedMajors: { select: { majorId: true } },
        versions: {
          where: { status: CourseVersionStatus.PUBLISHED },
          take: 1,
          select: {
            id: true,
            status: true,
            quizzes: {
              where: { quizType: { in: [QuizType.PRE_TEST, QuizType.POST_TEST] } },
              select: {
                id: true,
                quizType: true,
                attempts: {
                  where: {
                    studentId: student.id,
                    result: QuizResult.COMPLETED,
                    submittedAt: { not: null },
                  },
                  take: 1,
                  select: { result: true },
                },
              },
            },
          },
        },
      },
    });
    const publishedVersion = course?.versions[0];
    if (!course || course.archivedAt !== null || !publishedVersion) {
      throw new NotFoundException('Published Course was not found');
    }
    if (!this.isEligible(course, student.majorId)) {
      throw new ForbiddenException('Student Major is not eligible for this Course');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.courseEnrollment.createMany({
        data: [{ courseId, studentId: student.id }],
        skipDuplicates: true,
      });
      await tx.courseAccessEvent.create({
        data: { courseId, studentId: student.id },
      });
    });

    const preTest = publishedVersion.quizzes.find((quiz) => quiz.quizType === QuizType.PRE_TEST);
    const postTest = publishedVersion.quizzes.find((quiz) => quiz.quizType === QuizType.POST_TEST);
    const contentUnlocked =
      preTest?.attempts.some((attempt) => attempt.result === QuizResult.COMPLETED) ?? false;
    return {
      versionId: publishedVersion.id,
      preTestId: preTest?.id ?? null,
      postTestId: postTest?.id ?? null,
      contentUnlocked,
    };
  }

  async getPublishedContent(
    student: StudentActor,
    courseId: string,
  ): Promise<PublishedCourseContent> {
    this.requireActiveStudent(student);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        archivedAt: true,
        eligibilityMode: true,
        allowedMajors: { select: { majorId: true } },
        enrollments: {
          where: { studentId: student.id },
          take: 1,
          select: { id: true },
        },
        versions: {
          where: { status: CourseVersionStatus.PUBLISHED },
          take: 1,
          select: {
            id: true,
            title: true,
            description: true,
            languageCode: true,
            quizzes: {
              where: { quizType: QuizType.PRE_TEST },
              take: 1,
              select: {
                attempts: {
                  where: {
                    studentId: student.id,
                    result: QuizResult.COMPLETED,
                    submittedAt: { not: null },
                  },
                  take: 1,
                  select: { id: true },
                },
              },
            },
            contentItems: {
              orderBy: { position: 'asc' },
              select: {
                id: true,
                contentType: true,
                title: true,
                textBody: true,
                position: true,
                section: { select: { id: true, title: true, position: true } },
                mediaAsset: {
                  select: {
                    id: true,
                    fileName: true,
                    mimeType: true,
                    sizeBytes: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    const version = course?.versions[0];
    if (!course || course.archivedAt !== null || !version) {
      throw new NotFoundException('Published Course was not found');
    }
    if (!this.isEligible(course, student.majorId)) {
      throw new ForbiddenException('Student Major is not eligible for this Course');
    }
    if (course.enrollments.length === 0) {
      throw new ForbiddenException('Course enrollment is required');
    }
    if (!version.quizzes[0]?.attempts.length) {
      throw new ForbiddenException('Pre-Test completion is required');
    }

    return {
      versionId: version.id,
      title: version.title,
      description: version.description,
      languageCode: version.languageCode,
      contentItems: version.contentItems.map((item) => ({
        id: item.id,
        contentType: item.contentType,
        title: item.title,
        textBody: item.textBody,
        position: item.position,
        section: item.section,
        media:
          item.mediaAsset?.status === AssetStatus.READY
            ? {
                assetId: item.mediaAsset.id,
                fileName: item.mediaAsset.fileName,
                mimeType: item.mediaAsset.mimeType,
                sizeBytes: Number(item.mediaAsset.sizeBytes),
              }
            : null,
      })),
    };
  }

  private requireActiveStudent(student: StudentActor): void {
    if (student.role !== UserRole.STUDENT) {
      throw new ForbiddenException('STUDENT role is required');
    }
    if (student.accountStatus !== AccountStatus.ACTIVE) {
      throw new ForbiddenException('Institutional account is inactive');
    }
  }

  private isEligible(
    course: {
      eligibilityMode: CourseEligibilityMode;
      allowedMajors: Array<{ majorId: string }>;
    },
    majorId: string | null,
  ): boolean {
    return (
      course.eligibilityMode === CourseEligibilityMode.OPEN ||
      course.allowedMajors.some((allowed) => allowed.majorId === majorId)
    );
  }
}
