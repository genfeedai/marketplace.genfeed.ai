import { HandleErrors } from '@api/common/decorators/error-handler.decorator';
import { mapSellerRecord } from '@api/common/prisma/marketplace.mapper';
import type { SellerRecord } from '@api/common/prisma/marketplace.types';
import { buildOrderBy } from '@api/common/prisma/order-by.util';
import type { Page } from '@api/common/prisma/page';
import { PrismaService } from '@api/common/prisma/prisma.service';
import { QueryDefaultsUtil } from '@api/common/utils/query-defaults.util';
import type { AdminSellerQueryDto } from '@api/sellers/dto/admin-seller-query.dto';
import type { CreateSellerDto } from '@api/sellers/dto/create-seller.dto';
import type { UpdateSellerDto } from '@api/sellers/dto/update-seller.dto';
import { SellerBadgeTier, SellerStatus } from '@genfeedai/enums';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import slugify from 'slugify';

interface SellerPatchInput extends Partial<UpdateSellerDto> {
  payoutEnabled?: boolean;
  status?: string;
  stripeAccountId?: string | null;
  stripeOnboardingComplete?: boolean;
}

@Injectable()
export class SellersService {
  private readonly logger = new Logger(SellersService.name);
  private static readonly sortableFields = [
    'badgeTier',
    'createdAt',
    'displayName',
    'followerCount',
    'rating',
    'reviewCount',
    'slug',
    'status',
    'totalEarnings',
    'totalSales',
    'updatedAt',
  ] as const;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private buildWhere(params: Record<string, unknown>): Prisma.SellerWhereInput {
    const where: Prisma.SellerWhereInput = {};

    if (typeof params.id === 'string') {
      where.id = params.id;
    }

    if (typeof params.slug === 'string') {
      where.slug = params.slug;
    }

    if (typeof params.user === 'string') {
      where.user = params.user;
    }

    if (typeof params.organization === 'string') {
      where.organization = params.organization;
    }

    if (typeof params.isDeleted === 'boolean') {
      where.isDeleted = params.isDeleted;
    }

    if (typeof params.status === 'string') {
      where.status = params.status;
    }

    if (typeof params.badgeTier === 'string') {
      where.badgeTier = params.badgeTier;
    }

    return where;
  }

