import { HandleErrors } from '@api/common/decorators/error-handler.decorator';
import { mapPurchaseRecord } from '@api/common/prisma/marketplace.mapper';
import type { PurchaseRecord } from '@api/common/prisma/marketplace.types';
import { buildOrderBy } from '@api/common/prisma/order-by.util';
import type { Page } from '@api/common/prisma/page';
import { PrismaService } from '@api/common/prisma/prisma.service';
import { QueryDefaultsUtil } from '@api/common/utils/query-defaults.util';
import { Prisma } from '@api/generated/prisma/client';
import { ListingsService } from '@api/listings/services/listings.service';
import { getCreditPrice } from '@api/listings/utils/credit-price';
import {
  EXTERNAL_CHECKOUT_MESSAGE,
  getExternalCheckoutProvider,
} from '@api/listings/utils/external-checkout';
import type { CreatePurchaseDto } from '@api/purchases/dto/create-purchase.dto';
import type { PurchaseQueryDto } from '@api/purchases/dto/purchase-query.dto';
import {
  canTransitionPurchase,
  purchaseStatusesThatMayBecome,
} from '@api/purchases/purchase-status';
import { SellersService } from '@api/sellers/services/sellers.service';
import { PurchaseStatus } from '@genfeedai/enums';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

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
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ListingsService) private readonly listingsService: ListingsService,
    @Inject(SellersService) private readonly sellersService: SellersService,
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
    const purchaseId = purchase.id.toLowerCase();

    return (
      title.includes(normalized) ||
      sellerName.includes(normalized) ||
      stripeSessionId.includes(normalized) ||
      purchaseId.includes(normalized)
    );
  }

  private paginateMappedDocs<T>(
    items: T[],
    page: number,
    limit: number,
  ): Page<T> {
    const start = (page - 1) * limit;

    return {
      items: items.slice(start, start + limit),
      limit,
      page,
      total: items.length,
    };
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

  async ownsCheckoutSession(
    sessionId: string,
    buyer: string,
    organization: string,
  ): Promise<boolean> {
    return Boolean(
      await this.prisma.purchase.findFirst({
        where: {
          stripeSessionId: sessionId,
          buyer,
          organization,
          isDeleted: false,
        },
        select: { id: true },
      }),
    );
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

    if (getExternalCheckoutProvider(listing)) {
      throw new BadRequestException(EXTERNAL_CHECKOUT_MESSAGE);
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
      purchaseId: purchase.id,
    });

    return purchase;
  }

  /**
   * Record a purchase the Genfeed API already took credits for. The price is
   * the listing's own GEN price, so the caller cannot name a lower one. The
   * call key makes a retry return the purchase the first call made; the same
   * key for a different buyer, listing or amount is refused.
   */
  @HandleErrors('record credit purchase', 'purchases')
  async recordCreditPurchase(input: {
    buyerId: string;
    creditsPaid: number;
    idempotencyKey: string;
    listingId: string;
    organizationId: string;
  }): Promise<{ created: boolean; purchase: PurchaseRecord }> {
    const matchesCall = (purchase: PurchaseRecord): boolean =>
      purchase.buyer === input.buyerId &&
      purchase.listing === input.listingId &&
      purchase.organization === input.organizationId &&
      purchase.creditsPaid === input.creditsPaid;
    const replay = async (): Promise<PurchaseRecord | null> => {
      const row = await this.prisma.purchase.findUnique({
        include: { listingRecord: true, sellerRecord: true },
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (!row) {
        return null;
      }
      const purchase = mapPurchaseRecord(row);
      if (!matchesCall(purchase)) {
        throw new ConflictException(
          'This idempotency key was used for a different purchase',
        );
      }
      return purchase;
    };

    const existing = await replay();
    if (existing) {
      return { created: false, purchase: existing };
    }

    const listing = await this.listingsService.getPublishedListing(
      input.listingId,
    );
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    const creditPrice = getCreditPrice(listing);
    if (creditPrice === null) {
      throw new BadRequestException('This listing cannot be paid with credits');
    }
    if (creditPrice !== input.creditsPaid) {
      throw new ConflictException(
        `The GEN price of this listing is ${creditPrice}`,
      );
    }
    if (await this.hasAlreadyPurchased(input.listingId, input.buyerId)) {
      throw new ConflictException('This buyer already owns this item');
    }

    let purchase: PurchaseRecord;
    try {
      purchase = await this.create({
        buyer: input.buyerId,
        creditsPaid: input.creditsPaid,
        currency: listing.currency,
        discount: 0,
        idempotencyKey: input.idempotencyKey,
        isDeleted: false,
        listing: input.listingId,
        listingSnapshot: {
          price: listing.price,
          title: listing.title,
          type: listing.type,
          version: listing.version,
        } as Prisma.InputJsonValue,
        organization: input.organizationId,
        paymentMethod: 'credits',
        platformFee: 0,
        seller: listing.seller,
        sellerEarnings: 0,
        status: PurchaseStatus.COMPLETED,
        subtotal: 0,
        total: 0,
      });
    } catch (error) {
      // A concurrent call with the same key won the insert; return its row.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const winner = await replay();
        if (winner) {
          return { created: false, purchase: winner };
        }
      }
      throw error;
    }

    await this.addPurchaseToStats(purchase, 1);
    return { created: true, purchase };
  }

  /**
   * Refund a purchase made with credits, found by the call key that recorded
   * it. The item leaves the buyer's library.
   *
   * When no purchase exists under the key, a record call may still be in
   * flight. With the call's buyer, listing and amount, the key is written as
   * an already-refunded purchase, so that call finds a refunded row and
   * cannot complete the purchase after the credits went back. Without them,
   * or for a listing that can no longer be sold, there is nothing to write and
   * the result is null.
   */
  @HandleErrors('refund credit purchase', 'purchases')
  async refundCreditPurchase(input: {
    buyerId?: string;
    creditsPaid?: number;
    idempotencyKey: string;
    listingId?: string;
    organizationId?: string;
  }): Promise<PurchaseRecord | null> {
    const refundExisting = async (): Promise<PurchaseRecord | null> => {
      const row = await this.prisma.purchase.findUnique({
        select: { id: true, paymentMethod: true },
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (!row) {
        return null;
      }
      if (row.paymentMethod !== 'credits') {
        throw new BadRequestException(
          'This purchase was not paid with credits',
        );
      }
      return (await this.refundPurchase(row.id, null)).purchase;
    };

    const existing = await refundExisting();
    if (existing) {
      return existing;
    }
    if (
      !input.buyerId ||
      !input.listingId ||
      !input.organizationId ||
      !input.creditsPaid
    ) {
      return null;
    }
    const listing = await this.listingsService.getPublishedListing(
      input.listingId,
    );
    if (!listing) {
      return null;
    }
    try {
      return await this.create({
        buyer: input.buyerId,
        creditsPaid: input.creditsPaid,
        currency: listing.currency,
        discount: 0,
        idempotencyKey: input.idempotencyKey,
        isDeleted: false,
        listing: input.listingId,
        listingSnapshot: {
          price: listing.price,
          title: listing.title,
          type: listing.type,
          version: listing.version,
        } as Prisma.InputJsonValue,
        organization: input.organizationId,
        paymentMethod: 'credits',
        platformFee: 0,
        seller: listing.seller,
        sellerEarnings: 0,
        status: PurchaseStatus.REFUNDED,
        subtotal: 0,
        total: 0,
      });
    } catch (error) {
      // The record call won the insert; refund the purchase it made.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return refundExisting();
      }
      throw error;
    }
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
      isDeleted: false,
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
      purchaseId: purchase.id,
    });

    return purchase;
  }

  @HandleErrors('find purchase', 'purchases')
  async findById(purchaseId: string): Promise<PurchaseRecord | null> {
    const purchase = await this.prisma.purchase.findUnique({
      include: { listingRecord: true, sellerRecord: true },
      where: { id: purchaseId },
    });

    return purchase ? mapPurchaseRecord(purchase) : null;
  }

  @HandleErrors('find purchase by payment', 'purchases')
  async findByPaymentIntentId(
    paymentIntentId: string,
  ): Promise<PurchaseRecord | null> {
    const purchase = await this.prisma.purchase.findFirst({
      include: { listingRecord: true, sellerRecord: true },
      where: { stripePaymentIntentId: paymentIntentId },
    });

    return purchase ? mapPurchaseRecord(purchase) : null;
  }

  /**
   * Move a purchase to a new status only along an allowed transition. The
   * status check and the write are one statement, so two deliveries of the
   * same event cannot both win. Returns whether this call made the move.
   */
  private async transitionStatus(
    purchaseId: string,
    to: PurchaseStatus,
    data: Prisma.PurchaseUpdateManyMutationInput = {},
  ): Promise<{ applied: boolean; purchase: PurchaseRecord }> {
    const { count } = await this.prisma.purchase.updateMany({
      data: { ...data, status: to },
      where: {
        id: purchaseId,
        status: { in: purchaseStatusesThatMayBecome(to) },
      },
    });

    const purchase = await this.findById(purchaseId);
    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    if (count === 0 && !canTransitionPurchase(purchase.status, to)) {
      this.logger.warn('Purchase status change refused', {
        from: purchase.status,
        purchaseId,
        to,
      });
    }

    return { applied: count === 1, purchase };
  }

  @HandleErrors('complete purchase', 'purchases')
  async completePurchase(
    purchaseId: string,
    paymentIntentId: string | null,
  ): Promise<{ applied: boolean; purchase: PurchaseRecord }> {
    const result = await this.transitionStatus(
      purchaseId,
      PurchaseStatus.COMPLETED,
      { stripePaymentIntentId: paymentIntentId },
    );

    if (result.applied) {
      await this.addPurchaseToStats(result.purchase, 1);
    }

    return result;
  }

  @HandleErrors('refund purchase', 'purchases')
  async refundPurchase(
    purchaseId: string,
    paymentIntentId: string | null,
  ): Promise<{ applied: boolean; purchase: PurchaseRecord }> {
    const before = await this.findById(purchaseId);
    if (!before) {
      throw new NotFoundException('Purchase not found');
    }

    const result = await this.transitionStatus(
      purchaseId,
      PurchaseStatus.REFUNDED,
      { stripePaymentIntentId: paymentIntentId },
    );

    // Only a purchase that had counted as a sale gives that sale back.
    if (result.applied && before.status === PurchaseStatus.COMPLETED) {
      await this.addPurchaseToStats(result.purchase, -1);
    }

    return result;
  }

  @HandleErrors('fail purchase', 'purchases')
  failPurchase(
    purchaseId: string,
    reason: string,
  ): Promise<{ applied: boolean; purchase: PurchaseRecord }> {
    return this.transitionStatus(purchaseId, PurchaseStatus.FAILED, {
      failureReason: reason,
    });
  }

  private async addPurchaseToStats(
    purchase: PurchaseRecord,
    direction: 1 | -1,
  ): Promise<void> {
    await this.listingsService.updateListingStats(purchase.listing, {
      purchases: direction,
      revenue: direction * purchase.total,
    });

    await this.sellersService.incrementSellerStats(purchase.seller, {
      totalEarnings: direction * purchase.sellerEarnings,
      totalSales: direction,
    });
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
  ): Promise<Page<PurchaseRecord>> {
    const { limit, page } = QueryDefaultsUtil.getPaginationDefaults(query);

    const where: Prisma.PurchaseWhereInput = {
      buyer: buyerId,
      isDeleted: false,
      organization: organizationId,
    };

    // A refunded purchase leaves the library unless it is asked for by status.
    where.status = query.status
      ? query.status
      : { not: PurchaseStatus.REFUNDED };

    const orderBy = buildOrderBy(
      query.sort,
      PurchasesService.sortableFields,
      'createdAt',
    );

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

    return {
      items: docs.map(mapPurchaseRecord),
      limit,
      page,
      total,
    };
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
  ): Promise<Page<PurchaseRecord>> {
    const { limit, page } = QueryDefaultsUtil.getPaginationDefaults(query);

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

    return {
      items: docs.map(mapPurchaseRecord),
      limit,
      page,
      total,
    };
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
      // Money counts only once a purchase is paid. A pending, failed or
      // refunded purchase keeps its amounts on the row but earned nothing.
      if (purchase.status === PurchaseStatus.COMPLETED) {
        completedOrders += 1;
        totalEarnings += purchase.sellerEarnings;
        totalPlatformFees += purchase.platformFee;
        totalRevenue += purchase.total;

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
      totalSales: completedOrders,
    };
  }

  @HandleErrors('get admin purchases', 'purchases')
  async getAdminPurchases(
    query: PurchaseQueryDto & { search?: string; from?: string; to?: string },
  ): Promise<Page<PurchaseRecord>> {
    const { limit, page } = QueryDefaultsUtil.getPaginationDefaults(query);

    const where: Prisma.PurchaseWhereInput = {
      isDeleted: false,
    };

    if (query.status) {
      where.status = query.status;
    }

    const createdAt = PurchasesService.periodFilter(query);
    if (createdAt) {
      where.createdAt = createdAt;
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

    return this.paginateMappedDocs(filteredDocs, page, limit);
  }

  @HandleErrors('get admin purchase by id', 'purchases')
  async getAdminPurchaseById(
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
      },
    });

    return purchase ? mapPurchaseRecord(purchase) : null;
  }

  @HandleErrors('get admin analytics overview', 'purchases')
  async getAdminAnalyticsOverview(
    days = 30,
    period: { from?: string; to?: string } = {},
  ): Promise<{
    totalRevenue: number;
    totalSales: number;
    paidOrders: number;
    totalPlatformFees: number;
    totalSellerEarnings: number;
    completedOrders: number;
    pendingOrders: number;
    failedOrders: number;
    refundedOrders: number;
    totalRefunded: number;
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
        ...(PurchasesService.periodFilter(period)
          ? { createdAt: PurchasesService.periodFilter(period) }
          : {}),
      },
    });

    let completedOrders = 0;
    let failedOrders = 0;
    let paidOrders = 0;
    let pendingOrders = 0;
    let refundedOrders = 0;
    let totalPlatformFees = 0;
    let totalRefunded = 0;
    let totalRevenue = 0;
    let totalSellerEarnings = 0;

    // With a period the daily list covers the period; without one it covers
    // the last `days` days while the totals stay all time.
    const fromDate = period.from ? new Date(period.from) : new Date();
    if (!period.from) {
      fromDate.setDate(fromDate.getDate() - Math.max(1, days));
    }

    const recentSalesMap = new Map<
      string,
      { count: number; revenue: number }
    >();

    for (const purchase of purchases) {
      // Money counts only once a purchase is paid. A refund is reported on
      // its own, so a refunded sale stays visible without counting as revenue.
      if (purchase.status === PurchaseStatus.COMPLETED) {
        completedOrders += 1;
        if (purchase.total > 0) {
          paidOrders += 1;
        }
        totalPlatformFees += purchase.platformFee;
        totalRevenue += purchase.total;
        totalSellerEarnings += purchase.sellerEarnings;

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
      } else if (purchase.status === PurchaseStatus.REFUNDED) {
        refundedOrders += 1;
        totalRefunded += purchase.total;
      }
    }

    return {
      completedOrders,
      failedOrders,
      paidOrders,
      pendingOrders,
      recentSales: [...recentSalesMap.entries()].map(([date, data]) => ({
        count: data.count,
        date,
        revenue: data.revenue,
      })),
      refundedOrders,
      totalPlatformFees,
      totalRefunded,
      totalRevenue,
      totalSales: completedOrders,
      totalSellerEarnings,
    };
  }

  /** The createdAt filter for an optional ISO 8601 period, or undefined. */
  private static periodFilter(period: {
    from?: string;
    to?: string;
  }): Prisma.DateTimeFilter | undefined {
    if (!period.from && !period.to) {
      return undefined;
    }

    return {
      ...(period.from ? { gte: new Date(period.from) } : {}),
      ...(period.to ? { lte: new Date(period.to) } : {}),
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
