import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import HomePage from './page';

describe('marketplace homepage', () => {
  test('renders every category without the missing placeholder asset host', () => {
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
