type SortOrder = 'asc' | 'desc';
type OrderByInput = Record<string, SortOrder>;

/**
 * Turns a `sort` query value into Prisma `orderBy` input.
 *
 * @example
 * buildOrderBy('-createdAt', ['createdAt']) // [{ createdAt: 'desc' }]
 * buildOrderBy('category,-label', ['category', 'label']) // [{ category: 'asc' }, { label: 'desc' }]
 *
 * Fields outside `allowedFields` are dropped. When nothing is left the
 * result is `fallbackField` descending.
 */
export function buildOrderBy(
  sort: string | null | undefined,
  allowedFields: readonly string[],
  fallbackField = 'createdAt',
): OrderByInput[] {
  const orderBy: OrderByInput[] = [];

  for (const part of (sort ?? '').split(',')) {
    const token = part.trim();
    const isDescending = token.startsWith('-');
    const field = isDescending ? token.slice(1) : token;

    if (allowedFields.includes(field)) {
      orderBy.push({ [field]: isDescending ? 'desc' : 'asc' });
    }
  }

  return orderBy.length > 0 ? orderBy : [{ [fallbackField]: 'desc' }];
}
