import type { DatabaseSession } from './auth.service';

export const AUTH_SESSION_CACHE = Symbol('AUTH_SESSION_CACHE');
export type AuthCacheStats = { hits: number; misses: number; errors: number; ready: boolean };

export abstract class AuthSessionCache {
  abstract get(tokenHash: string): Promise<DatabaseSession | null>;
  abstract set(tokenHash: string, session: DatabaseSession, expiresAt: Date): Promise<void>;
  abstract delete(tokenHash: string): Promise<void>;
  abstract invalidateUser(userId: string): Promise<void>;
  abstract stats(): AuthCacheStats;
}

export class NoopAuthSessionCache extends AuthSessionCache {
  get(): Promise<null> {
    return Promise.resolve(null);
  }
  set(): Promise<void> {
    return Promise.resolve();
  }
  delete(): Promise<void> {
    return Promise.resolve();
  }
  invalidateUser(): Promise<void> {
    return Promise.resolve();
  }
  stats(): AuthCacheStats {
    return { hits: 0, misses: 0, errors: 0, ready: false };
  }
}
