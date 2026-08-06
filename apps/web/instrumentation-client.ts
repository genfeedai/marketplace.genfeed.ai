'use client';

import { buildMarketplacePostHogOptions } from './lib/posthog-client';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

/** Load analytics only in hosted builds that explicitly provide a token. */
if (POSTHOG_KEY && typeof window !== 'undefined') {
  void import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY, buildMarketplacePostHogOptions(POSTHOG_HOST));
    })
    .catch(() => {
      // Analytics must never interfere with marketplace navigation.
    });
}
