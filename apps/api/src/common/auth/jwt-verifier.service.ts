import type { MarketplacePrincipal } from '@api/common/auth/marketplace-principal';
import {
  MARKETPLACE_SERVICE_AUDIENCE,
  MARKETPLACE_SERVICE_MAX_TOKEN_SECONDS,
  MARKETPLACE_SERVICE_SUBJECT,
  type MarketplaceServiceScope,
} from '@api/common/auth/service-auth.constants';
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

  /**
   * Verify a token the Genfeed API signed for itself. It must carry the
   * service audience, the Genfeed API as subject, an expiry within a few
   * minutes of issue, and the scope the route needs. A user's identity token
   * names another audience and never passes here, and a service token never
   * passes the user guard.
   */
  async verifyService(
    token: string,
    scope: MarketplaceServiceScope,
  ): Promise<void> {
    try {
      const { payload } = await jwtVerify(token, this.keySet, {
        algorithms: ['EdDSA', 'ES256', 'RS256'],
        audience: MARKETPLACE_SERVICE_AUDIENCE,
        issuer: this.config.authIssuer,
        requiredClaims: ['sub', 'exp', 'iat', 'scope'],
        subject: MARKETPLACE_SERVICE_SUBJECT,
      });
      if (
        typeof payload.scope !== 'string' ||
        !payload.scope.split(' ').includes(scope) ||
        typeof payload.exp !== 'number' ||
        typeof payload.iat !== 'number' ||
        payload.exp - payload.iat > MARKETPLACE_SERVICE_MAX_TOKEN_SECONDS
      ) {
        throw new Error('Service token is not valid for this route');
      }
    } catch {
      throw new UnauthorizedException('Invalid service token');
    }
  }
}
