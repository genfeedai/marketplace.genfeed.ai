/**
 * Prisma Connection Utility for Scripts
 *
 * Loads env vars from .env.local by default, or .env.<env> with
 * --env=staging|production|test, then boots a Prisma client against DATABASE_URL.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const logger = {
  log: (...args: unknown[]) => console.log(...args),
};

function loadEnvFile(): void {
  const args = process.argv.slice(2);
  const envArg = args.find((arg) => arg.startsWith('--env='))?.split('=')[1];
  const envSuffix = envArg || 'local';
  const envPath = resolve(__dirname, '..', '..', `.env.${envSuffix}`);

  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (envArg || !process.env[key]) {
        process.env[key] = value;
      }
    }

    logger.log(`Loaded env from .env.${envSuffix}`);
  } catch {
    logger.log(`No .env.${envSuffix} found, using process env / defaults`);
  }
}

loadEnvFile();

const DEFAULT_URL = process.env.DATABASE_URL;

let prisma: PrismaClient | null = null;

export async function connect(
  databaseUrl = DEFAULT_URL,
): Promise<PrismaClient> {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not configured. Set DATABASE_URL or pass --uri=<postgres-url>.',
    );
  }

  if (prisma) {
    return prisma;
  }

  logger.log('Connecting to PostgreSQL...');

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  logger.log('Connected to PostgreSQL\n');

  return prisma;
}

export async function disconnect(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    logger.log('\nDisconnected from PostgreSQL');
  }
}

export async function runScript<T>(
  name: string,
  fn: (prisma: PrismaClient) => Promise<T>,
  databaseUrl?: string,
): Promise<T> {
  logger.log(`\n${'='.repeat(60)}`);
  logger.log(`Running: ${name}`);
  logger.log(`${'='.repeat(60)}\n`);

  const client = await connect(databaseUrl);

  try {
    return await fn(client);
  } finally {
    await disconnect();
  }
}
