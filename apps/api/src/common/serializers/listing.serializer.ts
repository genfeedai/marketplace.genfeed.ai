import type { IJsonApiSerializer } from '@api/common/utils/response.util';

class ListingSerializerClass implements IJsonApiSerializer {
  opts: Record<string, unknown> = {};

  constructor(private readonly publicOnly = false) {}

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

    if (this.publicOnly) {
      delete attributes.downloadData;
      delete attributes.comfyuiTemplate;
      delete attributes.rejectionReason;
    }

    // Flatten sellerData if present from $lookup
    if (attributes.sellerData && typeof attributes.sellerData === 'object') {
      const seller = attributes.sellerData as Record<string, unknown>;
      attributes.sellerInfo = {
        avatar: seller.avatar,
        badgeTier: seller.badgeTier,
        displayName: seller.displayName,
        slug: seller.slug,
      };
      attributes.sellerData = undefined;
    }

    return { attributes, id: String(id), type: 'listing' };
  }
}

export const ListingSerializer = new ListingSerializerClass();

export const PublicListingSerializer = new ListingSerializerClass(true);
