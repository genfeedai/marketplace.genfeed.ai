import { MarketplaceStripeModule } from '@api/common/services/stripe.module';
import { ListingsModule } from '@api/listings/listings.module';
import {
  AdminMarketplaceController,
  AdminMarketplacePurchasesController,
  PurchasesController,
} from '@api/purchases/controllers/purchases.controller';
import {
  Purchase,
  PurchaseSchema,
} from '@api/purchases/schemas/purchase.schema';
import { CheckoutService } from '@api/purchases/services/checkout.service';
import { PurchasesService } from '@api/purchases/services/purchases.service';
import { SellersModule } from '@api/sellers/sellers.module';
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import mongooseAggregatePaginateV2 from 'mongoose-aggregate-paginate-v2';

@Module({
  controllers: [
    PurchasesController,
    AdminMarketplacePurchasesController,
    AdminMarketplaceController,
  ],
  exports: [PurchasesService, CheckoutService],
  imports: [
    forwardRef(() => ListingsModule),
    SellersModule,
    MarketplaceStripeModule,
    MongooseModule.forFeatureAsync([
      {
        name: Purchase.name,
        useFactory: () => {
          const schema = PurchaseSchema;

          schema.plugin(mongooseAggregatePaginateV2);

          // Unique constraint: buyer can only purchase a listing once
          schema.index(
            { buyer: 1, listing: 1 },
            {
              partialFilterExpression: {
                isDeleted: false,
                status: 'completed',
              },
              unique: true,
            },
          );

          // Buyer's purchases with organization
          schema.index(
            { buyer: 1, isDeleted: 1, organization: 1 },
            { partialFilterExpression: { isDeleted: false } },
          );

          // Seller's sales with status
          schema.index({ seller: 1, status: 1 });

          // Listing purchases with status
          schema.index({ listing: 1, status: 1 });

          return schema;
        },
      },
    ]),
  ],
  providers: [PurchasesService, CheckoutService],
})
export class PurchasesModule {}
