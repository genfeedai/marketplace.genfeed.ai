import { randomBytes } from 'node:crypto';

export function createLegacyId(now = Date.now()): string {
  const timestamp = Math.floor(now / 1000)
    .toString(16)
    .padStart(8, '0');
  const random = randomBytes(8).toString('hex');

  return `${timestamp}${random}`;
}
