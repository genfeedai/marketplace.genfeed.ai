import {
  MarketplaceStripeService,
  type StripeCheckoutSession,
  type StripeWebhookEvent,
} from '@api/common/services/stripe.service';
import { MarketplaceConfigService } from '@api/config/config.service';
import { CheckoutService } from '@api/purchases/services/checkout.service';
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

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as StripeCheckoutSession;

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
        const session = event.data.object as StripeCheckoutSession;
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
