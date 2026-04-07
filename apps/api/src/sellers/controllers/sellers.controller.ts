import { AutoSwagger } from '@api/common/decorators/auto-swagger.decorator';
import { CurrentUser } from '@api/common/decorators/current-user.decorator';
import { LogMethod } from '@api/common/decorators/log-method.decorator';
import { RolesDecorator } from '@api/common/decorators/roles.decorator';
import { RolesGuard } from '@api/common/guards/roles.guard';
import type {
  JsonApiCollectionResponse,
  JsonApiSingleResponse,
} from '@api/common/interfaces/json-api.interface';
import { SellerSerializer } from '@api/common/serializers';
import {
  getIsSuperAdmin,
  getPublicMetadata,
} from '@api/common/utils/clerk.util';
import {
  returnNotFound,
  serializeCollection,
  serializeSingle,
} from '@api/common/utils/response.util';
import type { MarketplaceConfigService } from '@api/config/config.service';
import type { AdminSellerQueryDto } from '@api/sellers/dto/admin-seller-query.dto';
import type { CreateSellerDto } from '@api/sellers/dto/create-seller.dto';
import type { UpdateSellerStatusDto } from '@api/sellers/dto/update-seller-status.dto';
import type { UpdateSellerDto } from '@api/sellers/dto/update-seller.dto';
import type { SellersService } from '@api/sellers/services/sellers.service';
import type { StripeConnectService } from '@api/sellers/services/stripe-connect.service';
import type { User } from '@clerk/backend';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

@AutoSwagger()
@Controller('seller')
@ApiBearerAuth()
export class SellersController {
  private readonly constructorName: string = String(this.constructor.name);
  private static readonly officialSellerSlug = 'genfeed-official';

  constructor(
    private readonly sellersService: SellersService,
    private readonly stripeConnectService: StripeConnectService,
    private readonly configService: MarketplaceConfigService,
  ) {}

  /**
   * Check if current user is eligible to become a seller
   */
  @Get('eligibility')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async checkEligibility(
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);

    const eligibility = await this.sellersService.checkSellerEligibility(
      publicMetadata.user,
      publicMetadata.organization,
    );

