import { ConfigService } from '@nestjs/config';
import { AccountStatus, UserRole } from '@prisma/client';
import { RedisAuthSessionCache } from '../src/auth/redis-auth-session-cache';

const runIntegration = process.env.RUN_REDIS_INTEGRATION === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('RedisAuthSessionCache integration', () => {
  let cache: RedisAuthSessionCache;

  beforeAll(async () => {
    if (!process.env.REDIS_URL) throw new Error('REDIS_URL is required');
    if (!process.env.AUTH_CACHE_SIGNING_KEY) throw new Error('AUTH_CACHE_SIGNING_KEY is required');
    cache = new RedisAuthSessionCache(new ConfigService(process.env));
    await cache.onModuleInit();
    if (!cache.stats().ready) throw new Error('Redis is not ready');
  });

  afterAll(async () => cache?.onModuleDestroy());

  it('round-trips and invalidates a signed session', async () => {
    const tokenHash = `integration-${Date.now()}`;
    const userId = `integration-user-${Date.now()}`;
    const session = {
      id: userId,
      role: UserRole.STUDENT,
      roles: [UserRole.STUDENT],
      accountStatus: AccountStatus.ACTIVE,
      majorId: null,
    };

    await cache.set(tokenHash, session, new Date(Date.now() + 60_000));
    await expect(cache.get(tokenHash)).resolves.toEqual(session);
    await cache.invalidateUser(userId);
    await expect(cache.get(tokenHash)).resolves.toBeNull();
  });
});
