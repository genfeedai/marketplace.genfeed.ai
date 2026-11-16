import { JwtVerifierService } from '@api/common/auth/jwt-verifier.service';
import { MarketplaceStripeModule } from '@api/common/services/stripe.module';
import { ListingsModule } from '@api/listings/listings.module';
import {
  AdminMarketplaceController,
  AdminMarketplacePurchasesController,
  PurchasesController,
  ServicePurchasesController,
} from '@api/purchases/controllers/purchases.controller';
import { CheckoutService } from '@api/purchases/services/checkout.service';
import { PurchasesService } from '@api/purchases/services/purchases.service';
import { SellersModule } from '@api/sellers/sellers.module';
import { forwardRef, Module } from '@nestjs/common';

@Module({
  controllers: [
    PurchasesController,
    AdminMarketplacePurchasesController,
    AdminMarketplaceController,
    ServicePurchasesController,
  ],
  exports: [PurchasesService, CheckoutService],
  imports: [
    forwardRef(() => ListingsModule),
    SellersModule,
    MarketplaceStripeModule,
  ],
  providers: [PurchasesService, CheckoutService, JwtVerifierService],
})
export class PurchasesModule {}
