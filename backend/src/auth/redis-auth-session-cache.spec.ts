import { AccountStatus, UserRole } from '@prisma/client';
import { RedisAuthSessionCache } from './redis-auth-session-cache';

describe('RedisAuthSessionCache', () => {
  const client = {
    isOpen: true,
    isReady: true,
    connect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    quit: jest.fn(),
    destroy: jest.fn(),
  };
  const session = {
    id: 'user-id',
    role: UserRole.STUDENT,
    accountStatus: AccountStatus.ACTIVE,
    majorId: 'major-id',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    client.isOpen = true;
    client.isReady = true;
  });

  it('stores a session under a SHA-256 token key with the configured TTL', async () => {
    client.set.mockResolvedValue('OK');
    const cache = new RedisAuthSessionCache(client as never, 300);

    await cache.set('secret-bearer-token', session);

    expect(client.set).toHaveBeenCalledWith(
      expect.stringMatching(/^auth:session:[a-f0-9]{64}$/),
      JSON.stringify(session),
      { EX: 300 },
    );
    expect(client.set.mock.calls[0][0]).not.toContain('secret-bearer-token');
  });

  it('returns a valid cached session', async () => {
    client.get.mockResolvedValue(JSON.stringify(session));
    const cache = new RedisAuthSessionCache(client as never, 300);

    await expect(cache.get('token')).resolves.toEqual(session);
  });

  it('ignores malformed or invalid cached values', async () => {
    const cache = new RedisAuthSessionCache(client as never, 300);
    client.get.mockResolvedValueOnce('{invalid-json');
    await expect(cache.get('token')).resolves.toBeNull();

    client.get.mockResolvedValueOnce(JSON.stringify({ ...session, role: 'UNTRUSTED_ROLE' }));
    await expect(cache.get('token')).resolves.toBeNull();
  });

  it('fails open when Redis cannot connect', async () => {
    client.isOpen = false;
    client.isReady = false;
    client.connect.mockRejectedValue(new Error('Redis unavailable'));
    const cache = new RedisAuthSessionCache(client as never, 300);

    await expect(cache.get('token')).resolves.toBeNull();
    expect(client.get).not.toHaveBeenCalled();
  });
});
