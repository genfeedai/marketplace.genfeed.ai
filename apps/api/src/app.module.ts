import { MarketplaceStripeModule } from '@api/common/services/stripe.module';
import { ListingsModule } from '@api/listings/listings.module';
import { PurchasesModule } from '@api/purchases/purchases.module';
import { SellersModule } from '@api/sellers/sellers.module';
import { WebhooksModule } from '@api/webhooks/webhooks.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MarketplaceConfigService } from './config/config.service';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace',
      }),
    }),
    MarketplaceStripeModule,
    ListingsModule,
    SellersModule,
    PurchasesModule,
    WebhooksModule,
  ],
  controllers: [HealthController],
  providers: [MarketplaceConfigService],
  exports: [MarketplaceConfigService],
})
export class AppModule {}
