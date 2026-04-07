/**
 * MongoDB Connection Utility for Scripts
 *
 * Provides a shared connection for all seed and utility scripts.
 * Uses the MongoDB Node.js driver for direct database operations.
 *
 * Loads env vars from .env.local by default, or .env.<env> with --env=staging|production|test.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Db, MongoClient } from 'mongodb';

const logger = {
  log: (...args: unknown[]) => console.log(...args),
};

export interface ConnectionOptions {
  uri?: string;
  database?: string;
}

function loadEnvFile(): void {
  const args = process.argv.slice(2);
  const envArg = args.find((a) => a.startsWith('--env='))?.split('=')[1];
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

const DEFAULT_URI = process.env.MONGODB_URI;
const DEFAULT_DATABASE = 'marketplace';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connect(options: ConnectionOptions = {}): Promise<Db> {
  const { MongoClient } = await import('mongodb');
  const uri = options.uri || DEFAULT_URI;
  const database = options.database || DEFAULT_DATABASE;

  if (!uri) {
    throw new Error(
      'MongoDB URI is not configured. Set MONGODB_URI or pass --uri=<mongodb-uri>.',
    );
  }

  if (db) {
    return db;
  }

  logger.log('Connecting to MongoDB...');
  logger.log(`   Database: ${database}`);

  client = new MongoClient(uri) as MongoClient;
  await client.connect();
  db = client.db(database);

  logger.log('Connected to MongoDB\n');
  return db;
}

export async function disconnect(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.log('\nDisconnected from MongoDB');
  }
}

export function getDb(): Db {
  if (!db) {
    throw new Error('Not connected to MongoDB. Call connect() first.');
  }
  return db;
}

export async function runScript<T>(
  name: string,
  fn: (db: Db) => Promise<T>,
  options: ConnectionOptions = {},
): Promise<T> {
  logger.log(`\n${'='.repeat(60)}`);
  logger.log(`Running: ${name}`);
  logger.log(`${'='.repeat(60)}\n`);

  const database = await connect(options);

  try {
    const result = await fn(database);
    return result;
  } finally {
    await disconnect();
  }
}
