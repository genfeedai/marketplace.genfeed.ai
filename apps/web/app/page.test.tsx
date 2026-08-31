import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import HomePage from './page';

describe('marketplace homepage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('renders every category without the missing placeholder asset host', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(HomePage());

    expect(html).not.toContain('assets.genfeed.ai');

    for (const href of [
      '/videos',
      '/images',
      '/music',
      '/posts',
      '/leaderboard',
      '/prompts',
      '/workflows',
    ]) {
      expect(html).toContain(`href="${href}"`);
    }
  });
});
