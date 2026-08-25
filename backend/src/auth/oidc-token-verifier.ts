import { SsoIdentity } from './sso-identity';

export const OIDC_TOKEN_VERIFIER = Symbol('OIDC_TOKEN_VERIFIER');

export interface OidcTokenVerifier {
  verify(token: string): Promise<SsoIdentity>;
}
