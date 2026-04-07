import { Injectable, Logger, Optional } from '@nestjs/common';
import { type PipelineStage, Types } from 'mongoose';

/**
 * Common fields present on all Mongoose documents managed by BaseService.
 */
export interface BaseDocument {
  _id: Types.ObjectId;
  isDeleted?: boolean;
  organization?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

type MongoFilter = Record<string, unknown>;
type MongoUpdate = Record<string, unknown>;

/**
 * Aggregate paginate model interface.
 * Matches mongoose-aggregate-paginate-v2 plugin.
 */
export interface AggregatePaginateModel<T> {
  new (doc?: Partial<T>): T & { save(): Promise<T> };
  collection: { name: string };
  modelName: string;
  aggregate(pipeline: PipelineStage[]): { exec(): Promise<unknown[]> };
  aggregatePaginate(
    aggregate: ReturnType<AggregatePaginateModel<T>['aggregate']>,
    options: AggregationOptions,
  ): Promise<AggregatePaginateResult<T>>;
  find(filter: MongoFilter): {
    populate(p: unknown[]): { lean(): { exec(): Promise<T[]> } };
  };
  findOne(filter: MongoFilter): {
    populate(p: unknown[]): { exec(): Promise<T | null> };
    exec(): Promise<T | null>;
  };
  findById(id: unknown): {
    populate(p: unknown[]): { exec(): Promise<T | null> };
    exec(): Promise<T | null>;
  };
  findByIdAndUpdate(
    id: unknown,
    update: unknown,
    options?: unknown,
  ): {
    populate(p: unknown[]): { exec(): Promise<T | null> };
    exec(): Promise<T | null>;
  };
  findOneAndUpdate(
    filter: unknown,
    update: unknown,
    options?: unknown,
  ): Promise<T | null>;
  updateMany(
    filter: unknown,
    update: unknown,
  ): { exec(): Promise<{ matchedCount: number; modifiedCount: number }> };
}

export interface AggregatePaginateResult<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
  pagingCounter: number;
  [key: string]: unknown;
}

export interface AggregationOptions {
  page?: number;
  limit?: number;
  customLabels?: Record<string, string>;
  pagination?: boolean;
  [key: string]: unknown;
}

type QueryableModel = AggregatePaginateModel<MongoFilter>;

/**
 * Simplified BaseService for the marketplace API.
 * Provides core CRUD + aggregate-paginate without cache dependencies.
 */
@Injectable()
export abstract class BaseService<
  T,
  CreateDto = Partial<T>,
  UpdateDto = Partial<CreateDto>,
> {
  protected readonly logger: Logger;

  constructor(
    protected readonly model: AggregatePaginateModel<T>,
    @Optional() loggerContext?: string,
  ) {
    this.logger = new Logger(loggerContext || this.constructor.name);
  }

  protected get collectionName(): string {
    return this.model.collection.name;
  }

  async create(createDto: CreateDto): Promise<T> {
    const doc = new this.model(createDto as Partial<T>);
    const saved = await doc.save();
    return saved as T;
  }

  async findAll(
    aggregate: PipelineStage[],
    options: AggregationOptions,
  ): Promise<AggregatePaginateResult<T>> {
    if (options.pagination === false) {
      const agg = this.model.aggregate(aggregate);
      const docs = await agg.exec();
      return {
        docs,
        hasNextPage: false,
        hasPrevPage: false,
        limit: docs.length,
        nextPage: null,
        page: 1,
        pagingCounter: 1,
        prevPage: null,
        totalDocs: docs.length,
        totalPages: 1,
      } as AggregatePaginateResult<T>;
    }

    const agg = this.model.aggregate(aggregate);
    return this.model.aggregatePaginate(agg, options);
  }

  async find(params: MongoFilter): Promise<T[]> {
    const processedParams = this.processSearchParams(params);
    return (this.model as unknown as QueryableModel)
      .find(processedParams)
      .populate([])
      .lean()
      .exec() as Promise<T[]>;
  }

  async findOne(params: MongoFilter): Promise<T | null> {
    const processedParams = this.processSearchParams(params);
    return (this.model as unknown as QueryableModel)
      .findOne(processedParams)
      .exec() as Promise<T | null>;
  }

  async patch(
    id: Types.ObjectId | string,
    updateDto: Partial<UpdateDto> | MongoUpdate,
  ): Promise<T | null> {
    const updateOperation =
      '$set' in updateDto || '$unset' in updateDto
        ? updateDto
        : { $set: updateDto };

    return (this.model as unknown as QueryableModel)
      .findByIdAndUpdate(id, updateOperation, { returnDocument: 'after' })
      .populate([])
      .exec() as Promise<T | null>;
  }

  async patchAll(
    filter: MongoFilter,
    update: MongoUpdate,
  ): Promise<{ modifiedCount: number }> {
    const result = await (this.model as unknown as QueryableModel)
      .updateMany(filter, update)
      .exec();
    return { modifiedCount: result.modifiedCount };
  }

  async remove(id: string): Promise<T | null> {
    return (this.model as unknown as QueryableModel)
      .findByIdAndUpdate(id, { isDeleted: true }, { returnDocument: 'after' })
      .exec() as Promise<T | null>;
  }

  protected logOperation(
    method: string,
    status: string,
    meta?: Record<string, unknown>,
  ): void {
    this.logger.log(`${method} ${status}`, meta);
  }

  public processSearchParams(params: MongoFilter): MongoFilter {
    const processed = { ...params };
    const objectIdFields = [
      '_id',
      'id',
      'user',
      'organization',
      'seller',
      'listing',
      'buyer',
    ];

    for (const [key, value] of Object.entries(processed)) {
      if (
        objectIdFields.includes(key) &&
        typeof value === 'string' &&
        Types.ObjectId.isValid(value)
      ) {
        processed[key] = new Types.ObjectId(value);
      }
    }

    return processed;
  }
}
