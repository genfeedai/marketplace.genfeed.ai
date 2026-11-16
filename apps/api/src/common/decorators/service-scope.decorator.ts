import type { MarketplaceServiceScope } from '@api/common/auth/service-auth.constants';
import { SetMetadata } from '@nestjs/common';

export const SERVICE_SCOPE_KEY = 'serviceScope';

/** The scope a Genfeed API service token needs for this route. */
export const ServiceScope = (scope: MarketplaceServiceScope) =>
  SetMetadata(SERVICE_SCOPE_KEY, scope);
