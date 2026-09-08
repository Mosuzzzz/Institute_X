import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AccountsService } from './accounts.service';

describe('AccountsService', () => {
  const prisma = {
    user: { create: jest.fn(), findUniqueOrThrow: jest.fn() },
    userRoleAssignment: { upsert: jest.fn() },
  };
  const passwords = { hash: jest.fn() };
  let service: AccountsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AccountsService(prisma as never, passwords as never);
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

  it('adds a role without deleting existing assignments', async () => {
    prisma.userRoleAssignment.upsert.mockResolvedValue({});
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'target',
      roles: [{ role: UserRole.STUDENT }, { role: UserRole.TEACHER }],
    });
    await service.addRole('executive', 'target', UserRole.TEACHER);
    expect(prisma.userRoleAssignment.upsert).toHaveBeenCalled();
    expect(prisma.userRoleAssignment).not.toHaveProperty('deleteMany');
  });

  it('prevents assigning a role to yourself', async () => {
    await expect(
      service.addRole('same-user', 'same-user', UserRole.EXECUTIVE),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.userRoleAssignment.upsert).not.toHaveBeenCalled();
  });
});
