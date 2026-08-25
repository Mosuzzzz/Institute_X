import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AccountStatus, UserRole } from '@prisma/client';
import { OidcAuthGuard } from './oidc-auth.guard';

describe('OidcAuthGuard', () => {
  const verifier = { verify: jest.fn() };
  const users = { synchronize: jest.fn() };
  let guard: OidcAuthGuard;

  beforeEach(() => {
    jest.resetAllMocks();
    guard = new OidcAuthGuard(verifier, users as never);
  });

  function context(authorization?: string): {
    request: Record<string, unknown>;
    executionContext: never;
  } {
    const request: Record<string, unknown> = {
      headers: authorization ? { authorization } : {},
    };
    return {
      request,
      executionContext: {
        switchToHttp: () => ({ getRequest: () => request }),
      } as never,
    };
  }

  it('verifies a bearer token, synchronizes the SSO identity, and attaches the local User', async () => {
    const identity = {
      subject: 'sso-subject',
      universityEmail: 'student@institute.example',
      fullName: 'Student One',
      role: UserRole.STUDENT,
      accountStatus: AccountStatus.ACTIVE,
      majorCode: 'CS',
    };
    verifier.verify.mockResolvedValue(identity);
    users.synchronize.mockResolvedValue({
      id: 'user-id',
      role: UserRole.STUDENT,
      accountStatus: AccountStatus.ACTIVE,
      majorId: 'major-id',
    });
    const { request, executionContext } = context('Bearer signed-token');

    await expect(guard.canActivate(executionContext)).resolves.toBe(true);

    expect(verifier.verify).toHaveBeenCalledWith('signed-token');
    expect(users.synchronize).toHaveBeenCalledWith(identity);
    expect(request.user).toEqual({
      id: 'user-id',
      role: UserRole.STUDENT,
      accountStatus: AccountStatus.ACTIVE,
      majorId: 'major-id',
    });
  });

  it('rejects a missing or malformed bearer credential', async () => {
    await expect(guard.canActivate(context().executionContext)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      guard.canActivate(context('Basic credential').executionContext),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('does not expose token verification errors', async () => {
    verifier.verify.mockRejectedValue(new Error('JWT signature details'));

    await expect(
      guard.canActivate(context('Bearer invalid').executionContext),
    ).rejects.toMatchObject({
      constructor: UnauthorizedException,
      message: 'Invalid or expired institutional token',
    });
  });

  it('preserves the inactive-account denial from user synchronization', async () => {
    verifier.verify.mockResolvedValue({ subject: 'inactive' });
    users.synchronize.mockRejectedValue(new ForbiddenException('Institutional account is inactive'));

    await expect(
      guard.canActivate(context('Bearer valid').executionContext),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
