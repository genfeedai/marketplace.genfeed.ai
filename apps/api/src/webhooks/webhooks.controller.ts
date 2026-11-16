import { Public } from '@api/common/decorators/public.decorator';
import { StripeWebhookService } from '@api/webhooks/stripe-webhook.service';
import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  RawBody,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@ApiExcludeController()
@SkipThrottle()
@Controller('webhooks')
export class WebhooksController {
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
    await this.stripeWebhookService.handleWebhook(rawBody, signature);
    return { received: true };
  }
}
