import { JwtVerifierService } from '@api/common/auth/jwt-verifier.service';
import { BetterAuthGuard } from '@api/common/guards/better-auth.guard';
import { PrismaModule } from '@api/common/prisma/prisma.module';
import { MarketplaceStripeModule } from '@api/common/services/stripe.module';
import { ListingsModule } from '@api/listings/listings.module';
import { PurchasesModule } from '@api/purchases/purchases.module';
import { SellersModule } from '@api/sellers/sellers.module';
import { WebhooksModule } from '@api/webhooks/webhooks.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { MarketplaceConfigModule } from './config/config.module';
import { HealthController } from './health/health.controller';
import { DEFAULT_RATE_LIMIT } from './rate-limit';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.local', '.env'],
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([DEFAULT_RATE_LIMIT]),
    MarketplaceConfigModule,
    PrismaModule,
    MarketplaceStripeModule,
    ListingsModule,
    SellersModule,
    PurchasesModule,
    WebhooksModule,
  ],
  controllers: [HealthController],
  providers: [
    JwtVerifierService,
    // Runs before authentication so a flood is refused before a token is checked.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: BetterAuthGuard },
  ],
})
export class AppModule {}
