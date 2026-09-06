import 'dotenv/config';
import { AccountStatus, UserRole } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { createClient } from 'redis';
import type { AuthenticatedSession } from '../src/auth/auth-session-cache';
import { OidcAuthGuard } from '../src/auth/oidc-auth.guard';
import { RedisAuthSessionCache } from '../src/auth/redis-auth-session-cache';

const describeRedis = process.env.RUN_REDIS_INTEGRATION === 'true' ? describe : describe.skip;

describeRedis('Redis authentication cache integration', () => {
  it('serves the second request from Redis without repeating SSO verification or DB sync', async () => {
    const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';

    const client = createClient({ url: redisUrl });
    client.on('error', () => undefined);
    const cache = new RedisAuthSessionCache(client, 60);
    const token = `integration-token-${randomUUID()}`;
    const key = `auth:session:${createHash('sha256').update(token).digest('hex')}`;
    const verifier = {
      verify: jest.fn().mockResolvedValue({
        subject: `student-${randomUUID()}`,
        username: 'integration-student',
        universityEmail: 'integration-student@institute.example',
        fullName: 'Integration Student',
        role: UserRole.STUDENT,
        accountStatus: AccountStatus.ACTIVE,
        majorCode: 'IT',
      }),
    };
    const users = {
      synchronize: jest.fn().mockResolvedValue({
        id: randomUUID(),
        role: UserRole.STUDENT,
        accountStatus: AccountStatus.ACTIVE,
        majorId: randomUUID(),
      }),
    };
    const guard = new OidcAuthGuard(verifier as never, users as never, cache);
    type TestRequest = {
      headers: { authorization: string };
      user?: AuthenticatedSession;
    };
    type TestContext = {
      request: TestRequest;
      context: { switchToHttp: () => { getRequest: () => TestRequest } };
    };
    const createContext = (): TestContext => {
      const request: TestRequest = { headers: { authorization: `Bearer ${token}` } };
      return {
        request,
        context: {
          switchToHttp: () => ({ getRequest: () => request }),
        },
      };
    };

    try {
      const first = createContext();
      const second = createContext();
      await expect(guard.canActivate(first.context as never)).resolves.toBe(true);
      await expect(guard.canActivate(second.context as never)).resolves.toBe(true);

      expect(verifier.verify).toHaveBeenCalledTimes(1);
      expect(users.synchronize).toHaveBeenCalledTimes(1);
      expect(second.request).toHaveProperty('user', first.request.user);
      await expect(client.ttl(key)).resolves.toBeGreaterThan(0);
      await expect(client.ttl(key)).resolves.toBeLessThanOrEqual(60);
      expect(key).not.toContain(token);
    } finally {
      if (client.isReady) await client.del(key);
      await cache.onModuleDestroy();
    }
  });
});
