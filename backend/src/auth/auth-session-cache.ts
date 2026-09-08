import { AccountStatus, UserRole } from '@prisma/client';

export interface AuthenticatedSession {
  id: string;
  role: UserRole;
  roles?: UserRole[];
  accountStatus: AccountStatus;
  majorId: string | null;
}

export abstract class AuthSessionCache {
  abstract get(token: string): Promise<AuthenticatedSession | null>;
  abstract set(token: string, session: AuthenticatedSession): Promise<void>;
}

export class NoopAuthSessionCache extends AuthSessionCache {
  get(): Promise<null> {
    return Promise.resolve(null);
  }

  set(): Promise<void> {
    return Promise.resolve();
  }
}
