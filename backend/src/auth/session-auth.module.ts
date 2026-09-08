import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthModule } from './auth.module';
import { PasswordHasher } from './password-hasher';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordHasher],
  exports: [AuthService, PasswordHasher],
})
export class SessionAuthModule {}
