import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccountStatus, UserRole } from '@prisma/client';

export interface CurrentUserValue {
  id: string;
  role: UserRole;
  accountStatus: AccountStatus;
  majorId?: string | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserValue => {
    const request = context.switchToHttp().getRequest<{ user: CurrentUserValue }>();
    return request.user;
  },
);
