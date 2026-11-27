import type { PostHogConfig } from 'posthog-js';

/**
 * Anonymous, cookieless journey tracking for shop.genfeed.ai.
 * Form values and copied content are excluded from autocapture.
 */
export function buildMarketplacePostHogOptions(
  apiHost: string,
): Partial<PostHogConfig> {
  return {
    api_host: apiHost,
    autocapture: {
      capture_copied_text: false,
      dom_event_allowlist: ['click'],
      element_allowlist: ['a', 'button'],
    },
    capture_pageleave: true,
    capture_pageview: 'history_change',
    cookieless_mode: 'always',
    defaults: '2026-05-30',
    disable_session_recording: true,
    person_profiles: 'never',
  };
}
