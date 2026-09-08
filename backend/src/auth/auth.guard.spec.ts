import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AccountStatus, UserRole } from '@prisma/client';
import { AuthGuard } from './auth.guard';

describe('Database authentication guard', () => {
  const auth = { authenticate: jest.fn() };
  let guard: AuthGuard;

  beforeEach(() => {
    jest.resetAllMocks();
    guard = new AuthGuard({ get: jest.fn().mockReturnValue(auth) } as never);
  });

  function context(authorization?: string): {
    request: { headers: { authorization?: string }; user?: unknown };
    executionContext: ExecutionContext;
  } {
    const request: { headers: { authorization?: string }; user?: unknown } = {
      headers: { authorization },
    };
    return {
      request,
      executionContext: {
        switchToHttp: (): never => ({ getRequest: () => request }) as never,
      } as unknown as ExecutionContext,
    };
  }

  it('loads the user and all roles from the database-backed session', async () => {
    const session = {
      id: 'user-id',
      role: UserRole.STUDENT,
      roles: [UserRole.STUDENT, UserRole.TEACHER],
      accountStatus: AccountStatus.ACTIVE,
      majorId: null,
    };
    auth.authenticate.mockResolvedValue(session);
    const { request, executionContext } = context('Bearer opaque-token');
    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
    expect(auth.authenticate).toHaveBeenCalledWith('opaque-token');
    expect(request.user).toEqual(session);
  });

  it('requires a Bearer token', async () => {
    await expect(guard.canActivate(context().executionContext)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('does not trust a role supplied by the client', async () => {
    auth.authenticate.mockRejectedValue(new UnauthorizedException('Invalid or expired session'));
    await expect(
      guard.canActivate(context('Bearer forged-role-token').executionContext),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
