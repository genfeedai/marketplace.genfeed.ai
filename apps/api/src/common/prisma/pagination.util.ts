export interface PaginatedResult<T> {
  [key: string]: unknown;
  docs: T[];
  total: number;
  limit: number;
  page: number;
  pages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
  pagingCounter: number;
}

export function paginateDocs<T>(params: {
  docs: T[];
  total: number;
  page: number;
  limit: number;
}): PaginatedResult<T> {
  const { docs, total, page, limit } = params;
  const safeLimit = Math.max(limit, 1);
  const pages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  return {
    docs,
    hasNextPage: pages > 0 && page < pages,
    hasPrevPage: page > 1 && pages > 0,
    limit: safeLimit,
    nextPage: pages > 0 && page < pages ? page + 1 : null,
    page,
    pages,
    pagingCounter: total === 0 ? 0 : (page - 1) * safeLimit + 1,
    prevPage: page > 1 && pages > 0 ? page - 1 : null,
    total,
  };
}
