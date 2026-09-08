import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AccountStatus, UserRole } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { PasswordHasher } from './password-hasher';

export type DatabaseSession = {
  id: string;
  role: UserRole;
  roles: UserRole[];
  accountStatus: AccountStatus;
  majorId: string | null;
};

export type PublicUser = {
  id: string;
  username: string;
  email: string;
  name: string;
  accountStatus: AccountStatus;
  majorId: string | null;
  roles: UserRole[];
};

@Injectable()
export class AuthService {
  private readonly sessionLifetimeMs = 8 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordHasher,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; expiresAt: Date; user: PublicUser }> {
    const user = await this.prisma.user.findUnique({
      where: { universityEmail: email.trim().toLowerCase() },
      include: { roles: { orderBy: { assignedAt: 'asc' } } },
    });
    if (
      !user ||
      user.accountStatus !== AccountStatus.ACTIVE ||
      !(await this.passwords.verify(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.sessionLifetimeMs);
    await this.prisma.authSession.create({
      data: { userId: user.id, tokenHash: this.tokenHash(token), expiresAt },
    });
    return { token, expiresAt, user: this.publicUser(user) };
  }

  async authenticate(token: string): Promise<DatabaseSession> {
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: this.tokenHash(token) },
      include: { user: { include: { roles: { orderBy: { assignedAt: 'asc' } } } } },
    });
    if (!session || session.expiresAt <= new Date())
      throw new UnauthorizedException('Invalid or expired session');
    const roles = session.user.roles.map((entry) => entry.role);
    if (session.user.accountStatus !== AccountStatus.ACTIVE || roles.length === 0) {
      throw new UnauthorizedException('Account is inactive or has no role');
    }
    return {
      id: session.user.id,
      role: roles[0],
      roles,
      accountStatus: session.user.accountStatus,
      majorId: session.user.majorId,
    };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: { orderBy: { assignedAt: 'asc' } } },
    });
    return this.publicUser(user);
  }

  async logout(token: string): Promise<void> {
    await this.prisma.authSession.deleteMany({ where: { tokenHash: this.tokenHash(token) } });
  }

  private tokenHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private publicUser(user: {
    id: string;
    username: string;
    universityEmail: string;
    fullName: string;
    accountStatus: AccountStatus;
    majorId: string | null;
    roles: Array<{ role: UserRole }>;
  }): PublicUser {
    return {
      id: user.id,
      username: user.username,
      email: user.universityEmail,
      name: user.fullName,
      accountStatus: user.accountStatus,
      majorId: user.majorId,
      roles: user.roles.map((entry) => entry.role),
    };
  }
}
