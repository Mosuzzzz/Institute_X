import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ModuleRef } from '@nestjs/core';
import { AuthService, DatabaseSession } from './auth.service';

interface AuthenticatedRequest extends Request {
  user?: DatabaseSession;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly moduleRef: ModuleRef) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user) {
      return true;
    }

    const token = this.bearerToken(request.headers.authorization);
    request.user = await this.moduleRef.get(AuthService, { strict: false }).authenticate(token);
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
