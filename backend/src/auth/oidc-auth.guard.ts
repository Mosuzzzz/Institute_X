import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedSession, AuthSessionCache } from './auth-session-cache';
import { OIDC_TOKEN_VERIFIER, OidcTokenVerifier } from './oidc-token-verifier';
import { SsoUserService } from './sso-user.service';

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedSession;
}

@Injectable()
export class OidcAuthGuard implements CanActivate {
  constructor(
    @Inject(OIDC_TOKEN_VERIFIER) private readonly verifier: OidcTokenVerifier,
    private readonly users: SsoUserService,
    private readonly sessions: AuthSessionCache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user) {
      return true;
    }

    const token = this.bearerToken(request.headers.authorization);
    const cached = await this.sessions.get(token).catch(() => null);
    if (cached) {
      request.user = cached;
      return true;
    }

    let identity;
    try {
      identity = await this.verifier.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired institutional token');
    }

    const user = await this.users.synchronize(identity);
    const session: AuthenticatedSession = {
      id: user.id,
      role: user.role,
      accountStatus: user.accountStatus,
      majorId: user.majorId,
    };
    request.user = session;
    await this.sessions.set(token, session).catch(() => undefined);
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
