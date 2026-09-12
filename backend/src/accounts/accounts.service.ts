import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AccountStatus, Prisma, UserRole } from '@prisma/client';
import { AUTH_SESSION_CACHE, AuthSessionCache } from '../auth/auth-session-cache';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUTH_SESSION_CACHE) private readonly cache: AuthSessionCache,
  ) {}

  list(search?: string): Promise<unknown[]> {
    const term = search?.trim();
    return this.prisma.user.findMany({
      where: {
        emailVerifiedAt: { not: null },
        ...(term
          ? {
              OR: [
                { fullName: { contains: term, mode: 'insensitive' as const } },
                { universityEmail: { contains: term, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        universityEmail: true,
        fullName: true,
        accountStatus: true,
        createdAt: true,
        updatedAt: true,
        major: { select: { id: true, code: true, name: true } },
        roles: { select: { role: true }, orderBy: { assignedAt: 'asc' } },
      },
    });
  }

  listRoleAudits(): Promise<unknown[]> {
    return this.prisma.roleChangeAudit.findMany({
      take: 200,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, fullName: true, universityEmail: true } },
        targetUser: { select: { id: true, fullName: true, universityEmail: true } },
      },
    });
  }

  async addRole(actorId: string, userId: string, role: UserRole): Promise<unknown> {
    this.validateRoleChange(actorId, userId, role);
    await this.changeRole(actorId, userId, role, true);
    await this.cache.invalidateUser(userId);
    return this.userRoles(userId);
  }

  async removeRole(actorId: string, userId: string, role: UserRole): Promise<unknown> {
    this.validateRoleChange(actorId, userId, role);
    await this.changeRole(actorId, userId, role, false);
    await this.cache.invalidateUser(userId);
    return this.userRoles(userId);
  }

  async update(
    userId: string,
    input: { fullName?: string; majorId?: string | null },
  ): Promise<unknown> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}),
        ...(input.majorId === null
          ? { major: { disconnect: true } }
          : input.majorId !== undefined
            ? { major: { connect: { id: input.majorId } } }
            : {}),
      },
      select: { id: true, fullName: true, major: { select: { id: true, code: true, name: true } } },
    });
    await this.cache.invalidateUser(userId);
    return user;
  }

  async updateStatus(actorId: string, userId: string, status: AccountStatus): Promise<unknown> {
    if (actorId === userId)
      throw new ForbiddenException('You cannot change your own account status');
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { accountStatus: status },
      select: { id: true, accountStatus: true },
    });
    await this.prisma.authSession.deleteMany({ where: { userId } });
    await this.cache.invalidateUser(userId);
    return user;
  }

  private validateRoleChange(actorId: string, userId: string, role: UserRole): void {
    if (actorId === userId) throw new ForbiddenException('You cannot change your own roles');
    if (role === UserRole.STUDENT)
      throw new ForbiddenException('The mandatory STUDENT role cannot be changed');
  }

  private async changeRole(
    actorId: string,
    userId: string,
    role: UserRole,
    add: boolean,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT user_id FROM users WHERE user_id = ${userId}::uuid FOR UPDATE`,
      );
      const current = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { emailVerifiedAt: true, roles: { select: { role: true } } },
      });
      if (!current.emailVerifiedAt)
        throw new ForbiddenException('The user must verify their institutional email first');
      const oldRoles = current.roles.map((entry) => entry.role);
      if (add)
        await tx.userRoleAssignment.upsert({
          where: { userId_role: { userId, role } },
          create: { userId, role },
          update: {},
        });
      else await tx.userRoleAssignment.deleteMany({ where: { userId, role } });
      const newRoles = add
        ? [...new Set([...oldRoles, role])]
        : oldRoles.filter((item) => item !== role);
      if (oldRoles.length !== newRoles.length)
        await tx.roleChangeAudit.create({
          data: { actorId, targetUserId: userId, oldRoles, newRoles },
        });
    });
  }

  private userRoles(userId: string): Promise<unknown> {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, roles: { select: { role: true }, orderBy: { assignedAt: 'asc' } } },
    });
  }
}
