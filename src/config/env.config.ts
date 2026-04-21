import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(4000),

  // Supabase
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  SUPABASE_ANON_KEY: Joi.string().optional(),

  // Redis
  REDIS_URL: Joi.string().default('redis://localhost:6379'),

  // Anthropic
  ANTHROPIC_API_KEY: Joi.string().required(),
  USE_AI_SUMMARIES: Joi.boolean().default(true),
  AI_MODEL: Joi.string().default('claude-sonnet-4-6'),

  // CORS
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  // Feature flags
  ENABLE_PUBLIC_STATS: Joi.boolean().default(true),
  STATS_MIN_SESSIONS: Joi.number().integer().default(1000),
  ELECTORAL_SILENCE: Joi.boolean().default(false),

  // Storage
  PROGRAMS_BUCKET: Joi.string().default('programs'),

  // Admin
  ADMIN_TOKEN: Joi.string().optional(),

  // Ingestion
  CHUNK_SIZE_TOKENS: Joi.number().integer().default(500),
  CHUNK_OVERLAP_TOKENS: Joi.number().integer().default(50),
  CLASSIFICATION_MODEL: Joi.string().default('claude-haiku-4-5-20251001'),
  STANCE_MODEL: Joi.string().default('claude-sonnet-4-6'),

  // Logs
  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
    .default('info'),
});
