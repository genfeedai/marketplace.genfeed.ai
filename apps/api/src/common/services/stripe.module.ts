import { Module } from '@nestjs/common';
import { MarketplaceStripeService } from './stripe.service';

@Module({
  providers: [MarketplaceStripeService],
  exports: [MarketplaceStripeService],
})
export class MarketplaceStripeModule {}
