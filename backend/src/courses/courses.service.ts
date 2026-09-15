import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AssetStatus,
  CourseEligibilityMode,
  CourseVersion,
  CourseVersionStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { ObjectStorage } from '../media/object-storage';

const ONE_GIB = 1_073_741_824;

export interface CourseActor {
  id: string;
  role: UserRole;
}

export interface CreateCourseInput {
  title: string;
  description?: string;
  languageCode?: string;
  eligibilityMode: CourseEligibilityMode;
  majorIds: string[];
  categoryIds: string[];
}

export interface UpdateDraftInput {
  title?: string;
  description?: string | null;
  languageCode?: string;
}

type CreatedCourse = Prisma.CourseGetPayload<{
  include: { allowedMajors: true; categories: true; versions: true };
}>;

type OwnedCourse = Prisma.CourseGetPayload<{
  include: {
    allowedMajors: {
      include: { major: { select: { id: true; code: true; name: true } } };
    };
    categories: {
      include: { category: true };
    };
    versions: {
      include: { reviews: true };
    };
  };
}>;

type OwnedCourseDetail = Prisma.CourseGetPayload<{
  include: {
    allowedMajors: { include: { major: true } };
    categories: { include: { category: true } };
    versions: {
      include: {
        sections: true;
        contentItems: {
          include: {
            mediaAsset: {
              select: { id: true; fileName: true; mimeType: true; status: true };
            };
          };
        };
        coverAsset: {
          select: { id: true; fileName: true; mimeType: true; status: true };
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
    };
  };
}>;

interface CourseReadiness {
  details: boolean;
  categories: boolean;
  eligibility: boolean;
  content: boolean;
  media: boolean;
  preTest: boolean;
  postTest: boolean;
  assessments: boolean;
}

type OwnedCourseDetailResponse = OwnedCourseDetail & {
  readiness: number;
  checks: CourseReadiness;
};

interface PublishedCourseSummary {
  courseId: string;
  eligibilityMode: CourseEligibilityMode;
  versionId: string;
  title: string;
  description: string | null;
  languageCode: string;
  publishedAt: Date | null;
  coverAssetId: string | null;
  enrollments: number;
  categories: Array<{
    id: string;
    slug: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  teacher: { id: string; fullName: string; universityEmail: string };
}

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorage,
  ) {}

  async listOwned(actor: CourseActor): Promise<OwnedCourse[]> {
    this.requireTeacher(actor);
    return this.prisma.course.findMany({
      where: { teacherId: actor.id, archivedAt: null },
      include: {
        allowedMajors: {
          include: { major: { select: { id: true, code: true, name: true } } },
        },
        categories: {
          include: { category: true },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            reviews: { orderBy: { submissionNumber: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOwnedDetail(actor: CourseActor, courseId: string): Promise<OwnedCourseDetailResponse> {
    this.requireTeacher(actor);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        allowedMajors: { include: { major: true } },
        categories: { include: { category: true } },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            sections: { orderBy: { position: 'asc' } },
            contentItems: {
              orderBy: { position: 'asc' },
              include: {
                mediaAsset: {
                  select: { id: true, fileName: true, mimeType: true, status: true },
                },
              },
            },
            coverAsset: {
              select: { id: true, fileName: true, mimeType: true, status: true },
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
            reviews: { orderBy: { submissionNumber: 'desc' }, take: 1 },
          },
        },
      },
    });
    if (!course || course.archivedAt) throw new NotFoundException('Course was not found');
    if (course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may view this Course');
    }
    const latest = course.versions[0];
    const hasValidQuestions = (
      quiz: (typeof course.versions)[number]['quizzes'][number],
    ): boolean =>
      quiz.questions.length > 0 &&
      quiz.questions.every(
        (question) =>
          question.options.length >= 2 &&
          question.options.filter((option) => option.isCorrect).length === 1,
      );
    const checks = latest
      ? {
          details: Boolean(latest.title.trim() && latest.languageCode.trim()),
          categories: course.categories.length > 0,
          eligibility:
            course.eligibilityMode === CourseEligibilityMode.OPEN ||
            course.allowedMajors.length > 0,
          content: latest.contentItems.length > 0,
          media:
            (!latest.coverAsset || latest.coverAsset.status === AssetStatus.READY) &&
            latest.contentItems.every(
              (item) =>
                item.contentType === 'TEXT' || item.mediaAsset?.status === AssetStatus.READY,
            ) &&
            latest.quizzes.every((quiz) =>
              quiz.questions.every(
                (question) =>
                  !question.imageAsset || question.imageAsset.status === AssetStatus.READY,
              ),
            ),
          preTest: latest.quizzes
            .filter((quiz) => quiz.quizType === 'PRE_TEST')
            .every(hasValidQuestions),
          postTest: latest.quizzes
            .filter((quiz) => quiz.quizType === 'POST_TEST')
            .every(hasValidQuestions),
          assessments: latest.quizzes.every(hasValidQuestions),
        }
      : {
          details: false,
          categories: false,
          eligibility: false,
          content: false,
          media: false,
          preTest: false,
          postTest: false,
          assessments: false,
        };
    const passed = Object.values(checks).filter(Boolean).length;
    return {
      ...course,
      readiness: Math.round((passed / Object.keys(checks).length) * 100),
      checks,
    };
  }

  async createCourse(actor: CourseActor, input: CreateCourseInput): Promise<CreatedCourse> {
    this.requireTeacher(actor);
    this.validateMajorIds(input.eligibilityMode, input.majorIds);
    this.validateCategoryIds(input.categoryIds);
    const title = input.title.trim();
    if (!title) {
      throw new UnprocessableEntityException('Course title is required');
    }

    return this.prisma.$transaction(async (tx) => {
      if (input.eligibilityMode === CourseEligibilityMode.LIMITED) {
        const majorCount = await tx.major.count({
          where: { id: { in: input.majorIds } },
        });
        if (majorCount !== input.majorIds.length) {
          throw new UnprocessableEntityException('One or more eligible Majors are unknown');
        }
      }

      const categoryCount = await tx.category.count({
        where: { id: { in: input.categoryIds } },
      });
      if (categoryCount !== input.categoryIds.length) {
        throw new UnprocessableEntityException('One or more Categories are unknown');
      }

      return tx.course.create({
        data: {
          teacherId: actor.id,
          eligibilityMode: input.eligibilityMode,
          allowedMajors: {
            create: input.majorIds.map((majorId) => ({ majorId })),
          },
          categories: {
            create: input.categoryIds.map((categoryId) => ({ categoryId })),
          },
          versions: {
            create: {
              versionNumber: 1,
              title,
              description: input.description?.trim() || null,
              languageCode: input.languageCode ?? 'th',
              status: CourseVersionStatus.DRAFT,
            },
          },
        },
        include: { allowedMajors: true, categories: true, versions: true },
      });
    });
  }

  async updateDraft(
    actor: CourseActor,
    versionId: string,
    input: UpdateDraftInput,
  ): Promise<CourseVersion> {
    this.requireTeacher(actor);
    if (
      input.title === undefined &&
      input.description === undefined &&
      input.languageCode === undefined
    ) {
      throw new UnprocessableEntityException('At least one Course field is required');
    }
    const version = await this.prisma.courseVersion.findUnique({
      where: { id: versionId },
      include: { course: { select: { teacherId: true } } },
    });
    if (!version) {
      throw new NotFoundException('Course Version was not found');
    }
    if (version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may edit this Course');
    }
    if (version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft Version may be edited');
    }

    const data: UpdateDraftInput = {};
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) {
        throw new UnprocessableEntityException('Course title is required');
      }
      data.title = title;
    }
    if (input.description !== undefined) {
      data.description = input.description?.trim() || null;
    }
    if (input.languageCode !== undefined) {
      data.languageCode = input.languageCode;
    }

    const updated = await this.prisma.courseVersion.updateMany({
      where: {
        id: versionId,
        status: CourseVersionStatus.DRAFT,
        course: { teacherId: actor.id, archivedAt: null },
      },
      data,
    });
    if (updated.count !== 1) {
      throw new ConflictException('Version state changed concurrently');
    }
    const saved = await this.prisma.courseVersion.findUnique({ where: { id: versionId } });
    if (!saved) throw new NotFoundException('Course Version was not found');
    return saved;
  }

  async createRevision(actor: CourseActor, courseId: string): Promise<CourseVersion> {
    this.requireTeacher(actor);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        teacherId: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          select: {
            versionNumber: true,
            title: true,
            description: true,
            languageCode: true,
            status: true,
            coverAsset: {
              select: {
                fileName: true,
                mimeType: true,
                storageKey: true,
                sizeBytes: true,
                status: true,
              },
            },
            contentItems: {
              where: { sectionId: null },
              orderBy: { position: 'asc' },
              select: {
                contentType: true,
                title: true,
                textBody: true,
                position: true,
                mediaAsset: {
                  select: {
                    fileName: true,
                    mimeType: true,
                    storageKey: true,
                    sizeBytes: true,
                    status: true,
                  },
                },
              },
            },
            sections: {
              orderBy: { position: 'asc' },
              select: {
                title: true,
                position: true,
                contentItems: {
                  orderBy: { position: 'asc' },
                  select: {
                    contentType: true,
                    title: true,
                    textBody: true,
                    position: true,
                    mediaAsset: {
                      select: {
                        fileName: true,
                        mimeType: true,
                        storageKey: true,
                        sizeBytes: true,
                        status: true,
                      },
                    },
                  },
                },
              },
            },
            quizzes: {
              select: {
                quizType: true,
                title: true,
                durationSeconds: true,
                randomizeQuestions: true,
                randomizeOptions: true,
                questions: {
                  orderBy: { position: 'asc' },
                  select: {
                    questionText: true,
                    questionType: true,
                    points: true,
                    position: true,
                    imageAsset: {
                      select: {
                        fileName: true,
                        mimeType: true,
                        storageKey: true,
                        sizeBytes: true,
                        status: true,
                      },
                    },
                    options: {
                      orderBy: { position: 'asc' },
                      select: {
                        optionText: true,
                        isCorrect: true,
                        position: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException('Course was not found');
    }
    if (course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may create a revision');
    }

    const activeStatuses: CourseVersionStatus[] = [
      CourseVersionStatus.DRAFT,
      CourseVersionStatus.SUBMITTED,
      CourseVersionStatus.REJECTED,
    ];
    if (course.versions.some((version) => activeStatuses.includes(version.status))) {
      throw new ConflictException('An active Course revision already exists');
    }
    const source = course.versions.find(
      (version) =>
        version.status === CourseVersionStatus.APPROVED ||
        version.status === CourseVersionStatus.PUBLISHED ||
        version.status === CourseVersionStatus.UNPUBLISHED,
    );
    if (!source) {
      throw new ConflictException(
        'An approved, published, or unpublished Version is required before creating a revision',
      );
    }

    const revisionBytes =
      Number(source.coverAsset?.sizeBytes ?? 0n) +
      (source.contentItems ?? []).reduce(
        (total, item) => total + Number(item.mediaAsset?.sizeBytes ?? 0n),
        0,
      ) +
      (source.sections ?? []).reduce(
        (total, section) =>
          total +
          section.contentItems.reduce(
            (sectionTotal, item) => sectionTotal + Number(item.mediaAsset?.sizeBytes ?? 0n),
            0,
          ),
        0,
      ) +
      (source.quizzes ?? []).reduce(
        (total, quiz) =>
          total +
          quiz.questions.reduce(
            (quizTotal, question) => quizTotal + Number(question.imageAsset?.sizeBytes ?? 0n),
            0,
          ),
        0,
      );

    const copiedKeys: string[] = [];
    const copyAsset = async (
      asset: {
        fileName: string;
        mimeType: string;
        storageKey: string;
        sizeBytes: bigint;
        status: AssetStatus;
      },
      prefix: string,
    ): Promise<{
      fileName: string;
      mimeType: string;
      storageKey: string;
      sizeBytes: bigint;
      status: AssetStatus;
    }> => {
      const storageKey = `${prefix}/${randomUUID()}`;
      await this.storage.copyObject(asset.storageKey, storageKey);
      copiedKeys.push(storageKey);
      return {
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        storageKey,
        sizeBytes: asset.sizeBytes,
        status: asset.status,
      };
    };

    try {
      const coverAsset = source.coverAsset
        ? await copyAsset(source.coverAsset, 'course-covers')
        : null;
      const contentItems: Prisma.ContentItemCreateWithoutVersionInput[] = [];
      for (const item of source.contentItems ?? []) {
        contentItems.push({
          contentType: item.contentType,
          title: item.title,
          textBody: item.textBody,
          position: item.position,
          ...(item.mediaAsset
            ? { mediaAsset: { create: await copyAsset(item.mediaAsset, 'courses') } }
            : {}),
        });
      }
      const sections: Array<{
        title: string;
        position: number;
        contentPositions: number[];
      }> = [];
      for (const section of source.sections ?? []) {
        const contentPositions: number[] = [];
        for (const item of section.contentItems) {
          contentItems.push({
            contentType: item.contentType,
            title: item.title,
            textBody: item.textBody,
            position: item.position,
            ...(item.mediaAsset
              ? { mediaAsset: { create: await copyAsset(item.mediaAsset, 'courses') } }
              : {}),
          });
          contentPositions.push(item.position);
        }
        sections.push({
          title: section.title,
          position: section.position,
          contentPositions,
        });
      }
      const quizzes: Prisma.QuizCreateWithoutVersionInput[] = [];
      for (const quiz of source.quizzes ?? []) {
        const questions = [];
        for (const question of quiz.questions) {
          questions.push({
            questionText: question.questionText,
            questionType: question.questionType,
            points: question.points,
            position: question.position,
            ...(question.imageAsset
              ? {
                  imageAsset: {
                    create: await copyAsset(question.imageAsset, 'question-images'),
                  },
                }
              : {}),
            options: { create: question.options },
          });
        }
        quizzes.push({
          quizType: quiz.quizType,
          title: quiz.title,
          durationSeconds: quiz.durationSeconds,
          randomizeQuestions: quiz.randomizeQuestions,
          randomizeOptions: quiz.randomizeOptions,
          questions: { create: questions },
        });
      }

      return await this.prisma.$transaction(
        async (tx) => {
          const [lessonTotal, coverTotal, questionImageTotal] = await Promise.all([
            tx.mediaAsset.aggregate({
              where: {
                status: { not: AssetStatus.DELETED },
                contentItem: { version: { courseId } },
              },
              _sum: { sizeBytes: true },
            }),
            tx.courseCoverAsset.aggregate({
              where: { status: { not: AssetStatus.DELETED }, version: { courseId } },
              _sum: { sizeBytes: true },
            }),
            tx.questionImageAsset.aggregate({
              where: {
                status: { not: AssetStatus.DELETED },
                question: { quiz: { version: { courseId } } },
              },
              _sum: { sizeBytes: true },
            }),
          ]);
          const reservedBytes =
            Number(lessonTotal._sum.sizeBytes ?? 0n) +
            Number(coverTotal._sum.sizeBytes ?? 0n) +
            Number(questionImageTotal._sum.sizeBytes ?? 0n);
          if (reservedBytes + revisionBytes > ONE_GIB) {
            throw new ConflictException('Course revision would exceed the 1 GiB media limit');
          }

          const draft = await tx.courseVersion.create({
            data: {
              courseId,
              versionNumber: (course.versions[0]?.versionNumber ?? 0) + 1,
              title: source.title,
              description: source.description,
              languageCode: source.languageCode ?? 'th',
              status: CourseVersionStatus.DRAFT,
              ...(coverAsset ? { coverAsset: { create: coverAsset } } : {}),
              ...(contentItems.length ? { contentItems: { create: contentItems } } : {}),
              ...(quizzes.length ? { quizzes: { create: quizzes } } : {}),
            },
          });

          for (const section of sections) {
            const createdSection = await tx.courseSection.create({
              data: {
                versionId: draft.id,
                title: section.title,
                position: section.position,
              },
            });
            if (section.contentPositions.length > 0) {
              await tx.contentItem.updateMany({
                where: {
                  versionId: draft.id,
                  position: { in: section.contentPositions },
                },
                data: { sectionId: createdSection.id },
              });
            }
          }

          return draft;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error: unknown) {
      await Promise.allSettled(
        copiedKeys.map((storageKey) => this.storage.deleteObject(storageKey)),
      );
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A Course revision was created concurrently');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Course media changed concurrently; retry the revision');
      }
      throw error;
    }
  }

  async replaceCategories(
    actor: CourseActor,
    courseId: string,
    categoryIds: string[],
  ): Promise<{ courseId: string; categoryIds: string[] }> {
    this.requireTeacher(actor);
    this.validateCategoryIds(categoryIds);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });
    if (!course) {
      throw new NotFoundException('Course was not found');
    }
    if (course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may edit this Course');
    }

    await this.prisma.$transaction(async (tx) => {
      const categoryCount = await tx.category.count({ where: { id: { in: categoryIds } } });
      if (categoryCount !== categoryIds.length) {
        throw new UnprocessableEntityException('One or more Categories are unknown');
      }
      await tx.courseCategory.deleteMany({ where: { courseId } });
      await tx.courseCategory.createMany({
        data: categoryIds.map((categoryId) => ({ courseId, categoryId })),
      });
    });

    return { courseId, categoryIds };
  }

  async listPublishedForApprover(actor: CourseActor): Promise<PublishedCourseSummary[]> {
    if (actor.role !== UserRole.APPROVER) {
      throw new ForbiddenException('APPROVER role is required');
    }
    return this.listPublishedCourses();
  }

  async listPublishedForOwner(actor: CourseActor): Promise<PublishedCourseSummary[]> {
    if (actor.role !== UserRole.EXECUTIVE) {
      throw new ForbiddenException('EXECUTIVE role is required');
    }
    return this.listPublishedCourses();
  }

  private async listPublishedCourses(): Promise<PublishedCourseSummary[]> {
    const courses = await this.prisma.course.findMany({
      where: {
        archivedAt: null,
        versions: { some: { status: CourseVersionStatus.PUBLISHED } },
      },
      select: {
        id: true,
        eligibilityMode: true,
        teacher: { select: { id: true, fullName: true, universityEmail: true } },
        categories: { include: { category: true } },
        versions: {
          where: { status: CourseVersionStatus.PUBLISHED },
          orderBy: { publishedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            title: true,
            description: true,
            languageCode: true,
            publishedAt: true,
            coverAsset: { select: { id: true, status: true } },
          },
        },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return courses.flatMap((course) => {
      const version = course.versions[0];
      if (!version) return [];
      return [
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
          categories: course.categories.map((item) => item.category),
          teacher: course.teacher,
        },
      ];
    });
  }

  private validateMajorIds(eligibilityMode: CourseEligibilityMode, majorIds: string[]): void {
    if (eligibilityMode === CourseEligibilityMode.OPEN && majorIds.length > 0) {
      throw new UnprocessableEntityException('OPEN Courses must not restrict eligible Majors');
    }
    if (eligibilityMode === CourseEligibilityMode.LIMITED && majorIds.length === 0) {
      throw new UnprocessableEntityException('At least one eligible Major is required');
    }
    if (new Set(majorIds).size !== majorIds.length) {
      throw new UnprocessableEntityException('Eligible Majors must not contain duplicates');
    }
  }

  private validateCategoryIds(categoryIds: string[]): void {
    if (categoryIds.length === 0) {
      throw new UnprocessableEntityException('At least one Category is required');
    }
    if (new Set(categoryIds).size !== categoryIds.length) {
      throw new UnprocessableEntityException('Categories must not contain duplicates');
    }
  }

  private requireTeacher(actor: CourseActor): void {
    if (actor.role !== UserRole.TEACHER) {
      throw new ForbiddenException('TEACHER role is required');
    }
  }
}
