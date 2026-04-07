import type { IJsonApiSerializer } from '@api/common/utils/response.util';

class ListingSerializerClass implements IJsonApiSerializer {
  opts: Record<string, unknown> = {};

  serialize(data: unknown): unknown {
    if (Array.isArray(data)) {
      return {
        data: data.map((item: Record<string, unknown>) => this.serializeItem(item)),
        ...this.opts,
      };
    }
    return { data: this.serializeItem(data as Record<string, unknown>), ...this.opts };
  }

  private serializeItem(item: Record<string, unknown>): unknown {
    const id = item._id?.toString?.() ?? item.id ?? '';
    const { _id, __v, ...attributes } = item;

    // Flatten sellerData if present from $lookup
    if (attributes.sellerData && typeof attributes.sellerData === 'object') {
      const seller = attributes.sellerData as Record<string, unknown>;
      attributes.sellerInfo = {
        avatar: seller.avatar,
        badgeTier: seller.badgeTier,
        displayName: seller.displayName,
        slug: seller.slug,
      };
      delete attributes.sellerData;
    }

    return { attributes, id: String(id), type: 'listing' };
  }
}

export const ListingSerializer = new ListingSerializerClass();
