import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MarketplaceConfigService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  get port(): number {
    return this.configService.get<number>('PORT', 3200);
  }

  get databaseUrl(): string {
    return this.configService.getOrThrow<string>('DATABASE_URL');
  }

  get stripeSecretKey(): string {
    return this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');
  }

  get stripeWebhookSecret(): string {
    return this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
  }

  get authIssuer(): string {
    return this.configService.get<string>(
      'BETTER_AUTH_ISSUER',
      new URL(this.genfeedApiUrl).origin,
    );
  }

  get authAudience(): string {
    return this.configService.get<string>(
      'BETTER_AUTH_AUDIENCE',
      this.authIssuer,
    );
  }

  get authJwksUrl(): string {
    return this.configService.get<string>(
      'BETTER_AUTH_JWKS_URL',
      `${this.authIssuer}/v1/auth/jwks`,
    );
  }

  get genfeedApiUrl(): string {
    return this.configService.get<string>(
      'GENFEED_API_URL',
      'https://api.genfeed.ai',
    );
  }

  get marketplaceUrl(): string {
    return this.configService.get<string>(
      'MARKETPLACE_URL',
      'https://shop.genfeed.ai',
    );
  }

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }
}
