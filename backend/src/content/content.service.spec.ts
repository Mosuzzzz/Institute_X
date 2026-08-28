import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ContentType, CourseVersionStatus, UserRole } from '@prisma/client';
import { ContentService } from './content.service';

describe('ContentService', () => {
  const prisma = {
    courseVersion: { findUnique: jest.fn() },
    courseSection: { create: jest.fn(), findFirst: jest.fn() },
    contentItem: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  let service: ContentService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ContentService(prisma as never);
  });

  it('adds ordered text content to an owned Draft', async () => {
    prisma.courseVersion.findUnique.mockResolvedValue({
      status: CourseVersionStatus.DRAFT,
      course: { teacherId: 'teacher-id' },
    });
    prisma.contentItem.create.mockResolvedValue({ id: 'content-id' });

    await service.addText({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id', {
      title: 'Lesson 1',
      textBody: 'Introduction',
      position: 1,
    });

    expect(prisma.contentItem.create).toHaveBeenCalledWith({
      data: {
        versionId: 'version-id',
        contentType: ContentType.TEXT,
        title: 'Lesson 1',
        textBody: 'Introduction',
        position: 1,
      },
    });
  });

  it('creates an ordered Section in an owned Draft', async () => {
    prisma.courseVersion.findUnique.mockResolvedValue({
      status: CourseVersionStatus.DRAFT,
      course: { teacherId: 'teacher-id' },
    });
    prisma.courseSection.create.mockResolvedValue({ id: 'section-id' });

    await service.createSection(
      { id: 'teacher-id', role: UserRole.TEACHER },
      'version-id',
      { title: 'Section 1', position: 1 },
    );

    expect(prisma.courseSection.create).toHaveBeenCalledWith({
      data: { versionId: 'version-id', title: 'Section 1', position: 1 },
    });
  });

  it('adds a text lecture to the selected Section', async () => {
    prisma.courseVersion.findUnique.mockResolvedValue({
      status: CourseVersionStatus.DRAFT,
      course: { teacherId: 'teacher-id' },
    });
    prisma.courseSection.findFirst.mockResolvedValue({ id: 'section-id' });
    prisma.contentItem.create.mockResolvedValue({ id: 'content-id' });

    await service.addText({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id', {
      title: 'Lecture 1',
      textBody: 'Introduction',
      position: 1,
      sectionId: 'section-id',
    });

    expect(prisma.contentItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sectionId: 'section-id' }),
    });
  });

  it('denies another Teacher', async () => {
    prisma.courseVersion.findUnique.mockResolvedValue({
      status: CourseVersionStatus.DRAFT,
      course: { teacherId: 'owner-id' },
    });

    await expect(
      service.addText({ id: 'other-id', role: UserRole.TEACHER }, 'version-id', {
        textBody: 'No access',
        position: 1,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects changes to a submitted Version', async () => {
    prisma.courseVersion.findUnique.mockResolvedValue({
      status: CourseVersionStatus.SUBMITTED,
      course: { teacherId: 'teacher-id' },
    });

    await expect(
      service.addText({ id: 'teacher-id', role: UserRole.TEACHER }, 'version-id', {
        textBody: 'Too late',
        position: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates owned Draft text and display position', async () => {
    prisma.contentItem.findUnique.mockResolvedValue({
      id: 'content-id',
      contentType: ContentType.TEXT,
      version: {
        status: CourseVersionStatus.DRAFT,
        course: { teacherId: 'teacher-id' },
      },
    });
    prisma.contentItem.update.mockResolvedValue({ id: 'content-id' });

    await service.updateText({ id: 'teacher-id', role: UserRole.TEACHER }, 'content-id', {
      title: 'Updated lesson',
      textBody: 'Updated body',
      position: 2,
    });

    expect(prisma.contentItem.update).toHaveBeenCalledWith({
      where: { id: 'content-id' },
      data: { title: 'Updated lesson', textBody: 'Updated body', position: 2 },
    });
  });

  it('does not update text in a published Version', async () => {
    prisma.contentItem.findUnique.mockResolvedValue({
      id: 'content-id',
      contentType: ContentType.TEXT,
      version: {
        status: CourseVersionStatus.PUBLISHED,
        course: { teacherId: 'teacher-id' },
      },
    });

    await expect(
      service.updateText({ id: 'teacher-id', role: UserRole.TEACHER }, 'content-id', {
        textBody: 'Forbidden update',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deletes owned Draft text content', async () => {
    prisma.contentItem.findUnique.mockResolvedValue({
      id: 'content-id',
      contentType: ContentType.TEXT,
      version: {
        status: CourseVersionStatus.DRAFT,
        course: { teacherId: 'teacher-id' },
      },
    });
    prisma.contentItem.delete.mockResolvedValue({ id: 'content-id' });

    await service.deleteText({ id: 'teacher-id', role: UserRole.TEACHER }, 'content-id');

    expect(prisma.contentItem.delete).toHaveBeenCalledWith({ where: { id: 'content-id' } });
  });
});
