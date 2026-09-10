import { AccountStatus, UserRole } from '@prisma/client';
import { AuthService } from './auth.service';

describe('AuthService session cache', () => {
  const prisma = {
    authSession: { findUnique: jest.fn(), deleteMany: jest.fn() },
  };
  const passwords = { hash: jest.fn(), verify: jest.fn() };
  const cache = { get: jest.fn(), set: jest.fn(), delete: jest.fn() };
  const service = new AuthService(prisma as never, passwords as never, cache as never);

  beforeEach(() => jest.resetAllMocks());

  it('returns a valid Redis cache hit without querying PostgreSQL', async () => {
    const session = {
      id: 'user-id',
      role: UserRole.STUDENT,
      roles: [UserRole.STUDENT],
      accountStatus: AccountStatus.ACTIVE,
      majorId: null,
    };
    cache.get.mockResolvedValue(session);
    await expect(service.authenticate('token')).resolves.toEqual(session);
    expect(prisma.authSession.findUnique).not.toHaveBeenCalled();
  });

  it('loads a cache miss from PostgreSQL and caches it no longer than session expiry', async () => {
    cache.get.mockResolvedValue(null);
    const expiresAt = new Date(Date.now() + 60_000);
    prisma.authSession.findUnique.mockResolvedValue({
      expiresAt,
      user: {
        id: 'user-id',
        accountStatus: AccountStatus.ACTIVE,
        majorId: null,
        roles: [{ role: UserRole.STUDENT }, { role: UserRole.TEACHER }],
      },
    });
    await service.authenticate('token');
    expect(cache.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        roles: [UserRole.STUDENT, UserRole.TEACHER],
      }),
      expiresAt,
    );
  });

  it('invalidates PostgreSQL and Redis sessions on logout', async () => {
    prisma.authSession.deleteMany.mockResolvedValue({ count: 1 });
    cache.delete.mockResolvedValue(undefined);
    await service.logout('token');
    expect(prisma.authSession.deleteMany).toHaveBeenCalled();
    expect(cache.delete).toHaveBeenCalledWith(expect.any(String));
  });
});
