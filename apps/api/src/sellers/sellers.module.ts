import { MarketplaceStripeModule } from '@api/common/services/stripe.module';
import {
  AdminSellersController,
  SellersController,
} from '@api/sellers/controllers/sellers.controller';
import {
  Seller,
  SellerSchema,
} from '@api/sellers/schemas/seller.schema';
import { SellersService } from '@api/sellers/services/sellers.service';
import { StripeConnectService } from '@api/sellers/services/stripe-connect.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import mongooseAggregatePaginateV2 from 'mongoose-aggregate-paginate-v2';

@Module({
  controllers: [SellersController, AdminSellersController],
  exports: [SellersService, StripeConnectService],
  imports: [
    MarketplaceStripeModule,
    MongooseModule.forFeatureAsync([
      {
        name: Seller.name,
        useFactory: () => {
          const schema = SellerSchema;

          schema.plugin(mongooseAggregatePaginateV2);

          // Organization queries with soft delete
          schema.index(
            { isDeleted: 1, organization: 1 },
            { partialFilterExpression: { isDeleted: false } },
          );

          // Status and badge filtering
          schema.index({ badgeTier: 1, status: 1 });

          return schema;
        },
      },
    ]),
  ],
  providers: [SellersService, StripeConnectService],
})
export class SellersModule {}
