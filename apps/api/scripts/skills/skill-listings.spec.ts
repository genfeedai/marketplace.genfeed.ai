import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildFreeSkillListing,
  buildSkillsProBundleListing,
  parseFrontmatter,
  shortDescription,
  titleFromSlug,
} from './skill-listings';

const SKILL = `---
name: x-thread
description: Write an X thread of 2 to 15 posts.
license: MIT
metadata:
  author: genfeedai
  version: 1.2.0
  tags: x, twitter, threads
---

# X Thread
`;

function skillDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'skill-'));
  writeFileSync(join(dir, 'SKILL.md'), SKILL);
  writeFileSync(join(dir, 'metadata.json'), '{"a":1}');
  writeFileSync(join(dir, 'render.sh'), 'echo not shipped');
  mkdirSync(join(dir, 'references'));
  writeFileSync(join(dir, 'references', 'hooks.md'), '# Hooks');
  return dir;
}

describe('free skill listing', () => {
  it('turns a skill folder into a free listing with its files as the payload', () => {
    expect(buildFreeSkillListing(skillDir())).toEqual({
      type: 'skill',
      title: 'X Thread',
      shortDescription: 'Write an X thread of 2 to 15 posts.',
      description:
        'Write an X thread of 2 to 15 posts.\n\nOpen-source skill from genfeedai/skills, MIT licensed.',
      price: 0,
      currency: 'usd',
      tags: ['x', 'twitter', 'threads'],
      version: '1.2.0',
      downloadData: {
        slug: 'x-thread',
        description: 'Write an X thread of 2 to 15 posts.',
        files: [
          { path: 'SKILL.md', content: SKILL },
          { path: 'metadata.json', content: '{"a":1}' },
          { path: 'references/hooks.md', content: '# Hooks' },
        ],
      },
    });
  });

  it('refuses a folder without SKILL.md', () => {
    expect(() =>
      buildFreeSkillListing(mkdtempSync(join(tmpdir(), 'e-'))),
    ).toThrow('no SKILL.md');
  });
});

describe('Skills Pro bundle listing', () => {
  const storefront = {
    bundlePrice: 49,
    skills: [
      { slug: 'a-pro', name: 'A Pro', category: 'ops', description: 'Does A.' },
      { slug: 'b-pro', name: 'B Pro', category: 'ops', description: 'Does B.' },
    ],
  };

  it('prices the bundle in cents and lists what is inside', () => {
    const listing = buildSkillsProBundleListing(storefront);
    expect(listing.price).toBe(4900);
    expect(listing.shortDescription).toBe(
      'All 2 Skills Pro packs in one purchase.',
    );
    expect(listing.description).toContain('- A Pro: Does A.\n- B Pro: Does B.');
    expect(listing.description).toContain('delivered by receipt');
    expect(listing.previewData).toEqual({
      externalCheckout: { provider: 'skills-pro' },
      packs: storefront.skills,
    });
    expect(listing.downloadData).toBeUndefined();
  });

  it('refuses an empty storefront', () => {
    expect(() =>
      buildSkillsProBundleListing({ bundlePrice: 49, skills: [] }),
    ).toThrow('no packs');
  });
});

describe('helpers', () => {
  it('parses nested metadata and quoted values', () => {
    expect(
      parseFrontmatter('---\nname: "a"\nmetadata:\n  version: 2\n---\n'),
    ).toEqual({
      fields: { name: 'a' },
      metadata: { version: '2' },
    });
  });
  it('names a skill from its slug', () => {
    expect(titleFromSlug('instagram-carousel')).toBe('Instagram Carousel');
  });
  it('cuts a long description at a word within 300 characters', () => {
    const cut = shortDescription(`${'word '.repeat(100)}`);
    expect(cut.length).toBeLessThanOrEqual(300);
    expect(cut.endsWith('…')).toBe(true);
  });
});
