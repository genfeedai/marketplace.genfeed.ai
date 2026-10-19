import { createServer, type Server } from 'node:http';
import { JwtVerifierService } from '@api/common/auth/jwt-verifier.service';
import { MarketplaceConfigService } from '@api/config/config.service';
import { ConfigService } from '@nestjs/config';
import { exportJWK, generateKeyPair, type JWK, SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const issuer = 'https://api.genfeed.test';
let server: Server;
let keys: JWK[];
let key: Awaited<ReturnType<typeof generateKeyPair>>;
let verifier: JwtVerifierService;
let keyId = 'first';

async function token(claims: Record<string, unknown> = {}) {
  return new SignJWT({
    organizationId: 'org-opaque',
    isSuperAdmin: false,
    ...claims,
  })
    .setProtectedHeader({ alg: 'EdDSA', kid: keyId })
    .setSubject('user-opaque')
    .setIssuer(issuer)
    .setAudience(issuer)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key.privateKey);
}

beforeAll(async () => {
  key = await generateKeyPair('EdDSA');
  keys = [{ ...(await exportJWK(key.publicKey)), kid: keyId, alg: 'EdDSA' }];
  server = createServer((_request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ keys }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('JWKS listener missing');
  verifier = new JwtVerifierService(
    new MarketplaceConfigService(
      new ConfigService({
        NODE_ENV: 'test',
        BETTER_AUTH_ISSUER: issuer,
        BETTER_AUTH_AUDIENCE: issuer,
        BETTER_AUTH_JWKS_URL: `http://127.0.0.1:${address.port}/jwks`,
      }),
    ),
  );
});

afterAll(async () => {
  vi.restoreAllMocks();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

describe('Better Auth remote signing keys', () => {
  it('uses canonical opaque user and organization claims', async () => {
    expect(await verifier.verify(await token())).toMatchObject({
      id: 'user-opaque',
      organizationId: 'org-opaque',
      isSuperAdmin: false,
    });
    expect(
      (await verifier.verify(await token({ isSuperAdmin: 'true' })))
        .isSuperAdmin,
    ).toBe(false);
  });

  it.each([
    ['expired', (jwt: SignJWT) => jwt.setExpirationTime(1)],
    ['wrong issuer', (jwt: SignJWT) => jwt.setIssuer('https://attacker.test')],
    ['wrong audience', (jwt: SignJWT) => jwt.setAudience('unrelated-service')],
  ])('rejects %s credentials', async (_label, change) => {
    const jwt = new SignJWT({ organizationId: 'org-opaque' })
      .setProtectedHeader({ alg: 'EdDSA', kid: keyId })
      .setSubject('user-opaque')
      .setIssuer(issuer)
      .setAudience(issuer)
      .setIssuedAt()
      .setExpirationTime('5m');
    await expect(
      verifier.verify(await change(jwt).sign(key.privateKey)),
    ).rejects.toThrow('Invalid Better Auth token');
  });

  it('rejects tokens without an organization and unsigned tokens', async () => {
    await expect(
      verifier.verify(await token({ organizationId: '' })),
    ).rejects.toThrow('Invalid Better Auth token');
    await expect(
      verifier.verify('eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiJ9.'),
    ).rejects.toThrow('Invalid Better Auth token');
  });

  it('refreshes JWKS after signing-key rotation', async () => {
    key = await generateKeyPair('EdDSA');
    keyId = 'rotated';
    keys = [{ ...(await exportJWK(key.publicKey)), kid: keyId, alg: 'EdDSA' }];
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 6_000);
    try {
      expect((await verifier.verify(await token())).id).toBe('user-opaque');
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('rejects missing expiry and a token signed by an unrelated key', async () => {
    const unsignedExpiry = new SignJWT({ organizationId: 'org-opaque' })
      .setProtectedHeader({ alg: 'EdDSA', kid: keyId })
      .setSubject('user-opaque')
      .setIssuer(issuer)
      .setAudience(issuer)
      .setIssuedAt();
    await expect(
      verifier.verify(await unsignedExpiry.sign(key.privateKey)),
    ).rejects.toThrow('Invalid Better Auth token');
    const unrelated = await generateKeyPair('EdDSA');
    await expect(
      verifier.verify(
        await unsignedExpiry.setExpirationTime('5m').sign(unrelated.privateKey),
      ),
    ).rejects.toThrow('Invalid Better Auth token');
  });
});
