import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountStatus, Prisma, UserRole } from '@prisma/client';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { AUTH_SESSION_CACHE, AuthSessionCache } from './auth-session-cache';
import { OtpEmailSender } from './otp-email-sender';

const OTP_LIFETIME_MS = 5 * 60 * 1000;
const OTP_RATE_WINDOW_MS = 15 * 60 * 1000;
const OTP_REQUEST_LIMIT = 5;
const OTP_ATTEMPT_LIMIT = 5;

export type DatabaseSession = {
  id: string;
  role: UserRole;
  roles: UserRole[];
  accountStatus: AccountStatus;
  majorId: string | null;
};
export type PublicUser = {
  id: string;
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
    @Inject(AUTH_SESSION_CACHE) private readonly cache: AuthSessionCache,
    private readonly config: ConfigService,
    private readonly emails: OtpEmailSender,
  ) {}

  async requestOtp(
    inputEmail: string,
    requestAddress?: string,
  ): Promise<{ challengeId: string; expiresAt: Date }> {
    const email = this.institutionalEmail(inputEmail);
    const requestedBy = requestAddress ? this.secretHash(requestAddress) : null;
    const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const expiresAt = new Date(Date.now() + OTP_LIFETIME_MS);
    const challenge = await this.prisma.$transaction(async (tx) => {
      const lockKeys = [
        `otp:email:${email}`,
        ...(requestedBy ? [`otp:address:${requestedBy}`] : []),
      ].sort();
      for (const key of lockKeys) {
        await tx.$queryRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text AS locked`,
        );
      }
      const recentRequests = await tx.emailOtp.count({
        where: {
          createdAt: { gte: new Date(Date.now() - OTP_RATE_WINDOW_MS) },
          OR: [{ email }, ...(requestedBy ? [{ requestedBy }] : [])],
        },
      });
      if (recentRequests >= OTP_REQUEST_LIMIT)
        throw new HttpException(
          'Too many OTP requests. Try again later',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      return tx.emailOtp.create({
        data: { email, otpHash: this.otpHash(email, otp), expiresAt, requestedBy },
        select: { id: true },
      });
    });
    try {
      await this.emails.send(email, otp);
    } catch (error) {
      await this.prisma.emailOtp.deleteMany({ where: { id: challenge.id } });
      throw error;
    }
    return { challengeId: challenge.id, expiresAt };
  }

  async verifyOtp(
    challengeId: string,
    otp: string,
  ): Promise<{ token: string; expiresAt: Date; user: PublicUser }> {
    const challenge = await this.prisma.emailOtp.findUnique({ where: { id: challengeId } });
    const now = new Date();
    if (!challenge || challenge.usedAt || challenge.expiresAt <= now)
      throw new UnauthorizedException('Verification code is invalid or expired');
    const attempt = await this.prisma.emailOtp.updateMany({
      where: {
        id: challengeId,
        usedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: OTP_ATTEMPT_LIMIT },
      },
      data: { attempts: { increment: 1 } },
    });
    if (attempt.count !== 1)
      throw new HttpException('Too many verification attempts', HttpStatus.TOO_MANY_REQUESTS);
    if (!this.matchesOtp(challenge.email, otp, challenge.otpHash))
      throw new UnauthorizedException('Verification code is invalid or expired');

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.sessionLifetimeMs);
    const user = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.emailOtp.updateMany({
        where: { id: challengeId, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1)
        throw new UnauthorizedException('Verification code is invalid or expired');
      const account = await tx.user.upsert({
        where: { universityEmail: challenge.email },
        create: {
          universityEmail: challenge.email,
          fullName: this.defaultName(challenge.email),
          emailVerifiedAt: new Date(),
          accountStatus: AccountStatus.ACTIVE,
          roles: { create: { role: UserRole.STUDENT } },
        },
        update: { emailVerifiedAt: new Date() },
        include: { roles: { orderBy: { assignedAt: 'asc' } } },
      });
      if (account.accountStatus !== AccountStatus.ACTIVE)
        throw new UnauthorizedException('Institutional account is inactive');
      await tx.authSession.create({
        data: { userId: account.id, tokenHash: this.tokenHash(token), expiresAt },
      });
      return account;
    });
    return { token, expiresAt, user: this.publicUser(user) };
  }

  async authenticate(token: string): Promise<DatabaseSession> {
    const tokenHash = this.tokenHash(token);
    const cached = await this.cache.get(tokenHash);
    if (cached) return cached;
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash },
      include: { user: { include: { roles: { orderBy: { assignedAt: 'asc' } } } } },
    });
    if (!session || session.expiresAt <= new Date())
      throw new UnauthorizedException('Invalid or expired session');
    const roles = this.studentFirst(session.user.roles.map((entry) => entry.role));
    if (
      !session.user.emailVerifiedAt ||
      session.user.accountStatus !== AccountStatus.ACTIVE ||
      !roles.includes(UserRole.STUDENT)
    )
      throw new UnauthorizedException(
        'Account is unverified, inactive or is missing the STUDENT role',
      );
    const authenticated = {
      id: session.user.id,
      role: roles[0],
      roles,
      accountStatus: session.user.accountStatus,
      majorId: session.user.majorId,
    };
    await this.cache.set(tokenHash, authenticated, session.expiresAt);
    return authenticated;
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: { orderBy: { assignedAt: 'asc' } } },
    });
    return this.publicUser(user);
  }
  async logout(token: string): Promise<void> {
    const tokenHash = this.tokenHash(token);
    await this.prisma.authSession.deleteMany({ where: { tokenHash } });
    await this.cache.delete(tokenHash);
  }

  private institutionalEmail(value: string): string {
    const email = value.trim().toLowerCase();
    if (!/^[^@\s]+@x\.ac\.th$/.test(email))
      throw new UnauthorizedException('Use your @x.ac.th email address');
    return email;
  }
  private otpHash(email: string, otp: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('OTP_HASH_SECRET'))
      .update(`${email}:${otp}`)
      .digest('hex');
  }
  private matchesOtp(email: string, otp: string, stored: string): boolean {
    const expected = Buffer.from(stored, 'hex');
    const actual = Buffer.from(this.otpHash(email, otp), 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
  private secretHash(value: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('OTP_HASH_SECRET'))
      .update(value)
      .digest('hex');
  }
  private tokenHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  private defaultName(email: string): string {
    return email
      .slice(0, email.indexOf('@'))
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  private publicUser(user: {
    id: string;
    universityEmail: string;
    fullName: string;
    accountStatus: AccountStatus;
    majorId: string | null;
    roles: Array<{ role: UserRole }>;
  }): PublicUser {
    const roles = this.studentFirst(user.roles.map((entry) => entry.role));
    if (!roles.includes(UserRole.STUDENT))
      throw new UnauthorizedException('Every account must have the STUDENT role');
    return {
      id: user.id,
      email: user.universityEmail,
      name: user.fullName,
      accountStatus: user.accountStatus,
      majorId: user.majorId,
      roles,
    };
  }
  private studentFirst(roles: UserRole[]): UserRole[] {
    return roles.includes(UserRole.STUDENT)
      ? [UserRole.STUDENT, ...roles.filter((role) => role !== UserRole.STUDENT)]
      : roles;
  }
}
