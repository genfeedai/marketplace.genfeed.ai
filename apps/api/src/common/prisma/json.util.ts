import type { Prisma } from '@prisma/client';

export function asJsonObject(
  value: Prisma.JsonValue | null | undefined,
): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }

  return value as Record<string, unknown>;
}

export function asOptionalJsonObject(
  value: Prisma.JsonValue | null | undefined,
): Record<string, unknown> | undefined {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return undefined;
  }

  return value as Record<string, unknown>;
}
