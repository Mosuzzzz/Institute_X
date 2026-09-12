import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AccountsService } from './accounts.service';

describe('AccountsService', () => {
  const tx = {
    user: { findUniqueOrThrow: jest.fn() },
    userRoleAssignment: { upsert: jest.fn(), deleteMany: jest.fn() },
    roleChangeAudit: { create: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const prisma = {
    user: { findMany: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn() },
    roleChangeAudit: { findMany: jest.fn() },
    authSession: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const cache = { invalidateUser: jest.fn() };
  let service: AccountsService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'target', roles: [] });
    service = new AccountsService(prisma as never, cache as never);
  });

  it('searches verified users by name or institutional email', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    await service.list('teacher@x.ac.th');
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          emailVerifiedAt: { not: null },
          OR: [
            { fullName: { contains: 'teacher@x.ac.th', mode: 'insensitive' } },
            { universityEmail: { contains: 'teacher@x.ac.th', mode: 'insensitive' } },
          ],
        },
      }),
    );
  });

  it('adds an official role and records the old/new role sets', async () => {
    tx.user.findUniqueOrThrow.mockResolvedValue({
      emailVerifiedAt: new Date(),
      roles: [{ role: UserRole.STUDENT }],
    });
    await service.addRole('registrar', 'target', UserRole.TEACHER);
    expect(tx.userRoleAssignment.upsert).toHaveBeenCalled();
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.roleChangeAudit.create).toHaveBeenCalledWith({
      data: {
        actorId: 'registrar',
        targetUserId: 'target',
        oldRoles: [UserRole.STUDENT],
        newRoles: [UserRole.STUDENT, UserRole.TEACHER],
      },
    });
    expect(cache.invalidateUser).toHaveBeenCalledWith('target');
  });

  it('prevents changing the mandatory STUDENT role', async () => {
    await expect(
      service.removeRole('registrar', 'target', UserRole.STUDENT),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('prevents changing your own roles', async () => {
    await expect(service.addRole('same', 'same', UserRole.EXECUTIVE)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('does not assign roles to an unverified legacy account', async () => {
    tx.user.findUniqueOrThrow.mockResolvedValue({
      emailVerifiedAt: null,
      roles: [{ role: UserRole.STUDENT }],
    });
    await expect(service.addRole('registrar', 'target', UserRole.TEACHER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(tx.userRoleAssignment.upsert).not.toHaveBeenCalled();
  });

  it('invalidates all sessions immediately after deactivation', async () => {
    prisma.user.update.mockResolvedValue({ id: 'target', accountStatus: 'INACTIVE' });
    await service.updateStatus('registrar', 'target', 'INACTIVE' as never);
    expect(prisma.authSession.deleteMany).toHaveBeenCalledWith({ where: { userId: 'target' } });
    expect(cache.invalidateUser).toHaveBeenCalledWith('target');
  });
});
