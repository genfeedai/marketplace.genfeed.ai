import { HandleErrors } from '@api/common/decorators/error-handler.decorator';
import { mapListingRecord } from '@api/common/prisma/marketplace.mapper';
import type { ListingRecord } from '@api/common/prisma/marketplace.types';
import { buildOrderBy } from '@api/common/prisma/order-by.util';
import type { Page } from '@api/common/prisma/page';
import { PrismaService } from '@api/common/prisma/prisma.service';
import { QueryDefaultsUtil } from '@api/common/utils/query-defaults.util';
import { Prisma } from '@api/generated/prisma/client';
import type { CreateListingDto } from '@api/listings/dto/create-listing.dto';
import type { ListingQueryDto } from '@api/listings/dto/listing-query.dto';
import type { UpdateListingDto } from '@api/listings/dto/update-listing.dto';
import { SellersService } from '@api/sellers/services/sellers.service';
import { ListingStatus, SellerStatus } from '@genfeedai/enums';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import slugify from 'slugify';

interface ListingPatchInput extends Partial<UpdateListingDto> {
  canBeSoldSeparately?: boolean;
  publishedAt?: Date;
  rejectionReason?: string | null;
  status?: string;
}

@Injectable()
export class ListingsService {
  private static readonly sortableFields = [
    'createdAt',
    'downloads',
    'installCount',
    'likeCount',
    'price',
    'publishedAt',
    'purchases',
    'rating',
    'reviewCount',
    'revenue',
    'status',
    'title',
    'type',
    'updatedAt',
    'views',
  ] as const;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SellersService) private readonly sellersService: SellersService,
  ) {}

  private buildWhere(
    params: Record<string, unknown>,
  ): Prisma.ListingWhereInput {
    const where: Prisma.ListingWhereInput = {};

    if (typeof params.id === 'string') {
      where.id = params.id;
    }

    if (typeof params.seller === 'string') {
      where.seller = params.seller;
    }

    if (typeof params.organization === 'string') {
      where.organization = params.organization;
    }

    if (typeof params.slug === 'string') {
      where.slug = params.slug;
    }

    if (typeof params.status === 'string') {
      where.status = params.status;
    }

    if (typeof params.packageSource === 'string') {
      where.packageSource = params.packageSource;
    }

    if (typeof params.packageSlug === 'string') {
      where.packageSlug = params.packageSlug;
    }

    if (typeof params.isDeleted === 'boolean') {
      where.isDeleted = params.isDeleted;
    }

    return where;
  }

  private async updateListing(
    listingId: string,
    data: Prisma.ListingUpdateInput,
  ): Promise<ListingRecord | null> {
    try {
      const listing = await this.prisma.listing.update({
        data,
        include: { sellerRecord: true },
        where: { id: listingId },
      });

      return mapListingRecord(listing);
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

  async create(
    data: Prisma.ListingUncheckedCreateInput,
  ): Promise<ListingRecord> {
    const listing = await this.prisma.listing.create({
      data,
      include: { sellerRecord: true },
    });

    return mapListingRecord(listing);
  }

  async findOne(
    params: Record<string, unknown>,
  ): Promise<ListingRecord | null> {
    const listing = await this.prisma.listing.findFirst({
      include: { sellerRecord: true },
      where: this.buildWhere(params),
    });

    return listing ? mapListingRecord(listing) : null;
  }

  async patch(
    listingId: string,
    updateDto: ListingPatchInput,
  ): Promise<ListingRecord | null> {
    const data: Prisma.ListingUpdateInput = {};

    if (updateDto.canBeSoldSeparately !== undefined) {
      data.canBeSoldSeparately = updateDto.canBeSoldSeparately;
    }

    if (updateDto.changelog !== undefined) {
      data.changelog = updateDto.changelog;
    }

    if (updateDto.description !== undefined) {
      data.description = updateDto.description;
    }

    if (updateDto.downloadData !== undefined) {
      data.downloadData = updateDto.downloadData as Prisma.InputJsonValue;
    }

    if (updateDto.previewData !== undefined) {
      data.previewData = updateDto.previewData as Prisma.InputJsonValue;
    }

    if (updateDto.previewImages !== undefined) {
      data.previewImages = updateDto.previewImages;
    }

    if (updateDto.previewVideo !== undefined) {
      data.previewVideo = updateDto.previewVideo;
    }

    if (updateDto.price !== undefined) {
      data.price = updateDto.price;
    }

    if (updateDto.currency !== undefined) {
      data.currency = updateDto.currency;
    }

    if (updateDto.rejectionReason !== undefined) {
      data.rejectionReason = updateDto.rejectionReason;
    }

    if (updateDto.shortDescription !== undefined) {
      data.shortDescription = updateDto.shortDescription;
    }

    if (updateDto.status !== undefined) {
      data.status = updateDto.status;
    }

    if (updateDto.tags !== undefined) {
      data.tags = updateDto.tags;
    }

    if (updateDto.thumbnail !== undefined) {
      data.thumbnail = updateDto.thumbnail;
    }

    if (updateDto.title !== undefined) {
      data.title = updateDto.title;
    }

    if (updateDto.type !== undefined) {
      data.type = updateDto.type;
    }

    if (updateDto.version !== undefined) {
      data.version = updateDto.version;
    }

    if (updateDto.publishedAt !== undefined) {
      data.publishedAt = updateDto.publishedAt;
    }

    if (Object.keys(data).length === 0) {
      return this.findOne({ id: listingId });
    }

    return this.updateListing(listingId, data);
  }

  @HandleErrors('generate listing slug', 'listings')
  async generateListingSlug(
    sellerSlug: string,
    title: string,
  ): Promise<string> {
    const titleSlug = slugify(title, {
      lower: true,
      strict: true,
      trim: true,
    });

    const baseSlug = `${sellerSlug}/${titleSlug}`;
    let slug = baseSlug;
    let counter = 1;

    while (
      await this.prisma.listing.findFirst({
        select: { id: true },
        where: { slug },
      })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return slug;
  }

  @HandleErrors('create listing', 'listings')
  async createListing(
    sellerId: string,
    organizationId: string,
    dto: CreateListingDto,
  ): Promise<ListingRecord> {
    const seller = await this.sellersService.findOne({
      id: sellerId,
      isDeleted: false,
      status: SellerStatus.APPROVED,
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const slug = await this.generateListingSlug(seller.slug, dto.title);

    return this.create({
      canBeSoldSeparately: true,
      changelog: dto.changelog,
      currency: dto.currency ?? 'usd',
      description: dto.description,
      downloadData: (dto.downloadData ?? {}) as Prisma.InputJsonValue,
      isDeleted: false,
      organization: organizationId,
      previewData: (dto.previewData ?? {}) as Prisma.InputJsonValue,
      previewImages: dto.previewImages ?? [],
      previewVideo: dto.previewVideo,
      price: dto.price ?? 0,
      seller: sellerId,
      shortDescription: dto.shortDescription,
      slug,
      status: ListingStatus.DRAFT,
      tags: dto.tags ?? [],
      thumbnail: dto.thumbnail,
      title: dto.title,
      type: dto.type,
      version: dto.version ?? '1.0.0',
    });
  }

  @HandleErrors('submit for review', 'listings')
  async submitForReview(
    listingId: string,
    sellerId: string,
  ): Promise<ListingRecord> {
    const listing = await this.prisma.listing.findFirst({
      include: { sellerRecord: true },
      where: {
        id: listingId,
        isDeleted: false,
        seller: sellerId,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== ListingStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft listings can be submitted for review',
      );
    }

    return (await this.updateListing(listingId, {
      status: ListingStatus.PENDING_REVIEW,
    }))!;
  }

  @HandleErrors('review listing', 'listings')
  async reviewListing(
    listingId: string,
    isApproved: boolean,
    reason?: string,
  ): Promise<ListingRecord> {
    const listing = await this.prisma.listing.findFirst({
      include: { sellerRecord: true },
      where: {
        id: listingId,
        isDeleted: false,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== ListingStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Only pending_review listings can be moderated',
      );
    }

    return (await this.updateListing(listingId, {
      publishedAt: isApproved ? new Date() : undefined,
      rejectionReason: isApproved ? null : reason || 'Rejected by moderator',
      status: isApproved ? ListingStatus.PUBLISHED : ListingStatus.REJECTED,
    }))!;
  }

  @HandleErrors('get seller listings', 'listings')
  async getSellerListings(
    sellerId: string,
    query: ListingQueryDto,
  ): Promise<Page<ListingRecord>> {
    const { limit, page } = QueryDefaultsUtil.getPaginationDefaults(query);

    const where: Prisma.ListingWhereInput = {
      isDeleted: false,
      seller: sellerId,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    const orderBy = buildOrderBy(
      query.sort,
      ListingsService.sortableFields,
      'createdAt',
    );

    const [total, docs] = await this.prisma.$transaction([
      this.prisma.listing.count({ where }),
      this.prisma.listing.findMany({
        include: { sellerRecord: true },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        where,
      }),
    ]);

    return {
      items: docs.map(mapListingRecord),
      limit,
      page,
      total,
    };
  }

  @HandleErrors('get public listings', 'listings')
  async getPublicListings(
    query: ListingQueryDto,
  ): Promise<Page<ListingRecord>> {
    const { limit, page } = QueryDefaultsUtil.getPaginationDefaults(query);

    const where: Prisma.ListingWhereInput = {
      isDeleted: false,
      status: ListingStatus.PUBLISHED,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.tags && query.tags.length > 0) {
      where.tags = { hasSome: query.tags };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) {
        where.price.gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        where.price.lte = query.maxPrice;
      }
    }

    if (query.pricingTier) {
      where.pricingTier = query.pricingTier;
    }

    if (query.isOfficial !== undefined) {
      where.isOfficial = query.isOfficial;
    }

    if (query.sellerSlug) {
      where.sellerRecord = {
        is: {
          isDeleted: false,
          slug: query.sellerSlug,
        },
      };
    }

    const search = query.search?.trim().slice(0, 200);
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = buildOrderBy(
      query.sort,
      ListingsService.sortableFields,
      'createdAt',
    );

    const [total, docs] = await this.prisma.$transaction([
      this.prisma.listing.count({ where }),
      this.prisma.listing.findMany({
        include: { sellerRecord: true },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        where,
      }),
    ]);

    return {
      items: docs.map(mapListingRecord),
      limit,
      page,
      total,
    };
  }

  @HandleErrors('get admin listings', 'listings')
  async getAdminListings(query: ListingQueryDto): Promise<Page<ListingRecord>> {
    const { limit, page } = QueryDefaultsUtil.getPaginationDefaults(query);

    const where: Prisma.ListingWhereInput = {
      isDeleted: false,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    const search = query.search?.trim().slice(0, 200);
    if (search) {
      where.OR = [
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = buildOrderBy(
      query.sort,
      ListingsService.sortableFields,
      'createdAt',
    );

    const [total, docs] = await this.prisma.$transaction([
      this.prisma.listing.count({ where }),
      this.prisma.listing.findMany({
        include: { sellerRecord: true },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        where,
      }),
    ]);

    return {
      items: docs.map(mapListingRecord),
      limit,
      page,
      total,
    };
  }

  @HandleErrors('get admin listing', 'listings')
  async getAdminListingById(listingId: string): Promise<ListingRecord | null> {
    const listing = await this.prisma.listing.findFirst({
      include: { sellerRecord: true },
      where: {
        id: listingId,
        isDeleted: false,
      },
    });

    return listing ? mapListingRecord(listing) : null;
  }

  @HandleErrors('find by slug', 'listings')
  async findBySlug(fullSlug: string): Promise<ListingRecord | null> {
    const listing = await this.prisma.listing.findFirst({
      include: { sellerRecord: true },
      where: {
        isDeleted: false,
        slug: fullSlug,
        status: ListingStatus.PUBLISHED,
      },
    });

    return listing ? mapListingRecord(listing) : null;
  }

  @HandleErrors('get published listing', 'listings')
  async getPublishedListing(listingId: string): Promise<ListingRecord | null> {
    const listing = await this.prisma.listing.findFirst({
      include: { sellerRecord: true },
      where: {
        id: listingId,
        isDeleted: false,
        status: ListingStatus.PUBLISHED,
      },
    });

    return listing ? mapListingRecord(listing) : null;
  }

  @HandleErrors('increment views', 'listings')
  async incrementViews(listingId: string): Promise<void> {
    await this.updateListing(listingId, {
      views: { increment: 1 },
    });
  }

  @HandleErrors('update listing stats', 'listings')
  updateListingStats(
    listingId: string,
    increments: {
      downloads?: number;
      purchases?: number;
      likeCount?: number;
      revenue?: number;
    },
  ): Promise<ListingRecord | null> {
    const data: Prisma.ListingUpdateInput = {};

    if (increments.downloads !== undefined) {
      data.downloads = { increment: increments.downloads };
    }

    if (increments.purchases !== undefined) {
      data.purchases = { increment: increments.purchases };
    }

    if (increments.likeCount !== undefined) {
      data.likeCount = { increment: increments.likeCount };
    }

    if (increments.revenue !== undefined) {
      data.revenue = { increment: increments.revenue };
    }

    return this.updateListing(listingId, data);
  }

  @HandleErrors('get featured listings', 'listings')
  async getFeaturedListings(limit = 12): Promise<Page<ListingRecord>> {
    const docs = await this.prisma.listing.findMany({
      include: { sellerRecord: true },
      orderBy: [{ purchases: 'desc' }, { rating: 'desc' }],
      take: limit,
      where: {
        isDeleted: false,
        isOfficial: true,
        status: ListingStatus.PUBLISHED,
      },
    });

    return {
      items: docs.map(mapListingRecord),
      limit,
      page: 1,
      total: docs.length,
    };
  }

  @HandleErrors('get categories', 'listings')
  async getCategoryCounts(): Promise<Array<{ type: string; count: number }>> {
    const result = await this.prisma.listing.groupBy({
      _count: { _all: true },
      by: ['type'],
      where: {
        isDeleted: false,
        status: ListingStatus.PUBLISHED,
      },
    });

    return result.map((item) => ({
      count: item._count._all,
      type: item.type,
    }));
  }

  @HandleErrors('increment install count', 'listings')
  async incrementInstallCount(listingId: string): Promise<void> {
    await this.updateListing(listingId, {
      installCount: { increment: 1 },
    });
  }

  @HandleErrors('find by package source', 'listings')
  async findByPackageSource(
    packageSource: string,
    packageSlug: string,
  ): Promise<ListingRecord | null> {
    const listing = await this.prisma.listing.findFirst({
      include: { sellerRecord: true },
      where: {
        isDeleted: false,
        packageSlug,
        packageSource,
      },
    });

    return listing ? mapListingRecord(listing) : null;
  }

  @HandleErrors('archive listing', 'listings')
  async archiveListing(
    listingId: string,
    sellerId: string,
  ): Promise<ListingRecord> {
    const listing = await this.prisma.listing.findFirst({
      select: { id: true },
      where: {
        id: listingId,
        isDeleted: false,
        seller: sellerId,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return (await this.updateListing(listingId, {
      status: ListingStatus.ARCHIVED,
    }))!;
  }
}
