import { MarketplaceStripeService } from '@api/common/services/stripe.service';
import { MarketplaceConfigService } from '@api/config/config.service';
import { CheckoutService } from '@api/purchases/services/checkout.service';
import { Injectable, Logger } from '@nestjs/common';
import type Stripe from 'stripe';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly stripeService: MarketplaceStripeService,
    private readonly configService: MarketplaceConfigService,
    private readonly checkoutService: CheckoutService,
  ) {}

  /**
   * Verify and process a Stripe webhook event
   */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripeService.constructEvent(
        rawBody,
        signature,
        this.configService.stripeWebhookSecret,
      );
    } catch (err: unknown) {
      this.logger.error('Webhook signature verification failed', {
        error: (err as Error).message,
      });
      throw err;
    }

    this.logger.log(`Stripe webhook received: ${event.type}`, {
      eventId: event.id,
    });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Only handle marketplace checkout sessions
        if (session.metadata?.type === 'marketplace') {
          await this.checkoutService.handleSuccessfulCheckout(session);
          this.logger.log('Marketplace checkout completed', {
            purchaseId: session.metadata?.purchaseId,
            sessionId: session.id,
          });
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === 'marketplace') {
          await this.checkoutService.handleFailedCheckout(
            session.id,
            'Session expired',
          );
          this.logger.log('Marketplace checkout expired', {
            sessionId: session.id,
          });
        }
        break;
      }

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }
}
