import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AccountStatus,
  AssetStatus,
  ContentType,
  CourseVersionStatus,
  QuizResult,
  QuizType,
  UserRole,
} from '@prisma/client';
import { MediaService } from './media.service';

describe('MediaService', () => {
  const db = {
    courseVersion: { findUnique: jest.fn() },
    mediaAsset: { aggregate: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    courseCoverAsset: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    question: { findUnique: jest.fn() },
    questionImageAsset: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    contentItem: { create: jest.fn(), delete: jest.fn() },
  };
  const prisma = {
    ...db,
    $transaction: jest.fn((operation: (tx: typeof db) => unknown) => operation(db)),
  };
  const storage = {
    createUploadUrl: jest.fn(),
    createViewUrl: jest.fn(),
    headObject: jest.fn(),
    copyObject: jest.fn(),
    deleteObject: jest.fn(),
  };
  const teacher = { id: 'teacher-id', role: UserRole.TEACHER };
  let service: MediaService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((operation) => operation(db));
    db.courseCoverAsset.aggregate.mockResolvedValue({ _sum: { sizeBytes: 0n } });
    service = new MediaService(prisma as never, storage);
  });

  it('reserves media and returns a private short-lived upload URL', async () => {
    db.courseVersion.findUnique.mockResolvedValue({
      courseId: 'course-id',
      status: CourseVersionStatus.DRAFT,
      course: { teacherId: 'teacher-id' },
    });
    db.mediaAsset.aggregate.mockResolvedValue({ _sum: { sizeBytes: 100n } });
    db.contentItem.create.mockResolvedValue({
      id: 'content-id',
      mediaAsset: { id: 'asset-id', storageKey: 'private/key' },
    });
    storage.createUploadUrl.mockResolvedValue({
      url: 'https://storage.example/signed-upload',
      expiresAt: new Date('2026-08-25T01:00:00Z'),
    });

    const result = await service.initializeUpload(teacher, 'version-id', {
      contentType: ContentType.VIDEO,
      title: 'Lesson video',
      fileName: 'lesson.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1_000,
      position: 1,
    });

    expect(db.contentItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        versionId: 'version-id',
        contentType: ContentType.VIDEO,
        position: 1,
        mediaAsset: {
          create: expect.objectContaining({
            fileName: 'lesson.mp4',
            mimeType: 'video/mp4',
            sizeBytes: 1_000,
            status: AssetStatus.PENDING,
          }),
        },
      }),
      include: { mediaAsset: true },
    });
    expect(result).toEqual(
      expect.objectContaining({
        assetId: 'asset-id',
        uploadUrl: 'https://storage.example/signed-upload',
      }),
    );
  });

  it('reserves one image cover without creating a learning content item', async () => {
    db.courseVersion.findUnique.mockResolvedValue({
      courseId: 'course-id',
      status: CourseVersionStatus.DRAFT,
      course: { teacherId: 'teacher-id' },
    });
    db.mediaAsset.aggregate.mockResolvedValue({ _sum: { sizeBytes: 100n } });
    db.courseCoverAsset.create.mockResolvedValue({
      id: 'cover-id',
      storageKey: 'courses/course-id/covers/private-key',
    });
    storage.createUploadUrl.mockResolvedValue({
      url: 'https://storage.example/signed-cover-upload',
      expiresAt: new Date('2026-08-27T01:00:00Z'),
    });

    const result = await service.initializeCoverUpload(teacher, 'version-id', {
      fileName: 'cover.webp',
      mimeType: 'image/webp',
      sizeBytes: 250_000,
    });

    expect(db.courseCoverAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        versionId: 'version-id',
        fileName: 'cover.webp',
        mimeType: 'image/webp',
        sizeBytes: 250_000,
        status: AssetStatus.PENDING,
      }),
    });
    expect(db.contentItem.create).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        assetId: 'cover-id',
        uploadUrl: 'https://storage.example/signed-cover-upload',
      }),
    );
  });

  it('reserves one private image upload for an owned Draft question', async () => {
    db.question.findUnique.mockResolvedValue({
      quiz: {
        version: {
          status: CourseVersionStatus.DRAFT,
          course: { teacherId: 'teacher-id' },
        },
      },
    });
    db.questionImageAsset.create.mockResolvedValue({
      id: 'question-image-id',
      storageKey: 'question-images/private-key',
    });
    storage.createUploadUrl.mockResolvedValue({
      url: 'https://storage.example/signed-question-image-upload',
      expiresAt: new Date('2026-08-27T01:00:00Z'),
    });

    const result = await service.initializeQuestionImageUpload(teacher, 'question-id', {
      fileName: 'diagram.png',
      mimeType: 'image/png',
      sizeBytes: 500_000,
    });

    expect(db.questionImageAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        questionId: 'question-id',
        fileName: 'diagram.png',
        mimeType: 'image/png',
        sizeBytes: 500_000,
        status: AssetStatus.PENDING,
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        assetId: 'question-image-id',
        uploadUrl: 'https://storage.example/signed-question-image-upload',
      }),
    );
  });

  it('marks a question image READY and returns JSON-safe metadata', async () => {
    db.questionImageAsset.findUnique.mockResolvedValue({
      id: 'question-image-id',
      storageKey: 'question-images/private-key',
      sizeBytes: 500_000n,
      mimeType: 'image/png',
      question: {
        quiz: {
          version: {
            status: CourseVersionStatus.DRAFT,
            course: { teacherId: 'teacher-id' },
          },
        },
      },
    });
    storage.headObject.mockResolvedValue({ sizeBytes: 500_000, mimeType: 'image/png' });
    db.questionImageAsset.update.mockResolvedValue({
      id: 'question-image-id',
      status: AssetStatus.READY,
      sizeBytes: 500_000n,
    });

    const result = await service.completeQuestionImageUpload(teacher, 'question-image-id');

    expect(result.sizeBytes).toBe(500_000);
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('rejects an individual file above 1 GiB', async () => {
    await expect(
      service.initializeUpload(teacher, 'version-id', {
        contentType: ContentType.VIDEO,
        fileName: 'huge.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1_073_741_825,
        position: 1,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an unsupported MIME type', async () => {
    await expect(
      service.initializeUpload(teacher, 'version-id', {
        contentType: ContentType.DOCUMENT,
        fileName: 'payload.exe',
        mimeType: 'application/x-msdownload',
        sizeBytes: 100,
        position: 1,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects a reservation that would exceed the Course 1 GiB total', async () => {
    db.courseVersion.findUnique.mockResolvedValue({
      courseId: 'course-id',
      status: CourseVersionStatus.DRAFT,
      course: { teacherId: 'teacher-id' },
    });
    db.mediaAsset.aggregate.mockResolvedValue({
      _sum: { sizeBytes: 1_073_741_000n },
    });

    await expect(
      service.initializeUpload(teacher, 'version-id', {
        contentType: ContentType.VIDEO,
        fileName: 'lesson.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1_000,
        position: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.contentItem.create).not.toHaveBeenCalled();
  });

  it('marks an upload READY only after object metadata is verified', async () => {
    db.mediaAsset.findUnique.mockResolvedValue({
      id: 'asset-id',
      storageKey: 'private/key',
      sizeBytes: 1_000n,
      mimeType: 'video/mp4',
      status: AssetStatus.PENDING,
      contentItem: {
        version: {
          status: CourseVersionStatus.DRAFT,
          course: { teacherId: 'teacher-id' },
        },
      },
    });
    storage.headObject.mockResolvedValue({ sizeBytes: 1_000, mimeType: 'video/mp4' });
    db.mediaAsset.update.mockResolvedValue({
      id: 'asset-id',
      status: AssetStatus.READY,
      sizeBytes: 1_000n,
    });

    const result = await service.completeUpload(teacher, 'asset-id');

    expect(db.mediaAsset.update).toHaveBeenCalledWith({
      where: { id: 'asset-id' },
      data: { status: AssetStatus.READY },
    });
    expect(result.sizeBytes).toBe(1_000);
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('returns a JSON-safe Course cover after completion', async () => {
    db.courseCoverAsset.findUnique.mockResolvedValue({
      id: 'cover-id',
      storageKey: 'course-covers/private-key',
      sizeBytes: 250_000n,
      mimeType: 'image/webp',
      status: AssetStatus.PENDING,
      version: {
        status: CourseVersionStatus.DRAFT,
        course: { teacherId: 'teacher-id' },
      },
    });
    storage.headObject.mockResolvedValue({ sizeBytes: 250_000, mimeType: 'image/webp' });
    db.courseCoverAsset.update.mockResolvedValue({
      id: 'cover-id',
      status: AssetStatus.READY,
      sizeBytes: 250_000n,
    });

    const result = await service.completeCoverUpload(teacher, 'cover-id');

    expect(result.sizeBytes).toBe(250_000);
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('allows an Approver to view a published Course cover', async () => {
    db.courseCoverAsset.findUnique.mockResolvedValue({
      id: 'cover-id',
      storageKey: 'course-covers/private-key',
      status: AssetStatus.READY,
      version: {
        status: CourseVersionStatus.PUBLISHED,
        course: { teacherId: 'teacher-id', allowedMajors: [] },
      },
    });
    storage.createViewUrl.mockResolvedValue({
      url: 'https://storage.example/signed-cover-view',
      expiresAt: new Date('2026-08-27T01:00:00Z'),
    });

    await expect(
      service.createCoverViewUrl(
        { id: 'approver-id', role: UserRole.APPROVER },
        'cover-id',
      ),
    ).resolves.toEqual(expect.objectContaining({ url: 'https://storage.example/signed-cover-view' }));
  });

  it('denies a view URL before Pre-Test completion', async () => {
    db.mediaAsset.findUnique.mockResolvedValue({
      id: 'asset-id',
      storageKey: 'private/key',
      status: AssetStatus.READY,
      contentItem: {
        version: {
          status: CourseVersionStatus.PUBLISHED,
          course: {
            allowedMajors: [{ majorId: 'major-it' }],
            enrollments: [{ studentId: 'student-id' }],
          },
          quizzes: [{ quizType: QuizType.PRE_TEST, attempts: [] }],
        },
      },
    });

    await expect(
      service.createStudentViewUrl(
        {
          id: 'student-id',
          role: UserRole.STUDENT,
          accountStatus: AccountStatus.ACTIVE,
          majorId: 'major-it',
        },
        'asset-id',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.createViewUrl).not.toHaveBeenCalled();
  });

  it('returns a private view URL after Pre-Test completion', async () => {
    db.mediaAsset.findUnique.mockResolvedValue({
      id: 'asset-id',
      storageKey: 'private/key',
      status: AssetStatus.READY,
      contentItem: {
        version: {
          status: CourseVersionStatus.PUBLISHED,
          course: {
            allowedMajors: [{ majorId: 'major-it' }],
            enrollments: [{ studentId: 'student-id' }],
          },
          quizzes: [
            {
              quizType: QuizType.PRE_TEST,
              attempts: [{ result: QuizResult.COMPLETED }],
            },
          ],
        },
      },
    });
    storage.createViewUrl.mockResolvedValue({
      url: 'https://storage.example/signed-view',
      expiresAt: new Date('2026-08-25T01:00:00Z'),
    });

    await expect(
      service.createStudentViewUrl(
        {
          id: 'student-id',
          role: UserRole.STUDENT,
          accountStatus: AccountStatus.ACTIVE,
          majorId: 'major-it',
        },
        'asset-id',
      ),
    ).resolves.toEqual(expect.objectContaining({ url: 'https://storage.example/signed-view' }));
  });

  it('deletes an owned Draft media object and its Content Item', async () => {
    db.mediaAsset.findUnique.mockResolvedValue({
      id: 'asset-id',
      storageKey: 'private/key',
      contentItemId: 'content-id',
      contentItem: {
        version: {
          status: CourseVersionStatus.DRAFT,
          course: { teacherId: 'teacher-id' },
        },
      },
    });
    storage.deleteObject.mockResolvedValue(undefined);
    db.contentItem.delete.mockResolvedValue({ id: 'content-id' });

    await service.deleteDraftAsset(teacher, 'asset-id');

    expect(storage.deleteObject).toHaveBeenCalledWith('private/key');
    expect(db.contentItem.delete).toHaveBeenCalledWith({ where: { id: 'content-id' } });
    expect(storage.deleteObject.mock.invocationCallOrder[0]).toBeLessThan(
      db.contentItem.delete.mock.invocationCallOrder[0],
    );
  });

  it('does not delete media from a published Version', async () => {
    db.mediaAsset.findUnique.mockResolvedValue({
      id: 'asset-id',
      storageKey: 'private/key',
      contentItemId: 'content-id',
      contentItem: {
        version: {
          status: CourseVersionStatus.PUBLISHED,
          course: { teacherId: 'teacher-id' },
        },
      },
    });

    await expect(service.deleteDraftAsset(teacher, 'asset-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });
});
