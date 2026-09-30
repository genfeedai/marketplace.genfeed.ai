import { Public } from '@api/common/decorators/public.decorator';
import { StripeWebhookService } from '@api/webhooks/stripe-webhook.service';
import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  RawBody,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    @Inject(StripeWebhookService)
    private readonly stripeWebhookService: StripeWebhookService,
  ) {}

  @Post('stripe')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    try {
      await this.stripeWebhookService.handleWebhook(rawBody, signature);
    } catch (error: unknown) {
      this.logger.error('Stripe webhook processing failed', {
        error: (error as Error).message,
      });
      // Still return 200 to prevent Stripe retries on non-transient errors
    }

    return { received: true };
  }
}
