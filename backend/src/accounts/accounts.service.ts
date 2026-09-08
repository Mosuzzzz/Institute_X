import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { AccountStatus, Prisma, UserRole } from '@prisma/client';
import { PasswordHasher } from '../auth/password-hasher';
import { PrismaService } from '../database/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordHasher,
  ) {}

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
    await this.prisma.userRoleAssignment.upsert({
      where: { userId_role: { userId, role } },
      create: { userId, role },
      update: {},
    });
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, roles: { select: { role: true }, orderBy: { assignedAt: 'asc' } } },
    });
  }
}
