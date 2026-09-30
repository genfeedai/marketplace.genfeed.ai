import { ClerkGuard } from '@api/common/guards/clerk.guard';
import { PrismaModule } from '@api/common/prisma/prisma.module';
import { MarketplaceStripeModule } from '@api/common/services/stripe.module';
import { ListingsModule } from '@api/listings/listings.module';
import { PurchasesModule } from '@api/purchases/purchases.module';
import { SellersModule } from '@api/sellers/sellers.module';
import { WebhooksModule } from '@api/webhooks/webhooks.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MarketplaceConfigModule } from './config/config.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.local', '.env'],
      isGlobal: true,
    }),
    MarketplaceConfigModule,
    PrismaModule,
    MarketplaceStripeModule,
    ListingsModule,
    SellersModule,
    PurchasesModule,
    WebhooksModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ClerkGuard }],
})
export class AppModule {}
