import { Module } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { SsoUserService } from './sso-user.service';

@Module({
  providers: [SsoUserService, RolesGuard],
  exports: [SsoUserService, RolesGuard],
})
export class AuthModule {}
