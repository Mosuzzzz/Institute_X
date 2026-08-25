import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountStatus, UserRole } from '@prisma/client';
import { OidcTokenVerifier } from './oidc-token-verifier';
import { SsoIdentity } from './sso-identity';

type Claims = Record<string, unknown>;

@Injectable()
export class OidcUserInfoTokenVerifier implements OidcTokenVerifier {
  constructor(private readonly config: ConfigService) {}

  async verify(token: string): Promise<SsoIdentity> {
    let response: Response;
    try {
      response = await fetch(this.config.getOrThrow<string>('OIDC_USERINFO_URL'), {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      throw new UnauthorizedException('Institutional identity provider is unavailable');
    }
    if (!response.ok) {
      throw new UnauthorizedException('Institutional token was rejected');
    }

    let claims: Claims;
    try {
      claims = (await response.json()) as Claims;
    } catch {
      throw new UnauthorizedException('Institutional identity claims are invalid');
    }
    return this.toIdentity(claims);
  }

  private toIdentity(claims: Claims): SsoIdentity {
    const subject = this.requiredString(claims.sub);
    const universityEmail = this.requiredString(claims.email).toLowerCase();
    const fullName = this.requiredString(claims.name);
    const allowedEmailDomain = this.config
      .getOrThrow<string>('OIDC_ALLOWED_EMAIL_DOMAIN')
      .trim()
      .toLowerCase()
      .replace(/^@/, '');
    const role = claims[this.config.getOrThrow<string>('OIDC_ROLE_CLAIM')];
    const accountStatus =
      claims[this.config.getOrThrow<string>('OIDC_ACCOUNT_STATUS_CLAIM')];
    const majorCode = claims[this.config.getOrThrow<string>('OIDC_MAJOR_CODE_CLAIM')];

    if (
      claims.email_verified !== true ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(universityEmail) ||
      !universityEmail.endsWith(`@${allowedEmailDomain}`) ||
      !Object.values(UserRole).includes(role as UserRole) ||
      !Object.values(AccountStatus).includes(accountStatus as AccountStatus)
    ) {
      throw new UnauthorizedException('Institutional identity claims are invalid');
    }

    return {
      subject,
      universityEmail,
      fullName,
      role: role as UserRole,
      accountStatus: accountStatus as AccountStatus,
      ...(typeof majorCode === 'string' && majorCode.trim()
        ? { majorCode: majorCode.trim() }
        : {}),
    };
  }

  private requiredString(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new UnauthorizedException('Institutional identity claims are invalid');
    }
    return value.trim();
  }
}
