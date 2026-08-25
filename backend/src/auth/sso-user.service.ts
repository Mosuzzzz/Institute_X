import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AccountStatus, Prisma, User, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SsoIdentity } from './sso-identity';

@Injectable()
export class SsoUserService {
  constructor(private readonly prisma: PrismaService) {}

  async synchronize(identity: SsoIdentity): Promise<User> {
    if (identity.accountStatus !== AccountStatus.ACTIVE) {
      throw new ForbiddenException('Institutional account is inactive');
    }

    const majorId = await this.resolveMajorId(identity);
    const userData = {
      universityEmail: identity.universityEmail.trim().toLowerCase(),
      fullName: identity.fullName.trim(),
      role: identity.role,
      accountStatus: identity.accountStatus,
      majorId,
    };

    try {
      return await this.prisma.user.upsert({
        where: { ssoSubject: identity.subject },
        create: { ssoSubject: identity.subject, ...userData },
        update: userData,
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('SSO identity conflicts with an existing user');
      }
      throw error;
    }
  }

  private async resolveMajorId(identity: SsoIdentity): Promise<string | null> {
    if (identity.role !== UserRole.STUDENT) {
      return null;
    }
    if (!identity.majorCode) {
      throw new UnprocessableEntityException('Student Major is required');
    }

    const major = await this.prisma.major.findUnique({
      where: { code: identity.majorCode },
      select: { id: true },
    });
    if (!major) {
      throw new UnprocessableEntityException('Student Major is not recognized');
    }
    return major.id;
  }
}
