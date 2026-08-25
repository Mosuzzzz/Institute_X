import Joi from 'joi';

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
  OIDC_USERINFO_URL: Joi.string().uri().optional(),
  OIDC_ALLOWED_EMAIL_DOMAIN: Joi.string().hostname().optional(),
  OIDC_ROLE_CLAIM: Joi.string().default('role'),
  OIDC_ACCOUNT_STATUS_CLAIM: Joi.string().default('account_status'),
  OIDC_MAJOR_CODE_CLAIM: Joi.string().default('major_code'),
  S3_ENDPOINT: Joi.string().uri().optional(),
  S3_REGION: Joi.string().optional(),
  S3_BUCKET: Joi.string().optional(),
  S3_ACCESS_KEY_ID: Joi.string().optional(),
  S3_SECRET_ACCESS_KEY: Joi.string().optional(),
  S3_FORCE_PATH_STYLE: Joi.boolean().default(true),
  S3_SIGNED_URL_TTL_SECONDS: Joi.number().integer().min(60).max(3600).default(300),
}).unknown(true);

export function validateEnvironment(environment: Record<string, unknown>): Record<string, unknown> {
  const validation = environmentSchema.validate(environment, {
    abortEarly: false,
  });

  if (validation.error) {
    throw new Error(`Environment validation failed: ${validation.error.message}`);
  }

  return validation.value;
}
