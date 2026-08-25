import { AccountStatus, UserRole } from '@prisma/client';

/** Normalized claims produced by a trusted OIDC or SAML adapter. */
export interface SsoIdentity {
  subject: string;
  username?: string;
  universityEmail: string;
  fullName: string;
  role: UserRole;
  accountStatus: AccountStatus;
  majorCode?: string;
}
