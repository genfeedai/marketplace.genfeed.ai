import type { MarketplacePrincipal } from '@api/common/auth/marketplace-principal';
import { getIdentity } from '@api/common/auth/marketplace-principal';
import { MARKETPLACE_SERVICE_SCOPES } from '@api/common/auth/service-auth.constants';
import { AutoSwagger } from '@api/common/decorators/auto-swagger.decorator';
import { CurrentUser } from '@api/common/decorators/current-user.decorator';
import { LogMethod } from '@api/common/decorators/log-method.decorator';
import { Public } from '@api/common/decorators/public.decorator';
import { RolesDecorator } from '@api/common/decorators/roles.decorator';
import { ServiceScope } from '@api/common/decorators/service-scope.decorator';
import {
  ValidatedBody,
  ValidatedQuery,
} from '@api/common/decorators/validated-parameter.decorator';
import { RolesGuard } from '@api/common/guards/roles.guard';
import { ServiceAuthGuard } from '@api/common/guards/service-auth.guard';
import type {
  JsonApiCollectionResponse,
  JsonApiSingleResponse,
} from '@api/common/interfaces/json-api.interface';
import {
  MarketplaceAnalyticsOverviewSerializer,
  PurchaseSerializer,
  SellerSerializer,
} from '@api/common/serializers';
import {
  returnNotFound,
  serializeCollection,
  serializeSingle,
} from '@api/common/utils/response.util';
import { MarketplaceConfigService } from '@api/config/config.service';
import { ListingsService } from '@api/listings/services/listings.service';
import { AdminPurchaseQueryDto } from '@api/purchases/dto/admin-purchase-query.dto';
import { CheckoutDto } from '@api/purchases/dto/checkout.dto';
import { PurchaseQueryDto } from '@api/purchases/dto/purchase-query.dto';
import {
  RecordCreditPurchaseDto,
  RefundCreditPurchaseDto,
} from '@api/purchases/dto/record-credit-purchase.dto';
import { CheckoutService } from '@api/purchases/services/checkout.service';
import { PurchasesService } from '@api/purchases/services/purchases.service';
import { PURCHASE_RATE_LIMIT } from '@api/rate-limit';
import { AdminSellerQueryDto } from '@api/sellers/dto/admin-seller-query.dto';
import { SellersService } from '@api/sellers/services/sellers.service';
import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

@AutoSwagger()
@ApiTags('Marketplace Purchases')
@Controller('marketplace')
@ApiBearerAuth()
export class PurchasesController {
  private readonly constructorName: string = String(this.constructor.name);

  constructor(
    @Inject(PurchasesService)
    private readonly purchasesService: PurchasesService,
    @Inject(CheckoutService) private readonly checkoutService: CheckoutService,
    @Inject(ListingsService) private readonly listingsService: ListingsService,
    @Inject(SellersService) private readonly sellersService: SellersService,
    @Inject(MarketplaceConfigService)
    private readonly config: MarketplaceConfigService,
  ) {}

