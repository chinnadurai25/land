import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters'),
  CAPTCHA_SECRET: z.string().min(16, 'CAPTCHA_SECRET must be at least 16 characters'),
  STORAGE_DRIVER: z.enum(['s3', 'local']).default('local'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('ap-south-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  MAX_UPLOAD_FILE_SIZE_MB: z.coerce.number().positive().max(25).default(5),
  MAX_IMAGES_PER_PROPERTY: z.coerce.number().int().positive().max(20).default(10),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }

  const data = parsed.data;
  if (data.NODE_ENV === 'production') {
    if (data.STORAGE_DRIVER !== 's3') {
      throw new Error('Production requires STORAGE_DRIVER="s3" (ephemeral filesystem storage is forbidden)');
    }
    if (!data.S3_BUCKET || !data.S3_ACCESS_KEY_ID || !data.S3_SECRET_ACCESS_KEY) {
      throw new Error('Production requires S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY');
    }
  }

  return data;
}

export const env = loadEnv();
