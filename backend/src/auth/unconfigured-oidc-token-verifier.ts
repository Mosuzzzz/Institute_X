import { ServiceUnavailableException } from '@nestjs/common';
import { OidcTokenVerifier } from './oidc-token-verifier';
import { SsoIdentity } from './sso-identity';

export class UnconfiguredOidcTokenVerifier implements OidcTokenVerifier {
  verify(): Promise<SsoIdentity> {
    throw new ServiceUnavailableException('Institutional SSO is not configured');
  }
}
