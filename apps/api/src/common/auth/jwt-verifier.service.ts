import type { MarketplacePrincipal } from '@api/common/auth/marketplace-principal';
import { MarketplaceConfigService } from '@api/config/config.service';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class JwtVerifierService {
  private readonly keySet: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    @Inject(MarketplaceConfigService)
    private readonly config: MarketplaceConfigService,
  ) {
    const jwksUrl = new URL(config.authJwksUrl);
    if (config.nodeEnv === 'production' && jwksUrl.protocol !== 'https:') {
      throw new Error('Production Better Auth JWKS must use HTTPS');
    }
    this.keySet = createRemoteJWKSet(jwksUrl, {
      cooldownDuration: 5_000,
      timeoutDuration: 5_000,
    });
  }

  async verify(token: string): Promise<MarketplacePrincipal> {
    try {
      const { payload } = await jwtVerify(token, this.keySet, {
        algorithms: ['EdDSA', 'ES256', 'RS256'],
        issuer: this.config.authIssuer,
        audience: this.config.authAudience,
        requiredClaims: ['sub', 'exp', 'iat', 'organizationId'],
      });
      if (
        typeof payload.sub !== 'string' ||
        !payload.sub.trim() ||
        typeof payload.organizationId !== 'string' ||
        !payload.organizationId.trim()
      ) {
        throw new Error('Missing identity or organization');
      }
      return {
        id: payload.sub,
        organizationId: payload.organizationId,
        isSuperAdmin: payload.isSuperAdmin === true,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        name: typeof payload.name === 'string' ? payload.name : undefined,
      };
    } catch {
      throw new UnauthorizedException('Invalid Better Auth token');
    }
  }
}
