import { buildOrderBy } from '@api/common/prisma/order-by.util';
import { describe, expect, it } from 'vitest';

const allowed = ['createdAt', 'title', 'totalSales'];

describe('buildOrderBy', () => {
  it.each([
    ['a descending field', '-createdAt', [{ createdAt: 'desc' }]],
    ['an ascending field', 'title', [{ title: 'asc' }]],
    [
      'several fields in order',
      'title,-totalSales',
      [{ title: 'asc' }, { totalSales: 'desc' }],
    ],
    ['spaces around a field', ' -title ', [{ title: 'desc' }]],
    [
      'a field outside the allowed list',
      'password,-title',
      [{ title: 'desc' }],
    ],
    ['an empty value', '', [{ createdAt: 'desc' }]],
    ['a missing value', undefined, [{ createdAt: 'desc' }]],
    ['only disallowed fields', '-password', [{ createdAt: 'desc' }]],
    ['the old Mongo-style value', 'createdAt: -1', [{ createdAt: 'desc' }]],
  ])('returns the order for %s', (_label, sort, expected) => {
    expect(buildOrderBy(sort, allowed)).toEqual(expected);
  });

  it('falls back to the field the caller names, descending', () => {
    expect(buildOrderBy(undefined, allowed, 'totalSales')).toEqual([
      { totalSales: 'desc' },
    ]);
  });
});
