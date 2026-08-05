import { HandleErrors } from '@api/common/decorators/error-handler.decorator';
import { createLegacyId } from '@api/common/prisma/legacy-id.util';
import { mapPurchaseRecord } from '@api/common/prisma/marketplace.mapper';
import type { PurchaseRecord } from '@api/common/prisma/marketplace.types';
import { buildOrderBy } from '@api/common/prisma/order-by.util';
import {
  type PaginatedResult,
  paginateDocs,
} from '@api/common/prisma/pagination.util';
import type { PrismaService } from '@api/common/prisma/prisma.service';
import { QueryDefaultsUtil } from '@api/common/utils/query-defaults.util';
import type { ListingsService } from '@api/listings/services/listings.service';
import type { CreatePurchaseDto } from '@api/purchases/dto/create-purchase.dto';
import type { PurchaseQueryDto } from '@api/purchases/dto/purchase-query.dto';
import type { SellersService } from '@api/sellers/services/sellers.service';
import { PurchaseStatus } from '@genfeedai/enums';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

const PLATFORM_COMMISSION_RATE = 0.15;

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);
  private static readonly sortableFields = [
    'createdAt',
    'downloadCount',
    'platformFee',
    'sellerEarnings',
    'status',
    'subtotal',
    'total',
    'updatedAt',
  ] as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly listingsService: ListingsService,
    private readonly sellersService: SellersService,
  ) {}

  private async updatePurchase(
    purchaseId: string,
    data: Prisma.PurchaseUpdateInput,
  ): Promise<PurchaseRecord | null> {
    try {
      const purchase = await this.prisma.purchase.update({
        data,
        include: {
          listingRecord: true,
          sellerRecord: true,
        },
        where: { id: purchaseId },
      });

      return mapPurchaseRecord(purchase);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null;
      }

      throw error;
    }
  }

  private matchesAdminSearch(
    purchase: PurchaseRecord,
    search: string | undefined,
  ): boolean {
    if (!search) {
      return true;
    }

    const normalized = search.toLowerCase();
    const title = purchase.listingSnapshot.title?.toLowerCase() ?? '';
    const sellerName = purchase.sellerData?.displayName?.toLowerCase() ?? '';
    const stripeSessionId = purchase.stripeSessionId?.toLowerCase() ?? '';
    const purchaseId = purchase._id.toLowerCase();

    return (
      title.includes(normalized) ||
      sellerName.includes(normalized) ||
      stripeSessionId.includes(normalized) ||
      purchaseId.includes(normalized)
    );
  }

  private paginateMappedDocs<T>(
    docs: T[],
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    const start = (page - 1) * limit;

    return paginateDocs({
      docs: docs.slice(start, start + limit),
      limit,
      page,
      total: docs.length,
    });
  }

  async create(
    data: Prisma.PurchaseUncheckedCreateInput,
  ): Promise<PurchaseRecord> {
    const purchase = await this.prisma.purchase.create({
      data,
      include: {
        listingRecord: true,
        sellerRecord: true,
      },
    });

    return mapPurchaseRecord(purchase);
  }

  async patch(
    id: string,
    updateDto: Partial<{
      status: string;
      failureReason: string | null;
      stripeSessionId: string | null;
      stripePaymentIntentId: string | null;
      paymentMethod: string | null;
      lastDownloadedAt: Date | null;
      downloadCount: number;
    }>,
  ): Promise<PurchaseRecord | null> {
    const data: Prisma.PurchaseUpdateInput = {};

    if (updateDto.status !== undefined) {
      data.status = updateDto.status;
    }

    if (updateDto.failureReason !== undefined) {
      data.failureReason = updateDto.failureReason;
    }

    if (updateDto.stripeSessionId !== undefined) {
      data.stripeSessionId = updateDto.stripeSessionId;
    }

    if (updateDto.stripePaymentIntentId !== undefined) {
      data.stripePaymentIntentId = updateDto.stripePaymentIntentId;
    }

    if (updateDto.paymentMethod !== undefined) {
      data.paymentMethod = updateDto.paymentMethod;
    }

    if (updateDto.lastDownloadedAt !== undefined) {
      data.lastDownloadedAt = updateDto.lastDownloadedAt;
    }

    if (updateDto.downloadCount !== undefined) {
      data.downloadCount = updateDto.downloadCount;
    }

    if (Object.keys(data).length === 0) {
      const purchase = await this.prisma.purchase.findUnique({
        include: {
          listingRecord: true,
          sellerRecord: true,
        },
        where: { id },
      });

      return purchase ? mapPurchaseRecord(purchase) : null;
    }

    return this.updatePurchase(id, data);
  }

  @HandleErrors('check purchase', 'purchases')
  async hasAlreadyPurchased(
    listingId: string,
    buyerId: string,
  ): Promise<boolean> {
    const existing = await this.prisma.purchase.findFirst({
      select: { id: true },
      where: {
        buyer: buyerId,
        isDeleted: false,
        listing: listingId,
        status: PurchaseStatus.COMPLETED,
      },
    });

    return Boolean(existing);
  }

  calculateCommission(price: number): {
    platformFee: number;
    sellerEarnings: number;
  } {
    const platformFee = Math.round(price * PLATFORM_COMMISSION_RATE);
    const sellerEarnings = price - platformFee;
    return { platformFee, sellerEarnings };
  }

  @HandleErrors('claim free item', 'purchases')
  async claimFreeItem(
    listingId: string,
    buyerId: string,
    organizationId: string,
  ): Promise<PurchaseRecord> {
    this.logOperation('claimFreeItem', 'started', { buyerId, listingId });

    const alreadyPurchased = await this.hasAlreadyPurchased(listingId, buyerId);
    if (alreadyPurchased) {
      throw new BadRequestException('You already own this item');
    }

    const listing = await this.listingsService.getPublishedListing(listingId);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.pricingTier === 'premium') {
      throw new BadRequestException(
        'Premium listings cannot be claimed as free items.',
      );
    }

    if (listing.price > 0) {
      throw new BadRequestException(
        'This item is not free. Please use the checkout flow.',
      );
    }

    const purchase = await this.create({
      buyer: buyerId,
      currency: listing.currency,
      discount: 0,
      id: createLegacyId(),
      isDeleted: false,
      listing: listingId,
      listingSnapshot: {
        price: listing.price,
        title: listing.title,
        type: listing.type,
        version: listing.version,
      } as Prisma.InputJsonValue,
      organization: organizationId,
      platformFee: 0,
      seller: listing.seller,
      sellerEarnings: 0,
      status: PurchaseStatus.COMPLETED,
      subtotal: 0,
      total: 0,
    });

    await this.listingsService.updateListingStats(listingId, {
      downloads: 1,
      purchases: 1,
    });

    await this.sellersService.incrementSellerStats(listing.seller, {
      totalSales: 1,
    });

    this.logOperation('claimFreeItem', 'completed', {
      buyerId,
      listingId,
      purchaseId: purchase._id,
    });

    return purchase;
  }

  @HandleErrors('create purchase', 'purchases')
  async createPurchase(
    buyerId: string,
    organizationId: string,
    dto: CreatePurchaseDto,
  ): Promise<PurchaseRecord> {
    this.logOperation('createPurchase', 'started', {
      buyerId,
      listingId: dto.listingId,
    });

    const alreadyPurchased = await this.hasAlreadyPurchased(
      dto.listingId,
      buyerId,
    );
    if (alreadyPurchased) {
      throw new BadRequestException('You already own this item');
    }

    const listing = await this.listingsService.getPublishedListing(
      dto.listingId,
    );
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const { platformFee, sellerEarnings } = this.calculateCommission(
      listing.price,
    );

    const purchase = await this.create({
      buyer: buyerId,
      currency: listing.currency,
      discount: 0,
      discountCode: dto.discountCode,
      giftMessage: dto.giftMessage,
      giftRecipient: dto.giftRecipientId,
      id: createLegacyId(),
      isDeleted: false,
      isGift: Boolean(dto.giftRecipientId),
      listing: dto.listingId,
      listingSnapshot: {
        price: listing.price,
        title: listing.title,
        type: listing.type,
        version: listing.version,
      } as Prisma.InputJsonValue,
      organization: organizationId,
      platformFee,
      seller: listing.seller,
      sellerEarnings,
      status:
        listing.price === 0 ? PurchaseStatus.COMPLETED : PurchaseStatus.PENDING,
      subtotal: listing.price,
      total: listing.price,
    });

    if (listing.price === 0) {
      await this.listingsService.updateListingStats(dto.listingId, {
        downloads: 1,
        purchases: 1,
      });

      await this.sellersService.incrementSellerStats(listing.seller, {
        totalSales: 1,
      });
    }

    this.logOperation('createPurchase', 'completed', {
      buyerId,
      purchaseId: purchase._id,
    });

    return purchase;
  }

  @HandleErrors('complete purchase', 'purchases')
  async completePurchase(purchaseId: string): Promise<PurchaseRecord> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    if (purchase.status === PurchaseStatus.COMPLETED) {
      const completedPurchase = await this.prisma.purchase.findUnique({
        include: {
          listingRecord: true,
          sellerRecord: true,
        },
        where: { id: purchaseId },
      });

      return mapPurchaseRecord(completedPurchase!);
    }

    const updated = await this.updatePurchase(purchaseId, {
      status: PurchaseStatus.COMPLETED,
    });

    await this.listingsService.updateListingStats(purchase.listing, {
      purchases: 1,
      revenue: purchase.total,
    });

    await this.sellersService.incrementSellerStats(purchase.seller, {
      totalEarnings: purchase.sellerEarnings,
      totalSales: 1,
    });

    return updated!;
  }

  @HandleErrors('track download', 'purchases')
  async trackDownload(purchaseId: string): Promise<void> {
    const purchase = await this.prisma.purchase.findUnique({
      select: { listing: true },
      where: { id: purchaseId },
    });

    await this.updatePurchase(purchaseId, {
      downloadCount: { increment: 1 },
      lastDownloadedAt: new Date(),
    });

    if (purchase) {
      await this.listingsService.updateListingStats(purchase.listing, {
        downloads: 1,
      });
    }
  }

  @HandleErrors('get buyer purchases', 'purchases')
  async getBuyerPurchases(
    buyerId: string,
    organizationId: string,
    query: PurchaseQueryDto,
  ): Promise<PaginatedResult<PurchaseRecord>> {
    const { limit, page, pagination } =
      QueryDefaultsUtil.getPaginationDefaults(query);

    const where: Prisma.PurchaseWhereInput = {
      buyer: buyerId,
      isDeleted: false,
      organization: organizationId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const orderBy = buildOrderBy(
      query.sort,
      PurchasesService.sortableFields,
      'createdAt',
    );

    if (!pagination) {
      const docs = await this.prisma.purchase.findMany({
        include: {
          listingRecord: true,
          sellerRecord: true,
        },
        orderBy,
        where,
      });

      return paginateDocs({
        docs: docs.map(mapPurchaseRecord),
        limit: Math.max(docs.length, 1),
        page: 1,
        total: docs.length,
      });
    }

    const [total, docs] = await this.prisma.$transaction([
      this.prisma.purchase.count({ where }),
      this.prisma.purchase.findMany({
        include: {
          listingRecord: true,
          sellerRecord: true,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        where,
      }),
    ]);

    return paginateDocs({
      docs: docs.map(mapPurchaseRecord),
      limit,
      page,
      total,
    });
  }

  @HandleErrors('verify ownership', 'purchases')
  async verifyOwnership(
    purchaseId: string,
    userId: string,
    organizationId: string,
  ): Promise<{ owned: boolean; purchase?: PurchaseRecord }> {
    const purchase = await this.prisma.purchase.findFirst({
      include: {
        listingRecord: true,
        sellerRecord: true,
      },
      where: {
        buyer: userId,
        id: purchaseId,
        isDeleted: false,
        organization: organizationId,
        status: PurchaseStatus.COMPLETED,
      },
    });

    if (!purchase) {
      return { owned: false };
    }

    return { owned: true, purchase: mapPurchaseRecord(purchase) };
  }

  @HandleErrors('check listing ownership', 'purchases')
  async checkListingOwnership(
    listingId: string,
    userId: string,
    organizationId: string,
  ): Promise<{ owned: boolean; purchase?: PurchaseRecord }> {
    const purchase = await this.prisma.purchase.findFirst({
      include: {
        listingRecord: true,
        sellerRecord: true,
      },
      where: {
        buyer: userId,
        isDeleted: false,
        listing: listingId,
        organization: organizationId,
        status: PurchaseStatus.COMPLETED,
      },
    });

    if (!purchase) {
      return { owned: false };
    }

    return { owned: true, purchase: mapPurchaseRecord(purchase) };
  }

  @HandleErrors('get seller sales', 'purchases')
  async getSellerSales(
    sellerId: string,
    query: PurchaseQueryDto,
  ): Promise<PaginatedResult<PurchaseRecord>> {
    const { limit, page, pagination } =
      QueryDefaultsUtil.getPaginationDefaults(query);

    const where: Prisma.PurchaseWhereInput = {
      isDeleted: false,
      seller: sellerId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const orderBy = buildOrderBy(
      query.sort,
      PurchasesService.sortableFields,
      'createdAt',
    );

    if (!pagination) {
      const docs = await this.prisma.purchase.findMany({
        include: {
          listingRecord: true,
          sellerRecord: true,
        },
        orderBy,
        where,
      });

      return paginateDocs({
        docs: docs.map(mapPurchaseRecord),
        limit: Math.max(docs.length, 1),
        page: 1,
        total: docs.length,
      });
    }

    const [total, docs] = await this.prisma.$transaction([
      this.prisma.purchase.count({ where }),
      this.prisma.purchase.findMany({
        include: {
          listingRecord: true,
          sellerRecord: true,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        where,
      }),
    ]);

    return paginateDocs({
      docs: docs.map(mapPurchaseRecord),
      limit,
      page,
      total,
    });
  }

  @HandleErrors('get seller analytics', 'purchases')
  async getSellerAnalytics(sellerId: string): Promise<{
    totalSales: number;
    totalRevenue: number;
    totalEarnings: number;
    totalPlatformFees: number;
    completedOrders: number;
    pendingOrders: number;
    recentSales: Array<{ date: string; count: number; revenue: number }>;
  }> {
    const purchases = await this.prisma.purchase.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        platformFee: true,
        sellerEarnings: true,
        status: true,
        total: true,
      },
      where: {
        isDeleted: false,
        seller: sellerId,
      },
    });

    let completedOrders = 0;
    let pendingOrders = 0;
    let totalEarnings = 0;
    let totalPlatformFees = 0;
    let totalRevenue = 0;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    const recentSalesMap = new Map<
      string,
      { count: number; revenue: number }
    >();

    for (const purchase of purchases) {
      totalEarnings += purchase.sellerEarnings;
      totalPlatformFees += purchase.platformFee;
      totalRevenue += purchase.total;

      if (purchase.status === PurchaseStatus.COMPLETED) {
        completedOrders += 1;

        if (purchase.createdAt >= fromDate) {
          const date = purchase.createdAt.toISOString().slice(0, 10);
          const current = recentSalesMap.get(date) ?? {
            count: 0,
            revenue: 0,
          };

          current.count += 1;
          current.revenue += purchase.total;
          recentSalesMap.set(date, current);
        }
      }

      if (purchase.status === PurchaseStatus.PENDING) {
        pendingOrders += 1;
      }
    }

    return {
      completedOrders,
      pendingOrders,
      recentSales: [...recentSalesMap.entries()].map(([date, data]) => ({
        count: data.count,
        date,
        revenue: data.revenue,
      })),
      totalEarnings,
      totalPlatformFees,
      totalRevenue,
      totalSales: purchases.length,
    };
  }

  @HandleErrors('get admin purchases', 'purchases')
  async getAdminPurchases(
    organizationId: string,
    query: PurchaseQueryDto & { search?: string },
  ): Promise<PaginatedResult<PurchaseRecord>> {
    const { limit, page, pagination } =
      QueryDefaultsUtil.getPaginationDefaults(query);

    const where: Prisma.PurchaseWhereInput = {
      isDeleted: false,
      organization: organizationId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const orderBy = buildOrderBy(
      query.sort,
      PurchasesService.sortableFields,
      'createdAt',
    );

    const docs = await this.prisma.purchase.findMany({
      include: {
        listingRecord: true,
        sellerRecord: true,
      },
      orderBy,
      where,
    });

    const mappedDocs = docs.map(mapPurchaseRecord);
    const search = query.search?.trim().slice(0, 200);
    const filteredDocs = mappedDocs.filter((purchase) =>
      this.matchesAdminSearch(purchase, search),
    );

    if (!pagination) {
      return paginateDocs({
        docs: filteredDocs,
        limit: Math.max(filteredDocs.length, 1),
        page: 1,
        total: filteredDocs.length,
      });
    }

    return this.paginateMappedDocs(filteredDocs, page, limit);
  }

  @HandleErrors('get admin purchase by id', 'purchases')
  async getAdminPurchaseById(
    organizationId: string,
    purchaseId: string,
  ): Promise<PurchaseRecord | null> {
    const purchase = await this.prisma.purchase.findFirst({
      include: {
        listingRecord: true,
        sellerRecord: true,
      },
      where: {
        id: purchaseId,
        isDeleted: false,
        organization: organizationId,
      },
    });

    return purchase ? mapPurchaseRecord(purchase) : null;
  }

  @HandleErrors('get admin analytics overview', 'purchases')
  async getAdminAnalyticsOverview(
    organizationId: string,
    days = 30,
  ): Promise<{
    totalRevenue: number;
    totalSales: number;
    totalPlatformFees: number;
    totalSellerEarnings: number;
    completedOrders: number;
    pendingOrders: number;
    failedOrders: number;
    recentSales: Array<{ date: string; count: number; revenue: number }>;
  }> {
    const purchases = await this.prisma.purchase.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        platformFee: true,
        sellerEarnings: true,
        status: true,
        total: true,
      },
      where: {
        isDeleted: false,
        organization: organizationId,
      },
    });

    let completedOrders = 0;
    let failedOrders = 0;
    let pendingOrders = 0;
    let totalPlatformFees = 0;
    let totalRevenue = 0;
    let totalSellerEarnings = 0;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - Math.max(1, days));

    const recentSalesMap = new Map<
      string,
      { count: number; revenue: number }
    >();

    for (const purchase of purchases) {
      totalPlatformFees += purchase.platformFee;
      totalRevenue += purchase.total;
      totalSellerEarnings += purchase.sellerEarnings;

      if (purchase.status === PurchaseStatus.COMPLETED) {
        completedOrders += 1;

        if (purchase.createdAt >= fromDate) {
          const date = purchase.createdAt.toISOString().slice(0, 10);
          const current = recentSalesMap.get(date) ?? {
            count: 0,
            revenue: 0,
          };

          current.count += 1;
          current.revenue += purchase.total;
          recentSalesMap.set(date, current);
        }
      } else if (purchase.status === PurchaseStatus.FAILED) {
        failedOrders += 1;
      } else if (purchase.status === PurchaseStatus.PENDING) {
        pendingOrders += 1;
      }
    }

    return {
      completedOrders,
      failedOrders,
      pendingOrders,
      recentSales: [...recentSalesMap.entries()].map(([date, data]) => ({
        count: data.count,
        date,
        revenue: data.revenue,
      })),
      totalPlatformFees,
      totalRevenue,
      totalSales: purchases.length,
      totalSellerEarnings,
    };
  }

  private logOperation(
    method: string,
    status: string,
    meta?: Record<string, unknown>,
  ): void {
    this.logger.log(`${method} ${status}`, meta);
  }
}
