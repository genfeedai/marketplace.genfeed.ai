import type { IJsonApiSerializer } from '@api/common/utils/response.util';

class AnalyticsOverviewSerializerClass implements IJsonApiSerializer {
  opts: Record<string, unknown> = {};

  serialize(data: unknown): unknown {
    const item = data as Record<string, unknown>;
    const id = item._id?.toString?.() ?? item.id ?? 'overview';
    const { _id, __v, ...attributes } = item;

    return {
      data: { attributes, id: String(id), type: 'analytics-overview' },
      ...this.opts,
    };
  }
}

export const MarketplaceAnalyticsOverviewSerializer =
  new AnalyticsOverviewSerializerClass();
