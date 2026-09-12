import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountStatus, UserRole } from '@prisma/client';
import { createClient, RedisClientType } from 'redis';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { DatabaseSession } from './auth.service';
import { AuthCacheStats, AuthSessionCache } from './auth-session-cache';

@Injectable()
export class RedisAuthSessionCache
  extends AuthSessionCache
  implements OnModuleInit, OnModuleDestroy
{
  private client: RedisClientType | null = null;
  private hits = 0;
  private misses = 0;
  private errors = 0;

  constructor(private readonly config: ConfigService) {
    super();
  }

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) return;
    const client = createClient({
      url,
      password: this.config.get<string>('REDIS_PASSWORD'),
      socket: {
        connectTimeout: 1_000,
        reconnectStrategy: false,
      },
    });
    client.on('error', () => undefined);
    try {
      await client.connect();
      this.client = client;
    } catch {
      if (client.isOpen) client.destroy();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) await this.client.quit().catch(() => undefined);
  }

  async get(tokenHash: string): Promise<DatabaseSession | null> {
    if (!this.client?.isReady) return null;
    try {
      const raw = await this.client.get(this.key(tokenHash));
      if (!raw) {
        this.misses += 1;
        return null;
      }
      const envelope = JSON.parse(raw) as { payload: string; signature: string };
      if (!this.validSignature(envelope.payload, envelope.signature)) {
        this.errors += 1;
        await this.client.del(this.key(tokenHash));
        return null;
      }
      const value = JSON.parse(envelope.payload) as DatabaseSession;
      if (
        !value.id ||
        value.accountStatus !== AccountStatus.ACTIVE ||
        !Array.isArray(value.roles) ||
        !value.roles.includes(UserRole.STUDENT) ||
        !value.roles.every((role) => Object.values(UserRole).includes(role)) ||
        !value.roles.includes(value.role)
      )
        return null;
      this.hits += 1;
      return value;
    } catch {
      this.errors += 1;
      return null;
    }
  }

  async set(tokenHash: string, session: DatabaseSession, expiresAt: Date): Promise<void> {
    if (!this.client?.isReady) return;
    const configuredTtl = this.config.get<number>('AUTH_SESSION_CACHE_TTL_SECONDS', 60);
    const ttl = Math.min(
      configuredTtl,
      Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
    );
    const payload = JSON.stringify(session);
    const cacheKey = this.key(tokenHash);
    try {
      await this.client
        .multi()
        .set(cacheKey, JSON.stringify({ payload, signature: this.sign(payload) }), { EX: ttl })
        .sAdd(this.userKey(session.id), cacheKey)
        .expire(this.userKey(session.id), ttl)
        .exec();
    } catch {
      this.errors += 1;
    }
  }

  async delete(tokenHash: string): Promise<void> {
    if (!this.client?.isReady) return;
    try {
      const cacheKey = this.key(tokenHash);
      const raw = await this.client.get(cacheKey);
      if (!raw) return;
      const envelope = JSON.parse(raw) as { payload: string; signature: string };
      if (!this.validSignature(envelope.payload, envelope.signature)) {
        await this.client.del(cacheKey);
        return;
      }
      const session = JSON.parse(envelope.payload) as DatabaseSession;
      await this.client.multi().del(cacheKey).sRem(this.userKey(session.id), cacheKey).exec();
    } catch {
      this.errors += 1;
    }
  }

  async invalidateUser(userId: string): Promise<void> {
    if (!this.client?.isReady) return;
    try {
      const indexKey = this.userKey(userId);
      const keys = await this.client.sMembers(indexKey);
      if (keys.length) await this.client.del(keys);
      await this.client.del(indexKey);
    } catch {
      this.errors += 1;
    }
  }

  stats(): AuthCacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      ready: this.client?.isReady ?? false,
    };
  }

  private key(tokenHash: string): string {
    return `auth:otp-session:${tokenHash}`;
  }
  private userKey(userId: string): string {
    return `auth:otp-user:${userId}:sessions`;
  }
  private sign(payload: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('AUTH_CACHE_SIGNING_KEY'))
      .update(payload)
      .digest('hex');
  }
  private validSignature(payload: string, signature: string): boolean {
    const expected = Buffer.from(this.sign(payload), 'hex');
    const actual = Buffer.from(signature || '', 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
