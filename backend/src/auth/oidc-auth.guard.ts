import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AccountStatus, UserRole } from '@prisma/client';
import { Request } from 'express';
import { OIDC_TOKEN_VERIFIER, OidcTokenVerifier } from './oidc-token-verifier';
import { SsoUserService } from './sso-user.service';

interface AuthenticatedUser {
  id: string;
  role: UserRole;
  accountStatus: AccountStatus;
  majorId: string | null;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class OidcAuthGuard implements CanActivate {
  constructor(
    @Inject(OIDC_TOKEN_VERIFIER) private readonly verifier: OidcTokenVerifier,
    private readonly users: SsoUserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user) {
      return true;
    }

    const token = this.bearerToken(request.headers.authorization);
    let identity;
    try {
      identity = await this.verifier.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired institutional token');
    }

    const user = await this.users.synchronize(identity);
    request.user = {
      id: user.id,
      role: user.role,
      accountStatus: user.accountStatus,
      majorId: user.majorId,
    };
    return true;
  }

  private bearerToken(authorization: string | undefined): string {
    const match = authorization?.match(/^Bearer ([^\s]+)$/i);
    if (!match) {
      throw new UnauthorizedException('Bearer authentication is required');
    }
    return match[1];
  }
}
