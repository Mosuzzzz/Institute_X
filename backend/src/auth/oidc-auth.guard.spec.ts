import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AccountStatus, UserRole } from '@prisma/client';
import { OidcAuthGuard } from './oidc-auth.guard';

describe('OidcAuthGuard', () => {
  const verifier = { verify: jest.fn() };
  const users = { synchronize: jest.fn() };
  const sessions = { get: jest.fn(), set: jest.fn() };
  let guard: OidcAuthGuard;

  beforeEach(() => {
    jest.resetAllMocks();
    sessions.get.mockResolvedValue(null);
    sessions.set.mockResolvedValue(undefined);
    guard = new OidcAuthGuard(verifier, users as never, sessions as never);
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
    expect(sessions.set).toHaveBeenCalledWith('signed-token', {
      id: 'user-id',
      role: UserRole.STUDENT,
      accountStatus: AccountStatus.ACTIVE,
      majorId: 'major-id',
    });
    expect(request.user).toEqual({
      id: 'user-id',
      role: UserRole.STUDENT,
      accountStatus: AccountStatus.ACTIVE,
      majorId: 'major-id',
    });
  });

  it('uses a cached local User without calling SSO or PostgreSQL', async () => {
    sessions.get.mockResolvedValue({
      id: 'cached-user-id',
      role: UserRole.TEACHER,
      accountStatus: AccountStatus.ACTIVE,
      majorId: null,
    });
    const { request, executionContext } = context('Bearer cached-token');

    await expect(guard.canActivate(executionContext)).resolves.toBe(true);

    expect(request.user).toEqual({
      id: 'cached-user-id',
      role: UserRole.TEACHER,
      accountStatus: AccountStatus.ACTIVE,
      majorId: null,
    });
    expect(verifier.verify).not.toHaveBeenCalled();
    expect(users.synchronize).not.toHaveBeenCalled();
    expect(sessions.set).not.toHaveBeenCalled();
  });

  it('falls back to SSO and PostgreSQL when the cache is unavailable', async () => {
    sessions.get.mockRejectedValue(new Error('Redis unavailable'));
    sessions.set.mockRejectedValue(new Error('Redis unavailable'));
    const identity = {
      subject: 'sso-subject',
      universityEmail: 'teacher@institute.example',
      fullName: 'Teacher One',
      role: UserRole.TEACHER,
      accountStatus: AccountStatus.ACTIVE,
    };
    verifier.verify.mockResolvedValue(identity);
    users.synchronize.mockResolvedValue({
      id: 'user-id',
      role: UserRole.TEACHER,
      accountStatus: AccountStatus.ACTIVE,
      majorId: null,
    });
    const { request, executionContext } = context('Bearer valid-token');

    await expect(guard.canActivate(executionContext)).resolves.toBe(true);

    expect(verifier.verify).toHaveBeenCalledWith('valid-token');
    expect(users.synchronize).toHaveBeenCalledWith(identity);
    expect(request.user).toEqual({
      id: 'user-id',
      role: UserRole.TEACHER,
      accountStatus: AccountStatus.ACTIVE,
      majorId: null,
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
    users.synchronize.mockRejectedValue(
      new ForbiddenException('Institutional account is inactive'),
    );

    await expect(
      guard.canActivate(context('Bearer valid').executionContext),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
