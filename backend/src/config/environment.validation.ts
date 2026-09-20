import Joi from 'joi';
import { readFileSync } from 'node:fs';

const FILE_SECRETS = [
  'DATABASE_URL',
  'REDIS_URL',
  'AUTH_CACHE_SIGNING_KEY',
  'OTP_HASH_SECRET',
  'RESEND_API_KEY',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
] as const;

function resolveFileSecrets(environment: Record<string, unknown>): Record<string, unknown> {
  const resolved = { ...environment };
  for (const name of FILE_SECRETS) {
    const fileName = `${name}_FILE`;
    const path = resolved[fileName];
    if (path === undefined) continue;
    if (resolved[name] !== undefined) {
      throw new Error(`Environment validation failed: set either ${name} or ${fileName}, not both`);
    }
    if (typeof path !== 'string' || path.trim() === '') {
      throw new Error(`Environment validation failed: ${fileName} must be a file path`);
    }
    try {
      const value = readFileSync(path, { encoding: 'utf8' }).trim();
      if (!value) throw new Error('secret file is empty');
      resolved[name] = value;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      throw new Error(`Environment validation failed: cannot read ${fileName}: ${message}`);
    }
  }
  return resolved;
}

const environmentSchema = Joi.object<Record<string, unknown>>({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .when('NODE_ENV', {
      is: 'test',
      then: Joi.optional().default(
        'postgresql://postgres:postgres@localhost:5433/institute_x_test',
      ),
      otherwise: Joi.required(),
    }),
  CORS_ORIGIN: Joi.string().default('http://localhost:3001'),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().uri({ scheme: ['rediss'] }),
    })
    .optional(),
  REDIS_PASSWORD: Joi.string().min(12).optional(),
  AUTH_SESSION_CACHE_TTL_SECONDS: Joi.number().integer().min(15).max(300).default(60),
  AUTH_CACHE_SIGNING_KEY: Joi.string()
    .min(32)
    .invalid('replace-with-at-least-32-random-characters')
    .when('REDIS_URL', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  OTP_HASH_SECRET: Joi.string()
    .min(32)
    .invalid('replace-with-at-least-32-random-characters')
    .when('NODE_ENV', {
      is: 'test',
      then: Joi.optional().default('test-only-otp-secret-at-least-32-characters'),
      otherwise: Joi.required(),
    }),
  RESEND_API_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  OTP_EMAIL_PROVIDER: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.valid('resend').default('resend'),
    otherwise: Joi.valid('mailpit', 'resend').default('mailpit'),
  }),
  MAILPIT_HOST: Joi.string().hostname().default('127.0.0.1'),
  MAILPIT_SMTP_PORT: Joi.number().port().default(1025),
  OTP_FROM_EMAIL: Joi.string()
    .max(320)
    .when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.optional() }),
  S3_ENDPOINT: Joi.string().uri().optional(),
  S3_PUBLIC_ENDPOINT: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),
  S3_REGION: Joi.string().optional(),
  S3_BUCKET: Joi.string().optional(),
  S3_ACCESS_KEY_ID: Joi.string().optional(),
  S3_SECRET_ACCESS_KEY: Joi.string().optional(),
  S3_FORCE_PATH_STYLE: Joi.boolean().default(true),
  S3_SIGNED_URL_TTL_SECONDS: Joi.number().integer().min(60).max(3600).default(300),
}).unknown(true);

export function validateEnvironment(environment: Record<string, unknown>): Record<string, unknown> {
  const validation = environmentSchema.validate(resolveFileSecrets(environment), {
    abortEarly: false,
  });

  if (validation.error) {
    throw new Error(`Environment validation failed: ${validation.error.message}`);
  }

  return validation.value;
}
