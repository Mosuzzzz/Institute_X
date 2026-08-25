import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { OidcAuthGuard } from './oidc-auth.guard';
import { OIDC_TOKEN_VERIFIER, OidcTokenVerifier } from './oidc-token-verifier';
import { OidcUserInfoTokenVerifier } from './oidc-userinfo-token-verifier';
import { RolesGuard } from './roles.guard';
import { SsoUserService } from './sso-user.service';
import { UnconfiguredOidcTokenVerifier } from './unconfigured-oidc-token-verifier';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [
    SsoUserService,
    OidcAuthGuard,
    RolesGuard,
    {
      provide: OIDC_TOKEN_VERIFIER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): OidcTokenVerifier =>
        config.get<string>('OIDC_USERINFO_URL')
          ? new OidcUserInfoTokenVerifier(config)
          : new UnconfiguredOidcTokenVerifier(),
    },
  ],
  exports: [SsoUserService, OIDC_TOKEN_VERIFIER, OidcAuthGuard, RolesGuard],
})
export class AuthModule {}