  private async updateSeller(
    sellerId: string,
    data: Prisma.SellerUpdateInput,
  ): Promise<SellerRecord | null> {
    try {
      const seller = await this.prisma.seller.update({
        data,
        where: { id: sellerId },
      });

      return mapSellerRecord(seller);
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

  async create(data: Prisma.SellerUncheckedCreateInput): Promise<SellerRecord> {
    const seller = await this.prisma.seller.create({ data });
    return mapSellerRecord(seller);
  }

  async find(params: Record<string, unknown>): Promise<SellerRecord[]> {
    const sellers = await this.prisma.seller.findMany({
      where: this.buildWhere(params),
    });

    return sellers.map(mapSellerRecord);
  }

  async findOne(params: Record<string, unknown>): Promise<SellerRecord | null> {
    const seller = await this.prisma.seller.findFirst({
      where: this.buildWhere(params),
    });

    return seller ? mapSellerRecord(seller) : null;
  }

  async patch(
    id: string,
    updateDto: SellerPatchInput,
  ): Promise<SellerRecord | null> {
    const data: Prisma.SellerUpdateInput = {};

    if (updateDto.avatar !== undefined) {
      data.avatar = updateDto.avatar;
    }

    if (updateDto.bio !== undefined) {
      data.bio = updateDto.bio;
    }

    if (updateDto.displayName !== undefined) {
      data.displayName = updateDto.displayName;
    }

    if (updateDto.social !== undefined) {
      data.social = updateDto.social as Prisma.InputJsonValue;
    }

    if (updateDto.stripeAccountId !== undefined) {
      data.stripeAccountId = updateDto.stripeAccountId;
    }

    if (updateDto.stripeOnboardingComplete !== undefined) {
      data.stripeOnboardingComplete = updateDto.stripeOnboardingComplete;
    }

    if (updateDto.status !== undefined) {
      data.status = updateDto.status;
    }

    if (updateDto.payoutEnabled !== undefined) {
      data.payoutEnabled = updateDto.payoutEnabled;
    }

    if (updateDto.website !== undefined) {
      data.website = updateDto.website;
    }

    if (Object.keys(data).length === 0) {
      return this.findOne({ id });
    }

    return this.updateSeller(id, data);
  }

  @HandleErrors('check seller eligibility', 'sellers')
  async checkSellerEligibility(
    userId: string,
    _organizationId: string,
  ): Promise<{ eligible: boolean; reason?: string }> {
    this.logOperation('checkSellerEligibility', 'started', { userId });

    const existingSeller = await this.findByUserId(userId);
    if (existingSeller) {
      return {
        eligible: false,
        reason: 'User already has a seller profile',
      };
    }

    this.logOperation('checkSellerEligibility', 'completed', { userId });
    return { eligible: true };
  }

  @HandleErrors('generate seller slug', 'sellers')
  async generateSellerSlug(displayName: string): Promise<string> {
    const baseSlug = slugify(displayName, {
      lower: true,
      strict: true,
      trim: true,
    });

    let slug = baseSlug;
    let counter = 1;

    while (
      await this.prisma.seller.findFirst({
        select: { id: true },
        where: { slug },
      })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return slug;
  }

  @HandleErrors('create seller profile', 'sellers')
  async createSellerProfile(
    userId: string,
    organizationId: string,
    dto: CreateSellerDto,
  ): Promise<SellerRecord> {
    this.logOperation('createSellerProfile', 'started', { userId });

    const eligibility = await this.checkSellerEligibility(
      userId,
      organizationId,
    );
    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason);
    }

    const slug = await this.generateSellerSlug(dto.displayName);

    const seller = await this.create({
      avatar: dto.avatar,
      badgeTier: SellerBadgeTier.NEW,
      bio: dto.bio,
      displayName: dto.displayName,
      isDeleted: false,
      organization: organizationId,
      payoutEnabled: false,
      slug,
      social: (dto.social ?? {}) as Prisma.InputJsonValue,
      status: SellerStatus.APPROVED,
      stripeOnboardingComplete: false,
      user: userId,
      website: dto.website,
    });

    this.logOperation('createSellerProfile', 'completed', {
      sellerId: seller.id,
      userId,
    });

    return seller;
  }

  @HandleErrors('find by user id', 'sellers')
  async findByUserId(userId: string): Promise<SellerRecord | null> {
    const seller = await this.prisma.seller.findFirst({
      where: {
        isDeleted: false,
        user: userId,
      },
    });

    return seller ? mapSellerRecord(seller) : null;
  }

  @HandleErrors('find by slug', 'sellers')
  async findBySlug(slug: string): Promise<SellerRecord | null> {
    const seller = await this.prisma.seller.findFirst({
      where: {
        isDeleted: false,
        slug,
      },
    });

    return seller ? mapSellerRecord(seller) : null;
  }

  @HandleErrors('update badge tier', 'sellers')
  async updateBadgeTier(sellerId: string): Promise<SellerRecord | null> {
    const seller = await this.findOne({ id: sellerId });
    if (!seller) {
      return null;
    }

    let newBadgeTier = SellerBadgeTier.NEW;

    if (seller.totalSales >= 100) {
      newBadgeTier = SellerBadgeTier.TOP_SELLER;
    } else if (seller.totalSales >= 10) {
      newBadgeTier = SellerBadgeTier.VERIFIED;
    }

    if (seller.badgeTier !== newBadgeTier) {
      return this.updateSeller(sellerId, { badgeTier: newBadgeTier });
    }

    return seller;
  }

  @HandleErrors('update seller stats', 'sellers')
  async updateSellerStats(
    sellerId: string,
    updates: {
      totalEarnings?: number;
      totalSales?: number;
      rating?: number;
      reviewCount?: number;
      followerCount?: number;
    },
  ): Promise<SellerRecord | null> {
    this.logOperation('updateSellerStats', 'started', { sellerId, updates });

    const data: Prisma.SellerUpdateInput = {};

    if (updates.totalEarnings !== undefined) {
      data.totalEarnings = { increment: updates.totalEarnings };
    }

    if (updates.totalSales !== undefined) {
      data.totalSales = { increment: updates.totalSales };
    }

    if (updates.rating !== undefined) {
      data.rating = { increment: updates.rating };
    }

    if (updates.reviewCount !== undefined) {
      data.reviewCount = { increment: updates.reviewCount };
    }

    if (updates.followerCount !== undefined) {
      data.followerCount = { increment: updates.followerCount };
    }

    const result = await this.updateSeller(sellerId, data);

    this.logOperation('updateSellerStats', 'completed', { sellerId });

    return result;
  }

  @HandleErrors('increment seller stats', 'sellers')
  incrementSellerStats(
    sellerId: string,
    increments: {
      totalEarnings?: number;
      totalSales?: number;
      reviewCount?: number;
      followerCount?: number;
    },
  ): Promise<SellerRecord | null> {
    return this.updateSellerStats(sellerId, increments);
  }

  @HandleErrors('get admin sellers', 'sellers')
  async getAdminSellers(
    query: AdminSellerQueryDto,
  ): Promise<Page<SellerRecord>> {
    this.logOperation('getAdminSellers', 'started', {
      query,
    });

    const { limit, page } = QueryDefaultsUtil.getPaginationDefaults(query);

    const where: Prisma.SellerWhereInput = {
      isDeleted: false,
    };

    if (query.status) {
      where.status = query.status;
    }

    const search = query.search?.trim().slice(0, 200);
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = buildOrderBy(
      query.sort,
      SellersService.sortableFields,
      'createdAt',
    );

    const [total, docs] = await this.prisma.$transaction([
      this.prisma.seller.count({ where }),
      this.prisma.seller.findMany({
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        where,
      }),
    ]);

    const result = {
      items: docs.map(mapSellerRecord),
      limit,
      page,
      total,
    };

    this.logOperation('getAdminSellers', 'completed', {
      count: result.items.length,
    });

    return result;
  }

  @HandleErrors('get admin seller by id', 'sellers')
  async getAdminSellerById(sellerId: string): Promise<SellerRecord | null> {
    this.logOperation('getAdminSellerById', 'started', {
      sellerId,
    });

    const seller = await this.prisma.seller.findFirst({
      where: {
        id: sellerId,
        isDeleted: false,
      },
    });

    this.logOperation('getAdminSellerById', 'completed', {
      found: Boolean(seller),
      sellerId,
    });

    return seller ? mapSellerRecord(seller) : null;
  }

  @HandleErrors('set seller status', 'sellers')
  async setSellerStatus(
    sellerId: string,
    status: SellerStatus,
  ): Promise<SellerRecord> {
    const seller = await this.getAdminSellerById(sellerId);

    if (!seller) {
      throw new BadRequestException('Seller not found');
    }

    return (await this.updateSeller(sellerId, { status }))!;
  }

  @HandleErrors('get admin payouts', 'sellers')
  async getAdminPayouts(
    query: AdminSellerQueryDto,
  ): Promise<Page<SellerRecord>> {
    this.logOperation('getAdminPayouts', 'started', {
      query,
    });

    const result = await this.getAdminSellers({
      ...query,
      sort: query.sort || '-totalEarnings',
    });

    this.logOperation('getAdminPayouts', 'completed', {
      count: result.items.length,
    });

    return result;
  }

  protected logOperation(
    method: string,
    status: string,
    meta?: Record<string, unknown>,
  ): void {
    this.logger.log(`${method} ${status}`, meta);
  }
}
