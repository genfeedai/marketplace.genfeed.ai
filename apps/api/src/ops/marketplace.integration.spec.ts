import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { AppModule } from '@api/app.module';
import {
  type ParameterStore,
  provisionDatabase,
} from '@api/ops/provision-database';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const adminUrl = process.env.MARKETPLACE_DB_TEST_ADMIN_URL;
if (process.env.CI === 'true' && !adminUrl) {
  throw new Error('CI requires the PostgreSQL integration fixture');
}
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const suffix = randomBytes(5).toString('hex');
const database = `mp_journey_${suffix}`;
const runtimeRole = `mp_user_${suffix}`;
const migrationRole = `mp_owner_${suffix}`;
const parameterPath = `/test/${suffix}`;
const parameters = new Map<string, string>();
const store: ParameterStore = {
  read: async (name) => parameters.get(name),
  write: async (name, value) => {
    parameters.set(name, value);
  },
};
let admin: Client;
let app: INestApplication;
let server: Server;
let url: string;
let sellerToken: string;
let buyerToken: string;
let operatorToken: string;
let wrongOrganizationToken: string;
let listingId: string;
let purchaseId: string;

async function request(path: string, token?: string, body?: unknown) {
  return fetch(`${url}${path}`, {
    method: body !== undefined ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe.skipIf(!adminUrl)(
  'signed identity and real PostgreSQL marketplace journey',
  () => {
    beforeAll(async () => {
      if (!adminUrl) throw new Error('Test database required');
      admin = new Client({ connectionString: adminUrl });
      await admin.connect();
      await provisionDatabase({
        adminUrl,
        database,
        runtimeRole,
        migrationRole,
        parameterPath,
        store,
      });
      const migration = new Client({
        connectionString: parameters.get(
          `${parameterPath}/MIGRATION_DATABASE_URL`,
        ),
      });
      await migration.connect();
      try {
        for (const name of readdirSync('prisma/migrations').sort()) {
          const file = `prisma/migrations/${name}/migration.sql`;
          if (existsSync(file)) {
            await migration.query(readFileSync(file, 'utf8'));
          }
        }
      } finally {
        await migration.end();
      }
      const key = await generateKeyPair('EdDSA');
      const jwk = {
        ...(await exportJWK(key.publicKey)),
        kid: 'contract',
        alg: 'EdDSA',
      };
      server = createServer((_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ keys: [jwk] }));
      });
      await new Promise<void>((resolve) =>
        server.listen(0, '127.0.0.1', resolve),
      );
      const address = server.address();
      if (!address || typeof address === 'string')
        throw new Error('JWKS unavailable');
      const issuer = 'https://api.genfeed.test';
      vi.stubEnv(
        'BETTER_AUTH_JWKS_URL',
        `http://127.0.0.1:${address.port}/jwks`,
      );
      vi.stubEnv('BETTER_AUTH_ISSUER', issuer);
      vi.stubEnv('BETTER_AUTH_AUDIENCE', issuer);
      vi.stubEnv(
        'DATABASE_URL',
        parameters.get(`${parameterPath}/DATABASE_URL`) || '',
      );
      vi.stubEnv('NODE_ENV', 'test');
      vi.stubEnv('STRIPE_SECRET_KEY', '');
      // Public/free flows do not call Stripe; production still requires credentials.
      vi.stubEnv('NODE_ENV', 'development');
      async function sign(
        user: string,
        organizationId: string,
        isSuperAdmin = false,
      ) {
        return new SignJWT({ organizationId, isSuperAdmin })
          .setProtectedHeader({ alg: 'EdDSA', kid: 'contract' })
          .setSubject(user)
          .setIssuer(issuer)
          .setAudience(issuer)
          .setIssuedAt()
          .setExpirationTime('5m')
          .sign(key.privateKey);
      }
      sellerToken = await sign('seller-opaque', 'seller-org');
      buyerToken = await sign('buyer-opaque', 'buyer-org');
      operatorToken = await sign('operator-opaque', 'seller-org', true);
      wrongOrganizationToken = await sign('buyer-opaque', 'unrelated-org');
      const module = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = module.createNestApplication({ rawBody: true });
      await app.listen(0, '127.0.0.1');
      url = await app.getUrl();
    });
    afterAll(async () => {
      await app?.close();
      if (server)
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      vi.unstubAllEnvs();
      if (admin) {
        await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
        await admin.query(`DROP ROLE IF EXISTS "${runtimeRole}"`);
        await admin.query(`DROP ROLE IF EXISTS "${migrationRole}"`);
        await admin.end();
      }
    });

    it('creates a seller and listing without allowing client-supplied identity', async () => {
      const invalid = await request('/seller/profile', sellerToken, {
        displayName: 'Seller',
        organization: 'unrelated-org',
      });
      expect(invalid.status).toBe(400);
      const profile = await request('/seller/profile', sellerToken, {
        displayName: `Contract Seller ${suffix}`,
      });
      expect(profile.status).toBe(201);
      const response = await request('/seller/listings', sellerToken, {
        title: 'Test Workflow',
        type: 'workflow',
        shortDescription: 'A free workflow',
        description: 'Integration contract',
        price: 0,
        downloadData: { workflow: { nodes: [] } },
      });
      expect(response.status).toBe(201);
      listingId = (await response.json()).data.id;
      expect(listingId).toMatch(UUID_PATTERN);
      const created = await request(
        `/seller/listings/${listingId}`,
        sellerToken,
      );
      const createdBody = await created.json();
      expect(createdBody.data.attributes.organization).toBe('seller-org');
      expect(createdBody.data.id).toBe(listingId);
      expect(JSON.stringify(createdBody)).not.toContain('"_id"');
    });

    it('requires operator authority to approve a listing and hides download payloads publicly', async () => {
      const submitted = await request(
        `/seller/listings/${listingId}/submit`,
        sellerToken,
        {},
      );
      expect(submitted.status).toBe(201);
      const unauthorized = await request(
        `/admin/marketplace/listings/${listingId}/approve`,
        sellerToken,
        {},
      );
      expect(unauthorized.status).toBe(403);
      const approved = await request(
        `/admin/marketplace/listings/${listingId}/approve`,
        operatorToken,
        {},
      );
      expect(approved.status).toBe(201);
      const catalog = await request('/marketplace/listings?type=workflow');
      expect(catalog.status).toBe(200);
      const data = (await catalog.json()).data;
      expect(data).toHaveLength(1);
      expect(data[0].attributes.downloadData).toBeUndefined();
      expect((await request(`/marketplace/listings/${listingId}`)).status).toBe(
        200,
      );
    });

    it('claims a free listing and exposes the purchase only to its buyer organization', async () => {
      const claim = await request(
        `/marketplace/listings/${listingId}/claim`,
        buyerToken,
        {},
      );
      expect(claim.status).toBe(201);
      const claimBody = await claim.json();
      purchaseId = claimBody.data.id;
      expect(purchaseId).toMatch(UUID_PATTERN);
      expect(JSON.stringify(claimBody)).not.toContain('"_id"');
      const library = await request('/marketplace/purchases', buyerToken);
      const libraryBody = await library.json();
      expect(libraryBody.data).toHaveLength(1);
      expect(JSON.stringify(libraryBody)).not.toContain('"_id"');
      expect(
        (await request('/marketplace/purchases', wrongOrganizationToken))
          .status,
      ).toBe(200);
      expect(
        (
          await (
            await request('/marketplace/purchases', wrongOrganizationToken)
          ).json()
        ).data,
      ).toHaveLength(0);
      const download = await request(
        `/marketplace/purchases/${purchaseId}/download-data`,
        buyerToken,
      );
      expect(download.status).toBe(200);
      expect((await download.json()).data.attributes.downloadData).toEqual({
        workflow: { nodes: [] },
      });
      expect(
        (
          await request(
            `/marketplace/purchases/${purchaseId}/download-data`,
            wrongOrganizationToken,
          )
        ).status,
      ).toBe(404);
      expect(
        (await request(`/marketplace/purchases/${purchaseId}/download-data`))
          .status,
      ).toBe(401);
      expect(
        (await request(`/marketplace/checkout/unrelated-session`, buyerToken))
          .status,
      ).toBe(404);
      expect(
        (
          await request(
            `/marketplace/listings/${listingId}/checkout`,
            buyerToken,
            { successUrl: 'https://attacker.example/success' },
          )
        ).status,
      ).toBe(400);
    });
  },
);
