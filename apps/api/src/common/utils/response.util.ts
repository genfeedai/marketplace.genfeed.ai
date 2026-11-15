import type { Page } from '@api/common/prisma/page';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';

export const returnNotFound = (type: string, id: string): never => {
  throw new HttpException(
    {
      detail: `${type} ${id} doesn't exist`,
      title: `${type} not found`,
    },
    HttpStatus.NOT_FOUND,
  );
};

export interface IJsonApiSerializer {
  opts: Record<string, unknown>;
  serialize(data: unknown): unknown;
}

const setTopLinks = (
  req: Request,
  serializerOptions: Record<string, unknown>,
  page?: Page<unknown>,
) => {
  if (!page) {
    return { ...serializerOptions, topLevelLinks: { self: req.originalUrl } };
  }

  return {
    ...serializerOptions,
    topLevelLinks: {
      pagination: {
        limit: page.limit,
        page: page.page,
        pages: page.total === 0 ? 0 : Math.ceil(page.total / page.limit),
        total: page.total,
      },
      self: req.originalUrl,
    },
  };
};

export const serializeSingle = (
  request: Request,
  serializer: IJsonApiSerializer | null,
  data: unknown,
): unknown => {
  if (!serializer) {
    return data;
  }
  serializer.opts = setTopLinks(request, { ...serializer.opts });
  return serializer.serialize(data);
};

export const serializeCollection = (
  request: Request,
  serializer: IJsonApiSerializer | null,
  page: Page<unknown>,
): unknown => {
  if (!serializer) {
    return page.items;
  }
  serializer.opts = setTopLinks(request, { ...serializer.opts }, page);
  return serializer.serialize(page.items);
};
