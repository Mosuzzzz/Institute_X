import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { OidcAuthGuard } from './oidc-auth.guard';
import { MockSsoTokenVerifier } from './mock-sso-token-verifier';
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
      useFactory: (config: ConfigService): OidcTokenVerifier => {
        if (
          config.get<string>('SSO_PROVIDER', 'oidc') === 'mock' &&
          config.get<string>('MOCK_SSO_ME_URL')
        ) {
          return new MockSsoTokenVerifier(config);
        }
        if (config.get<string>('OIDC_USERINFO_URL')) {
          return new OidcUserInfoTokenVerifier(config);
        }
        return new UnconfiguredOidcTokenVerifier();
      },
    },
  ],
  exports: [SsoUserService, OIDC_TOKEN_VERIFIER, OidcAuthGuard, RolesGuard],
})
export class AuthModule {}
