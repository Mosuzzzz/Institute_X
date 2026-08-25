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
    courseVersion: { findUnique: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
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
  let service: CourseVersionsService;

  const validDraft = {
    id: 'version-id',
    courseId: 'course-id',
    status: CourseVersionStatus.DRAFT,
    course: { teacherId: 'teacher-id', allowedMajors: [{ majorId: 'major-id' }] },
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
    service = new CourseVersionsService(prisma as never);
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

  it('rejects an optional Post-Test that has no valid questions', async () => {
    db.courseVersion.findUnique.mockResolvedValue({
      ...validDraft,
      quizzes: [
        ...validDraft.quizzes,
        { quizType: QuizType.POST_TEST, questions: [] },
      ],
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

  it('approves and atomically publishes a submitted Version', async () => {
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

    expect(db.courseVersion.updateMany).toHaveBeenCalledWith({
      where: {
        courseId: 'course-id',
        status: CourseVersionStatus.PUBLISHED,
      },
      data: { status: CourseVersionStatus.SUPERSEDED },
    });
    expect(db.courseVersion.updateMany).toHaveBeenCalledWith({
      where: { id: 'version-id', status: CourseVersionStatus.SUBMITTED },
      data: expect.objectContaining({ status: CourseVersionStatus.PUBLISHED }),
    });
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

      await service.reopenRejected(
        { id: 'teacher-id', role: UserRole.TEACHER },
        'version-id',
      );

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
          quizzes: { include: { questions: { include: { options: true } } } },
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
