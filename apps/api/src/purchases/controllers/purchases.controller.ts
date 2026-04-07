import { LogMethod } from '@api/common/decorators/log-method.decorator';
import { RolesDecorator } from '@api/common/decorators/roles.decorator';
import { AutoSwagger } from '@api/common/decorators/auto-swagger.decorator';
import { CurrentUser } from '@api/common/decorators/current-user.decorator';
import { RolesGuard } from '@api/common/guards/roles.guard';
import { getPublicMetadata } from '@api/common/utils/clerk.util';
import {
  returnNotFound,
  serializeCollection,
  serializeSingle,
} from '@api/common/utils/response.util';
import {
  MarketplaceAnalyticsOverviewSerializer,
  PurchaseSerializer,
  SellerSerializer,
} from '@api/common/serializers';
import { ListingsService } from '@api/listings/services/listings.service';
import { AdminPurchaseQueryDto } from '@api/purchases/dto/admin-purchase-query.dto';
import { CheckoutDto } from '@api/purchases/dto/checkout.dto';
import { PurchaseQueryDto } from '@api/purchases/dto/purchase-query.dto';
import { CheckoutService } from '@api/purchases/services/checkout.service';
import { PurchasesService } from '@api/purchases/services/purchases.service';
import { AdminSellerQueryDto } from '@api/sellers/dto/admin-seller-query.dto';
import { SellersService } from '@api/sellers/services/sellers.service';
import type { User } from '@clerk/backend';
import type {
  JsonApiCollectionResponse,
  JsonApiSingleResponse,
} from '@api/common/interfaces/json-api.interface';
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

@AutoSwagger()
@ApiTags('Marketplace Purchases')
@Controller('marketplace')
@ApiBearerAuth()
export class PurchasesController {
  private readonly constructorName: string = String(this.constructor.name);

  constructor(
    private readonly purchasesService: PurchasesService,
    private readonly checkoutService: CheckoutService,
    private readonly listingsService: ListingsService,
    private readonly sellersService: SellersService,
  ) {}

  /**
   * Create Stripe Checkout session for a listing
   */
  @Post('listings/:listingId/checkout')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async createCheckoutSession(
    @Req() request: Request,
    @Param('listingId') listingId: string,
    @Body() dto: CheckoutDto,
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);

    // Determine success/cancel URLs
    const origin = request.headers.origin || 'https://marketplace.genfeed.ai';
    const successUrl = dto.successUrl || `${origin}/checkout/success`;
    const cancelUrl = dto.cancelUrl || `${origin}/checkout/cancel`;

    const result = await this.checkoutService.createCheckoutSession({
      buyerId: publicMetadata.user,
      cancelUrl,
      listingId,
      organizationId: publicMetadata.organization,
      successUrl,
    });

