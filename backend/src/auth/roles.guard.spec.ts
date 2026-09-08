import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountStatus, UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  let guard: RolesGuard;

  function context(user?: {
    role: UserRole;
    roles?: UserRole[];
    accountStatus: AccountStatus;
  }): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    jest.resetAllMocks();
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows an active user with an accepted role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.TEACHER]);

    expect(
      guard.canActivate(context({ role: UserRole.TEACHER, accountStatus: AccountStatus.ACTIVE })),
    ).toBe(true);
  });

  it('allows any role assigned in the database without discarding existing roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.TEACHER]);
    expect(
      guard.canActivate(
        context({
          role: UserRole.STUDENT,
          roles: [UserRole.STUDENT, UserRole.TEACHER],
          accountStatus: AccountStatus.ACTIVE,
        }),
      ),
    ).toBe(true);
  });

  it('denies a user with the wrong role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.EXECUTIVE]);

    expect(() =>
      guard.canActivate(context({ role: UserRole.TEACHER, accountStatus: AccountStatus.ACTIVE })),
    ).toThrow(ForbiddenException);
  });

  it('denies an inactive user even when the role matches', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.TEACHER]);

    expect(() =>
      guard.canActivate(context({ role: UserRole.TEACHER, accountStatus: AccountStatus.INACTIVE })),
    ).toThrow(ForbiddenException);
  });

  it('allows any active authenticated role when no roles are declared', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(
      guard.canActivate(context({ role: UserRole.STUDENT, accountStatus: AccountStatus.ACTIVE })),
    ).toBe(true);
  });
});
