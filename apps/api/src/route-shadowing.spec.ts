import { AppModule } from '@api/app.module';
import { PrismaService } from '@api/common/prisma/prisma.service';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ModulesContainer } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

interface Route {
  method: number;
  path: string;
  label: string;
}

function join(...parts: string[]): string {
  return `/${parts
    .flatMap((part) => part.split('/'))
    .filter(Boolean)
    .join('/')}`;
}

function firstPath(value: unknown): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

/** Express matches routes in registration order, and a `:param` matches any one segment. */
function shadows(earlier: string, later: string): boolean {
  const first = earlier.split('/');
  const second = later.split('/');
  if (first.length !== second.length) return false;
  let isNarrower = false;
  for (let index = 0; index < first.length; index += 1) {
    const isParam = first[index].startsWith(':');
    if (isParam && !second[index].startsWith(':')) isNarrower = true;
    else if (!isParam && first[index] !== second[index]) return false;
  }
  return isNarrower;
}

describe('Route shadowing', () => {
  let routes: Route[];
  let close: () => Promise<void>;

  beforeAll(async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    close = () => module.close();
    routes = [];
    for (const nestModule of module.get(ModulesContainer).values()) {
      for (const wrapper of nestModule.controllers.values()) {
        const controller = wrapper.metatype as (new () => object) | null;
        if (!controller) continue;
        const prefix = firstPath(
          Reflect.getMetadata(PATH_METADATA, controller),
        );
        for (const name of Object.getOwnPropertyNames(controller.prototype)) {
          const handler = (controller.prototype as Record<string, unknown>)[
            name
          ];
          if (typeof handler !== 'function') continue;
          const method = Reflect.getMetadata(METHOD_METADATA, handler);
          if (method === undefined) continue;
          const path = firstPath(Reflect.getMetadata(PATH_METADATA, handler));
          routes.push({
            label: `${controller.name}.${name}`,
            method,
            path: join(prefix, path),
          });
        }
      }
    }
  });

  afterAll(async () => {
    await close?.();
    vi.unstubAllEnvs();
  });

  it('finds the API routes it checks', () => {
    expect(routes.length).toBeGreaterThan(20);
  });

  it('never lets an earlier route with a parameter swallow a later route', () => {
    const shadowed: string[] = [];
    routes.forEach((later, laterIndex) => {
      for (const earlier of routes.slice(0, laterIndex)) {
        if (
          earlier.method === later.method &&
          shadows(earlier.path, later.path)
        ) {
          shadowed.push(
            `${earlier.label} (${earlier.path}) shadows ${later.label} (${later.path})`,
          );
        }
      }
    });

    expect(shadowed).toEqual([]);
  });

  it('detects the shape of the ownership bug it guards against', () => {
    expect(
      shadows(
        '/marketplace/listings/:sellerSlug/:listingSlug',
        '/marketplace/listings/:listingId/ownership',
      ),
    ).toBe(true);
    expect(
      shadows(
        '/marketplace/listings/:sellerSlug/:listingSlug',
        '/marketplace/purchases/by-listing/:listingId/ownership',
      ),
    ).toBe(false);
  });
});
