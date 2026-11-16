/**
 * Local stack for the browser flow in apps/e2e: a throwaway PostgreSQL
 * database, the built API, a stand-in for the Genfeed sign-in service, and one
 * published free listing. It needs no Stripe credentials or production data.
 *
 * Run from apps/api after `bun run build`:
 *   MARKETPLACE_DB_TEST_ADMIN_URL=postgresql://postgres@127.0.0.1:5432/postgres \
 *     bun scripts/e2e-stack.ts
 *
 * It answers GET http://127.0.0.1:3299/ready once the listing is seeded and
 * tears everything down on SIGINT or SIGTERM.
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { Client } from 'pg';
import {
  type ParameterStore,
  provisionDatabase,
} from '../src/ops/provision-database';

const API_PORT = 3200;
const AUTH_PORT = 3299;
const WEB_ORIGIN = 'http://127.0.0.1:3204';
const ISSUER = 'https://api.genfeed.test';

const E2E_LISTING = {
  title: 'E2E Free Workflow',
  downloadData: { workflow: { nodes: ['e2e-download-payload'] } },
};

async function main(): Promise<void> {
  const adminUrl = process.env.MARKETPLACE_DB_TEST_ADMIN_URL;
  if (!adminUrl) throw new Error('MARKETPLACE_DB_TEST_ADMIN_URL is required');

  const suffix = randomBytes(5).toString('hex');
  const database = `mp_e2e_${suffix}`;
  const runtimeRole = `mp_e2e_user_${suffix}`;
  const migrationRole = `mp_e2e_owner_${suffix}`;
  const parameterPath = `/e2e/${suffix}`;
  const parameters = new Map<string, string>();
  const store: ParameterStore = {
    read: async (name) => parameters.get(name),
    write: async (name, value) => {
      parameters.set(name, value);
    },
  };

  await provisionDatabase({
    adminUrl,
    database,
    runtimeRole,
    migrationRole,
    parameterPath,
    store,
  });
  const migration = new Client({
    connectionString: parameters.get(`${parameterPath}/MIGRATION_DATABASE_URL`),
  });
  await migration.connect();
  for (const name of readdirSync('prisma/migrations').sort()) {
    const file = `prisma/migrations/${name}/migration.sql`;
    if (existsSync(file)) await migration.query(readFileSync(file, 'utf8'));
  }
  await migration.end();

  const key = await generateKeyPair('EdDSA');
  const jwk = {
    ...(await exportJWK(key.publicKey)),
    kid: 'e2e',
    alg: 'EdDSA',
  };
  const sign = (user: string, organizationId: string, isSuperAdmin: boolean) =>
    new SignJWT({ organizationId, isSuperAdmin })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'e2e' })
      .setSubject(user)
      .setIssuer(ISSUER)
      .setAudience(ISSUER)
      .setIssuedAt()
      .setExpirationTime('30m')
      .sign(key.privateKey);

  let isSeeded = false;
  const authService: Server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', WEB_ORIGIN);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
    } else if (req.url === '/jwks') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ keys: [jwk] }));
    } else if (req.url === '/v1/auth/token') {
      // The signed-in browser visitor of the flow.
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          token: await sign('visitor-opaque', 'visitor-org', false),
        }),
      );
    } else if (req.url === '/ready') {
      res.statusCode = isSeeded ? 200 : 503;
      res.end(isSeeded ? 'ready' : 'seeding');
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise<void>((resolve) =>
    authService.listen(AUTH_PORT, '127.0.0.1', resolve),
  );

  const api: ChildProcess = spawn(
    'node',
    ['-r', 'tsconfig-paths/register', 'dist/main'],
    {
      stdio: ['ignore', 'ignore', 'inherit'],
      env: {
        ...process.env,
        PORT: String(API_PORT),
        NODE_ENV: 'development',
        DATABASE_URL: parameters.get(`${parameterPath}/DATABASE_URL`),
        BETTER_AUTH_JWKS_URL: `http://127.0.0.1:${AUTH_PORT}/jwks`,
        BETTER_AUTH_ISSUER: ISSUER,
        BETTER_AUTH_AUDIENCE: ISSUER,
        MARKETPLACE_URL: WEB_ORIGIN,
        STRIPE_SECRET_KEY: '',
        STRIPE_WEBHOOK_SECRET: 'whsec_disposable_e2e',
      },
    },
  );

  async function teardown(): Promise<void> {
    api.kill('SIGTERM');
    await new Promise<void>((resolve) => authService.close(() => resolve()));
    const admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    await admin.query(`DROP ROLE IF EXISTS "${runtimeRole}"`);
    await admin.query(`DROP ROLE IF EXISTS "${migrationRole}"`);
    await admin.end();
  }
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => void teardown().finally(() => process.exit(0)));
  }
  api.on('exit', (code) => {
    if (!isSeeded) process.exit(code ?? 1);
  });

  const base = `http://127.0.0.1:${API_PORT}`;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = await fetch(`${base}/health/ready`).catch(() => null);
    if (ready?.ok) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const operator = await sign('operator-opaque', 'operator-org', true);
  async function post(path: string, body: unknown): Promise<Response> {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operator}`,
      },
      body: JSON.stringify(body),
    });
    if (response.status !== 201) {
      throw new Error(`${path} answered ${response.status}`);
    }
    return response;
  }
  await post('/seller/profile', { displayName: 'Genfeed' });
  const created = await post('/seller/listings', {
    title: E2E_LISTING.title,
    type: 'workflow',
    shortDescription: 'A free workflow for the browser flow',
    description: 'Seeded by the browser-flow stack.',
    price: 0,
    downloadData: E2E_LISTING.downloadData,
  });
  const listingId: string = (await created.json()).data.id;
  await post(`/seller/listings/${listingId}/submit`, {});
  await post(`/admin/marketplace/listings/${listingId}/approve`, {});

  isSeeded = true;
  console.info(`E2E stack ready: API ${base}, sign-in stand-in :${AUTH_PORT}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
