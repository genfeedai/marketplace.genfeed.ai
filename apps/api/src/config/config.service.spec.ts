import { describe, expect, it } from 'vitest';
import { MarketplaceConfigService } from './config.service';

describe('MarketplaceConfigService', () => {
  const createService = (env: Record<string, string | undefined>) =>
    new MarketplaceConfigService({
      get: <T>(key: string, defaultValue?: T) =>
        (env[key] as T | undefined) ?? defaultValue,
      getOrThrow: <T>(key: string) => {
        const value = env[key];
        if (!value) {
          throw new Error(`Missing ${key}`);
        }
        return value as T;
      },
    } as never);

  it('returns DATABASE_URL when configured', () => {
    const service = createService({
      DATABASE_URL:
        'postgresql://postgres:postgres@aws-postgres.internal:5432/marketplace?schema=public',
    });

    expect(service.databaseUrl).toBe(
      'postgresql://postgres:postgres@aws-postgres.internal:5432/marketplace?schema=public',
    );
  });

  it('throws when DATABASE_URL is missing', () => {
    const service = createService({});

    expect(() => service.databaseUrl).toThrow('Missing DATABASE_URL');
  });
});
