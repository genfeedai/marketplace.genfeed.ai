import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

@Injectable()
export class MarketplaceConfigService {
  constructor(private readonly configService: ConfigService) {}

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

  get clerkSecretKey(): string {
    return this.configService.getOrThrow<string>('CLERK_SECRET_KEY');
  }

  get clerkPublishableKey(): string {
    return this.configService.getOrThrow<string>('CLERK_PUBLISHABLE_KEY');
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
      'https://marketplace.genfeed.ai',
    );
  }

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }
}
