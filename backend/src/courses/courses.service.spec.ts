import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CourseVersionStatus, TeacherPermissionStatus, UserRole } from '@prisma/client';
import { CoursesService } from './courses.service';

describe('CoursesService', () => {
  const db = {
    teacherPermissionRequest: { findFirst: jest.fn() },
    major: { count: jest.fn() },
    category: { count: jest.fn() },
    course: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    courseCategory: { createMany: jest.fn(), deleteMany: jest.fn() },
    courseSection: { create: jest.fn() },
    contentItem: { updateMany: jest.fn() },
    courseVersion: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const storage = {
    copyObject: jest.fn(),
    deleteObject: jest.fn(),
  };
  const prisma = {
    ...db,
    $transaction: jest.fn((operation: (tx: typeof db) => unknown) => operation(db)),
  };
  let service: CoursesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CoursesService(prisma as never, storage as never);
  });

  describe('getOwnedDetail', () => {
    it('treats an archived Course as deleted', async () => {
      db.course.findUnique.mockResolvedValue({
        id: 'course-id',
        teacherId: 'teacher-id',
        archivedAt: new Date('2026-08-27T00:00:00Z'),
        allowedMajors: [],
        categories: [],
        versions: [],
      });

      await expect(
        service.getOwnedDetail({ id: 'teacher-id', role: UserRole.TEACHER }, 'course-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('selects JSON-safe media fields without BigInt sizeBytes', async () => {
      db.course.findUnique.mockResolvedValue({
        id: 'course-id',
        teacherId: 'teacher-id',
        eligibilityMode: 'OPEN',
        allowedMajors: [],
        categories: [],
        versions: [
          {
            title: 'Course title',
            description: 'Course description',
            languageCode: 'en',
            contentItems: [],
            coverAsset: null,
            quizzes: [],
          },
        ],
      });

      await service.getOwnedDetail({ id: 'teacher-id', role: UserRole.TEACHER }, 'course-id');

      expect(db.course.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            versions: expect.objectContaining({
              include: expect.objectContaining({
                coverAsset: {
                  select: expect.not.objectContaining({ sizeBytes: true }),
                },
                contentItems: expect.objectContaining({
                  include: {
                    mediaAsset: {
                      select: expect.not.objectContaining({ sizeBytes: true }),
                    },
                  },
                }),
              }),
            }),
          }),
        }),
      );
    });

    it('reports a complete mandatory checklist without requiring an optional Post-Test', async () => {
      db.course.findUnique.mockResolvedValue({
        id: 'course-id',
        teacherId: 'teacher-id',
        archivedAt: null,
        eligibilityMode: 'OPEN',
        allowedMajors: [],
        categories: [{ category: { id: 'category-id' } }],
        versions: [
          {
            title: 'Course title',
            description: null,
            languageCode: 'en',
            contentItems: [
              {
                contentType: 'VIDEO',
                mediaAsset: { status: 'READY' },
              },
            ],
            coverAsset: null,
            quizzes: [
              {
                quizType: 'PRE_TEST',
                questions: [
                  {
                    imageAsset: null,
                    options: [{ isCorrect: true }, { isCorrect: false }],
                  },
                ],
              },
            ],
          },
        ],
      });

      await expect(
        service.getOwnedDetail({ id: 'teacher-id', role: UserRole.TEACHER }, 'course-id'),
      ).resolves.toEqual(
        expect.objectContaining({
          readiness: 100,
          checks: {
            details: true,
            categories: true,
            eligibility: true,
            content: true,
            media: true,
            preTest: true,
            assessments: true,
          },
        }),
      );
    });

    it('marks the media checklist incomplete while any uploaded asset is not READY', async () => {
      db.course.findUnique.mockResolvedValue({
        id: 'course-id',
        teacherId: 'teacher-id',
        archivedAt: null,
        eligibilityMode: 'OPEN',
        allowedMajors: [],
        categories: [{ category: { id: 'category-id' } }],
        versions: [
          {
            title: 'Course title',
            languageCode: 'en',
            contentItems: [{ contentType: 'TEXT', mediaAsset: null }],
            coverAsset: { status: 'PENDING' },
            quizzes: [
              {
                quizType: 'PRE_TEST',
                questions: [
                  {
                    imageAsset: null,
                    options: [{ isCorrect: true }, { isCorrect: false }],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = await service.getOwnedDetail(
        { id: 'teacher-id', role: UserRole.TEACHER },
        'course-id',
      );

      expect(result.checks.media).toBe(false);
      expect(result.readiness).toBeLessThan(100);
    });
  });

  describe('createCourse', () => {
    const input = {
      title: 'Network Fundamentals',
      description: 'Introduction to networking',
      languageCode: 'en',
      eligibilityMode: 'LIMITED' as const,
      majorIds: ['major-it', 'major-electronics'],
      categoryIds: ['category-technology'],
    };

    it('atomically creates a Course with eligible Majors and Version 1 Draft', async () => {
      db.teacherPermissionRequest.findFirst.mockResolvedValue({
        status: TeacherPermissionStatus.APPROVED,
      });
      db.major.count.mockResolvedValue(2);
      db.category.count.mockResolvedValue(1);
      db.course.create.mockResolvedValue({
        id: 'course-id',
        versions: [{ id: 'version-id', versionNumber: 1 }],
      });

      const result = await service.createCourse(
        { id: 'teacher-id', role: UserRole.TEACHER },
        input,
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(db.course.create).toHaveBeenCalledWith({
        data: {
          teacherId: 'teacher-id',
          eligibilityMode: 'LIMITED',
          allowedMajors: {
            create: [{ majorId: 'major-it' }, { majorId: 'major-electronics' }],
          },
          categories: {
            create: [{ categoryId: 'category-technology' }],
          },
          versions: {
            create: {
              versionNumber: 1,
              title: input.title,
              description: input.description,
              languageCode: 'en',
              status: CourseVersionStatus.DRAFT,
            },
          },
        },
        include: { allowedMajors: true, categories: true, versions: true },
      });
      expect(result).toEqual(expect.objectContaining({ id: 'course-id' }));
    });

    it('creates an OPEN Course without requiring eligible Majors', async () => {
      db.teacherPermissionRequest.findFirst.mockResolvedValue({
        status: TeacherPermissionStatus.APPROVED,
      });
      db.category.count.mockResolvedValue(1);
      db.course.create.mockResolvedValue({ id: 'course-id', allowedMajors: [] });

      await service.createCourse(
        { id: 'teacher-id', role: UserRole.TEACHER },
        { ...input, eligibilityMode: 'OPEN', majorIds: [] },
      );

      expect(db.major.count).not.toHaveBeenCalled();
      expect(db.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eligibilityMode: 'OPEN',
            allowedMajors: { create: [] },
          }),
        }),
      );
    });

    it('denies a Teacher without effective approved permission', async () => {
      db.teacherPermissionRequest.findFirst.mockResolvedValue({
        status: TeacherPermissionStatus.REVOKED,
      });

      await expect(
        service.createCourse({ id: 'teacher-id', role: UserRole.TEACHER }, input),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.course.create).not.toHaveBeenCalled();
    });

    it('denies non-Teachers', async () => {
      await expect(
        service.createCourse({ id: 'owner-id', role: UserRole.OWNER }, input),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('requires at least one eligible Major', async () => {
      await expect(
        service.createCourse(
          { id: 'teacher-id', role: UserRole.TEACHER },
          { ...input, majorIds: [] },
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects duplicate eligible Majors', async () => {
      await expect(
        service.createCourse(
          { id: 'teacher-id', role: UserRole.TEACHER },
          { ...input, majorIds: ['major-it', 'major-it'] },
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects unknown Majors', async () => {
      db.teacherPermissionRequest.findFirst.mockResolvedValue({
        status: TeacherPermissionStatus.APPROVED,
      });
      db.major.count.mockResolvedValue(1);

      await expect(
        service.createCourse({ id: 'teacher-id', role: UserRole.TEACHER }, input),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('requires at least one category', async () => {
      await expect(
        service.createCourse(
          { id: 'teacher-id', role: UserRole.TEACHER },
          { ...input, categoryIds: [] },
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects unknown categories', async () => {
      db.teacherPermissionRequest.findFirst.mockResolvedValue({
        status: TeacherPermissionStatus.APPROVED,
      });
      db.major.count.mockResolvedValue(2);
      db.category.count.mockResolvedValue(0);

      await expect(
        service.createCourse({ id: 'teacher-id', role: UserRole.TEACHER }, input),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });

  describe('updateDraft', () => {
    it('rejects an empty update', async () => {
      await expect(
        service.updateDraft({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id', {}),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(db.courseVersion.findUnique).not.toHaveBeenCalled();
    });

    it('allows the owning Teacher to edit Draft metadata', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'version-id',
        status: CourseVersionStatus.DRAFT,
        course: { teacherId: 'teacher-id' },
      });
      db.courseVersion.update.mockResolvedValue({
        id: 'version-id',
        title: 'Updated title',
      });

      await service.updateDraft({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id', {
        title: 'Updated title',
        languageCode: 'ja',
      });

      expect(db.courseVersion.update).toHaveBeenCalledWith({
        where: { id: 'version-id' },
        data: { title: 'Updated title', languageCode: 'ja' },
      });
    });

    it('denies another Teacher', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'version-id',
        status: CourseVersionStatus.DRAFT,
        course: { teacherId: 'owner-id' },
      });

      await expect(
        service.updateDraft({ id: 'other-id', role: UserRole.TEACHER }, 'version-id', {
          title: 'Hijacked',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects changes after the Version leaves Draft', async () => {
      db.courseVersion.findUnique.mockResolvedValue({
        id: 'version-id',
        status: CourseVersionStatus.SUBMITTED,
        course: { teacherId: 'teacher-id' },
      });

      await expect(
        service.updateDraft({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id', {
          title: 'Too late',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('returns not found for an unknown Version', async () => {
      db.courseVersion.findUnique.mockResolvedValue(null);

      await expect(
        service.updateDraft({ id: 'teacher-id', role: UserRole.TEACHER }, 'missing', {
          title: 'Missing',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createRevision', () => {
    it('copies the old content, assessments, cover, and question images into the Draft', async () => {
      db.course.findUnique.mockResolvedValue({
        teacherId: 'teacher-id',
        versions: [
          {
            versionNumber: 1,
            title: 'Published title',
            description: 'Published description',
            languageCode: 'th',
            status: CourseVersionStatus.PUBLISHED,
            coverAsset: {
              fileName: 'cover.webp',
              mimeType: 'image/webp',
              storageKey: 'course-covers/old-cover',
              sizeBytes: 100n,
              status: 'READY',
            },
            contentItems: [
              {
                contentType: 'VIDEO',
                title: 'Lesson',
                textBody: null,
                position: 1,
                mediaAsset: {
                  fileName: 'lesson.mp4',
                  mimeType: 'video/mp4',
                  storageKey: 'courses/old-video',
                  sizeBytes: 200n,
                  status: 'READY',
                },
              },
            ],
            quizzes: [
              {
                quizType: 'PRE_TEST',
                title: 'Pre-test',
                durationSeconds: 600,
                randomizeQuestions: true,
                randomizeOptions: true,
                questions: [
                  {
                    questionText: 'Question?',
                    questionType: 'MULTIPLE_CHOICE',
                    points: 1,
                    position: 1,
                    imageAsset: {
                      fileName: 'question.webp',
                      mimeType: 'image/webp',
                      storageKey: 'question-images/old-image',
                      sizeBytes: 50n,
                      status: 'READY',
                    },
                    options: [
                      { optionText: 'Yes', isCorrect: true, position: 1 },
                      { optionText: 'No', isCorrect: false, position: 2 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
      db.courseVersion.create.mockResolvedValue({ id: 'draft-id' });

      await service.createRevision({ id: 'teacher-id', role: UserRole.TEACHER }, 'course-id');

      expect(storage.copyObject).toHaveBeenCalledTimes(3);
      expect(storage.copyObject).toHaveBeenCalledWith(
        'course-covers/old-cover',
        expect.stringMatching(/^course-covers\//),
      );
      expect(db.courseVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          coverAsset: { create: expect.objectContaining({ fileName: 'cover.webp' }) },
          contentItems: {
            create: [
              expect.objectContaining({
                title: 'Lesson',
                mediaAsset: { create: expect.objectContaining({ fileName: 'lesson.mp4' }) },
              }),
            ],
          },
          quizzes: {
            create: [
              expect.objectContaining({
                quizType: 'PRE_TEST',
                questions: {
                  create: [
                    expect.objectContaining({
                      questionText: 'Question?',
                      imageAsset: {
                        create: expect.objectContaining({ fileName: 'question.webp' }),
                      },
                      options: {
                        create: expect.arrayContaining([
                          expect.objectContaining({ optionText: 'Yes' }),
                        ]),
                      },
                    }),
                  ],
                },
              }),
            ],
          },
        }),
      });
    });

    it('creates the next Draft from published metadata without changing the published Version', async () => {
      db.course.findUnique.mockResolvedValue({
        teacherId: 'teacher-id',
        versions: [
          {
            id: 'published-id',
            versionNumber: 2,
            title: 'Published title',
            description: 'Published description',
            status: CourseVersionStatus.PUBLISHED,
          },
          {
            id: 'old-id',
            versionNumber: 1,
            title: 'Old title',
            description: null,
            status: CourseVersionStatus.SUPERSEDED,
          },
        ],
      });
      db.courseVersion.create.mockResolvedValue({
        id: 'draft-id',
        versionNumber: 3,
        status: CourseVersionStatus.DRAFT,
      });

      await service.createRevision({ id: 'teacher-id', role: UserRole.TEACHER }, 'course-id');

      expect(db.courseVersion.create).toHaveBeenCalledWith({
        data: {
          courseId: 'course-id',
          versionNumber: 3,
          title: 'Published title',
          description: 'Published description',
          languageCode: 'th',
          status: CourseVersionStatus.DRAFT,
        },
      });
      expect(db.courseVersion.update).not.toHaveBeenCalled();
    });

    it('copies Sections and reconnects their Lectures in the new Draft', async () => {
      db.course.findUnique.mockResolvedValue({
        teacherId: 'teacher-id',
        versions: [
          {
            versionNumber: 1,
            title: 'Published title',
            description: 'Published description',
            languageCode: 'en',
            status: CourseVersionStatus.PUBLISHED,
            contentItems: [],
            sections: [
              {
                title: 'Section 1',
                position: 1,
                contentItems: [
                  {
                    contentType: 'TEXT',
                    title: 'Lecture 1',
                    textBody: 'Introduction',
                    position: 1,
                    mediaAsset: null,
                  },
                  {
                    contentType: 'TEXT',
                    title: 'Lecture 2',
                    textBody: 'Practice',
                    position: 2,
                    mediaAsset: null,
                  },
                ],
              },
            ],
            quizzes: [],
          },
        ],
      });
      db.courseVersion.create.mockResolvedValue({ id: 'draft-id' });
      db.courseSection.create.mockResolvedValue({ id: 'new-section-id' });
      db.contentItem.updateMany.mockResolvedValue({ count: 2 });

      await service.createRevision({ id: 'teacher-id', role: UserRole.TEACHER }, 'course-id');

      expect(db.courseVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contentItems: {
            create: [
              expect.objectContaining({ title: 'Lecture 1', position: 1 }),
              expect.objectContaining({ title: 'Lecture 2', position: 2 }),
            ],
          },
        }),
      });
      expect(db.courseSection.create).toHaveBeenCalledWith({
        data: { versionId: 'draft-id', title: 'Section 1', position: 1 },
      });
      expect(db.contentItem.updateMany).toHaveBeenCalledWith({
        where: { versionId: 'draft-id', position: { in: [1, 2] } },
        data: { sectionId: 'new-section-id' },
      });
    });

    it('prevents multiple active revisions', async () => {
      db.course.findUnique.mockResolvedValue({
        teacherId: 'teacher-id',
        versions: [
          {
            versionNumber: 3,
            status: CourseVersionStatus.SUBMITTED,
          },
          {
            versionNumber: 2,
            status: CourseVersionStatus.PUBLISHED,
          },
        ],
      });

      await expect(
        service.createRevision({ id: 'teacher-id', role: UserRole.TEACHER }, 'course-id'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(db.courseVersion.create).not.toHaveBeenCalled();
    });

    it('creates a Draft revision from an unpublished Version', async () => {
      db.course.findUnique.mockResolvedValue({
        teacherId: 'teacher-id',
        versions: [
          {
            id: 'unpublished-id',
            versionNumber: 2,
            title: 'Unpublished title',
            description: 'Needs correction',
            status: 'UNPUBLISHED',
          },
        ],
      });
      db.courseVersion.create.mockResolvedValue({
        id: 'draft-id',
        versionNumber: 3,
        status: CourseVersionStatus.DRAFT,
      });

      await service.createRevision({ id: 'teacher-id', role: UserRole.TEACHER }, 'course-id');

      expect(db.courseVersion.create).toHaveBeenCalledWith({
        data: {
          courseId: 'course-id',
          versionNumber: 3,
          title: 'Unpublished title',
          description: 'Needs correction',
          languageCode: 'th',
          status: CourseVersionStatus.DRAFT,
        },
      });
    });

    it('denies revision creation by another Teacher', async () => {
      db.course.findUnique.mockResolvedValue({ teacherId: 'owner-id', versions: [] });

      await expect(
        service.createRevision({ id: 'other-id', role: UserRole.TEACHER }, 'course-id'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('listOwned', () => {
    it('returns only the authenticated Teacher Courses with Version states', async () => {
      db.course.findMany.mockResolvedValue([{ id: 'course-id', versions: [] }]);

      await expect(
        service.listOwned({ id: 'teacher-id', role: UserRole.TEACHER }),
      ).resolves.toEqual([{ id: 'course-id', versions: [] }]);
      expect(db.course.findMany).toHaveBeenCalledWith({
        where: { teacherId: 'teacher-id', archivedAt: null },
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
    });

    it('denies the Teacher Course list to non-Teachers', async () => {
      await expect(
        service.listOwned({ id: 'owner-id', role: UserRole.OWNER }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.course.findMany).not.toHaveBeenCalled();
    });
  });

  describe('replaceCategories', () => {
    it('replaces category assignments for the owning Teacher', async () => {
      db.course.findUnique.mockResolvedValue({ teacherId: 'teacher-id' });
      db.category.count.mockResolvedValue(2);
      db.courseCategory.deleteMany.mockResolvedValue({ count: 1 });
      db.courseCategory.createMany.mockResolvedValue({ count: 2 });

      await service.replaceCategories({ id: 'teacher-id', role: UserRole.TEACHER }, 'course-id', [
        'category-a',
        'category-b',
      ]);

      expect(db.courseCategory.deleteMany).toHaveBeenCalledWith({
        where: { courseId: 'course-id' },
      });
      expect(db.courseCategory.createMany).toHaveBeenCalledWith({
        data: [
          { courseId: 'course-id', categoryId: 'category-a' },
          { courseId: 'course-id', categoryId: 'category-b' },
        ],
      });
    });
  });

  describe('archiveCourse', () => {
    it('allows an Owner to archive any Course', async () => {
      db.course.findUnique.mockResolvedValue({
        id: 'course-id',
        teacherId: 'teacher-id',
        archivedAt: null,
      });
      db.course.updateMany.mockResolvedValue({ count: 1 });

      await service.archiveCourse({ id: 'owner-id', role: UserRole.OWNER }, 'course-id');

      expect(db.course.updateMany).toHaveBeenCalledWith({
        where: { id: 'course-id', archivedAt: null },
        data: { archivedAt: expect.any(Date) },
      });
    });

    it.each([UserRole.TEACHER, UserRole.APPROVER])('denies Course archival to %s', async (role) => {
      await expect(
        service.archiveCourse({ id: 'actor-id', role }, 'course-id'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.course.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('listPublishedForApprover', () => {
    it('returns every non-archived published Course without Major filtering', async () => {
      db.course.findMany.mockResolvedValue([
        {
          id: 'course-id',
          eligibilityMode: 'LIMITED',
          teacher: { id: 'teacher-id', fullName: 'Test Teacher' },
          categories: [{ category: { id: 'category-id', slug: 'english', name: 'English' } }],
          versions: [
            {
              id: 'version-id',
              title: 'English Course',
              description: 'Description',
              languageCode: 'en',
              publishedAt: new Date('2026-08-27T00:00:00Z'),
              coverAsset: { id: 'cover-id', status: 'READY' },
            },
          ],
          _count: { enrollments: 5 },
        },
      ]);

      await expect(
        service.listPublishedForApprover({ id: 'approver-id', role: UserRole.APPROVER }),
      ).resolves.toEqual([
        expect.objectContaining({
          courseId: 'course-id',
          title: 'English Course',
          languageCode: 'en',
          coverAssetId: 'cover-id',
          enrollments: 5,
        }),
      ]);
      expect(db.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            archivedAt: null,
            versions: { some: { status: CourseVersionStatus.PUBLISHED } },
          },
        }),
      );
    });

    it('denies the Approver catalog to Teachers', async () => {
      await expect(
        service.listPublishedForApprover({ id: 'teacher-id', role: UserRole.TEACHER }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('listPublishedForOwner', () => {
    it('returns the moderation catalog to an Owner', async () => {
      db.course.findMany.mockResolvedValue([]);

      await expect(
        service.listPublishedForOwner({ id: 'owner-id', role: UserRole.OWNER }),
      ).resolves.toEqual([]);
      expect(db.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            archivedAt: null,
            versions: { some: { status: CourseVersionStatus.PUBLISHED } },
          },
        }),
      );
    });

    it('denies the Owner moderation catalog to an Approver', async () => {
      await expect(
        service.listPublishedForOwner({ id: 'approver-id', role: UserRole.APPROVER }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
