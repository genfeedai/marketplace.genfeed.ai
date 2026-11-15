import type { IJsonApiSerializer } from '@api/common/utils/response.util';

class SellerSerializerClass implements IJsonApiSerializer {
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
    return { attributes, id: String(id), type: 'seller' };
  }
}

export const SellerSerializer = new SellerSerializerClass();
