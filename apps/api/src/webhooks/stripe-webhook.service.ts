import {
  MarketplaceStripeService,
  type StripeCharge,
  type StripeCheckoutSession,
  type StripeWebhookEvent,
} from '@api/common/services/stripe.service';
import { MarketplaceConfigService } from '@api/config/config.service';
import { CheckoutService } from '@api/purchases/services/checkout.service';
import { StripeEventLedgerService } from '@api/webhooks/stripe-event-ledger.service';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    @Inject(MarketplaceStripeService)
    private readonly stripeService: MarketplaceStripeService,
    @Inject(MarketplaceConfigService)
    private readonly configService: MarketplaceConfigService,
    @Inject(CheckoutService) private readonly checkoutService: CheckoutService,
    @Inject(StripeEventLedgerService)
    private readonly ledger: StripeEventLedgerService,
  ) {}

  /**
   * Verify and process a Stripe webhook event
   */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    let event: StripeWebhookEvent;
    const webhookSecret = this.configService.stripeWebhookSecret;
    const client = this.stripeService.client;

    try {
      event = client.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: unknown) {
      this.logger.error('Webhook signature verification failed', {
        error: (err as Error).message,
      });
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    this.logger.log(`Stripe webhook received: ${event.type}`, {
      eventId: event.id,
    });

    if (!(await this.ledger.claim(event.id, event.type))) {
      this.logger.log('Stripe event already processed', { eventId: event.id });
      return;
    }

    await this.applyEvent(event);
    await this.ledger.markProcessed(event.id);
  }

  private async applyEvent(event: StripeWebhookEvent): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as StripeCheckoutSession;

        // Only handle marketplace checkout sessions
        if (session.metadata?.type === 'marketplace') {
          await this.checkoutService.handleSuccessfulCheckout(session);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as StripeCheckoutSession;
        if (session.metadata?.type === 'marketplace') {
          await this.checkoutService.handleFailedCheckout(
            session,
            'Session expired',
          );
        }
        break;
      }

      case 'charge.refunded':
        await this.checkoutService.handleRefundedCharge(
          event.data.object as StripeCharge,
        );
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }
}
