import { MarketplaceStripeModule } from '@api/common/services/stripe.module';
import { PurchasesModule } from '@api/purchases/purchases.module';
import { StripeWebhookService } from '@api/webhooks/stripe-webhook.service';
import { WebhooksController } from '@api/webhooks/webhooks.controller';
import { Module } from '@nestjs/common';

@Module({
  controllers: [WebhooksController],
  imports: [PurchasesModule, MarketplaceStripeModule],
  providers: [StripeWebhookService],
})
export class WebhooksModule {}