    return {
      data: {
        attributes: eligibility,
        id: publicMetadata.user,
        type: 'seller-eligibility',
      },
    };
  }

  /**
   * Get current user's seller profile
   */
  @Get('profile')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getProfile(
    @Req() request: Request,
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);

    if (!seller) {
      return returnNotFound(this.constructorName, publicMetadata.user);
    }

    return serializeSingle(
      request,
      SellerSerializer,
      seller,
    ) as JsonApiSingleResponse;
  }

  /**
   * Get the canonical GenFeed AI official seller for superadmin marketplace mode
   */
  @Get('official/profile')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getOfficialProfile(
    @Req() request: Request,
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    if (!getIsSuperAdmin(user)) {
      throw new ForbiddenException('Superadmin access required');
    }

    const seller = await this.sellersService.findBySlug(
      SellersController.officialSellerSlug,
    );

    if (!seller) {
      return returnNotFound(
        this.constructorName,
        SellersController.officialSellerSlug,
      );
    }

    return serializeSingle(
      request,
      SellerSerializer,
      seller,
    ) as JsonApiSingleResponse;
  }

  /**
   * Create a seller profile for current user
   */
  @Post('profile')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async createProfile(
    @Req() request: Request,
    @Body() createSellerDto: CreateSellerDto,
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);

    const seller = await this.sellersService.createSellerProfile(
      publicMetadata.user,
      publicMetadata.organization,
      createSellerDto,
    );

    return serializeSingle(
      request,
      SellerSerializer,
      seller,
    ) as JsonApiSingleResponse;
  }

  /**
   * Update current user's seller profile
   */
  @Put('profile')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async updateProfile(
    @Req() request: Request,
    @Body() updateSellerDto: UpdateSellerDto,
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);

    if (!seller) {
      return returnNotFound(this.constructorName, publicMetadata.user);
    }

    const updated = await this.sellersService.patch(
      seller._id,
      updateSellerDto,
    );

    return serializeSingle(
      request,
      SellerSerializer,
      updated,
    ) as JsonApiSingleResponse;
  }

  /**
   * Initiate Stripe Connect onboarding for the current seller
   */
  @Post('stripe/connect')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async initiateStripeConnect(
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    let stripeAccountId = seller.stripeAccountId;

    // Create a Stripe Connect Express account if one doesn't exist
    if (!stripeAccountId) {
      const account = await this.stripeConnectService.createConnectAccount({
        displayName: seller.displayName,
        email: user.emailAddresses[0]?.emailAddress || '',
        sellerId: seller._id.toString(),
      });

      stripeAccountId = account.id;

      await this.sellersService.patch(seller._id, {
        stripeAccountId: account.id,
      });
    }

    // Generate onboarding link
    const marketplaceUrl = this.configService.marketplaceUrl;
    const returnUrl = `${marketplaceUrl}/dashboard?stripe=connected`;
    const refreshUrl = `${marketplaceUrl}/dashboard?stripe=refresh`;

    const onboardingUrl = await this.stripeConnectService.createOnboardingLink({
      accountId: stripeAccountId,
      refreshUrl,
      returnUrl,
    });

    return {
      data: {
        attributes: {
          stripeAccountId,
          url: onboardingUrl,
        },
        id: seller._id.toString(),
        type: 'stripe-connect',
      },
    };
  }

  /**
   * Get Stripe Connect onboarding status for the current seller
   */
  @Get('stripe/status')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getStripeStatus(
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    if (!seller.stripeAccountId) {
      return {
        data: {
          attributes: {
            chargesEnabled: false,
            complete: false,
            payoutsEnabled: false,
            stripeAccountId: null,
          },
          id: seller._id.toString(),
          type: 'stripe-connect-status',
        },
      };
    }

    const status = await this.stripeConnectService.checkOnboardingComplete(
      seller.stripeAccountId,
    );

    // Update seller record if onboarding just completed and charges are enabled
    if (
      status.complete &&
      status.chargesEnabled &&
      !seller.stripeOnboardingComplete
    ) {
      await this.sellersService.patch(seller._id, {
        payoutEnabled: status.payoutsEnabled,
        stripeOnboardingComplete: true,
      });
    }

    return {
      data: {
        attributes: {
          ...status,
          stripeAccountId: seller.stripeAccountId,
        },
        id: seller._id.toString(),
        type: 'stripe-connect-status',
      },
    };
  }

  /**
   * Get Stripe Express dashboard link for the current seller
   */
  @Get('stripe/dashboard')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getStripeDashboard(
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);
    if (!seller?.stripeAccountId) {
      throw new NotFoundException('Stripe account not found');
    }

    const dashboardUrl = await this.stripeConnectService.createDashboardLink(
      seller.stripeAccountId,
    );

    return {
      data: {
        attributes: {
          url: dashboardUrl,
        },
        id: seller._id.toString(),
        type: 'stripe-dashboard',
      },
    };
  }

  /**
   * Get Stripe Connect account balance for the current seller
   */
  @Get('stripe/balance')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getStripeBalance(
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);
    if (!seller?.stripeAccountId) {
      throw new NotFoundException('Stripe account not found');
    }

    const balance = await this.stripeConnectService.getAccountBalance(
      seller.stripeAccountId,
    );

    return {
      data: {
        attributes: balance,
        id: seller._id.toString(),
        type: 'stripe-balance',
      },
    };
  }

  /**
   * List payouts for the current seller's Stripe Connect account
   */
  @Get('stripe/payouts')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getStripePayouts(
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);

    const seller = await this.sellersService.findByUserId(publicMetadata.user);
    if (!seller?.stripeAccountId) {
      throw new NotFoundException('Stripe account not found');
    }

    const payouts = await this.stripeConnectService.listPayouts(
      seller.stripeAccountId,
    );

    return {
      data: {
        attributes: {
          payouts: payouts.data.map((p) => ({
            amount: p.amount,
            arrivalDate: p.arrival_date,
            created: p.created,
            currency: p.currency,
            id: p.id,
            status: p.status,
          })),
        },
        id: seller._id.toString(),
        type: 'stripe-payouts',
      },
    };
  }
}

@AutoSwagger()
@ApiTags('Admin Marketplace Sellers')
@Controller('admin/marketplace/sellers')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class AdminSellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Get()
  @RolesDecorator('superadmin')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getSellers(
    @Req() request: Request,
    @Query() query: AdminSellerQueryDto,
    @CurrentUser() user: User,
  ): Promise<JsonApiCollectionResponse> {
    const publicMetadata = getPublicMetadata(user);
    const data = await this.sellersService.getAdminSellers(
      publicMetadata.organization,
      query,
    );

    return serializeCollection(
      request,
      SellerSerializer,
      data,
    ) as JsonApiCollectionResponse;
  }

  @Get(':sellerId')
  @RolesDecorator('superadmin')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async getSeller(
    @Req() request: Request,
    @Param('sellerId') sellerId: string,
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);
    const seller = await this.sellersService.getAdminSellerById(
      publicMetadata.organization,
      sellerId,
    );

    if (!seller) {
      return returnNotFound('AdminSellersController', sellerId);
    }

    return serializeSingle(
      request,
      SellerSerializer,
      seller,
    ) as JsonApiSingleResponse;
  }

  @Patch(':sellerId/status')
  @RolesDecorator('superadmin')
  @LogMethod({ logEnd: false, logError: true, logStart: true })
  async updateSellerStatus(
    @Req() request: Request,
    @Param('sellerId') sellerId: string,
    @Body() body: UpdateSellerStatusDto,
    @CurrentUser() user: User,
  ): Promise<JsonApiSingleResponse> {
    const publicMetadata = getPublicMetadata(user);
    const updated = await this.sellersService.setSellerStatus(
      publicMetadata.organization,
      sellerId,
      body.status,
    );

    return serializeSingle(
      request,
      SellerSerializer,
      updated,
    ) as JsonApiSingleResponse;
  }
}
