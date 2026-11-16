import { AppModule } from '@api/app.module';
import { configureApp } from '@api/app.setup';
import { PrismaService } from '@api/common/prisma/prisma.service';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

describe('Public API limits and headers', () => {
  let app: NestExpressApplication;
  let url: string;
  const prisma = {
    $queryRaw: vi.fn().mockResolvedValue([{ result: 1 }]),
    $transaction: (queries: Promise<unknown>[]) => Promise.all(queries),
    listing: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
  };

  beforeAll(async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
    vi.unstubAllEnvs();
  });

  it('sends the standard security headers', async () => {
    const response = await fetch(`${url}/marketplace/listings`);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(response.headers.get('strict-transport-security')).toContain(
      'max-age=',
    );
    expect(response.headers.get('x-powered-by')).toBeNull();
  });

  it.each([
    ['an oversized page size', 'limit=100000'],
    ['a page number beyond the cap', 'page=99999999'],
    ['a request to skip paging', 'pagination=false'],
    ['a request for deleted rows', 'isDeleted=true'],
  ])('refuses %s on the public catalog', async (_name, query) => {
    const response = await fetch(`${url}/marketplace/listings?${query}`);

    expect(response.status).toBe(400);
  });

  it('serves the largest allowed page size', async () => {
    const response = await fetch(`${url}/marketplace/listings?limit=100`);

    expect(response.status).toBe(200);
    expect(prisma.listing.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });

  it('refuses a burst of checkout attempts from one client with 429', async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await fetch(`${url}/marketplace/listings/any/checkout`, {
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      statuses.push(response.status);
    }

    expect(statuses).toEqual([...Array<number>(10).fill(401), 429, 429]);
  });

  it.each([
    ['the operator console', 'https://console.genfeed.ai'],
    ['the operator console in development', 'http://localhost:3000'],
  ])(
    'lets %s call the admin routes from the browser',
    async (_name, origin) => {
      const response = await fetch(`${url}/admin/marketplace/listings`, {
        headers: {
          'Access-Control-Request-Headers': 'authorization',
          'Access-Control-Request-Method': 'POST',
          Origin: origin,
        },
        method: 'OPTIONS',
      });

      expect(response.headers.get('access-control-allow-origin')).toBe(origin);
    },
  );

  it('refuses a browser call from an unknown origin', async () => {
    const response = await fetch(`${url}/admin/marketplace/listings`, {
      headers: {
        'Access-Control-Request-Method': 'POST',
        Origin: 'https://example.com',
      },
      method: 'OPTIONS',
    });

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('reaches the ownership route instead of a public listing route', async () => {
    const response = await fetch(
      `${url}/marketplace/purchases/by-listing/any/ownership`,
    );

    expect(response.status).toBe(401);
  });
});
