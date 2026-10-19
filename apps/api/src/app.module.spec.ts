import { PrismaService } from '@api/common/prisma/prisma.service';
import { MarketplaceStripeService } from '@api/common/services/stripe.service';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from './app.module';

describe('Marketplace local startup', () => {
  let app: INestApplication;
  let url: string;
  const prisma = {
    $queryRaw: vi.fn().mockResolvedValue([{ result: 1 }]),
    $transaction: (queries: Promise<unknown>[]) => Promise.all(queries),
    listing: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
  };

  beforeAll(async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
    vi.unstubAllEnvs();
  });

  it('starts health and database-backed public browsing without payment credentials', async () => {
    const health = await fetch(`${url}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ status: 'ok' });
    expect((await fetch(`${url}/health/ready`)).status).toBe(200);
    const listings = await fetch(`${url}/marketplace/listings`);
    expect(listings.status).toBe(200);
    expect(await listings.json()).toMatchObject({ data: [] });
    expect(prisma.listing.findMany).toHaveBeenCalled();
  });

  it('rejects invalid public catalog filters before hitting the database', async () => {
    expect(
      (await fetch(`${url}/marketplace/listings?minPrice=invalid`)).status,
    ).toBe(400);
  });

  it('requires authentication for seller and administrator routes', async () => {
    for (const path of [
      '/seller/profile',
      '/admin/marketplace/listings',
      '/marketplace/listings/library',
    ]) {
      expect((await fetch(`${url}${path}`)).status).toBe(401);
    }
  });

  it('reports database readiness failures', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('database offline'));
    expect((await fetch(`${url}/health/ready`)).status).toBe(503);
  });

  it('refuses payment operations without a Stripe key', () => {
    expect(() => app.get(MarketplaceStripeService).client).toThrow(
      'Payments are not configured',
    );
  });
});

describe('Marketplace production startup', () => {
  afterAll(() => vi.unstubAllEnvs());

  it('still requires Stripe credentials outside development', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    expect(() => new MarketplaceStripeService()).toThrow(
      'STRIPE_SECRET_KEY is required',
    );
  });
});
