import { validateEnvironment } from './environment.validation';

describe('validateEnvironment', () => {
  const baseEnvironment = {
    NODE_ENV: 'test',
    SSO_PROVIDER: 'oidc',
  };

  it('accepts a Redis URL and applies a five-minute session cache TTL by default', () => {
    const environment = validateEnvironment({
      ...baseEnvironment,
      REDIS_URL: 'redis://localhost:6379',
    });

    expect(environment).toMatchObject({
      REDIS_URL: 'redis://localhost:6379',
      AUTH_SESSION_CACHE_TTL_SECONDS: 300,
    });
  });

  it('rejects unsupported Redis URL schemes and unsafe TTL values', () => {
    expect(() =>
      validateEnvironment({ ...baseEnvironment, REDIS_URL: 'http://localhost:6379' }),
    ).toThrow('Environment validation failed');
    expect(() =>
      validateEnvironment({ ...baseEnvironment, AUTH_SESSION_CACHE_TTL_SECONDS: 30 }),
    ).toThrow('Environment validation failed');
    expect(() =>
      validateEnvironment({ ...baseEnvironment, AUTH_SESSION_CACHE_TTL_SECONDS: 901 }),
    ).toThrow('Environment validation failed');
  });
});
