import { existsSync } from 'node:fs';
import { z } from 'zod';

/**
 * Env o'qish va validatsiya. Startda fail-fast: noto'g'ri konfiguratsiya bilan
 * ishlayotgan jarayon — bazani ifloslantiradigan jarayon.
 *
 * `.env` Node 22 ning o'z `process.loadEnvFile()` i bilan o'qiladi — dotenv kerak emas.
 */
if (existsSync('.env')) process.loadEnvFile('.env');

const mongoUri = z
  .string()
  .refine((v) => /^mongodb(\+srv)?:\/\//.test(v), 'mongodb:// bilan boshlanishi kerak');

const schema = z.object({
  MONGO_URI: mongoUri,
  MONGO_URI_TEST: mongoUri,
  PORT: z.coerce.number().int().positive().default(3000),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  console.error(`Env konfiguratsiyasi noto'g'ri:\n${issues}\n\n.env.example dan nusxa oling: cp .env.example .env`);
  process.exit(1);
}

export const env = parsed.data;

/** Testlar alohida bazada ishlaydi — seed ma'lumotini o'chirib yubormaslik uchun. */
export const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

export const activeMongoUri = isTest ? env.MONGO_URI_TEST : env.MONGO_URI;