  /**
   * Create Stripe Checkout session for a listing
   */
  @Post('listings/:listingId/checkout')
  @Throttle(PURCHASE_RATE_LIMIT)
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async createCheckoutSession(
    @Req() request: Request,
    @Param('listingId') listingId: string,
    @ValidatedBody(CheckoutDto) dto: CheckoutDto,
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getIdentity(user);

    if (dto.listingId && dto.listingId !== listingId) {
      throw new BadRequestException(
        'Listing ID must match the requested listing',
      );
    }
    const origin = new URL(this.config.marketplaceUrl).origin;
    const successUrl = dto.successUrl || `${origin}/checkout/success`;
    const cancelUrl = dto.cancelUrl || `${origin}/checkout/cancel`;
    if (
      [successUrl, cancelUrl].some((value) => new URL(value).origin !== origin)
    ) {
      throw new BadRequestException(
        'Checkout redirects must use the Marketplace origin',
      );
    }

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
          purchaseId: result.purchase.id,
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
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiSingleResponse> {
    if (
      !(await this.purchasesService.ownsCheckoutSession(
        sessionId,
        user.id,
        user.organizationId,
      ))
    ) {
      throw new NotFoundException('Checkout session not found');
    }
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
  @Throttle(PURCHASE_RATE_LIMIT)
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async claimFreeListing(
    @Req() request: Request,
    @Param('listingId') listingId: string,
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getIdentity(user);

    const purchase = await this.purchasesService.claimFreeItem(
      listingId,
      publicMetadata.user,
      publicMetadata.organization,
    );

    return serializeSingle(
      request,
      PurchaseSerializer,
      purchase,
    ) as JsonApiSingleResponse;
  }

  /**
   * Get buyer's purchases
   */
  @Get('purchases')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getMyPurchases(
    @Req() request: Request,
    @ValidatedQuery(PurchaseQueryDto) query: PurchaseQueryDto,
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiCollectionResponse> {
    const publicMetadata = getIdentity(user);

    const data = await this.purchasesService.getBuyerPurchases(
      publicMetadata.user,
      publicMetadata.organization,
      query,
    );

    return serializeCollection(
      request,
      PurchaseSerializer,
      data,
    ) as JsonApiCollectionResponse;
  }

  /**
   * Get a specific purchase
   */
  @Get('purchases/:purchaseId')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getPurchase(
    @Req() request: Request,
    @Param('purchaseId') purchaseId: string,
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getIdentity(user);

    const { owned, purchase } = await this.purchasesService.verifyOwnership(
      purchaseId,
      publicMetadata.user,
      publicMetadata.organization,
    );

    if (!owned || !purchase) {
      return returnNotFound(this.constructorName, purchaseId);
    }

    return serializeSingle(
      request,
      PurchaseSerializer,
      purchase,
    ) as JsonApiSingleResponse;
  }

  /**
   * Get download URL for a purchase
   */
  @Get('purchases/:purchaseId/download')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getDownloadUrl(
    @Param('purchaseId') purchaseId: string,
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getIdentity(user);

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
      id: purchase.listing,
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
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getIdentity(user);

    const { owned, purchase } = await this.purchasesService.verifyOwnership(
      purchaseId,
      publicMetadata.user,
      publicMetadata.organization,
    );

    if (!owned || !purchase) {
      return returnNotFound(this.constructorName, purchaseId);
    }

    const listing = await this.listingsService.findOne({
      id: purchase.listing,
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
  @Get('purchases/by-listing/:listingId/ownership')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async checkOwnership(
    @Param('listingId') listingId: string,
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getIdentity(user);

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
          purchaseId: purchase?.id,
        },
        id: listingId,
        type: 'listing-ownership',
      },
    };
  }

  /**
   * Install payload of a listing the caller has bought. The Genfeed API relays
   * the buyer's own token here; the payload is returned only for a completed,
   * non-deleted purchase of this listing by this user in this organization.
   */
  @Get('purchases/by-listing/:listingId/install-data')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getInstallData(
    @Param('listingId') listingId: string,
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getIdentity(user);

    const { owned, purchase } =
      await this.purchasesService.checkListingOwnership(
        listingId,
        publicMetadata.user,
        publicMetadata.organization,
      );

    if (!owned || !purchase) {
      throw new ForbiddenException(
        'This item is not in your marketplace library',
      );
    }

    const listing = await this.listingsService.findOne({ id: listingId });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return {
      data: {
        attributes: {
          downloadData: listing.downloadData,
          listingId,
          title: listing.title,
          type: listing.type,
        },
        id: purchase.id,
        type: 'install-data',
      },
    };
  }

  /**
   * Get seller dashboard overview (profile + analytics summary)
   */
  @Get('seller/overview')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getSellerOverview(
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getIdentity(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const analytics = await this.purchasesService.getSellerAnalytics(seller.id);

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
        id: seller.id,
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
    @ValidatedQuery(PurchaseQueryDto) query: PurchaseQueryDto,
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiCollectionResponse> {
    const publicMetadata = getIdentity(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const data = await this.purchasesService.getSellerSales(seller.id, query);

    return serializeCollection(
      request,
      PurchaseSerializer,
      data,
    ) as JsonApiCollectionResponse;
  }

  /**
   * Get seller analytics (totals + 30-day breakdown)
   */
  @Get('seller/analytics')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getSellerAnalytics(
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getIdentity(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const analytics = await this.purchasesService.getSellerAnalytics(seller.id);

    return {
      data: {
        attributes: analytics,
        id: seller.id,
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
  constructor(
    @Inject(PurchasesService)
    private readonly purchasesService: PurchasesService,
  ) {}

  @Get()
  @RolesDecorator('superadmin')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getPurchases(
    @Req() request: Request,
    @ValidatedQuery(AdminPurchaseQueryDto) query: AdminPurchaseQueryDto,
  ): Promise<JsonApiCollectionResponse> {
    const data = await this.purchasesService.getAdminPurchases(query);

    return serializeCollection(
      request,
      PurchaseSerializer,
      data,
    ) as JsonApiCollectionResponse;
  }

  @Get(':purchaseId')
  @RolesDecorator('superadmin')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getPurchase(
    @Req() request: Request,
    @Param('purchaseId') purchaseId: string,
  ): Promise<JsonApiSingleResponse> {
    const purchase =
      await this.purchasesService.getAdminPurchaseById(purchaseId);

    if (!purchase) {
      return returnNotFound('AdminMarketplacePurchasesController', purchaseId);
    }

    return serializeSingle(
      request,
      PurchaseSerializer,
      purchase,
    ) as JsonApiSingleResponse;
  }
}

@AutoSwagger()
@ApiTags('Admin Marketplace')
@Controller('admin/marketplace')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class AdminMarketplaceController {
  constructor(
    @Inject(PurchasesService)
    private readonly purchasesService: PurchasesService,
    @Inject(SellersService) private readonly sellersService: SellersService,
  ) {}

  @Get('analytics/overview')
  @RolesDecorator('superadmin')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getOverview(
    @Req() request: Request,
    @Query('days') days: string | undefined,
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getIdentity(user);
    const parsedDays = days ? Number(days) : 30;

    const analytics = await this.purchasesService.getAdminAnalyticsOverview(
      Number.isFinite(parsedDays) ? parsedDays : 30,
    );

    return serializeSingle(request, MarketplaceAnalyticsOverviewSerializer, {
      id: publicMetadata.organization,
      ...analytics,
    }) as JsonApiSingleResponse;
  }

  @Get('payouts')
  @RolesDecorator('superadmin')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getPayouts(
    @Req() request: Request,
    @ValidatedQuery(AdminSellerQueryDto) query: AdminSellerQueryDto,
  ): Promise<JsonApiCollectionResponse> {
    const data = await this.sellersService.getAdminPayouts(query);

    return serializeCollection(
      request,
      SellerSerializer,
      data,
    ) as JsonApiCollectionResponse;
  }
}

/**
 * Routes only the Genfeed API calls, with a token it signs for itself. The
 * main API takes a buyer's credits first, then records the purchase here.
 */
@AutoSwagger()
@ApiTags('Marketplace Service Purchases')
@Controller('marketplace/service/purchases')
@Public()
@UseGuards(ServiceAuthGuard)
export class ServicePurchasesController {
  constructor(
    @Inject(PurchasesService)
    private readonly purchasesService: PurchasesService,
  ) {}

  /** 201 for a new purchase, 200 when the call key already recorded one. */
  @Post()
  @ServiceScope(MARKETPLACE_SERVICE_SCOPES.recordPurchase)
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async recordCreditPurchase(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @ValidatedBody(RecordCreditPurchaseDto) dto: RecordCreditPurchaseDto,
  ): Promise<JsonApiSingleResponse> {
    const { created, purchase } =
      await this.purchasesService.recordCreditPurchase(dto);
    response.status(created ? 201 : 200);

    return serializeSingle(
      request,
      PurchaseSerializer,
      purchase,
    ) as JsonApiSingleResponse;
  }

  /** Refund a credit purchase by its call key; the item leaves the library. */
  @Post('refund')
  @ServiceScope(MARKETPLACE_SERVICE_SCOPES.refundPurchase)
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async refundCreditPurchase(
    @Req() request: Request,
    @ValidatedBody(RefundCreditPurchaseDto) dto: RefundCreditPurchaseDto,
  ): Promise<JsonApiSingleResponse> {
    const purchase = await this.purchasesService.refundCreditPurchase(
      dto.idempotencyKey,
    );
    if (!purchase) {
      throw new NotFoundException('No purchase was recorded under this key');
    }

    return serializeSingle(
      request,
      PurchaseSerializer,
      purchase,
    ) as JsonApiSingleResponse;
  }
}
