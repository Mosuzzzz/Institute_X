import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AccountStatus,
  AssetStatus,
  ContentType,
  CourseCoverAsset,
  CourseEligibilityMode,
  CourseVersionStatus,
  MediaAsset,
  Prisma,
  QuestionImageAsset,
  QuizResult,
  QuizType,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { ObjectStorage, SignedStorageUrl } from './object-storage';

const ONE_GIB = 1_073_741_824;

interface TeacherActor {
  id: string;
  role: UserRole;
}

interface StudentActor {
  id: string;
  role: UserRole;
  accountStatus: AccountStatus;
  majorId: string | null;
}

interface InitializeUploadInput {
  sectionId?: string;
  contentType: ContentType;
  title?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  position: number;
}

interface InitializeCoverUploadInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

interface CoverViewer {
  id: string;
  role: UserRole;
  accountStatus?: AccountStatus;
  majorId?: string | null;
}

interface InitializedUpload {
  assetId: string;
  uploadUrl: string;
  expiresAt: Date;
}

type JsonSafeAsset<T extends { sizeBytes: bigint }> = Omit<T, 'sizeBytes'> & {
  sizeBytes: number;
};

const ALLOWED_MIME_TYPES: Record<Exclude<ContentType, 'TEXT'>, ReadonlySet<string>> = {
  VIDEO: new Set(['video/mp4', 'video/webm']),
  AUDIO: new Set(['audio/mpeg', 'audio/ogg', 'audio/wav']),
  IMAGE: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  DOCUMENT: new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]),
};

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorage,
  ) {}

  async initializeUpload(
    actor: TeacherActor,
    versionId: string,
    input: InitializeUploadInput,
  ): Promise<InitializedUpload> {
    this.validateUpload(actor, input);
    const storageKey = `courses/${randomUUID()}`;
    const content = await this.prisma.$transaction(
      async (tx) => {
        const version = await tx.courseVersion.findUnique({
          where: { id: versionId },
          include: { course: { select: { teacherId: true } } },
        });
        if (!version) {
          throw new NotFoundException('Course Version was not found');
        }
        if (version.course.teacherId !== actor.id) {
          throw new ForbiddenException('Only the owning Teacher may upload media');
        }
        if (version.status !== CourseVersionStatus.DRAFT) {
          throw new ConflictException('Only a Draft Version may be changed');
        }
        if (input.sectionId) {
          const section = await tx.courseSection.findFirst({
            where: { id: input.sectionId, versionId },
            select: { id: true },
          });
          if (!section) {
            throw new UnprocessableEntityException('Section does not belong to this Version');
          }
        }

        const total = await tx.mediaAsset.aggregate({
          where: {
            status: { not: AssetStatus.DELETED },
            contentItem: { version: { courseId: version.courseId } },
          },
          _sum: { sizeBytes: true },
        });
        if (Number(total._sum.sizeBytes ?? 0n) + input.sizeBytes > ONE_GIB) {
          throw new ConflictException('Course media would exceed the 1 GiB limit');
        }

        try {
          return await tx.contentItem.create({
            data: {
              versionId,
              ...(input.sectionId ? { sectionId: input.sectionId } : {}),
              contentType: input.contentType,
              title: input.title?.trim() || null,
              textBody: null,
              position: input.position,
              mediaAsset: {
                create: {
                  fileName: input.fileName.trim(),
                  mimeType: input.mimeType,
                  storageKey,
                  sizeBytes: input.sizeBytes,
                  status: AssetStatus.PENDING,
                },
              },
            },
            include: { mediaAsset: true },
          });
        } catch (error: unknown) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ConflictException('Content position is already in use');
          }
          throw error;
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (!content.mediaAsset) {
      throw new ConflictException('Media reservation was not created');
    }
    const signed = await this.storage.createUploadUrl(
      content.mediaAsset.storageKey,
      input.mimeType,
      input.sizeBytes,
    );
    return {
      assetId: content.mediaAsset.id,
      uploadUrl: signed.url,
      expiresAt: signed.expiresAt,
    };
  }

  async initializeCoverUpload(
    actor: TeacherActor,
    versionId: string,
    input: InitializeCoverUploadInput,
  ): Promise<InitializedUpload> {
    this.validateCoverUpload(actor, input);
    const storageKey = `course-covers/${randomUUID()}`;
    const cover = await this.prisma.$transaction(
      async (tx) => {
        const version = await tx.courseVersion.findUnique({
          where: { id: versionId },
          include: { course: { select: { teacherId: true } } },
        });
        if (!version) throw new NotFoundException('Course Version was not found');
        if (version.course.teacherId !== actor.id) {
          throw new ForbiddenException('Only the owning Teacher may upload a Course cover');
        }
        if (version.status !== CourseVersionStatus.DRAFT) {
          throw new ConflictException('Only a Draft Version may be changed');
        }

        const [mediaTotal, coverTotal] = await Promise.all([
          tx.mediaAsset.aggregate({
            where: {
              status: { not: AssetStatus.DELETED },
              contentItem: { version: { courseId: version.courseId } },
            },
            _sum: { sizeBytes: true },
          }),
          tx.courseCoverAsset.aggregate({
            where: {
              status: { not: AssetStatus.DELETED },
              version: { courseId: version.courseId },
            },
            _sum: { sizeBytes: true },
          }),
        ]);
        const reservedBytes =
          Number(mediaTotal._sum.sizeBytes ?? 0n) + Number(coverTotal._sum.sizeBytes ?? 0n);
        if (reservedBytes + input.sizeBytes > ONE_GIB) {
          throw new ConflictException('Course media would exceed the 1 GiB limit');
        }

        try {
          return await tx.courseCoverAsset.create({
            data: {
              versionId,
              fileName: input.fileName.trim(),
              mimeType: input.mimeType,
              storageKey,
              sizeBytes: input.sizeBytes,
              status: AssetStatus.PENDING,
            },
          });
        } catch (error: unknown) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ConflictException('This Course Version already has a cover image');
          }
          throw error;
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    let signed: SignedStorageUrl;
    try {
      signed = await this.storage.createUploadUrl(
        cover.storageKey,
        input.mimeType,
        input.sizeBytes,
      );
    } catch (error: unknown) {
      await this.prisma.courseCoverAsset.delete({ where: { id: cover.id } });
      throw error;
    }
    return { assetId: cover.id, uploadUrl: signed.url, expiresAt: signed.expiresAt };
  }

  async initializeQuestionImageUpload(
    actor: TeacherActor,
    questionId: string,
    input: InitializeCoverUploadInput,
  ): Promise<InitializedUpload> {
    this.validateCoverUpload(actor, input);
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          include: { version: { include: { course: { select: { teacherId: true } } } } },
        },
      },
    });
    if (!question) throw new NotFoundException('Question was not found');
    if (question.quiz.version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may upload a question image');
    }
    if (question.quiz.version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft question may be changed');
    }

    const storageKey = `question-images/${randomUUID()}`;
    let asset: QuestionImageAsset;
    try {
      asset = await this.prisma.questionImageAsset.create({
        data: {
          questionId,
          fileName: input.fileName.trim(),
          mimeType: input.mimeType,
          storageKey,
          sizeBytes: input.sizeBytes,
          status: AssetStatus.PENDING,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This question already has an image');
      }
      throw error;
    }

    try {
      const signed = await this.storage.createUploadUrl(storageKey, input.mimeType, input.sizeBytes);
      return { assetId: asset.id, uploadUrl: signed.url, expiresAt: signed.expiresAt };
    } catch (error: unknown) {
      await this.prisma.questionImageAsset.delete({ where: { id: asset.id } });
      throw error;
    }
  }

  async completeCoverUpload(
    actor: TeacherActor,
    assetId: string,
  ): Promise<JsonSafeAsset<CourseCoverAsset>> {
    if (actor.role !== UserRole.TEACHER) {
      throw new ForbiddenException('TEACHER role is required');
    }
    const asset = await this.prisma.courseCoverAsset.findUnique({
      where: { id: assetId },
      include: { version: { include: { course: true } } },
    });
    if (!asset) throw new NotFoundException('Course cover was not found');
    if (asset.version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may complete this cover upload');
    }
    if (asset.version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft cover may be completed');
    }
    const stored = await this.storage.headObject(asset.storageKey);
    if (stored.sizeBytes !== Number(asset.sizeBytes) || stored.mimeType !== asset.mimeType) {
      await this.prisma.courseCoverAsset.update({
        where: { id: assetId },
        data: { status: AssetStatus.FAILED },
      });
      throw new UnprocessableEntityException('Uploaded cover metadata does not match');
    }
    const updated = await this.prisma.courseCoverAsset.update({
      where: { id: assetId },
      data: { status: AssetStatus.READY },
    });
    return { ...updated, sizeBytes: Number(updated.sizeBytes) };
  }

  async completeQuestionImageUpload(
    actor: TeacherActor,
    assetId: string,
  ): Promise<JsonSafeAsset<QuestionImageAsset>> {
    if (actor.role !== UserRole.TEACHER) {
      throw new ForbiddenException('TEACHER role is required');
    }
    const asset = await this.prisma.questionImageAsset.findUnique({
      where: { id: assetId },
      include: {
        question: {
          include: {
            quiz: { include: { version: { include: { course: true } } } },
          },
        },
      },
    });
    if (!asset) throw new NotFoundException('Question image was not found');
    if (asset.question.quiz.version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may complete this image upload');
    }
    if (asset.question.quiz.version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft question image may be completed');
    }
    const stored = await this.storage.headObject(asset.storageKey);
    if (stored.sizeBytes !== Number(asset.sizeBytes) || stored.mimeType !== asset.mimeType) {
      await this.prisma.questionImageAsset.update({
        where: { id: assetId },
        data: { status: AssetStatus.FAILED },
      });
      throw new UnprocessableEntityException('Uploaded question image metadata does not match');
    }
    const updated = await this.prisma.questionImageAsset.update({
      where: { id: assetId },
      data: { status: AssetStatus.READY },
    });
    return { ...updated, sizeBytes: Number(updated.sizeBytes) };
  }

  async deleteDraftCover(actor: TeacherActor, assetId: string): Promise<void> {
    if (actor.role !== UserRole.TEACHER) {
      throw new ForbiddenException('TEACHER role is required');
    }
    const asset = await this.prisma.courseCoverAsset.findUnique({
      where: { id: assetId },
      include: { version: { include: { course: true } } },
    });
    if (!asset) throw new NotFoundException('Course cover was not found');
    if (asset.version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may delete this cover');
    }
    if (asset.version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft cover may be deleted');
    }
    await this.storage.deleteObject(asset.storageKey);
    await this.prisma.courseCoverAsset.delete({ where: { id: assetId } });
  }

  async deleteDraftQuestionImage(actor: TeacherActor, assetId: string): Promise<void> {
    if (actor.role !== UserRole.TEACHER) {
      throw new ForbiddenException('TEACHER role is required');
    }
    const asset = await this.prisma.questionImageAsset.findUnique({
      where: { id: assetId },
      include: {
        question: {
          include: {
            quiz: { include: { version: { include: { course: true } } } },
          },
        },
      },
    });
    if (!asset) throw new NotFoundException('Question image was not found');
    if (asset.question.quiz.version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may delete this question image');
    }
    if (asset.question.quiz.version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only a Draft question image may be deleted');
    }
    await this.storage.deleteObject(asset.storageKey);
    await this.prisma.questionImageAsset.delete({ where: { id: assetId } });
  }

  async createQuestionImageViewUrl(
    actor: CoverViewer,
    assetId: string,
  ): Promise<SignedStorageUrl> {
    const asset = await this.prisma.questionImageAsset.findUnique({
      where: { id: assetId },
      include: {
        question: {
          include: {
            quiz: {
              include: {
                version: {
                  include: {
                    course: {
                      include: {
                        allowedMajors: true,
                        enrollments: { where: { studentId: actor.id } },
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
    if (!asset || asset.status !== AssetStatus.READY) {
      throw new NotFoundException('Question image was not found');
    }

    const version = asset.question.quiz.version;
    if (actor.role === UserRole.TEACHER) {
      if (version.course.teacherId !== actor.id) {
        throw new ForbiddenException('Only the owning Teacher may view this question image');
      }
    } else if (actor.role === UserRole.APPROVER) {
      if (version.status !== CourseVersionStatus.SUBMITTED) {
        throw new ForbiddenException('Only a submitted question image may be reviewed');
      }
    } else if (actor.role === UserRole.STUDENT && actor.accountStatus === AccountStatus.ACTIVE) {
      if (
        version.status !== CourseVersionStatus.PUBLISHED ||
        version.course.enrollments.length === 0 ||
        (version.course.eligibilityMode !== CourseEligibilityMode.OPEN &&
          !version.course.allowedMajors.some((item) => item.majorId === actor.majorId))
      ) {
        throw new ForbiddenException('Question image access is not allowed');
      }
    } else {
      throw new ForbiddenException('Question image access is not allowed');
    }
    return this.storage.createViewUrl(asset.storageKey);
  }

  async createCoverViewUrl(actor: CoverViewer, assetId: string): Promise<SignedStorageUrl> {
    const asset = await this.prisma.courseCoverAsset.findUnique({
      where: { id: assetId },
      include: {
        version: {
          include: { course: { include: { allowedMajors: true } } },
        },
      },
    });
    if (!asset || asset.status !== AssetStatus.READY) {
      throw new NotFoundException('Course cover was not found');
    }

    if (actor.role === UserRole.TEACHER) {
      if (asset.version.course.teacherId !== actor.id) {
        throw new ForbiddenException('Only the owning Teacher may view this cover');
      }
    } else if (actor.role === UserRole.APPROVER) {
      if (
        asset.version.status !== CourseVersionStatus.PUBLISHED &&
        asset.version.status !== CourseVersionStatus.SUBMITTED
      ) {
        throw new ForbiddenException('Course cover access is not allowed');
      }
    } else if (actor.role === UserRole.STUDENT && actor.accountStatus === AccountStatus.ACTIVE) {
      if (
        asset.version.status !== CourseVersionStatus.PUBLISHED ||
        (asset.version.course.eligibilityMode !== CourseEligibilityMode.OPEN &&
          !asset.version.course.allowedMajors.some((item) => item.majorId === actor.majorId))
      ) {
        throw new ForbiddenException('Student is not eligible for this Course cover');
      }
    } else {
      throw new ForbiddenException('Course cover access is not allowed');
    }
    return this.storage.createViewUrl(asset.storageKey);
  }

  async completeUpload(actor: TeacherActor, assetId: string): Promise<JsonSafeAsset<MediaAsset>> {
    if (actor.role !== UserRole.TEACHER) {
      throw new ForbiddenException('TEACHER role is required');
    }
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
      include: {
        contentItem: {
          include: { version: { include: { course: true } } },
        },
      },
    });
    if (!asset) {
      throw new NotFoundException('Media asset was not found');
    }
    if (asset.contentItem.version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may complete this upload');
    }
    if (asset.contentItem.version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only Draft media may be completed');
    }
    const stored = await this.storage.headObject(asset.storageKey);
    if (stored.sizeBytes !== Number(asset.sizeBytes) || stored.mimeType !== asset.mimeType) {
      await this.prisma.mediaAsset.update({
        where: { id: assetId },
        data: { status: AssetStatus.FAILED },
      });
      throw new UnprocessableEntityException('Uploaded object metadata does not match');
    }
    const updated = await this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: { status: AssetStatus.READY },
    });
    return { ...updated, sizeBytes: Number(updated.sizeBytes) };
  }

  async deleteDraftAsset(actor: TeacherActor, assetId: string): Promise<void> {
    if (actor.role !== UserRole.TEACHER) {
      throw new ForbiddenException('TEACHER role is required');
    }
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
      include: {
        contentItem: {
          include: { version: { include: { course: true } } },
        },
      },
    });
    if (!asset) {
      throw new NotFoundException('Media asset was not found');
    }
    if (asset.contentItem.version.course.teacherId !== actor.id) {
      throw new ForbiddenException('Only the owning Teacher may delete this asset');
    }
    if (asset.contentItem.version.status !== CourseVersionStatus.DRAFT) {
      throw new ConflictException('Only Draft media may be deleted');
    }

    await this.storage.deleteObject(asset.storageKey);
    await this.prisma.contentItem.delete({ where: { id: asset.contentItemId } });
  }

  async createStudentViewUrl(student: StudentActor, assetId: string): Promise<SignedStorageUrl> {
    if (student.role !== UserRole.STUDENT || student.accountStatus !== AccountStatus.ACTIVE) {
      throw new ForbiddenException('Active STUDENT access is required');
    }
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
      include: {
        contentItem: {
          include: {
            version: {
              include: {
                course: {
                  include: {
                    allowedMajors: true,
                    enrollments: { where: { studentId: student.id } },
                  },
                },
                quizzes: {
                  where: { quizType: QuizType.PRE_TEST },
                  include: {
                    attempts: {
                      where: {
                        studentId: student.id,
                        result: QuizResult.COMPLETED,
                        submittedAt: { not: null },
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
    if (
      !asset ||
      asset.status !== AssetStatus.READY ||
      asset.contentItem.version.status !== CourseVersionStatus.PUBLISHED
    ) {
      throw new NotFoundException('Published media asset was not found');
    }
    const version = asset.contentItem.version;
    if (
      version.course.enrollments.length === 0 ||
      (version.course.eligibilityMode !== CourseEligibilityMode.OPEN &&
        !version.course.allowedMajors.some((allowed) => allowed.majorId === student.majorId))
    ) {
      throw new ForbiddenException('Student is not eligible for this Course');
    }
    if (!version.quizzes[0]?.attempts.length) {
      throw new ForbiddenException('Pre-Test completion is required');
    }
    return this.storage.createViewUrl(asset.storageKey);
  }

  private validateUpload(actor: TeacherActor, input: InitializeUploadInput): void {
    if (actor.role !== UserRole.TEACHER) {
      throw new ForbiddenException('TEACHER role is required');
    }
    if (
      !Number.isSafeInteger(input.sizeBytes) ||
      input.sizeBytes < 1 ||
      input.sizeBytes > ONE_GIB
    ) {
      throw new UnprocessableEntityException('Media size must be between 1 byte and 1 GiB');
    }
    if (input.contentType === ContentType.TEXT) {
      throw new UnprocessableEntityException('TEXT content is not a media upload');
    }
    if (!ALLOWED_MIME_TYPES[input.contentType].has(input.mimeType)) {
      throw new UnprocessableEntityException('Media MIME type is not allowed');
    }
    if (!input.fileName.trim()) {
      throw new UnprocessableEntityException('File name is required');
    }
    if (!Number.isInteger(input.position) || input.position < 1) {
      throw new UnprocessableEntityException('Content position must be positive');
    }
  }

  private validateCoverUpload(actor: TeacherActor, input: InitializeCoverUploadInput): void {
    if (actor.role !== UserRole.TEACHER) {
      throw new ForbiddenException('TEACHER role is required');
    }
    if (
      !Number.isSafeInteger(input.sizeBytes) ||
      input.sizeBytes < 1 ||
      input.sizeBytes > 10_485_760
    ) {
      throw new UnprocessableEntityException('Cover size must be between 1 byte and 10 MiB');
    }
    if (!new Set(['image/jpeg', 'image/png', 'image/webp']).has(input.mimeType)) {
      throw new UnprocessableEntityException('Cover must be a JPEG, PNG, or WebP image');
    }
    if (!input.fileName.trim()) {
      throw new UnprocessableEntityException('File name is required');
    }
  }
}
