import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountStatus, UserRole } from '@prisma/client';
import { OidcTokenVerifier } from './oidc-token-verifier';
import { SsoIdentity } from './sso-identity';

interface MockSsoResponse {
  success: boolean;
  valid?: boolean;
  user?: {
    user_id?: unknown;
    username?: unknown;
    name?: unknown;
    email?: unknown;
    major_code?: unknown;
  };
  status?: {
    is_active?: unknown;
    is_current_student?: unknown;
    is_educational_personnel?: unknown;
    personnel_type?: unknown;
  };
}

@Injectable()
export class MockSsoTokenVerifier implements OidcTokenVerifier {
  constructor(private readonly config: ConfigService) {}

  async verify(token: string): Promise<SsoIdentity> {
    let response: Response;
    try {
      response = await fetch(this.config.getOrThrow<string>('MOCK_SSO_ME_URL'), {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      throw new UnauthorizedException('Mock University SSO is unavailable');
    }
    if (!response.ok) {
      throw new UnauthorizedException('Mock University SSO token was rejected');
    }

    let payload: MockSsoResponse;
    try {
      payload = (await response.json()) as MockSsoResponse;
    } catch {
      throw new UnauthorizedException('Mock University SSO response is invalid');
    }
    const identity = this.toIdentity(payload);
    if (
      identity.role !== UserRole.STUDENT ||
      identity.accountStatus !== AccountStatus.ACTIVE ||
      identity.majorCode
    ) {
      return identity;
    }

    const verifiedPayload = await this.fetchStudentProfile(identity.subject);
    const verifiedIdentity = this.toIdentity(verifiedPayload);
    if (
      verifiedPayload.valid !== true ||
      verifiedIdentity.subject !== identity.subject ||
      verifiedIdentity.universityEmail !== identity.universityEmail
    ) {
      throw new UnauthorizedException('Mock University SSO identity mismatch');
    }
    return verifiedIdentity;
  }

  private async fetchStudentProfile(subject: string): Promise<MockSsoResponse> {
    let response: Response;
    try {
      response = await fetch(this.config.getOrThrow<string>('MOCK_SSO_VERIFY_URL'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: subject }),
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      throw new UnauthorizedException('Mock University SSO is unavailable');
    }
    if (!response.ok) {
      throw new UnauthorizedException('Mock University SSO profile was rejected');
    }
    try {
      return (await response.json()) as MockSsoResponse;
    } catch {
      throw new UnauthorizedException('Mock University SSO response is invalid');
    }
  }

  private toIdentity(payload: MockSsoResponse): SsoIdentity {
    const user = payload.user;
    const status = payload.status;
    if (
      payload.success !== true ||
      !user ||
      !status ||
      typeof status.is_active !== 'boolean' ||
      typeof status.is_current_student !== 'boolean' ||
      typeof status.is_educational_personnel !== 'boolean'
    ) {
      throw new UnauthorizedException('Mock University SSO response is invalid');
    }
    const subject = this.requiredString(user.user_id);
    const username = this.optionalString(user.username) ?? subject;
    const universityEmail = this.requiredString(user.email).toLowerCase();
    const fullName = this.requiredString(user.name);
    const allowedDomain = this.config
      .get<string>('MOCK_SSO_ALLOWED_EMAIL_DOMAIN', 'university.ac.th')
      .trim()
      .toLowerCase()
      .replace(/^@/, '');
    if (!universityEmail.endsWith(`@${allowedDomain}`)) {
      throw new UnauthorizedException('Mock University email domain is invalid');
    }

    const role = this.resolveRole(status);
    const majorCode =
      role === UserRole.STUDENT
        ? this.optionalString(user.major_code)
        : undefined;

    return {
      subject,
      username,
      universityEmail,
      fullName,
      role,
      accountStatus: status.is_active ? AccountStatus.ACTIVE : AccountStatus.INACTIVE,
      majorCode,
    };
  }

  private resolveRole(status: NonNullable<MockSsoResponse['status']>): UserRole {
    if (status.is_current_student === true && status.is_educational_personnel === false) {
      return UserRole.STUDENT;
    }
    if (status.is_current_student === false && status.is_educational_personnel === true) {
      if (status.personnel_type === 'lecturer') {
        return UserRole.TEACHER;
      }
      if (status.personnel_type === 'staff') {
        return this.config.get<UserRole>('MOCK_SSO_STAFF_ROLE', UserRole.APPROVER);
      }
      throw new UnauthorizedException('Educational personnel type is not supported');
    }
    if (status.is_active === false) {
      return UserRole.STUDENT;
    }
    throw new UnauthorizedException('Mock University affiliation is not eligible');
  }

  private requiredString(value: unknown): string {
    const result = this.optionalString(value);
    if (!result) {
      throw new UnauthorizedException('Mock University SSO response is invalid');
    }
    return result;
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
}