    return {
      data: {
        attributes: {
          purchaseId: result.purchase._id.toString(),
          sessionId: result.sessionId,
          url: result.url,
        },
        id: result.sessionId,
        type: 'checkout-session',
      },
    };
  }

  /**
   * Get checkout session status
   */
  @Get('checkout/:sessionId')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getCheckoutSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() _user: User,
  ): Promise<JsonApiSingleResponse> {
    const session = await this.checkoutService.getCheckoutSession(sessionId);

    return {
      data: {
        attributes: {
          amountTotal: session.amount_total,
          currency: session.currency,
          paymentStatus: session.payment_status,
          status: session.status,
        },
        id: sessionId,
        type: 'checkout-session',
      },
    };
  }

  /**
   * Claim a free listing
   */
  @Post('listings/:listingId/claim')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async claimFreeListing(
    @Req() request: Request,
    @Param('listingId') listingId: string,
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);

    const purchase = await this.purchasesService.claimFreeItem(
      listingId,
      publicMetadata.user,
      publicMetadata.organization,
    );

    return serializeSingle(request, PurchaseSerializer, purchase) as JsonApiSingleResponse;
  }

  /**
   * Get buyer's purchases
   */
  @Get('purchases')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getMyPurchases(
    @Req() request: Request,
    @Query() query: PurchaseQueryDto,
    @CurrentUser() user: User,
  ): Promise<JsonApiCollectionResponse> {
    const publicMetadata = getPublicMetadata(user);

    const data = await this.purchasesService.getBuyerPurchases(
      publicMetadata.user,
      publicMetadata.organization,
      query,
    );

    return serializeCollection(request, PurchaseSerializer, data) as JsonApiCollectionResponse;
  }

  /**
   * Get a specific purchase
   */
  @Get('purchases/:purchaseId')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getPurchase(
    @Req() request: Request,
    @Param('purchaseId') purchaseId: string,
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);

    const { owned, purchase } = await this.purchasesService.verifyOwnership(
      purchaseId,
      publicMetadata.user,
      publicMetadata.organization,
    );

    if (!owned || !purchase) {
      return returnNotFound(this.constructorName, purchaseId);
    }

    return serializeSingle(request, PurchaseSerializer, purchase) as JsonApiSingleResponse;
  }

  /**
   * Get download URL for a purchase
   */
  @Get('purchases/:purchaseId/download')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getDownloadUrl(
    @Param('purchaseId') purchaseId: string,
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);

    const { owned, purchase } = await this.purchasesService.verifyOwnership(
      purchaseId,
      publicMetadata.user,
      publicMetadata.organization,
    );

    if (!owned || !purchase) {
      return returnNotFound(this.constructorName, purchaseId);
    }

    // Get the listing to retrieve download data
    const listing = await this.listingsService.findOne({
      _id: purchase.listing,
    });

    if (!listing) {
      return returnNotFound('Listing', purchase.listing.toString());
    }

    // Track the download
    await this.purchasesService.trackDownload(purchaseId);

    return {
      data: {
        attributes: {
          downloadData: listing.downloadData,
          downloadedAt: new Date().toISOString(),
          purchaseId,
        },
        id: purchaseId,
        type: 'download',
      },
    };
  }

  /**
   * Get download data for a purchase (listing.downloadData)
   */
  @Get('purchases/:purchaseId/download-data')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getDownloadData(
    @Param('purchaseId') purchaseId: string,
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);

    const { owned, purchase } = await this.purchasesService.verifyOwnership(
      purchaseId,
      publicMetadata.user,
      publicMetadata.organization,
    );

    if (!owned || !purchase) {
      return returnNotFound(this.constructorName, purchaseId);
    }

    const listing = await this.listingsService.findOne({
      _id: purchase.listing,
    });

    if (!listing) {
      return returnNotFound('Listing', purchase.listing.toString());
    }

    return {
      data: {
        attributes: {
          downloadData: listing.downloadData,
        },
        id: purchaseId,
        type: 'download-data',
      },
    };
  }

  /**
   * Check if user owns a listing
   */
  @Get('listings/:listingId/ownership')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async checkOwnership(
    @Param('listingId') listingId: string,
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);

    const { owned, purchase } =
      await this.purchasesService.checkListingOwnership(
        listingId,
        publicMetadata.user,
        publicMetadata.organization,
      );

    return {
      data: {
        attributes: {
          listingId,
          owned,
          purchaseId: purchase?._id?.toString(),
        },
        id: listingId,
        type: 'listing-ownership',
      },
    };
  }

  /**
   * Get seller dashboard overview (profile + analytics summary)
   */
  @Get('seller/overview')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getSellerOverview(
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const analytics = await this.purchasesService.getSellerAnalytics(
      seller._id.toString(),
    );

    return {
      data: {
        attributes: {
          analytics,
          seller: {
            badgeTier: seller.badgeTier,
            displayName: seller.displayName,
            payoutEnabled: seller.payoutEnabled,
            slug: seller.slug,
            status: seller.status,
            stripeOnboardingComplete: seller.stripeOnboardingComplete,
            totalEarnings: seller.totalEarnings,
            totalSales: seller.totalSales,
          },
        },
        id: seller._id.toString(),
        type: 'seller-overview',
      },
    };
  }

  /**
   * Get seller's sales (paginated)
   */
  @Get('seller/sales')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getSellerSales(
    @Req() request: Request,
    @Query() query: PurchaseQueryDto,
    @CurrentUser() user: User,
  ): Promise<JsonApiCollectionResponse> {
    const publicMetadata = getPublicMetadata(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const data = await this.purchasesService.getSellerSales(
      seller._id.toString(),
      query,
    );

    return serializeCollection(request, PurchaseSerializer, data) as JsonApiCollectionResponse;
  }

  /**
   * Get seller analytics (totals + 30-day breakdown)
   */
  @Get('seller/analytics')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getSellerAnalytics(
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const analytics = await this.purchasesService.getSellerAnalytics(
      seller._id.toString(),
    );

    return {
      data: {
        attributes: analytics,
        id: seller._id.toString(),
        type: 'seller-analytics',
      },
    };
  }
}

@AutoSwagger()
@ApiTags('Admin Marketplace Purchases')
@Controller('admin/marketplace/purchases')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class AdminMarketplacePurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  @RolesDecorator('superadmin')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getPurchases(
    @Req() request: Request,
    @Query() query: AdminPurchaseQueryDto,
    @CurrentUser() user: User,
  ): Promise<JsonApiCollectionResponse> {
    const publicMetadata = getPublicMetadata(user);

    const data = await this.purchasesService.getAdminPurchases(
      publicMetadata.organization,
      query,
    );

    return serializeCollection(request, PurchaseSerializer, data) as JsonApiCollectionResponse;
  }

  @Get(':purchaseId')
  @RolesDecorator('superadmin')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getPurchase(
    @Req() request: Request,
    @Param('purchaseId') purchaseId: string,
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);
    const purchase = await this.purchasesService.getAdminPurchaseById(
      publicMetadata.organization,
      purchaseId,
    );

    if (!purchase) {
      return returnNotFound('AdminMarketplacePurchasesController', purchaseId);
    }

    return serializeSingle(request, PurchaseSerializer, purchase) as JsonApiSingleResponse;
  }
}

@AutoSwagger()
@ApiTags('Admin Marketplace')
@Controller('admin/marketplace')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class AdminMarketplaceController {
  constructor(
    private readonly purchasesService: PurchasesService,
    private readonly sellersService: SellersService,
  ) {}

  @Get('analytics/overview')
  @RolesDecorator('superadmin')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getOverview(
    @Req() request: Request,
    @Query('days') days: string | undefined,
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);
    const parsedDays = days ? Number(days) : 30;

    const analytics = await this.purchasesService.getAdminAnalyticsOverview(
      publicMetadata.organization,
      Number.isFinite(parsedDays) ? parsedDays : 30,
    );

    return serializeSingle(request, MarketplaceAnalyticsOverviewSerializer, {
      _id: publicMetadata.organization,
      ...analytics,
    }) as JsonApiSingleResponse;
  }

  @Get('payouts')
  @RolesDecorator('superadmin')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getPayouts(
    @Req() request: Request,
    @Query() query: AdminSellerQueryDto,
    @CurrentUser() user: User,
  ): Promise<JsonApiCollectionResponse> {
    const publicMetadata = getPublicMetadata(user);
    const data = await this.sellersService.getAdminPayouts(
      publicMetadata.organization,
      query,
    );

    return serializeCollection(request, SellerSerializer, data) as JsonApiCollectionResponse;
  }
}
