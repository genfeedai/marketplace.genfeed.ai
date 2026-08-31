import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import HomePage from './page';

describe('marketplace homepage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('renders only the marketplace product categories', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(HomePage());

    expect(html).not.toContain('assets.genfeed.ai');

    for (const href of ['/workflows', '/prompts', '/skills']) {
      expect(html).toContain(`href="${href}"`);
    }

    for (const href of [
      '/videos',
      '/images',
      '/music',
      '/posts',
      '/leaderboard',
    ]) {
      expect(html).not.toContain(`href="${href}"`);
    }
  });
});
