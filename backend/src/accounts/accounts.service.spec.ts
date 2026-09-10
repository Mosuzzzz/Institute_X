import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AccountsService } from './accounts.service';

describe('AccountsService', () => {
  const prisma = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    userRoleAssignment: { upsert: jest.fn(), deleteMany: jest.fn() },
    authSession: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const passwords = { hash: jest.fn() };
  const cache = { invalidateUser: jest.fn() };
  let service: AccountsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AccountsService(prisma as never, passwords as never, cache as never);
  });

  it('hashes the password and gives a new account only the Student role', async () => {
    passwords.hash.mockResolvedValue('scrypt$salt$hash');
    prisma.user.create.mockResolvedValue({ id: 'new-user' });
    await service.create({
      email: 'New@Example.com',
      username: 'new.user',
      fullName: 'New User',
      password: 'a secure password',
      majorId: '00000000-0000-4000-8000-000000000127',
    });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          universityEmail: 'new@example.com',
          passwordHash: 'scrypt$salt$hash',
          roles: { create: { role: UserRole.STUDENT } },
        }),
      }),
    );
  });

  it('creates an account without a major', async () => {
    passwords.hash.mockResolvedValue('scrypt$salt$hash');
    prisma.user.create.mockResolvedValue({ id: 'new-user' });
    await service.create({
      email: 'no-major@example.com',
      username: 'no.major',
      fullName: 'No Major',
      password: 'a secure password',
    });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ majorId: undefined }) }),
    );
  });

  it('adds a role without deleting existing assignments', async () => {
    prisma.userRoleAssignment.upsert.mockResolvedValue({});
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'target',
      roles: [{ role: UserRole.STUDENT }, { role: UserRole.TEACHER }],
    });
    await service.addRole('executive', 'target', UserRole.TEACHER);
    expect(prisma.userRoleAssignment.upsert).toHaveBeenCalled();
    expect(cache.invalidateUser).toHaveBeenCalledWith('target');
    expect(prisma.userRoleAssignment.deleteMany).not.toHaveBeenCalled();
  });

  it('prevents assigning a role to yourself', async () => {
    await expect(
      service.addRole('same-user', 'same-user', UserRole.EXECUTIVE),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.userRoleAssignment.upsert).not.toHaveBeenCalled();
  });

  it('prevents a registrar from assigning privileged roles', async () => {
    await expect(service.addRole('registrar', 'target', UserRole.EXECUTIVE)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.userRoleAssignment.upsert).not.toHaveBeenCalled();
  });

  it('invalidates sessions immediately after changing account status', async () => {
    prisma.user.update.mockResolvedValue({ id: 'target', accountStatus: 'INACTIVE' });
    await service.updateStatus('registrar', 'target', 'INACTIVE' as never);
    expect(cache.invalidateUser).toHaveBeenCalledWith('target');
  });

  it('removes database sessions when resetting a password', async () => {
    passwords.hash.mockResolvedValue('scrypt$salt$hash');
    prisma.$transaction.mockResolvedValue([]);
    await service.resetPassword('target', 'replacement password');
    expect(prisma.authSession.deleteMany).toHaveBeenCalledWith({ where: { userId: 'target' } });
    expect(cache.invalidateUser).toHaveBeenCalledWith('target');
  });
});
