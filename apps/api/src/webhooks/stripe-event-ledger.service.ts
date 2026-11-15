import { PrismaService } from '@api/common/prisma/prisma.service';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Remembers every Stripe event id so a redelivered event is not applied
 * again. An event whose handling failed stays unprocessed, so Stripe's retry
 * handles it; the purchase transitions are themselves guarded, so two
 * deliveries at the same moment still apply the effect once.
 */
@Injectable()
export class StripeEventLedgerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Returns false when this event id was already processed. */
  async claim(stripeEventId: string, type: string): Promise<boolean> {
    try {
      await this.prisma.stripeEvent.create({ data: { stripeEventId, type } });
      return true;
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }
    }

    const existing = await this.prisma.stripeEvent.findUnique({
      select: { processedAt: true },
      where: { stripeEventId },
    });

    return existing?.processedAt == null;
  }

  async markProcessed(stripeEventId: string): Promise<void> {
    await this.prisma.stripeEvent.update({
      data: { processedAt: new Date() },
      where: { stripeEventId },
    });
  }
}
