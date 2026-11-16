import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { AppModule } from '@api/app.module';
import {
  MarketplaceStripeService,
  type StripeCheckoutSession,
} from '@api/common/services/stripe.service';
import {
  type ParameterStore,
  provisionDatabase,
} from '@api/ops/provision-database';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { Client } from 'pg';
import Stripe from 'stripe';
import { vi } from 'vitest';

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const STRIPE_WEBHOOK_SECRET = 'whsec_disposable_marketplace_fixture';
const ISSUER = 'https://api.genfeed.test';

/**
 * PostgreSQL superuser URL the fixture provisions a throwaway database from.
 * CI sets it; locally the database suites skip when it is unset.
 */
export const adminUrl = process.env.MARKETPLACE_DB_TEST_ADMIN_URL;

if (process.env.CI === 'true' && !adminUrl) {
  throw new Error('CI requires the PostgreSQL integration fixture');
}

interface SignedStripeEvent {
  body: string;
  signature: string;
}

interface StripeSessionInput {
  /** Defaults to a fresh `evt_` id. Reuse an id to replay the same delivery. */
  eventId?: string;
  sessionId: string;
  purchaseId: string;
  paymentStatus?: 'paid' | 'unpaid';
  amountTotal?: number;
  currency?: string;
  paymentIntent?: string;
}

interface PublishListingInput {
  title: string;
  /** Price in cents; 0 makes the listing free to claim. */
  price: number;
  downloadData: Record<string, unknown>;
}

export const OPERATOR = {
  user: 'operator-opaque',
  organization: 'operator-org',
};

export interface MarketplaceFixture {
  /** GET, or POST when a body is given. Pass a token for an authenticated call. */
  request(path: string, token?: string, body?: unknown): Promise<Response>;
  /** A signed identity token for an opaque user id in an organization. */
  token(
    user: string,
    organizationId: string,
    isSuperAdmin?: boolean,
  ): Promise<string>;
  /**
   * A token the Genfeed API would sign for a service call. Defaults are the
   * valid ones; override one field to build a token the marketplace refuses.
   */
  serviceToken(options?: {
    audience?: string;
    subject?: string;
    scope?: string | null;
    lifetimeSeconds?: number;
  }): Promise<string>;
  /** Run SQL as the database owner, bypassing the API, and return the rows. */
  sql<Row = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<Row[]>;
  /** A Stripe event signed with the fixture's disposable webhook secret. */
  signedStripeEvent(
    type: string,
    object: unknown,
    id?: string,
  ): SignedStripeEvent;
  /** Deliver a signed Stripe event to the webhook route. */
  postStripeEvent(
    type: string,
    object: unknown,
    id?: string,
  ): Promise<Response>;
  /** POST a raw body with an arbitrary signature header, signed or not. */
  sendRawStripeBody(body: string, signature: string): Promise<Response>;
  /** A signed `checkout.session.completed` for a purchase's session. */
  postCheckoutCompleted(input: StripeSessionInput): Promise<Response>;
  /** Checkout sessions the API asked Stripe to create, oldest first. */
  createdStripeSessions(): StripeCheckoutSession[];
  /** Start checkout for a listing and return the pending purchase's ids. */
  startCheckout(
    buyerToken: string,
    listingId: string,
  ): Promise<{ purchaseId: string; sessionId: string }>;
  /**
   * Create, submit and approve a listing as the platform operator, who is the
   * only seller of a Genfeed-only store. Returns the public listing id.
   */
  publishListing(input: PublishListingInput): Promise<{ id: string }>;
  stop(): Promise<void>;
}

/**
 * Boots the whole API against a throwaway PostgreSQL database with signed
 * identity tokens and a Stripe client that never leaves the process: session
 * creation is faked, and webhook signatures use a disposable secret. No Stripe
 * credentials, production data or network access are needed.
 */
