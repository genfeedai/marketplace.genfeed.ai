import type { MarketplacePrincipal } from '@api/common/auth/marketplace-principal';
import { getIdentity } from '@api/common/auth/marketplace-principal';
import { AutoSwagger } from '@api/common/decorators/auto-swagger.decorator';
import { CurrentUser } from '@api/common/decorators/current-user.decorator';
import { LogMethod } from '@api/common/decorators/log-method.decorator';
import { Public } from '@api/common/decorators/public.decorator';
import { RolesDecorator } from '@api/common/decorators/roles.decorator';
import {
  ValidatedBody,
  ValidatedQuery,
} from '@api/common/decorators/validated-parameter.decorator';
import { RolesGuard } from '@api/common/guards/roles.guard';
import type {
  JsonApiCollectionResponse,
  JsonApiSingleResponse,
} from '@api/common/interfaces/json-api.interface';
import {
  ListingSerializer,
  PublicListingSerializer,
  PurchaseSerializer,
} from '@api/common/serializers';
import {
  returnNotFound,
  serializeCollection,
  serializeSingle,
} from '@api/common/utils/response.util';
import { CreateListingDto } from '@api/listings/dto/create-listing.dto';
import { ListingQueryDto } from '@api/listings/dto/listing-query.dto';
import { ReviewListingDto } from '@api/listings/dto/review-listing.dto';
import { UpdateListingDto } from '@api/listings/dto/update-listing.dto';
import { ListingsService } from '@api/listings/services/listings.service';
import { PurchasesService } from '@api/purchases/services/purchases.service';
import { SellersService } from '@api/sellers/services/sellers.service';
import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

@AutoSwagger()
@ApiTags('Marketplace Listings')
@Controller('marketplace/listings')
export class ListingsController {
  private readonly constructorName: string = String(this.constructor.name);

  constructor(
    @Inject(ListingsService) private readonly listingsService: ListingsService,
    @Inject(PurchasesService)
    private readonly purchasesService: PurchasesService,
    @Inject(SellersService) readonly _sellersService: SellersService,
  ) {}

  /**
   * Browse public published listings
   */
  @Public()
  @Get()
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async browseListings(
    @Req() request: Request,
    @ValidatedQuery(ListingQueryDto) query: ListingQueryDto,
  ): Promise<JsonApiCollectionResponse> {
    const data = await this.listingsService.getPublicListings(query);
    return serializeCollection(
      request,
      PublicListingSerializer,
      data,
    ) as JsonApiCollectionResponse;
  }

  /**
   * Get public listing by seller slug and listing slug
   */
  @Public()
  @Get(':sellerSlug/:listingSlug')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getListingBySlug(
    @Req() request: Request,
    @Param('sellerSlug') sellerSlug: string,
    @Param('listingSlug') listingSlug: string,
  ): Promise<JsonApiSingleResponse> {
    const fullSlug = `${sellerSlug}/${listingSlug}`;
    const listing = await this.listingsService.findBySlug(fullSlug);

    if (!listing) {
      return returnNotFound(this.constructorName, fullSlug);
    }

    // Increment view count
    await this.listingsService.incrementViews(listing.id);

    return serializeSingle(
      request,
      PublicListingSerializer,
      listing,
    ) as JsonApiSingleResponse;
  }

  /**
   * Get preview data for a listing (public)
   */
  @Public()
  @Get(':sellerSlug/:listingSlug/preview')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getListingPreview(
    @Param('sellerSlug') sellerSlug: string,
    @Param('listingSlug') listingSlug: string,
  ): Promise<JsonApiSingleResponse> {
    const fullSlug = `${sellerSlug}/${listingSlug}`;
    const listing = await this.listingsService.findBySlug(fullSlug);

    if (!listing) {
      return returnNotFound(this.constructorName, fullSlug);
    }

    return {
      data: {
        attributes: {
          previewData: listing.previewData,
          title: listing.title,
          type: listing.type,
        },
        id: listing.id,
        type: 'listing-preview',
      },
    };
  }

