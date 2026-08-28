import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AssetStatus,
  ContentType,
  CourseEligibilityMode,
  CourseVersionStatus,
  Prisma,
  QuizType,
  ReviewDecision,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

interface VersionActor {
  id: string;
  role: UserRole;
}

type SubmittedVersion = Prisma.CourseVersionGetPayload<{
  include: {
    course: {
      include: {
        teacher: { select: { id: true; fullName: true; universityEmail: true } };
        allowedMajors: { include: { major: true } };
      };
    };
    contentItems: {
      include: {
        mediaAsset: { select: { id: true; fileName: true; mimeType: true; status: true } };
      };
    };
    quizzes: {
      include: {
        questions: {
          include: {
            options: true;
            imageAsset: {
              select: { id: true; fileName: true; mimeType: true; status: true };
            };
          };
        };
      };
    };
    reviews: true;
  };
}>;

@Injectable()
export class CourseVersionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSubmitted(actor: VersionActor): Promise<SubmittedVersion[]> {
    this.requireRole(actor, UserRole.APPROVER);
    return this.prisma.courseVersion.findMany({
      where: { status: CourseVersionStatus.SUBMITTED },
      include: {
        course: {
          include: {
            teacher: { select: { id: true, fullName: true, universityEmail: true } },
            allowedMajors: { include: { major: true } },
          },
        },
        contentItems: {
          orderBy: { position: 'asc' },
          include: {
            mediaAsset: { select: { id: true, fileName: true, mimeType: true, status: true } },
          },
        },
        quizzes: {
          include: {
            questions: {
              include: {
                options: true,
                imageAsset: {
                  select: { id: true, fileName: true, mimeType: true, status: true },
                },
              },
            },
          },
        },
        reviews: { where: { decision: null }, take: 1 },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async submit(actor: VersionActor, versionId: string): Promise<void> {
    this.requireRole(actor, UserRole.TEACHER);
    const version = await this.prisma.courseVersion.findUnique({
      where: { id: versionId },
      include: {
        course: { include: { allowedMajors: true } },
        contentItems: {
          select: {
            id: true,
            contentType: true,
            mediaAsset: { select: { status: true } },
          },
        },
        quizzes: {
          include: {
            questions: {
              include: {
                options: true,
                imageAsset: { select: { status: true } },
              },
            },
          },
        },
      },
    });
    if (!version) {
      throw new NotFoundException('Course Version was not found');
    }
    if (version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may submit this Version');
    }
    if (version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft Version may be submitted');
    }
    this.validateSubmission(version);

    await this.prisma.$transaction(async (tx) => {
      const submission = await tx.courseVersionReview.aggregate({
        where: { versionId },
        _max: { submissionNumber: true },
      });
      const submittedAt = new Date();
      const updated = await tx.courseVersion.updateMany({
        where: { id: versionId, status: CourseVersionStatus.DRAFT },
        data: { status: CourseVersionStatus.SUBMITTED, submittedAt },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Version state changed concurrently');
      }
      await tx.courseVersionReview.create({
        data: {
          versionId,
          submissionNumber: (submission._max.submissionNumber ?? 0) + 1,
          submittedAt,
        },
      });
    });
  }

  async review(
    actor: VersionActor,
    versionId: string,
    decision: ReviewDecision,
    comment?: string,
  ): Promise<void> {
    this.requireRole(actor, UserRole.APPROVER);
    const normalizedComment = comment?.trim() || null;
    if (decision === ReviewDecision.REJECTED && normalizedComment === null) {
      throw new UnprocessableEntityException('A rejection comment is required');
    }

    const version = await this.prisma.courseVersion.findUnique({
      where: { id: versionId },
      select: { id: true, courseId: true, status: true },
    });
    if (!version) {
      throw new NotFoundException('Course Version was not found');
    }
    if (version.status !== CourseVersionStatus.SUBMITTED) {
      throw new ConflictException('Only a submitted Version may be reviewed');
    }

    await this.prisma.$transaction(async (tx) => {
      const reviewedAt = new Date();
      const updated = await tx.courseVersion.updateMany({
        where: { id: versionId, status: CourseVersionStatus.SUBMITTED },
        data:
          decision === ReviewDecision.APPROVED
            ? {
                status: CourseVersionStatus.APPROVED,
              }
            : { status: CourseVersionStatus.REJECTED },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Version was reviewed concurrently');
      }

      const review = await tx.courseVersionReview.updateMany({
        where: { versionId, decision: null },
        data: {
          decision,
          reviewComment: normalizedComment,
          reviewedById: actor.id,
          reviewedAt,
        },
      });
      if (review.count !== 1) {
        throw new ConflictException('Pending review record was not found');
      }
    });
  }

  async reopenRejected(actor: VersionActor, versionId: string): Promise<void> {
    this.requireRole(actor, UserRole.TEACHER);
    const version = await this.prisma.courseVersion.findUnique({
      where: { id: versionId },
      select: {
        status: true,
        course: { select: { teacherId: true } },
      },
    });
    if (!version) {
      throw new NotFoundException('Course Version was not found');
    }
    if (version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may reopen this Version');
    }
    if (version.status !== CourseVersionStatus.REJECTED) {
      throw new ConflictException('Only a rejected Version may be reopened');
    }

    const updated = await this.prisma.courseVersion.updateMany({
      where: { id: versionId, status: CourseVersionStatus.REJECTED },
      data: { status: CourseVersionStatus.DRAFT, submittedAt: null },
    });
    if (updated.count !== 1) {
      throw new ConflictException('Version state changed concurrently');
    }
  }

  async unpublish(actor: VersionActor, versionId: string): Promise<void> {
    this.requireRole(actor, UserRole.TEACHER);
    const version = await this.prisma.courseVersion.findUnique({
      where: { id: versionId },
      select: {
        status: true,
        course: { select: { teacherId: true } },
      },
    });
    if (!version) {
      throw new NotFoundException('Course Version was not found');
    }
    if (version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may unpublish this Version');
    }
    if (version.status !== CourseVersionStatus.PUBLISHED) {
      throw new ConflictException('Only a published Version may be unpublished');
    }

    const updated = await this.prisma.courseVersion.updateMany({
      where: { id: versionId, status: CourseVersionStatus.PUBLISHED },
      data: { status: CourseVersionStatus.UNPUBLISHED },
    });
    if (updated.count !== 1) {
      throw new ConflictException('Version state changed concurrently');
    }
  }

  async republish(actor: VersionActor, versionId: string): Promise<void> {
    this.requireRole(actor, UserRole.TEACHER);
    const version = await this.prisma.courseVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        courseId: true,
        status: true,
        course: { select: { teacherId: true } },
      },
    });
    if (!version) {
      throw new NotFoundException('Course Version was not found');
    }
    if (version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may publish this Version');
    }
    if (
      version.status !== CourseVersionStatus.APPROVED &&
      version.status !== CourseVersionStatus.UNPUBLISHED
    ) {
      throw new ConflictException('Only an approved or unpublished Version may be published');
    }

    if (version.status === CourseVersionStatus.APPROVED) {
      await this.prisma.$transaction(async (tx) => {
        await tx.courseVersion.updateMany({
          where: {
            courseId: version.courseId,
            status: CourseVersionStatus.PUBLISHED,
          },
          data: { status: CourseVersionStatus.SUPERSEDED },
        });
        const updated = await tx.courseVersion.updateMany({
          where: { id: versionId, status: CourseVersionStatus.APPROVED },
          data: {
            status: CourseVersionStatus.PUBLISHED,
            publishedAt: new Date(),
          },
        });
        if (updated.count !== 1) {
          throw new ConflictException('Version state changed concurrently');
        }
      });
      return;
    }

    const currentPublished = await this.prisma.courseVersion.findFirst({
      where: {
        courseId: version.courseId,
        status: CourseVersionStatus.PUBLISHED,
      },
      select: { id: true },
    });
    if (currentPublished) {
      throw new ConflictException('This Course already has a published Version');
    }

    try {
      const updated = await this.prisma.courseVersion.updateMany({
        where: { id: versionId, status: CourseVersionStatus.UNPUBLISHED },
        data: {
          status: CourseVersionStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Version state changed concurrently');
      }
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This Course already has a published Version');
      }
      throw error;
    }
  }

  private validateSubmission(version: {
    course: { eligibilityMode: CourseEligibilityMode; allowedMajors: unknown[] };
    contentItems: Array<{
      contentType: ContentType;
      mediaAsset: { status: AssetStatus } | null;
    }>;
    quizzes: Array<{
      quizType: QuizType;
      questions: Array<{
        imageAsset?: { status: AssetStatus } | null;
        options: Array<{ isCorrect: boolean }>;
      }>;
    }>;
  }): void {
    if (
      version.course.eligibilityMode !== CourseEligibilityMode.OPEN &&
      version.course.allowedMajors.length === 0
    ) {
      throw new UnprocessableEntityException('At least one eligible Major is required');
    }
    if (version.contentItems.length === 0) {
      throw new UnprocessableEntityException('Learning content is required');
    }
    if (
      version.contentItems.some(
        (item) =>
          item.contentType !== ContentType.TEXT && item.mediaAsset?.status !== AssetStatus.READY,
      )
    ) {
      throw new UnprocessableEntityException('Every media asset must be READY before submission');
    }
    const preTest = version.quizzes.find((quiz) => quiz.quizType === QuizType.PRE_TEST);
    if (!preTest || preTest.questions.length === 0) {
      throw new UnprocessableEntityException('A Pre-Test with questions is required');
    }
    for (const quiz of version.quizzes) {
      if (quiz.questions.length === 0) {
        throw new UnprocessableEntityException(`${quiz.quizType} requires at least one question`);
      }
      for (const question of quiz.questions) {
        if (question.imageAsset && question.imageAsset.status !== AssetStatus.READY) {
          throw new UnprocessableEntityException(
            'Every question image must be READY before submission',
          );
        }
        if (
          question.options.length < 2 ||
          question.options.filter((option) => option.isCorrect).length !== 1
        ) {
          throw new UnprocessableEntityException(
            'Every question requires at least two options and exactly one correct option',
          );
        }
      }
    }
  }

  private requireRole(actor: VersionActor, role: UserRole): void {
    if (actor.role !== role) {
      throw new ForbiddenException(`${role} role is required`);
    }
  }
}
