import type { IJsonApiSerializer } from '@api/common/utils/response.util';

class PurchaseSerializerClass implements IJsonApiSerializer {
  opts: Record<string, unknown> = {};

  serialize(data: unknown): unknown {
    if (Array.isArray(data)) {
      return {
        data: data.map((item: Record<string, unknown>) =>
          this.serializeItem(item),
        ),
        ...this.opts,
      };
    }
    return {
      data: this.serializeItem(data as Record<string, unknown>),
      ...this.opts,
    };
  }

  private serializeItem(item: Record<string, unknown>): unknown {
    const id = item.id ?? '';
    const { __v, ...attributes } = item;

    // Flatten lookup data if present
    if (attributes.listingData && typeof attributes.listingData === 'object') {
      const listing = attributes.listingData as Record<string, unknown>;
      attributes.listingInfo = {
        slug: listing.slug,
        thumbnail: listing.thumbnail,
        title: listing.title,
        type: listing.type,
      };
      attributes.listingData = undefined;
    }

    if (attributes.sellerData && typeof attributes.sellerData === 'object') {
      const seller = attributes.sellerData as Record<string, unknown>;
      attributes.sellerInfo = {
        displayName: seller.displayName,
        slug: seller.slug,
      };
      attributes.sellerData = undefined;
    }

    return { attributes, id: String(id), type: 'purchase' };
  }
}

export const PurchaseSerializer = new PurchaseSerializerClass();
