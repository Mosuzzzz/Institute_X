import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthModule } from './auth.module';
import { PasswordHasher } from './password-hasher';
import { AUTH_SESSION_CACHE } from './auth-session-cache';
import { RedisAuthSessionCache } from './redis-auth-session-cache';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordHasher,
    RedisAuthSessionCache,
    { provide: AUTH_SESSION_CACHE, useExisting: RedisAuthSessionCache },
  ],
  exports: [AuthService, PasswordHasher, AUTH_SESSION_CACHE],
})
export class SessionAuthModule {}
