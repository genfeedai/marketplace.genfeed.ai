import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Builds listing definitions for the store's Skills page (#81):
 * one free listing per skill in genfeedai/skills, and one paid listing for
 * the Skills Pro bundle. Pure data: the one-off seed script (#2) creates the
 * listings through the seller routes. Nothing here writes to a database.
 */

export interface SkillFile {
  path: string;
  content: string;
}

export interface SkillListingDefinition {
  type: 'skill';
  title: string;
  shortDescription: string;
  description: string;
  price: number;
  currency: 'usd';
  tags: string[];
  version: string;
  previewData?: Record<string, unknown>;
  downloadData?: Record<string, unknown>;
}

export interface SkillsProStorefront {
  /** Bundle price in dollars, as the Genfeed API's storefront returns it. */
  bundlePrice: number;
  skills: Array<{
    slug: string;
    name: string;
    category: string;
    description: string;
  }>;
}

const SHORT_DESCRIPTION_LIMIT = 300;
const SKILL_FILE_EXTENSIONS = ['.md', '.json', '.txt', '.yaml', '.yml'];
const MAX_SKILL_BYTES = 256 * 1024;

export function parseFrontmatter(markdown: string): {
  fields: Record<string, string>;
  metadata: Record<string, string>;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);
  const fields: Record<string, string> = {};
  const metadata: Record<string, string> = {};
  if (!match) return { fields, metadata };
  let inMetadata = false;
  for (const line of match[1].split(/\r?\n/)) {
    const nested = /^\s+([\w-]+):\s*(.*)$/.exec(line);
    const top = /^([\w-]+):\s*(.*)$/.exec(line);
    if (nested && inMetadata) {
      metadata[nested[1]] = unquote(nested[2]);
    } else if (top) {
      inMetadata = top[1] === 'metadata';
      if (!inMetadata) fields[top[1]] = unquote(top[2]);
    }
  }
  return { fields, metadata };
}

function unquote(value: string): string {
  const trimmed = value.trim();
  return /^(["']).*\1$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
}

export function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function shortDescription(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= SHORT_DESCRIPTION_LIMIT) return flat;
  const cut = flat.slice(0, SHORT_DESCRIPTION_LIMIT - 1);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

export function readSkillFiles(skillDir: string): SkillFile[] {
  const files: SkillFile[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (SKILL_FILE_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
        files.push({
          path: relative(skillDir, full).split('\\').join('/'),
          content: readFileSync(full, 'utf8'),
        });
      }
    }
  };
  walk(skillDir);
  const bytes = files.reduce((n, file) => n + file.content.length, 0);
  if (bytes > MAX_SKILL_BYTES) {
    throw new Error(
      `${skillDir} is ${bytes} bytes; the limit is ${MAX_SKILL_BYTES}`,
    );
  }
  return files;
}

export function buildFreeSkillListing(
  skillDir: string,
): SkillListingDefinition {
  const files = readSkillFiles(skillDir);
  const skillFile = files.find((file) => file.path === 'SKILL.md');
  if (!skillFile) throw new Error(`${skillDir} has no SKILL.md`);
  const { fields, metadata } = parseFrontmatter(skillFile.content);
  const slug = fields.name;
  if (!slug || !fields.description) {
    throw new Error(`${skillDir}/SKILL.md needs a name and a description`);
  }
  return {
    type: 'skill',
    title: titleFromSlug(slug),
    shortDescription: shortDescription(fields.description),
    description: `${fields.description}\n\nOpen-source skill from genfeedai/skills, ${fields.license ?? 'MIT'} licensed.`,
    price: 0,
    currency: 'usd',
    tags: (metadata.tags ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    version: metadata.version ?? '1.0.0',
    downloadData: { slug, description: fields.description, files },
  };
}

export function buildSkillsProBundleListing(
  storefront: SkillsProStorefront,
): SkillListingDefinition {
  if (!storefront.skills.length) {
    throw new Error('The Skills Pro storefront lists no packs.');
  }
  const contents = storefront.skills
    .map((pack) => `- ${pack.name}: ${pack.description}`)
    .join('\n');
  return {
    type: 'skill',
    title: 'Skills Pro Bundle',
    shortDescription: `All ${storefront.skills.length} Skills Pro packs in one purchase.`,
    description: `All ${storefront.skills.length} Skills Pro packs in one purchase:\n\n${contents}\n\nThis purchase is delivered by receipt. You get a receipt ID by email, then install the packs with the Skills Pro CLI or in a Genfeed workspace. It does not appear in your store library.`,
    price: Math.round(storefront.bundlePrice * 100),
    currency: 'usd',
    tags: ['skills-pro', 'bundle'],
    version: '1.0.0',
    previewData: {
      externalCheckout: { provider: 'skills-pro' },
      packs: storefront.skills,
    },
  };
}
