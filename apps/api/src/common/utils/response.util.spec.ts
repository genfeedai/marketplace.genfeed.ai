import {
  type IJsonApiSerializer,
  serializeCollection,
  serializeSingle,
} from '@api/common/utils/response.util';
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

const request = { originalUrl: '/marketplace/listings?page=2' } as Request;

/** Returns what the real serializer would be given, so the test reads the links it was set up with. */
function recordingSerializer(): IJsonApiSerializer {
  return {
    opts: { type: 'listing' },
    serialize(data: unknown) {
      return { data, opts: this.opts };
    },
  };
}

describe('serializeCollection', () => {
  it('serializes the items and links the page it was given', () => {
    const result = serializeCollection(request, recordingSerializer(), {
      items: [{ id: 'a' }, { id: 'b' }],
      limit: 10,
      page: 2,
      total: 25,
    });

    expect(result).toEqual({
      data: [{ id: 'a' }, { id: 'b' }],
      opts: {
        topLevelLinks: {
          pagination: { limit: 10, page: 2, pages: 3, total: 25 },
          self: '/marketplace/listings?page=2',
        },
        type: 'listing',
      },
    });
  });

  it('reports zero pages for an empty result', () => {
    const result = serializeCollection(request, recordingSerializer(), {
      items: [],
      limit: 10,
      page: 1,
      total: 0,
    }) as { opts: { topLevelLinks: { pagination: { pages: number } } } };

    expect(result.opts.topLevelLinks.pagination.pages).toBe(0);
  });

  it('returns the bare items when there is no serializer', () => {
    expect(
      serializeCollection(request, null, {
        items: [{ id: 'a' }],
        limit: 10,
        page: 1,
        total: 1,
      }),
    ).toEqual([{ id: 'a' }]);
  });
});

describe('serializeSingle', () => {
  it('links only the request for one record', () => {
    expect(
      serializeSingle(request, recordingSerializer(), { id: 'a' }),
    ).toEqual({
      data: { id: 'a' },
      opts: {
        topLevelLinks: { self: '/marketplace/listings?page=2' },
        type: 'listing',
      },
    });
  });
});
