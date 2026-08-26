import { AccountStatus, UserRole } from '@prisma/client';
import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { SsoUserService } from './sso-user.service';

describe('SsoUserService', () => {
  const prisma = {
    major: { findUnique: jest.fn() },
    user: { upsert: jest.fn() },
  };
  let service: SsoUserService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new SsoUserService(prisma as never);
  });

  it('creates or updates an active SSO user by stable subject', async () => {
    const identity = {
      subject: 'sso-123',
      username: '6600000001',
      universityEmail: 'student@institute.example',
      fullName: 'Student One',
      role: UserRole.STUDENT,
      accountStatus: AccountStatus.ACTIVE,
      majorCode: 'IT',
    };
    prisma.major.findUnique.mockResolvedValue({ id: 'major-id' });
    prisma.user.upsert.mockResolvedValue({ id: 'user-id', ...identity });

    const result = await service.synchronize(identity);

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { ssoSubject: 'sso-123' },
      create: expect.objectContaining({
        ssoSubject: 'sso-123',
        username: '6600000001',
        universityEmail: 'student@institute.example',
        majorId: 'major-id',
      }),
      update: expect.objectContaining({
        username: '6600000001',
        universityEmail: 'student@institute.example',
        majorId: 'major-id',
      }),
    });
    expect(result).toEqual(expect.objectContaining({ id: 'user-id' }));
  });

  it('denies an identity whose institutional account is inactive', async () => {
    await expect(
      service.synchronize({
        subject: 'sso-123',
        universityEmail: 'student@institute.example',
        fullName: 'Student One',
        role: UserRole.STUDENT,
        accountStatus: AccountStatus.INACTIVE,
        majorCode: 'IT',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });

  it('requires a Major for Students', async () => {
    await expect(
      service.synchronize({
        subject: 'sso-123',
        universityEmail: 'student@institute.example',
        fullName: 'Student One',
        role: UserRole.STUDENT,
        accountStatus: AccountStatus.ACTIVE,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects an unknown Student Major', async () => {
    prisma.major.findUnique.mockResolvedValue(null);

    await expect(
      service.synchronize({
        subject: 'sso-123',
        universityEmail: 'student@institute.example',
        fullName: 'Student One',
        role: UserRole.STUDENT,
        accountStatus: AccountStatus.ACTIVE,
        majorCode: 'UNKNOWN',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('maps the legacy SSO CS Major code to BTECH-ICT', async () => {
    prisma.major.findUnique.mockResolvedValue({ id: 'btech-ict-major-id' });
    prisma.user.upsert.mockResolvedValue({ id: 'student-id' });

    await service.synchronize({
      subject: 'sso-legacy-cs',
      universityEmail: 'legacy@institute.example',
      fullName: 'Legacy CS Student',
      role: UserRole.STUDENT,
      accountStatus: AccountStatus.ACTIVE,
      majorCode: 'CS',
    });

    expect(prisma.major.findUnique).toHaveBeenCalledWith({
      where: { code: 'BTECH-ICT' },
      select: { id: true },
    });
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ majorId: 'btech-ict-major-id' }),
        update: expect.objectContaining({ majorId: 'btech-ict-major-id' }),
      }),
    );
  });

  it('does not assign a Major to a non-Student', async () => {
    prisma.user.upsert.mockResolvedValue({ id: 'teacher-id' });

    await service.synchronize({
      subject: 'teacher-123',
      universityEmail: 'teacher@institute.example',
      fullName: 'Teacher One',
      role: UserRole.TEACHER,
      accountStatus: AccountStatus.ACTIVE,
      majorCode: 'IT',
    });

    expect(prisma.major.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ majorId: null }),
        update: expect.objectContaining({ majorId: null }),
      }),
    );
  });
});
