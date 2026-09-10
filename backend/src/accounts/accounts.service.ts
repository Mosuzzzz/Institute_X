import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AccountStatus, Prisma, UserRole } from '@prisma/client';
import { PasswordHasher } from '../auth/password-hasher';
import { PrismaService } from '../database/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { AUTH_SESSION_CACHE, AuthSessionCache } from '../auth/auth-session-cache';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordHasher,
    @Inject(AUTH_SESSION_CACHE) private readonly cache: AuthSessionCache,
  ) {}

  list(): Promise<unknown[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
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

  async create(input: CreateAccountDto): Promise<unknown> {
    const passwordHash = await this.passwords.hash(input.password);
    try {
      return await this.prisma.user.create({
        data: {
          universityEmail: input.email.trim().toLowerCase(),
          username: input.username.trim(),
          fullName: input.fullName.trim(),
          passwordHash,
          accountStatus: AccountStatus.ACTIVE,
          majorId: input.majorId,
          roles: { create: { role: UserRole.STUDENT } },
        },
        select: {
          id: true,
          username: true,
          universityEmail: true,
          fullName: true,
          accountStatus: true,
          roles: { select: { role: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email or username already exists');
      }
      throw error;
    }
  }

  async addRole(actorId: string, userId: string, role: UserRole): Promise<unknown> {
    if (actorId === userId) throw new ForbiddenException('You cannot assign a role to yourself');
    if (role !== UserRole.TEACHER) {
      throw new ForbiddenException('Registrar can only assign the TEACHER role');
    }
    await this.prisma.userRoleAssignment.upsert({
      where: { userId_role: { userId, role } },
      create: { userId, role },
      update: {},
    });
    await this.cache.invalidateUser(userId);
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, roles: { select: { role: true }, orderBy: { assignedAt: 'asc' } } },
    });
  }

  async removeRole(actorId: string, userId: string, role: UserRole): Promise<unknown> {
    if (actorId === userId) throw new ForbiddenException('You cannot remove your own role');
    if (role !== UserRole.TEACHER) {
      throw new ForbiddenException('Registrar can only remove the TEACHER role');
    }
    await this.prisma.userRoleAssignment.deleteMany({ where: { userId, role } });
    await this.cache.invalidateUser(userId);
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, roles: { select: { role: true }, orderBy: { assignedAt: 'asc' } } },
    });
  }

  async update(
    userId: string,
    input: { fullName?: string; majorId?: string | null },
  ): Promise<unknown> {
    const data: Prisma.UserUpdateInput = {};
    if (input.fullName !== undefined) data.fullName = input.fullName.trim();
    if (input.majorId === null) data.major = { disconnect: true };
    else if (input.majorId !== undefined) data.major = { connect: { id: input.majorId } };
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
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
    await this.cache.invalidateUser(userId);
    return user;
  }

  async resetPassword(userId: string, password: string): Promise<void> {
    const passwordHash = await this.passwords.hash(password);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.authSession.deleteMany({ where: { userId } }),
    ]);
    await this.cache.invalidateUser(userId);
  }
}
