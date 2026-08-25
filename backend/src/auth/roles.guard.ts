import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountStatus, UserRole } from '@prisma/client';
import { Request } from 'express';
import { ROLES_KEY } from './roles.decorator';

interface AuthenticatedRequest extends Request {
  user?: { role: UserRole; accountStatus: AccountStatus };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Authentication is required');
    }
    if (user.accountStatus !== AccountStatus.ACTIVE) {
      throw new ForbiddenException('Institutional account is inactive');
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles?.length && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Role is not permitted');
    }
    return true;
  }
}
