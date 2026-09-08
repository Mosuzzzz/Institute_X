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
import { ObjectStorage } from '../media/object-storage';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorage,
  ) {}

  async listSubmitted(actor: VersionActor): Promise<SubmittedVersion[]> {
    this.requireRole(actor, UserRole.APPROVER);
    return this.prisma.courseVersion.findMany({
      where: { status: CourseVersionStatus.SUBMITTED, course: { archivedAt: null } },
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
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.prisma.$transaction(
          async (tx) => {
            const locked = await tx.courseVersion.updateMany({
              where: {
                id: versionId,
                status: CourseVersionStatus.DRAFT,
                course: { teacherId: actor.id, archivedAt: null },
              },
              data: { updatedAt: new Date() },
            });
            if (locked.count !== 1) {
              const current = await tx.courseVersion.findUnique({
                where: { id: versionId },
                include: { course: { select: { teacherId: true, archivedAt: true } } },
              });
              if (!current) throw new NotFoundException('Course Version was not found');
              if (current.course.teacherId !== actor.id) {
                throw new ForbiddenException('Only the owning Teacher may submit this Version');
              }
              throw new ConflictException('Only an active Draft Version may be submitted');
            }

            const version = await tx.courseVersion.findUnique({
              where: { id: versionId },
              include: {
                course: { include: { allowedMajors: true, categories: true } },
                coverAsset: { select: { status: true } },
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
            if (!version) throw new NotFoundException('Course Version was not found');
            this.validateSubmission(version);

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
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        return;
      } catch (error: unknown) {
        if (!this.isSerializableWriteConflict(error)) throw error;
        if (attempt === maxAttempts) {
          throw new ConflictException('Version changed concurrently; retry submission');
        }
      }
    }
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
      select: {
        id: true,
        courseId: true,
        status: true,
        course: { select: { archivedAt: true } },
      },
    });
    if (!version) {
      throw new NotFoundException('Course Version was not found');
    }
    if (version.status !== CourseVersionStatus.SUBMITTED) {
      throw new ConflictException('Only a submitted Version may be reviewed');
    }
    if (version.course?.archivedAt) {
      throw new ConflictException('An archived Course may not be reviewed');
    }

    await this.prisma.$transaction(async (tx) => {
      const reviewedAt = new Date();
      if (decision === ReviewDecision.APPROVED) {
        await tx.courseVersion.updateMany({
          where: {
            courseId: version.courseId,
            id: { not: versionId },
            status: CourseVersionStatus.PUBLISHED,
          },
          data: { status: CourseVersionStatus.SUPERSEDED },
        });
      }
      const updated = await tx.courseVersion.updateMany({
        where: {
          id: versionId,
          status: CourseVersionStatus.SUBMITTED,
          course: { archivedAt: null },
        },
        data:
          decision === ReviewDecision.APPROVED
            ? {
                status: CourseVersionStatus.PUBLISHED,
                publishedAt: reviewedAt,
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

  async discardDraft(actor: VersionActor, versionId: string): Promise<void> {
    this.requireRole(actor, UserRole.TEACHER);
    const candidate = await this.prisma.courseVersion.findUnique({
      where: { id: versionId },
      select: {
        status: true,
        course: { select: { teacherId: true } },
      },
    });
    if (!candidate) {
      throw new NotFoundException('Course Version was not found');
    }
    if (candidate.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may discard this Draft');
    }
    if (candidate.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft Version may be discarded');
    }

    await this.prisma.$transaction(async (tx) => {
      // This no-op update takes the same row lock used by submit(). It must
      // succeed before storage is touched, so publication can never race ahead
      // of deletion.
      const locked = await tx.courseVersion.updateMany({
        where: {
          id: versionId,
          status: CourseVersionStatus.DRAFT,
          course: { teacherId: actor.id },
        },
        data: { updatedAt: new Date() },
      });
      if (locked.count !== 1) {
        throw new ConflictException('Version state changed concurrently');
      }

      const version = await tx.courseVersion.findUnique({
        where: { id: versionId },
        select: {
          courseId: true,
          versionNumber: true,
          course: { select: { _count: { select: { versions: true } } } },
          coverAsset: { select: { storageKey: true } },
          contentItems: { select: { mediaAsset: { select: { storageKey: true } } } },
          quizzes: {
            select: {
              questions: { select: { imageAsset: { select: { storageKey: true } } } },
            },
          },
          reviews: {
            select: {
              id: true,
              submissionNumber: true,
              submittedAt: true,
              reviewedById: true,
              decision: true,
              reviewComment: true,
              reviewedAt: true,
            },
          },
        },
      });
      if (!version) {
        throw new ConflictException('Version state changed concurrently');
      }

      const storageKeys = [
        version.coverAsset?.storageKey,
        ...version.contentItems.map((item) => item.mediaAsset?.storageKey),
        ...version.quizzes.flatMap((quiz) =>
          quiz.questions.map((question) => question.imageAsset?.storageKey),
        ),
      ].filter((storageKey): storageKey is string => Boolean(storageKey));

      // Keep the row lock until cleanup and deletion commit. If storage is
      // unavailable the transaction rolls back and the Draft remains retryable.
      await Promise.all(storageKeys.map((storageKey) => this.storage.deleteObject(storageKey)));

      if (version.reviews?.length > 0) {
        await tx.discardedCourseVersionReview.createMany({
          data: version.reviews.map((review) => ({
            originalReviewId: review.id,
            originalVersionId: versionId,
            courseId: version.courseId,
            versionNumber: version.versionNumber,
            submissionNumber: review.submissionNumber,
            submittedAt: review.submittedAt,
            reviewedById: review.reviewedById,
            decision: review.decision,
            reviewComment: review.reviewComment,
            reviewedAt: review.reviewedAt,
          })),
          skipDuplicates: true,
        });
        await tx.courseVersionReview.deleteMany({ where: { versionId } });
      }
      const deleted = await tx.courseVersion.deleteMany({
        where: { id: versionId, status: CourseVersionStatus.DRAFT },
      });
      if (deleted.count !== 1) {
        throw new ConflictException('Version state changed concurrently');
      }
      if (version.course._count.versions === 1) {
        await tx.course.deleteMany({
          where: { id: version.courseId, versions: { none: {} } },
        });
      }
    });
  }

  async unpublish(actor: VersionActor, versionId: string): Promise<void> {
    this.requireTeacherOrOwner(actor);
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
    if (actor.role === UserRole.TEACHER && version.course.teacherId !== actor.id) {
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
    this.requireTeacherOrOwner(actor);
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
    if (actor.role === UserRole.TEACHER && version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may publish this Version');
    }
    if (version.status !== CourseVersionStatus.UNPUBLISHED) {
      throw new ConflictException('Only an unpublished Version may be republished');
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
    title: string;
    languageCode: string;
    course: {
      eligibilityMode: CourseEligibilityMode;
      allowedMajors: unknown[];
      categories: unknown[];
    };
    coverAsset: { status: AssetStatus } | null;
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
    if (!version.title.trim() || !version.languageCode.trim()) {
      throw new UnprocessableEntityException('Course title and language are required');
    }
    if (version.course.categories.length === 0) {
      throw new UnprocessableEntityException('At least one Category is required');
    }
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
      (version.coverAsset && version.coverAsset.status !== AssetStatus.READY) ||
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
    const postTest = version.quizzes.find((quiz) => quiz.quizType === QuizType.POST_TEST);
    if (!postTest || postTest.questions.length === 0) {
      throw new UnprocessableEntityException('A Post-Test with questions is required');
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

  private isSerializableWriteConflict(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034';
  }

  private requireRole(actor: VersionActor, role: UserRole): void {
    if (actor.role !== role) {
      throw new ForbiddenException(`${role} role is required`);
    }
  }

  private requireTeacherOrOwner(actor: VersionActor): void {
    if (actor.role !== UserRole.TEACHER && actor.role !== UserRole.EXECUTIVE) {
      throw new ForbiddenException('TEACHER or EXECUTIVE role is required');
    }
  }
}
