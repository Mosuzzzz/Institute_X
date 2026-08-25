import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ContentType, CourseVersionStatus, UserRole } from '@prisma/client';
import { ContentService } from './content.service';

describe('ContentService', () => {
  const prisma = {
    courseVersion: { findUnique: jest.fn() },
    contentItem: { create: jest.fn() },
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
});
