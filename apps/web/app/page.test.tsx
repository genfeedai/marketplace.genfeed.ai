import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import HomePage from './page';

function internalLinks(html: string): string[] {
  return [...html.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]);
}

describe('store homepage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('leads to the catalog, the four product types and the gallery', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(HomePage());

    expect(html).toContain('From brief to feed');
    expect(html).not.toContain('assets.genfeed.ai');
    expect(internalLinks(html)).toEqual([
      '/browse',
      '/workflows',
      '/prompts',
      '/presets',
      '/skills',
      '/gallery',
    ]);
  });
});
