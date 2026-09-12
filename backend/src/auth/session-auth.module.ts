import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthModule } from './auth.module';
import { AUTH_SESSION_CACHE } from './auth-session-cache';
import { RedisAuthSessionCache } from './redis-auth-session-cache';
import { OtpEmailSender } from './otp-email-sender';
import { ResendOtpEmailSender } from './resend-otp-email-sender';
import { MailpitOtpEmailSender } from './mailpit-otp-email-sender';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    RedisAuthSessionCache,
    ResendOtpEmailSender,
    MailpitOtpEmailSender,
    {
      provide: OtpEmailSender,
      inject: [ConfigService, MailpitOtpEmailSender, ResendOtpEmailSender],
      useFactory: (
        config: ConfigService,
        mailpit: MailpitOtpEmailSender,
        resend: ResendOtpEmailSender,
      ): OtpEmailSender =>
        config.get<string>('OTP_EMAIL_PROVIDER') === 'mailpit' ? mailpit : resend,
    },
    { provide: AUTH_SESSION_CACHE, useExisting: RedisAuthSessionCache },
  ],
  exports: [AuthService, AUTH_SESSION_CACHE],
})
export class SessionAuthModule {}
