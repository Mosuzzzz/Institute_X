import { OnModuleDestroy } from '@nestjs/common';
import { AccountStatus, UserRole } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { RedisClientType } from 'redis';
import { AuthenticatedSession, AuthSessionCache } from './auth-session-cache';

const RETRY_DELAY_MS = 5_000;

export class RedisAuthSessionCache extends AuthSessionCache implements OnModuleDestroy {
  private connectPromise: Promise<boolean> | null = null;
  private retryAfter = 0;

  constructor(
    private readonly client: RedisClientType,
    private readonly ttlSeconds: number,
  ) {
    super();
  }

  async get(token: string): Promise<AuthenticatedSession | null> {
    if (!(await this.ensureConnected())) return null;
    try {
      const serialized = await this.client.get(this.keyFor(token));
      if (!serialized) return null;
      return this.parse(serialized);
    } catch {
      this.openCircuit();
      return null;
    }
  }

  async set(token: string, session: AuthenticatedSession): Promise<void> {
    if (!(await this.ensureConnected())) return;
    try {
      await this.client.set(this.keyFor(token), JSON.stringify(session), { EX: this.ttlSeconds });
    } catch {
      this.openCircuit();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client.isOpen) return;
    try {
      await this.client.quit();
    } catch {
      this.client.destroy();
    }
  }

  private async ensureConnected(): Promise<boolean> {
    if (this.client.isReady) return true;
    if (Date.now() < this.retryAfter) return false;
    if (!this.connectPromise) {
      this.connectPromise = this.client
        .connect()
        .then(() => true)
        .catch(() => {
          this.openCircuit();
          return false;
        })
        .finally(() => {
          this.connectPromise = null;
        });
    }
    return this.connectPromise;
  }

  private openCircuit(): void {
    this.retryAfter = Date.now() + RETRY_DELAY_MS;
  }

  private keyFor(token: string): string {
    return `auth:session:${createHash('sha256').update(token).digest('hex')}`;
  }

  private parse(serialized: string): AuthenticatedSession | null {
    try {
      const value = JSON.parse(serialized) as Partial<AuthenticatedSession>;
      if (
        typeof value.id !== 'string' ||
        !Object.values(UserRole).includes(value.role as UserRole) ||
        !Object.values(AccountStatus).includes(value.accountStatus as AccountStatus) ||
        (value.majorId !== null && typeof value.majorId !== 'string')
      ) {
        return null;
      }
      return value as AuthenticatedSession;
    } catch {
      return null;
    }
  }
}
