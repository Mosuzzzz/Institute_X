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
    course: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    courseCategory: { createMany: jest.fn(), deleteMany: jest.fn() },
    courseVersion: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
  };
  const prisma = {
    ...db,
    $transaction: jest.fn((operation: (tx: typeof db) => unknown) => operation(db)),
  };
  let service: CoursesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CoursesService(prisma as never);
  });

  describe('createCourse', () => {
    const input = {
      title: 'Network Fundamentals',
      description: 'Introduction to networking',
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
              status: CourseVersionStatus.DRAFT,
            },
          },
        },
        include: { allowedMajors: true, categories: true, versions: true },
      });
      expect(result).toEqual(expect.objectContaining({ id: 'course-id' }));
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
      });

      expect(db.courseVersion.update).toHaveBeenCalledWith({
        where: { id: 'version-id' },
        data: { title: 'Updated title' },
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
          status: CourseVersionStatus.DRAFT,
        },
      });
      expect(db.courseVersion.update).not.toHaveBeenCalled();
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
        where: { teacherId: 'teacher-id' },
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
});
