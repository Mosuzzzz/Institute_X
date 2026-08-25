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
    course: { create: jest.fn(), findUnique: jest.fn() },
    courseVersion: { findUnique: jest.fn(), update: jest.fn() },
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
    };

    it('atomically creates a Course with eligible Majors and Version 1 Draft', async () => {
      db.teacherPermissionRequest.findFirst.mockResolvedValue({
        status: TeacherPermissionStatus.APPROVED,
      });
      db.major.count.mockResolvedValue(2);
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
          versions: {
            create: {
              versionNumber: 1,
              title: input.title,
              description: input.description,
              status: CourseVersionStatus.DRAFT,
            },
          },
        },
        include: { allowedMajors: true, versions: true },
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
  });

  describe('updateDraft', () => {
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
});
