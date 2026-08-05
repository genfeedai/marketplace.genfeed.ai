import { handleQuerySort } from '@api/common/utils/sort.util';

export type SortOrder = 'asc' | 'desc';
export type OrderByInput = Record<string, SortOrder>;

export function buildOrderBy(
  sort: string | null | undefined,
  allowedFields: readonly string[],
  fallbackField = 'createdAt',
): OrderByInput[] {
  const parsed = handleQuerySort(sort);
  const orderBy = Object.entries(parsed)
    .filter(([field]) => allowedFields.includes(field))
    .map(([field, direction]) => ({
      [field]: (direction === -1 ? 'desc' : 'asc') as SortOrder,
    }));

  if (orderBy.length > 0) {
    return orderBy;
  }

  return [{ [fallbackField]: 'desc' as SortOrder }];
}
