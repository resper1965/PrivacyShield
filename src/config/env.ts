/**
 * Environment Configuration with Zod Validation
 * Loads and validates environment variables
 */

import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('8000'),
  HOST: z.string().default('0.0.0.0'),
  
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  PGHOST: z.string().optional(),
  PGPORT: z.string().transform(Number).optional(),
  PGUSER: z.string().optional(),
  PGPASSWORD: z.string().optional(),
  PGDATABASE: z.string().optional(),
  
  // Redis
  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  
  // ClamAV
  CLAMAV_HOST: z.string().default('localhost'),
  CLAMAV_PORT: z.string().transform(Number).default('3310'),
  
  // Application
  UPLOAD_DIR: z.string().default('./uploads'),
  TMP_DIR: z.string().default('./tmp'),
  MAX_FILE_SIZE: z.string().transform(Number).default('100000000'), // 100MB
  
  // CORS
  CORS_ORIGINS: z.string().default('*'),
  
  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Environment = z.infer<typeof envSchema>;

let env: Environment;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`);
  }
  throw error;
}

export { env };