import { validateEnvironment } from './environment.validation';

describe('validateEnvironment', () => {
  const baseEnvironment = {
    NODE_ENV: 'test',
  };

  it('defaults mock email delivery to Mailpit without requiring Resend credentials', () => {
    expect(validateEnvironment(baseEnvironment)).toMatchObject({
      OTP_EMAIL_PROVIDER: 'mailpit', MAILPIT_HOST: '127.0.0.1', MAILPIT_SMTP_PORT: 1025,
    });
  });

  it('rejects Mailpit in production even if production email credentials exist', () => {
    expect(() => validateEnvironment({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/institute_x',
      OTP_HASH_SECRET: 'test-otp-signing-key-with-32-characters',
      RESEND_API_KEY: 're_test_key',
      OTP_FROM_EMAIL: 'no-reply@x.ac.th',
      OTP_EMAIL_PROVIDER: 'mailpit',
    })).toThrow('OTP_EMAIL_PROVIDER');
  });

  it('accepts Redis session-cache configuration with a bounded TTL', () => {
    expect(
      validateEnvironment({
        ...baseEnvironment,
        REDIS_URL: 'redis://localhost:6379',
        AUTH_SESSION_CACHE_TTL_SECONDS: 60,
        AUTH_CACHE_SIGNING_KEY: 'test-cache-signing-key-with-32-characters',
      }),
    ).toMatchObject({ AUTH_SESSION_CACHE_TTL_SECONDS: 60 });
    expect(() =>
      validateEnvironment({
        ...baseEnvironment,
        AUTH_SESSION_CACHE_TTL_SECONDS: 301,
      }),
    ).toThrow('Environment validation failed');
  });

  it('requires encrypted Redis transport in production', () => {
    const production = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/institute_x',
      AUTH_CACHE_SIGNING_KEY: 'test-cache-signing-key-with-32-characters',
      OTP_HASH_SECRET: 'test-otp-signing-key-with-32-characters',
      RESEND_API_KEY: 're_test_key',
      OTP_FROM_EMAIL: 'Institute X <no-reply@x.ac.th>',
    };
    expect(() => validateEnvironment({ ...production, REDIS_URL: 'redis://redis:6379' })).toThrow(
      'Environment validation failed',
    );
    expect(
      validateEnvironment({ ...production, REDIS_URL: 'rediss://redis.example.edu:6380' }),
    ).toMatchObject({ REDIS_URL: 'rediss://redis.example.edu:6380' });
  });

  it('rejects ambiguous direct and file-mounted secrets', () => {
    expect(() =>
      validateEnvironment({
        ...baseEnvironment,
        REDIS_URL: 'redis://localhost:6379',
        REDIS_URL_FILE: '/run/secrets/redis_url',
      }),
    ).toThrow('set either REDIS_URL or REDIS_URL_FILE, not both');
  });

  it('accepts a browser-facing object-storage endpoint and rejects invalid URLs', () => {
    expect(
      validateEnvironment({
        ...baseEnvironment,
        S3_PUBLIC_ENDPOINT: 'https://media.example.edu',
      }),
    ).toMatchObject({ S3_PUBLIC_ENDPOINT: 'https://media.example.edu' });

    expect(() =>
      validateEnvironment({
        ...baseEnvironment,
        S3_PUBLIC_ENDPOINT: 'minio:9000',
      }),
    ).toThrow('Environment validation failed');
  });
});
