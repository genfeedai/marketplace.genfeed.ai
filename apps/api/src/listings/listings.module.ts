import {
  AdminListingsController,
  ListingsController,
  SellerListingsController,
} from '@api/listings/controllers/listings.controller';
import { ListingsService } from '@api/listings/services/listings.service';
import { PurchasesModule } from '@api/purchases/purchases.module';
import { SellersModule } from '@api/sellers/sellers.module';
import { forwardRef, Module } from '@nestjs/common';

@Module({
  controllers: [
    ListingsController,
    SellerListingsController,
    AdminListingsController,
  ],
  exports: [ListingsService],
  imports: [forwardRef(() => PurchasesModule), SellersModule],
  providers: [ListingsService],
})
export class ListingsModule {}
