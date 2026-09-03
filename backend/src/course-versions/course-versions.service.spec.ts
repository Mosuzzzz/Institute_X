import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AssetStatus,
  ContentType,
  CourseVersionStatus,
  QuizType,
  ReviewDecision,
  UserRole,
} from '@prisma/client';
import { CourseVersionsService } from './course-versions.service';

describe('CourseVersionsService', () => {
  const db = {
    courseVersion: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    course: { deleteMany: jest.fn() },
    courseVersionReview: {
      aggregate: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const prisma = {
    ...db,
    $transaction: jest.fn((operation: (tx: typeof db) => unknown) => operation(db)),
  };
  const storage = { deleteObject: jest.fn() };
  let service: CourseVersionsService;

  const validDraft = {
    id: 'version-id',
    courseId: 'course-id',
    title: 'Network Fundamentals',
    languageCode: 'en',
    status: CourseVersionStatus.DRAFT,
    course: {
      teacherId: 'teacher-id',
      eligibilityMode: 'LIMITED',
      allowedMajors: [{ majorId: 'major-id' }],
      categories: [{ categoryId: 'category-id' }],
    },
    contentItems: [{ id: 'content-id', contentType: ContentType.TEXT, mediaAsset: null }],
    quizzes: [
      {
        quizType: QuizType.PRE_TEST,
        questions: [
          {
            options: [{ isCorrect: true }, { isCorrect: false }],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((operation) => operation(db));
    service = new CourseVersionsService(prisma as never, storage as never);
  });

  it('submits a complete owned Draft and creates review history', async () => {
    db.courseVersion.findUnique.mockResolvedValue(validDraft);
    db.courseVersionReview.aggregate.mockResolvedValue({
      _max: { submissionNumber: null },
    });
    db.courseVersion.updateMany.mockResolvedValue({ count: 1 });
    db.courseVersionReview.create.mockResolvedValue({ id: 'review-id' });

    await service.submit({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id');

    expect(db.courseVersion.updateMany).toHaveBeenCalledWith({
      where: { id: 'version-id', status: CourseVersionStatus.DRAFT },
      data: expect.objectContaining({ status: CourseVersionStatus.SUBMITTED }),
    });
    expect(db.courseVersionReview.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        versionId: 'version-id',
        submissionNumber: 1,
      }),
    });
  });

  it('rejects submission without a Pre-Test', async () => {
    db.courseVersion.findUnique.mockResolvedValue({ ...validDraft, quizzes: [] });

    await expect(
      service.submit({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects a question without exactly one correct option', async () => {
    db.courseVersion.findUnique.mockResolvedValue({
      ...validDraft,
      quizzes: [
        {
          quizType: QuizType.PRE_TEST,
          questions: [{ options: [{ isCorrect: false }, { isCorrect: false }] }],
        },
      ],
    });

    await expect(
      service.submit({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects submission while a media asset is not READY', async () => {
    db.courseVersion.findUnique.mockResolvedValue({
      ...validDraft,
      contentItems: [
        {
          id: 'video-content',
          contentType: ContentType.VIDEO,
          mediaAsset: { status: AssetStatus.PENDING },
        },
      ],
    });

    await expect(
      service.submit({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(db.courseVersion.updateMany).not.toHaveBeenCalled();
  });

  it('rejects submission while a question image is not READY', async () => {
    db.courseVersion.findUnique.mockResolvedValue({
      ...validDraft,
      quizzes: [
        {
          quizType: QuizType.PRE_TEST,
          questions: [
            {
              imageAsset: { status: AssetStatus.PENDING },
              options: [{ isCorrect: true }, { isCorrect: false }],
            },
          ],
        },
      ],
    });

    await expect(
      service.submit({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(db.courseVersion.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an optional Post-Test that has no valid questions', async () => {
    db.courseVersion.findUnique.mockResolvedValue({
      ...validDraft,
      quizzes: [...validDraft.quizzes, { quizType: QuizType.POST_TEST, questions: [] }],
    });

    await expect(
      service.submit({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('denies submission by a different Teacher', async () => {
    db.courseVersion.findUnique.mockResolvedValue(validDraft);

    await expect(
      service.submit({ id: 'other-id', role: UserRole.TEACHER }, 'version-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('publishes an approved submitted Version and supersedes the live Version atomically', async () => {
    db.courseVersion.findUnique.mockResolvedValue({
      id: 'version-id',
      courseId: 'course-id',
      status: CourseVersionStatus.SUBMITTED,
    });
    db.courseVersion.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    db.courseVersionReview.updateMany.mockResolvedValue({ count: 1 });

    await service.review(
      { id: 'approver-id', role: UserRole.APPROVER },
      'version-id',
      ReviewDecision.APPROVED,
    );

    expect(db.courseVersion.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        courseId: 'course-id',
        id: { not: 'version-id' },
        status: CourseVersionStatus.PUBLISHED,
      },
      data: { status: CourseVersionStatus.SUPERSEDED },
    });
    expect(db.courseVersion.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'version-id', status: CourseVersionStatus.SUBMITTED },
      data: {
        status: CourseVersionStatus.PUBLISHED,
        publishedAt: expect.any(Date),
      },
    });
  });

  it('rejects submission when title or Category is missing', async () => {
    db.courseVersion.findUnique.mockResolvedValue({
      ...validDraft,
      title: ' ',
      course: { ...validDraft.course, categories: [] },
    });

    await expect(
      service.submit({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(db.courseVersion.updateMany).not.toHaveBeenCalled();
  });

  it('requires a comment when rejecting', async () => {
    await expect(
      service.review(
        { id: 'approver-id', role: UserRole.APPROVER },
        'version-id',
        ReviewDecision.REJECTED,
        ' ',
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('denies review by a non-Approver', async () => {
    await expect(
      service.review(
        { id: 'teacher-id', role: UserRole.TEACHER },
        'version-id',
        ReviewDecision.APPROVED,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects review when the Version is not submitted', async () => {
    db.courseVersion.findUnique.mockResolvedValue({
      id: 'version-id',
      status: CourseVersionStatus.DRAFT,
    });

    await expect(
      service.review(
        { id: 'approver-id', role: UserRole.APPROVER },
        'version-id',
        ReviewDecision.APPROVED,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  describe('reopenRejected', () => {
    it('reopens an owned rejected Version as a Draft while retaining review history', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'version-id',
        status: CourseVersionStatus.REJECTED,
        course: { teacherId: 'teacher-id' },
      });
      db.courseVersion.updateMany.mockResolvedValue({ count: 1 });

      await service.reopenRejected({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id');

      expect(db.courseVersion.updateMany).toHaveBeenCalledWith({
        where: { id: 'version-id', status: CourseVersionStatus.REJECTED },
        data: { status: CourseVersionStatus.DRAFT, submittedAt: null },
      });
      expect(db.courseVersionReview.updateMany).not.toHaveBeenCalled();
    });

    it('denies reopening another Teacher Version', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'version-id',
        status: CourseVersionStatus.REJECTED,
        course: { teacherId: 'owner-id' },
      });

      await expect(
        service.reopenRejected({ id: 'other-id', role: UserRole.TEACHER }, 'version-id'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('does not reopen a published Version', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'version-id',
        status: CourseVersionStatus.PUBLISHED,
        course: { teacherId: 'teacher-id' },
      });

      await expect(
        service.reopenRejected({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('discardDraft', () => {
    it('deletes an owned Draft revision and its copied storage objects', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'draft-id',
        courseId: 'course-id',
        status: CourseVersionStatus.DRAFT,
        course: { id: 'course-id', teacherId: 'teacher-id', _count: { versions: 2 } },
        coverAsset: { storageKey: 'course-covers/copied' },
        contentItems: [{ mediaAsset: { storageKey: 'courses/copied' } }],
        quizzes: [{ questions: [{ imageAsset: { storageKey: 'question-images/copied' } }] }],
      });
      db.courseVersion.deleteMany.mockResolvedValue({ count: 1 });

      await service.discardDraft({ id: 'teacher-id', role: UserRole.TEACHER }, 'draft-id');

      expect(db.courseVersion.deleteMany).toHaveBeenCalledWith({
        where: { id: 'draft-id', status: CourseVersionStatus.DRAFT },
      });
      expect(storage.deleteObject).toHaveBeenCalledTimes(3);
      expect(db.course.deleteMany).not.toHaveBeenCalled();
    });

    it('removes the empty Course when discarding its only unreleased Draft', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'draft-id',
        courseId: 'course-id',
        status: CourseVersionStatus.DRAFT,
        course: { id: 'course-id', teacherId: 'teacher-id', _count: { versions: 1 } },
        coverAsset: null,
        contentItems: [],
        quizzes: [],
      });
      db.courseVersion.deleteMany.mockResolvedValue({ count: 1 });
      db.course.deleteMany.mockResolvedValue({ count: 1 });

      await service.discardDraft({ id: 'teacher-id', role: UserRole.TEACHER }, 'draft-id');

      expect(db.course.deleteMany).toHaveBeenCalledWith({
        where: { id: 'course-id', versions: { none: {} } },
      });
    });

    it('does not discard a submitted Version', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'version-id',
        status: CourseVersionStatus.SUBMITTED,
        course: { id: 'course-id', teacherId: 'teacher-id', _count: { versions: 1 } },
        coverAsset: null,
        contentItems: [],
        quizzes: [],
      });

      await expect(
        service.discardDraft({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('unpublish', () => {
    it('allows the owning Teacher to unpublish a published Version', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'version-id',
        status: CourseVersionStatus.PUBLISHED,
        course: { teacherId: 'teacher-id' },
      });
      db.courseVersion.updateMany.mockResolvedValue({ count: 1 });

      await service.unpublish({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id');

      expect(db.courseVersion.updateMany).toHaveBeenCalledWith({
        where: { id: 'version-id', status: CourseVersionStatus.PUBLISHED },
        data: { status: 'UNPUBLISHED' },
      });
    });

    it('allows an Owner to unpublish any published Version', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'version-id',
        status: CourseVersionStatus.PUBLISHED,
        course: { teacherId: 'teacher-id' },
      });
      db.courseVersion.updateMany.mockResolvedValue({ count: 1 });

      await service.unpublish({ id: 'owner-id', role: UserRole.OWNER }, 'version-id');

      expect(db.courseVersion.updateMany).toHaveBeenCalledWith({
        where: { id: 'version-id', status: CourseVersionStatus.PUBLISHED },
        data: { status: CourseVersionStatus.UNPUBLISHED },
      });
    });

    it('denies unpublishing another Teacher Version', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'version-id',
        status: CourseVersionStatus.PUBLISHED,
        course: { teacherId: 'owner-id' },
      });

      await expect(
        service.unpublish({ id: 'other-id', role: UserRole.TEACHER }, 'version-id'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.courseVersion.updateMany).not.toHaveBeenCalled();
    });

    it('does not unpublish a Draft Version', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'version-id',
        status: CourseVersionStatus.DRAFT,
        course: { teacherId: 'teacher-id' },
      });

      await expect(
        service.unpublish({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('republish', () => {
    it('does not manually publish an approved Version because approval auto-publishes', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'approved-version-id',
        courseId: 'course-id',
        status: 'APPROVED',
        course: { teacherId: 'teacher-id' },
      });
      await expect(
        service.republish({ id: 'teacher-id', role: UserRole.TEACHER }, 'approved-version-id'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(db.courseVersion.updateMany).not.toHaveBeenCalled();
    });

    it('allows the owning Teacher to publish an unpublished Version again', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'version-id',
        courseId: 'course-id',
        status: CourseVersionStatus.UNPUBLISHED,
        course: { teacherId: 'teacher-id' },
      });
      db.courseVersion.findFirst.mockResolvedValue(null);
      db.courseVersion.updateMany.mockResolvedValue({ count: 1 });

      await service.republish({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id');

      expect(db.courseVersion.updateMany).toHaveBeenCalledWith({
        where: { id: 'version-id', status: CourseVersionStatus.UNPUBLISHED },
        data: {
          status: CourseVersionStatus.PUBLISHED,
          publishedAt: expect.any(Date),
        },
      });
    });

    it('allows an Owner to republish an unpublished Version', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'version-id',
        courseId: 'course-id',
        status: CourseVersionStatus.UNPUBLISHED,
        course: { teacherId: 'teacher-id' },
      });
      db.courseVersion.findFirst.mockResolvedValue(null);
      db.courseVersion.updateMany.mockResolvedValue({ count: 1 });

      await service.republish({ id: 'owner-id', role: UserRole.OWNER }, 'version-id');

      expect(db.courseVersion.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'version-id', status: CourseVersionStatus.UNPUBLISHED },
        }),
      );
    });

    it('does not replace a newer published Version', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'old-version-id',
        courseId: 'course-id',
        status: CourseVersionStatus.UNPUBLISHED,
        course: { teacherId: 'teacher-id' },
      });
      db.courseVersion.findFirst.mockResolvedValue({ id: 'new-version-id' });

      await expect(
        service.republish({ id: 'teacher-id', role: UserRole.TEACHER }, 'old-version-id'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(db.courseVersion.updateMany).not.toHaveBeenCalled();
    });

    it('denies publishing another Teacher Version', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'version-id',
        courseId: 'course-id',
        status: CourseVersionStatus.UNPUBLISHED,
        course: { teacherId: 'owner-id' },
      });

      await expect(
        service.republish({ id: 'other-id', role: UserRole.TEACHER }, 'version-id'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('listSubmitted', () => {
    it('returns the oldest submitted Versions to an Approver', async () => {
      db.courseVersion.findMany.mockResolvedValue([{ id: 'version-id' }]);

      await expect(
        service.listSubmitted({ id: 'approver-id', role: UserRole.APPROVER }),
      ).resolves.toEqual([{ id: 'version-id' }]);
      expect(db.courseVersion.findMany).toHaveBeenCalledWith({
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
    });

    it('denies the submitted queue to Teachers', async () => {
      await expect(
        service.listSubmitted({ id: 'teacher-id', role: UserRole.TEACHER }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.courseVersion.findMany).not.toHaveBeenCalled();
    });
  });
});
