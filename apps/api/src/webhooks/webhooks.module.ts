import { MarketplaceStripeModule } from '@api/common/services/stripe.module';
import { PurchasesModule } from '@api/purchases/purchases.module';
import { StripeEventLedgerService } from '@api/webhooks/stripe-event-ledger.service';
import { StripeWebhookService } from '@api/webhooks/stripe-webhook.service';
import { WebhooksController } from '@api/webhooks/webhooks.controller';
import { Module } from '@nestjs/common';

@Module({
  controllers: [WebhooksController],
  imports: [PurchasesModule, MarketplaceStripeModule],
  providers: [StripeWebhookService, StripeEventLedgerService],
})
export class WebhooksModule {}
