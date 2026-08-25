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