  /**
   * Get featured listings (official, highest rated)
   */
  @Public()
  @Get('featured')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getFeatured(
    @Req() request: Request,
  ): Promise<JsonApiCollectionResponse> {
    const data = await this.listingsService.getFeaturedListings(12);
    return serializeCollection(
      request,
      PublicListingSerializer,
      data,
    ) as JsonApiCollectionResponse;
  }

  /**
   * Get category counts for published listings
   */
  @Public()
  @Get('categories')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getCategories(): Promise<JsonApiSingleResponse> {
    const categories = await this.listingsService.getCategoryCounts();

    return {
      data: {
        attributes: { categories },
        id: 'categories',
        type: 'category-counts',
      },
    };
  }

  /**
   * Get user's library (claimed/purchased items)
   */
  @Get('library')
  @ApiBearerAuth()
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getLibrary(
    @Req() request: Request,
    @ValidatedQuery(ListingQueryDto) query: ListingQueryDto,
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiCollectionResponse> {
    const publicMetadata = getIdentity(user);

    const data = await this.purchasesService.getBuyerPurchases(
      publicMetadata.user,
      publicMetadata.organization,
      // @ts-expect-error TS2345
      query,
    );

    return serializeCollection(
      request,
      PurchaseSerializer,
      data,
    ) as JsonApiCollectionResponse;
  }

  /**
   * Claim a free listing to library
   */
  @Post('library/:listingId')
  @ApiBearerAuth()
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async addToLibrary(
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
  @Public()
  @Get(':listingId')
  async getPublishedListingById(
    @Req() request: Request,
    @Param('listingId') listingId: string,
  ): Promise<JsonApiSingleResponse> {
    const listing = await this.listingsService.getPublishedListing(listingId);
    if (!listing) return returnNotFound(this.constructorName, listingId);
    return serializeSingle(
      request,
      PublicListingSerializer,
      listing,
    ) as JsonApiSingleResponse;
  }
}

/**
 * Seller-specific listing management
 */
@AutoSwagger()
@ApiTags('Seller Listings')
@Controller('seller/listings')
@ApiBearerAuth()
export class SellerListingsController {
  private readonly constructorName: string = String(this.constructor.name);

  constructor(
    @Inject(ListingsService) private readonly listingsService: ListingsService,
    @Inject(SellersService) private readonly sellersService: SellersService,
  ) {}

  /**
   * Get current seller's listings
   */
  @Get()
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getMyListings(
    @Req() request: Request,
    @ValidatedQuery(ListingQueryDto) query: ListingQueryDto,
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiCollectionResponse> {
    const publicMetadata = getIdentity(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);

    if (!seller) {
      return {
        data: [],
        meta: {
          hasNextPage: false,
          hasPrevPage: false,
          limit: 10,
          page: 1,
          totalDocs: 0,
          totalPages: 0,
        },
      };
    }

    const data = await this.listingsService.getSellerListings(seller.id, query);

    return serializeCollection(
      request,
      ListingSerializer,
      data,
    ) as JsonApiCollectionResponse;
  }

  /**
   * Create a new listing
   */
  @Post()
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async createListing(
    @Req() request: Request,
    @ValidatedBody(CreateListingDto) createListingDto: CreateListingDto,
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getIdentity(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);

    if (!seller) {
      return returnNotFound('Seller', publicMetadata.user);
    }

    const listing = await this.listingsService.createListing(
      seller.id,
      publicMetadata.organization,
      createListingDto,
    );

    return serializeSingle(
      request,
      ListingSerializer,
      listing,
    ) as JsonApiSingleResponse;
  }

  /**
   * Get a specific listing
   */
  @Get(':listingId')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getListing(
    @Req() request: Request,
    @Param('listingId') listingId: string,
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getIdentity(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);

    if (!seller) {
      return returnNotFound('Seller', publicMetadata.user);
    }

    const listing = await this.listingsService.findOne({
      id: listingId,
      isDeleted: false,
      seller: seller.id,
    });

    if (!listing) {
      return returnNotFound(this.constructorName, listingId);
    }

    return serializeSingle(
      request,
      ListingSerializer,
      listing,
    ) as JsonApiSingleResponse;
  }

  /**
   * Update a listing
   */
  @Put(':listingId')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async updateListing(
    @Req() request: Request,
    @Param('listingId') listingId: string,
    @ValidatedBody(UpdateListingDto) updateListingDto: UpdateListingDto,
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getIdentity(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);

    if (!seller) {
      return returnNotFound('Seller', publicMetadata.user);
    }

    const listing = await this.listingsService.findOne({
      id: listingId,
      isDeleted: false,
      seller: seller.id,
    });

    if (!listing) {
      return returnNotFound(this.constructorName, listingId);
    }

    const updated = await this.listingsService.patch(
      listingId,
      updateListingDto,
    );

    return serializeSingle(
      request,
      ListingSerializer,
      updated,
    ) as JsonApiSingleResponse;
  }

  /**
   * Archive a listing
   */
  @Delete(':listingId')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async archiveListing(
    @Param('listingId') listingId: string,
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiSingleResponse<{ message: string }>> {
    const publicMetadata = getIdentity(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);

    if (!seller) {
      return returnNotFound('Seller', publicMetadata.user);
    }

    await this.listingsService.archiveListing(listingId, seller.id);

    return {
      data: {
        attributes: {
          message: 'Listing archived successfully',
        },
        id: listingId,
        type: 'listing',
      },
    };
  }

  /**
   * Submit listing for review
   */
  @Post(':listingId/submit')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async submitForReview(
    @Req() request: Request,
    @Param('listingId') listingId: string,
    @CurrentUser() user: MarketplacePrincipal,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getIdentity(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);

    if (!seller) {
      return returnNotFound('Seller', publicMetadata.user);
    }

    const listing = await this.listingsService.submitForReview(
      listingId,
      seller.id,
    );

    return serializeSingle(
      request,
      ListingSerializer,
      listing,
    ) as JsonApiSingleResponse;
  }
}

@AutoSwagger()
@ApiTags('Admin Marketplace Listings')
@Controller('admin/marketplace/listings')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class AdminListingsController {
  constructor(
    @Inject(ListingsService) private readonly listingsService: ListingsService,
  ) {}

  @Get()
  @RolesDecorator('superadmin')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getListings(
    @Req() request: Request,
    @ValidatedQuery(ListingQueryDto) query: ListingQueryDto,
  ): Promise<JsonApiCollectionResponse> {
    const data = await this.listingsService.getAdminListings(query);

    return serializeCollection(
      request,
      ListingSerializer,
      data,
    ) as JsonApiCollectionResponse;
  }

  @Get(':listingId')
  @RolesDecorator('superadmin')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getListing(
    @Req() request: Request,
    @Param('listingId') listingId: string,
  ): Promise<JsonApiSingleResponse> {
    const listing = await this.listingsService.getAdminListingById(listingId);

    if (!listing) {
      return returnNotFound('AdminListingsController', listingId);
    }

    return serializeSingle(
      request,
      ListingSerializer,
      listing,
    ) as JsonApiSingleResponse;
  }

  @Post(':listingId/approve')
  @RolesDecorator('superadmin')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async approveListing(
    @Req() request: Request,
    @Param('listingId') listingId: string,
    @ValidatedBody(ReviewListingDto) body: ReviewListingDto,
  ): Promise<JsonApiSingleResponse> {
    const listing = await this.listingsService.reviewListing(
      listingId,
      true,
      body.reason,
    );

    return serializeSingle(
      request,
      ListingSerializer,
      listing,
    ) as JsonApiSingleResponse;
  }

  @Post(':listingId/reject')
  @RolesDecorator('superadmin')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async rejectListing(
    @Req() request: Request,
    @Param('listingId') listingId: string,
    @ValidatedBody(ReviewListingDto) body: ReviewListingDto,
  ): Promise<JsonApiSingleResponse> {
    const listing = await this.listingsService.reviewListing(
      listingId,
      false,
      body.reason,
    );

    return serializeSingle(
      request,
      ListingSerializer,
      listing,
    ) as JsonApiSingleResponse;
  }
}
