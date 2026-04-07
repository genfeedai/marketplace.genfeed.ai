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

export const returnBadRequest = (
  response: string | Record<string, unknown>,
): never => {
  throw new HttpException(response, HttpStatus.BAD_REQUEST);
};

export const returnUnauthorized = (message = 'Unauthorized'): never => {
  throw new HttpException(
    { detail: message, title: 'Unauthorized' },
    HttpStatus.UNAUTHORIZED,
  );
};

export interface IJsonApiSerializer {
  opts: Record<string, unknown>;
  serialize(data: unknown): unknown;
}

export const setTopLinks = (
  req: Request,
  serializerOptions: Record<string, unknown>,
  data: Record<string, unknown>,
) => {
  const isPaginated =
    data &&
    typeof data === 'object' &&
    'total' in data &&
    'page' in data &&
    Array.isArray(data.docs);

  const topLevelLinks = isPaginated
    ? {
        pagination: {
          limit: data.limit,
          page: data.page,
          pages: data.pages,
          total: data.total,
        },
        self: req.originalUrl,
      }
    : { self: req.originalUrl };

  return { ...serializerOptions, topLevelLinks };
};

export const serializeSingle = (
  request: Request,
  serializer: IJsonApiSerializer | null,
  data: unknown,
): unknown => {
  if (!serializer) {
    return data;
  }
  serializer.opts = setTopLinks(
    request,
    { ...serializer.opts },
    data as Record<string, unknown>,
  );
  return serializer.serialize(data);
};

export const serializeCollection = (
  request: Request,
  serializer: IJsonApiSerializer | null,
  data: { docs: unknown[]; [key: string]: unknown },
): unknown => {
  if (!serializer) {
    return data.docs;
  }
  serializer.opts = setTopLinks(
    request,
    { ...serializer.opts },
    data as Record<string, unknown>,
  );
  return serializer.serialize(data.docs);
};