export async function startMarketplaceFixture(
  options: { rateLimited?: boolean } = {},
): Promise<MarketplaceFixture> {
  if (!adminUrl) throw new Error('Test database required');

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

  const admin = new Client({ connectionString: adminUrl });
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
    connectionString: parameters.get(`${parameterPath}/MIGRATION_DATABASE_URL`),
  });
  await migration.connect();
  for (const name of readdirSync('prisma/migrations').sort()) {
    const file = `prisma/migrations/${name}/migration.sql`;
    if (existsSync(file)) {
      await migration.query(readFileSync(file, 'utf8'));
    }
  }

  const key = await generateKeyPair('EdDSA');
  const jwk = {
    ...(await exportJWK(key.publicKey)),
    kid: 'contract',
    alg: 'EdDSA',
  };
  const jwks: Server = createServer((_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise<void>((resolve) => jwks.listen(0, '127.0.0.1', resolve));
  const address = jwks.address();
  if (!address || typeof address === 'string') {
    throw new Error('JWKS unavailable');
  }

  vi.stubEnv('BETTER_AUTH_JWKS_URL', `http://127.0.0.1:${address.port}/jwks`);
  vi.stubEnv('BETTER_AUTH_ISSUER', ISSUER);
  vi.stubEnv('BETTER_AUTH_AUDIENCE', ISSUER);
  vi.stubEnv(
    'DATABASE_URL',
    parameters.get(`${parameterPath}/DATABASE_URL`) || '',
  );
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', STRIPE_WEBHOOK_SECRET);
  // The Stripe client is replaced below; production still requires the key.
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  vi.stubEnv('NODE_ENV', 'development');

  const stripe = new Stripe('sk_test_disposable_marketplace_fixture');
  const sessions: StripeCheckoutSession[] = [];
  const fakeStripeClient = {
    webhooks: stripe.webhooks,
    checkout: {
      sessions: {
        create: async (params: {
          metadata?: Record<string, string>;
        }): Promise<StripeCheckoutSession> => {
          const id = `cs_test_${sessions.length + 1}_${suffix}`;
          const session = {
            id,
            url: `https://checkout.stripe.test/c/pay/${id}`,
            metadata: params.metadata ?? null,
          };
          sessions.push(session);
          return session;
        },
        // A session's payment intent is `pi_<session id>`, the same default
        // `postCheckoutCompleted` puts on the completed event.
        list: async (params: {
          payment_intent: string;
          limit?: number;
        }): Promise<{ data: StripeCheckoutSession[] }> => ({
          data: sessions
            .filter(
              (candidate) => `pi_${candidate.id}` === params.payment_intent,
            )
            .slice(0, params.limit),
        }),
        retrieve: async (id: string): Promise<StripeCheckoutSession> => {
          const session = sessions.find((candidate) => candidate.id === id);
          if (!session) throw new Error(`No such checkout session: ${id}`);
          return session;
        },
      },
    },
  };

  // Journeys start many checkouts from one address. Unless a suite is about
  // the rate limit, count nothing so the limit cannot hide a real failure.
  const unlimitedStorage = {
    increment: async () => ({
      isBlocked: false,
      timeToBlockExpire: 0,
      timeToExpire: 0,
      totalHits: 1,
    }),
  };
  const testing = Test.createTestingModule({ imports: [AppModule] });
  if (!options.rateLimited) {
    testing.overrideProvider(ThrottlerStorage).useValue(unlimitedStorage);
  }
  const moduleRef = await testing
    .overrideProvider(MarketplaceStripeService)
    .useValue({
      client: fakeStripeClient,
      constructEvent: fakeStripeClient.webhooks.constructEvent.bind(
        fakeStripeClient.webhooks,
      ),
    })
    .compile();
  const app: INestApplication = moduleRef.createNestApplication({
    rawBody: true,
  });
  await app.listen(0, '127.0.0.1');
  const url = await app.getUrl();

  async function token(
    user: string,
    organizationId: string,
    isSuperAdmin = false,
  ): Promise<string> {
    return new SignJWT({ organizationId, isSuperAdmin })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'contract' })
      .setSubject(user)
      .setIssuer(ISSUER)
      .setAudience(ISSUER)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(key.privateKey);
  }

  async function serviceToken(
    options: Parameters<MarketplaceFixture['serviceToken']>[0] = {},
  ): Promise<string> {
    const issuedAt = Math.floor(Date.now() / 1000);
    const claims: Record<string, unknown> =
      options.scope === null
        ? {}
        : { scope: options.scope ?? 'purchases:record purchases:refund' };
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'EdDSA', kid: 'contract' })
      .setSubject(options.subject ?? 'genfeed-api')
      .setIssuer(ISSUER)
      .setAudience(options.audience ?? 'marketplace-service')
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + (options.lifetimeSeconds ?? 60))
      .sign(key.privateKey);
  }

  function signedStripeEvent(
    type: string,
    object: unknown,
    id = `evt_${randomBytes(8).toString('hex')}`,
  ): SignedStripeEvent {
    const body = JSON.stringify({
      id,
      object: 'event',
      type,
      data: { object },
    });
    return {
      body,
      signature: stripe.webhooks.generateTestHeaderString({
        payload: body,
        secret: STRIPE_WEBHOOK_SECRET,
      }),
    };
  }

  const request: MarketplaceFixture['request'] = (path, bearer, body) =>
    fetch(`${url}${path}`, {
      method: body !== undefined ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  const sendRawStripeBody: MarketplaceFixture['sendRawStripeBody'] = (
    body,
    signature,
  ) =>
    fetch(`${url}/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
      body,
    });

  const postStripeEvent: MarketplaceFixture['postStripeEvent'] = (
    type,
    object,
    id,
  ) => {
    const event = signedStripeEvent(type, object, id);
    return sendRawStripeBody(event.body, event.signature);
  };

  let isOperatorSeller = false;
  async function publishListing(
    input: PublishListingInput,
  ): Promise<{ id: string }> {
    const operator = await token(OPERATOR.user, OPERATOR.organization, true);
    if (!isOperatorSeller) {
      const profile = await request('/seller/profile', operator, {
        displayName: `Genfeed ${suffix}`,
      });
      if (profile.status !== 201) {
        throw new Error(`Seller profile failed: ${profile.status}`);
      }
      isOperatorSeller = true;
    }
    const created = await request('/seller/listings', operator, {
      title: input.title,
      type: 'workflow',
      shortDescription: `${input.title} short description`,
      description: `${input.title} description`,
      price: input.price,
      downloadData: input.downloadData,
    });
    if (created.status !== 201) {
      throw new Error(`Listing create failed: ${created.status}`);
    }
    const id: string = (await created.json()).data.id;
    for (const step of [
      `/seller/listings/${id}/submit`,
      `/admin/marketplace/listings/${id}/approve`,
    ]) {
      const response = await request(step, operator, {});
      if (response.status !== 201) {
        throw new Error(`${step} failed: ${response.status}`);
      }
    }
    return { id };
  }

  async function startCheckout(
    buyerToken: string,
    listingId: string,
  ): Promise<{ purchaseId: string; sessionId: string }> {
    const response = await request(
      `/marketplace/listings/${listingId}/checkout`,
      buyerToken,
      {},
    );
    if (response.status !== 201) {
      throw new Error(`Checkout failed: ${response.status}`);
    }
    const { purchaseId, sessionId } = (await response.json()).data.attributes;
    return { purchaseId, sessionId };
  }

  return {
    request,
    token,
    serviceToken,
    publishListing,
    startCheckout,
    sql: async (text, values) =>
      (await migration.query(text, values)).rows as never,
    signedStripeEvent,
    postStripeEvent,
    sendRawStripeBody,
    postCheckoutCompleted: (input) =>
      postStripeEvent(
        'checkout.session.completed',
        {
          id: input.sessionId,
          object: 'checkout.session',
          payment_status: input.paymentStatus ?? 'paid',
          amount_total: input.amountTotal,
          currency: input.currency ?? 'usd',
          payment_intent: input.paymentIntent ?? `pi_${input.sessionId}`,
          metadata: { type: 'marketplace', purchaseId: input.purchaseId },
        },
        input.eventId,
      ),
    createdStripeSessions: () => [...sessions],
    stop: async () => {
      await app.close();
      await new Promise<void>((resolve, reject) =>
        jwks.close((error) => (error ? reject(error) : resolve())),
      );
      vi.unstubAllEnvs();
      await migration.end();
      await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
      await admin.query(`DROP ROLE IF EXISTS "${runtimeRole}"`);
      await admin.query(`DROP ROLE IF EXISTS "${migrationRole}"`);
      await admin.end();
    },
  };
}
