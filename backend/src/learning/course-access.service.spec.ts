import {
  ForbiddenException,
  NotFoundException,
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
import { CourseAccessService } from './course-access.service';

describe('CourseAccessService', () => {
  const db = {
    courseEnrollment: { upsert: jest.fn() },
    courseAccessEvent: { create: jest.fn() },
  };
  const prisma = {
    course: { findUnique: jest.fn(), findMany: jest.fn() },
    ...db,
    $transaction: jest.fn((operation: (tx: typeof db) => unknown) => operation(db)),
  };
  let service: CourseAccessService;

  const student = {
    id: 'student-id',
    role: UserRole.STUDENT,
    accountStatus: AccountStatus.ACTIVE,
    majorId: 'major-it',
  };
  const accessibleCourse = {
    id: 'course-id',
    archivedAt: null,
    eligibilityMode: 'LIMITED',
    allowedMajors: [{ majorId: 'major-it' }],
    versions: [
      {
        id: 'published-version',
        status: CourseVersionStatus.PUBLISHED,
        quizzes: [
          {
            id: 'pre-test-id',
            quizType: QuizType.PRE_TEST,
            attempts: [],
          },
          {
            id: 'post-test-id',
            quizType: QuizType.POST_TEST,
            attempts: [],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((operation) => operation(db));
    service = new CourseAccessService(prisma as never);
  });

  it('enrolls an eligible Student once and records every Course entry', async () => {
    prisma.course.findUnique.mockResolvedValue(accessibleCourse);
    db.courseEnrollment.upsert.mockResolvedValue({ id: 'enrollment-id' });
    db.courseAccessEvent.create.mockResolvedValue({ id: 'event-id' });

    const result = await service.enterCourse(student, 'course-id');

    expect(db.courseEnrollment.upsert).toHaveBeenCalledWith({
      where: {
        courseId_studentId: {
          courseId: 'course-id',
          studentId: 'student-id',
        },
      },
      create: { courseId: 'course-id', studentId: 'student-id' },
      update: {},
    });
    expect(db.courseAccessEvent.create).toHaveBeenCalledWith({
      data: { courseId: 'course-id', studentId: 'student-id' },
    });
    expect(result).toEqual({
      versionId: 'published-version',
      preTestId: 'pre-test-id',
      postTestId: 'post-test-id',
      contentUnlocked: false,
    });
  });

  it('returns unlocked after the Student completes the Pre-Test', async () => {
    prisma.course.findUnique.mockResolvedValue({
      ...accessibleCourse,
      versions: [
        {
          ...accessibleCourse.versions[0],
          quizzes: [
            {
              id: 'pre-test-id',
              quizType: QuizType.PRE_TEST,
              attempts: [{ result: QuizResult.COMPLETED }],
            },
            {
              id: 'post-test-id',
              quizType: QuizType.POST_TEST,
              attempts: [],
            },
          ],
        },
      ],
    });
    db.courseEnrollment.upsert.mockResolvedValue({ id: 'enrollment-id' });
    db.courseAccessEvent.create.mockResolvedValue({ id: 'event-id' });

    await expect(service.enterCourse(student, 'course-id')).resolves.toEqual({
      versionId: 'published-version',
      preTestId: 'pre-test-id',
      postTestId: 'post-test-id',
      contentUnlocked: true,
    });
  });

  it('denies a Student whose Major is not eligible', async () => {
    prisma.course.findUnique.mockResolvedValue(accessibleCourse);

    await expect(
      service.enterCourse({ ...student, majorId: 'major-business' }, 'course-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.courseEnrollment.upsert).not.toHaveBeenCalled();
    expect(db.courseAccessEvent.create).not.toHaveBeenCalled();
  });

  it('allows a Student into an OPEN Course without a matching Major', async () => {
    prisma.course.findUnique.mockResolvedValue({
      ...accessibleCourse,
      eligibilityMode: 'OPEN',
      allowedMajors: [],
    });
    db.courseEnrollment.upsert.mockResolvedValue({ id: 'enrollment-id' });
    db.courseAccessEvent.create.mockResolvedValue({ id: 'event-id' });

    await expect(
      service.enterCourse({ ...student, majorId: 'major-business' }, 'course-id'),
    ).resolves.toEqual(expect.objectContaining({ versionId: 'published-version' }));
  });

  it('denies an inactive Student', async () => {
    await expect(
      service.enterCourse({ ...student, accountStatus: AccountStatus.INACTIVE }, 'course-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.course.findUnique).not.toHaveBeenCalled();
  });

  it('denies a non-Student', async () => {
    await expect(
      service.enterCourse({ ...student, role: UserRole.TEACHER }, 'course-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not expose an unpublished Course', async () => {
    prisma.course.findUnique.mockResolvedValue({
      ...accessibleCourse,
      versions: [],
    });

    await expect(service.enterCourse(student, 'course-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('does not expose an archived Course', async () => {
    prisma.course.findUnique.mockResolvedValue({
      ...accessibleCourse,
      archivedAt: new Date(),
    });

    await expect(service.enterCourse(student, 'course-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('getPublishedContent', () => {
    const readableCourse = {
      id: 'course-id',
      archivedAt: null,
      allowedMajors: [{ majorId: 'major-it' }],
      enrollments: [{ id: 'enrollment-id' }],
      versions: [
        {
          id: 'published-version',
          title: 'Network Fundamentals',
          description: 'Course description',
          quizzes: [{ attempts: [{ id: 'pre-attempt' }] }],
          contentItems: [
            {
              id: 'text-id',
              contentType: ContentType.TEXT,
              title: 'Introduction',
              textBody: 'Welcome',
              position: 1,
              mediaAsset: null,
            },
            {
              id: 'video-id',
              contentType: ContentType.VIDEO,
              title: 'Lesson video',
              textBody: null,
              position: 2,
              mediaAsset: {
                id: 'asset-id',
                fileName: 'lesson.mp4',
                mimeType: 'video/mp4',
                sizeBytes: 42n,
                status: AssetStatus.READY,
              },
            },
          ],
        },
      ],
    };

    it('returns ordered published content after Pre-Test completion without storage keys', async () => {
      prisma.course.findUnique.mockResolvedValue(readableCourse);

      await expect(service.getPublishedContent(student, 'course-id')).resolves.toEqual({
        versionId: 'published-version',
        title: 'Network Fundamentals',
        description: 'Course description',
        contentItems: [
          {
            id: 'text-id',
            contentType: ContentType.TEXT,
            title: 'Introduction',
            textBody: 'Welcome',
            position: 1,
            media: null,
          },
          {
            id: 'video-id',
            contentType: ContentType.VIDEO,
            title: 'Lesson video',
            textBody: null,
            position: 2,
            media: {
              assetId: 'asset-id',
              fileName: 'lesson.mp4',
              mimeType: 'video/mp4',
              sizeBytes: 42,
            },
          },
        ],
      });
      expect(prisma.course.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'course-id' },
          select: expect.objectContaining({
            versions: expect.objectContaining({
              where: { status: CourseVersionStatus.PUBLISHED },
            }),
          }),
        }),
      );
    });

    it('denies content before Pre-Test completion', async () => {
      prisma.course.findUnique.mockResolvedValue({
        ...readableCourse,
        versions: [
          {
            ...readableCourse.versions[0],
            quizzes: [{ attempts: [] }],
          },
        ],
      });

      await expect(service.getPublishedContent(student, 'course-id')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('does not expose non-ready media metadata', async () => {
      prisma.course.findUnique.mockResolvedValue({
        ...readableCourse,
        versions: [
          {
            ...readableCourse.versions[0],
            contentItems: [
              {
                ...readableCourse.versions[0].contentItems[1],
                mediaAsset: {
                  ...readableCourse.versions[0].contentItems[1].mediaAsset,
                  status: AssetStatus.PENDING,
                },
              },
            ],
          },
        ],
      });

      const result = await service.getPublishedContent(student, 'course-id');
      expect(result.contentItems[0].media).toBeNull();
    });
  });

  describe('listEligibleCourses', () => {
    it('lists only published Courses for the Student current Major', async () => {
      prisma.course.findMany.mockResolvedValue([
        {
          id: 'course-id',
          eligibilityMode: 'LIMITED',
          versions: [
            {
              id: 'version-id',
              title: 'Network Fundamentals',
              description: 'Introduction',
              publishedAt: new Date('2026-08-25T00:00:00.000Z'),
              coverAsset: { id: 'cover-id', status: AssetStatus.READY },
              quizzes: [
                { quizType: QuizType.PRE_TEST, attempts: [{ result: QuizResult.COMPLETED }] },
                { quizType: QuizType.POST_TEST, attempts: [{ result: QuizResult.PASS }] },
              ],
            },
          ],
          enrollments: [{ studentId: 'student-id' }],
          categories: [{ category: { id: 'category-id', slug: 'technology', name: 'Technology' } }],
          _count: { enrollments: 25 },
        },
      ]);

      await expect(service.listEligibleCourses(student)).resolves.toEqual([
        {
          courseId: 'course-id',
          eligibilityMode: 'LIMITED',
          versionId: 'version-id',
          title: 'Network Fundamentals',
          description: 'Introduction',
          publishedAt: new Date('2026-08-25T00:00:00.000Z'),
          coverAssetId: 'cover-id',
          enrollments: 25,
          enrolled: true,
          progress: 100,
          categories: [{ id: 'category-id', slug: 'technology', name: 'Technology' }],
        },
      ]);
      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            archivedAt: null,
            OR: [
              { eligibilityMode: 'OPEN' },
              {
                eligibilityMode: 'LIMITED',
                allowedMajors: { some: { majorId: 'major-it' } },
              },
            ],
            versions: { some: { status: CourseVersionStatus.PUBLISHED } },
          },
        }),
      );
    });

    it('filters the eligible catalog by category', async () => {
      prisma.course.findMany.mockResolvedValue([]);

      await service.listEligibleCourses(student, 'category-id');

      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: { some: { categoryId: 'category-id' } },
          }),
        }),
      );
    });

    it('requires an active Student with a Major before querying the catalog', async () => {
      await expect(
        service.listEligibleCourses({ ...student, majorId: null }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(prisma.course.findMany).not.toHaveBeenCalled();
    });
  });
});
