import { describe, expect, test } from 'vitest';
import { buildMarketplacePostHogOptions } from './posthog-client';

describe('marketplace PostHog client', () => {
  test('tracks page journeys and semantic controls without browser storage', () => {
    expect(buildMarketplacePostHogOptions('https://eu.i.posthog.com')).toEqual({
      api_host: 'https://eu.i.posthog.com',
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
    });
  });
});
