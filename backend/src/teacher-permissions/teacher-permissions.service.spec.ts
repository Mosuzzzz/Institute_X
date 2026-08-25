import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TeacherPermissionStatus, UserRole } from '@prisma/client';
import { TeacherPermissionsService } from './teacher-permissions.service';

describe('TeacherPermissionsService', () => {
  const requests = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  };
  let service: TeacherPermissionsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new TeacherPermissionsService({
      teacherPermissionRequest: requests,
    } as never);
  });

  describe('requestPermission', () => {
    it('creates a pending request for a Teacher', async () => {
      requests.findFirst.mockResolvedValue(null);
      requests.create.mockResolvedValue({
        id: 'request-id',
        status: TeacherPermissionStatus.PENDING,
      });

      const result = await service.requestPermission(
        { id: 'teacher-id', role: UserRole.TEACHER },
        'I want to create courses',
      );

      expect(requests.create).toHaveBeenCalledWith({
        data: {
          teacherId: 'teacher-id',
          requestMessage: 'I want to create courses',
          status: TeacherPermissionStatus.PENDING,
        },
      });
      expect(result).toEqual(expect.objectContaining({ id: 'request-id' }));
    });

    it('denies a non-Teacher', async () => {
      await expect(
        service.requestPermission({ id: 'student-id', role: UserRole.STUDENT }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it.each([TeacherPermissionStatus.PENDING, TeacherPermissionStatus.APPROVED])(
      'rejects a new request when latest status is %s',
      async (status) => {
        requests.findFirst.mockResolvedValue({ status });

        await expect(
          service.requestPermission({ id: 'teacher-id', role: UserRole.TEACHER }),
        ).rejects.toBeInstanceOf(ConflictException);
      },
    );

    it.each([TeacherPermissionStatus.REJECTED, TeacherPermissionStatus.REVOKED])(
      'allows another request after %s',
      async (status) => {
        requests.findFirst.mockResolvedValue({ status });
        requests.create.mockResolvedValue({ id: 'new-request' });

        await expect(
          service.requestPermission({ id: 'teacher-id', role: UserRole.TEACHER }),
        ).resolves.toEqual({ id: 'new-request' });
      },
    );
  });

  describe('review', () => {
    it('allows an Approver to approve a pending request atomically', async () => {
      requests.findUnique.mockResolvedValue({
        id: 'request-id',
        teacherId: 'teacher-id',
        status: TeacherPermissionStatus.PENDING,
      });
      requests.updateMany.mockResolvedValue({ count: 1 });

      await service.review(
        { id: 'approver-id', role: UserRole.APPROVER },
        'request-id',
        TeacherPermissionStatus.APPROVED,
      );

      expect(requests.updateMany).toHaveBeenCalledWith({
        where: { id: 'request-id', status: TeacherPermissionStatus.PENDING },
        data: expect.objectContaining({
          status: TeacherPermissionStatus.APPROVED,
          reviewedById: 'approver-id',
        }),
      });
    });

    it('requires a rejection comment', async () => {
      await expect(
        service.review(
          { id: 'approver-id', role: UserRole.APPROVER },
          'request-id',
          TeacherPermissionStatus.REJECTED,
          '   ',
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('denies a non-Approver', async () => {
      await expect(
        service.review(
          { id: 'teacher-id', role: UserRole.TEACHER },
          'request-id',
          TeacherPermissionStatus.APPROVED,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns not found for an unknown request', async () => {
      requests.findUnique.mockResolvedValue(null);

      await expect(
        service.review(
          { id: 'approver-id', role: UserRole.APPROVER },
          'missing',
          TeacherPermissionStatus.APPROVED,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an already decided request', async () => {
      requests.findUnique.mockResolvedValue({
        id: 'request-id',
        status: TeacherPermissionStatus.REJECTED,
      });

      await expect(
        service.review(
          { id: 'approver-id', role: UserRole.APPROVER },
          'request-id',
          TeacherPermissionStatus.APPROVED,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('revoke', () => {
    it('revokes an approved request', async () => {
      requests.findUnique.mockResolvedValue({
        id: 'request-id',
        teacherId: 'teacher-id',
        status: TeacherPermissionStatus.APPROVED,
      });
      requests.create.mockResolvedValue({
        id: 'revocation-id',
        status: TeacherPermissionStatus.REVOKED,
      });

      await service.revoke(
        { id: 'approver-id', role: UserRole.APPROVER },
        'request-id',
        'Policy violation',
      );

      expect(requests.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teacherId: 'teacher-id',
          status: TeacherPermissionStatus.REVOKED,
          reviewedById: 'approver-id',
          reviewComment: 'Policy violation',
        }),
      });
    });
  });
});
