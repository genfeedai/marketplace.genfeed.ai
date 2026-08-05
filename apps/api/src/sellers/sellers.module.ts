import { MarketplaceStripeModule } from '@api/common/services/stripe.module';
import {
  AdminSellersController,
  SellersController,
} from '@api/sellers/controllers/sellers.controller';
import { SellersService } from '@api/sellers/services/sellers.service';
import { StripeConnectService } from '@api/sellers/services/stripe-connect.service';
import { Module } from '@nestjs/common';

@Module({
  controllers: [SellersController, AdminSellersController],
  exports: [SellersService, StripeConnectService],
  imports: [MarketplaceStripeModule],
  providers: [SellersService, StripeConnectService],
})
export class SellersModule {}
