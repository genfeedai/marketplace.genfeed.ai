/**
 * Guard the TypeScript toolchain, the same boundary genfeedai/genfeed.ai enforces.
 *
 * `tsc` is TypeScript 7.0.2, installed as `@typescript/native`. The `typescript`
 * package stays at 6.0.3 for the tools that read the compiler API (Next.js and
 * Nest), and only the manifests listed below may declare it.
 *
 *   bun scripts/deps/check-typescript-toolchain.ts
 */

import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

const TYPESCRIPT_6_VERSION = '6.0.3';
const TYPESCRIPT_7_VERSION = '7.0.2';
const TYPESCRIPT_7_ALIAS = `npm:typescript@${TYPESCRIPT_7_VERSION}`;

const LEGACY_API_CONSUMERS = new Set([
  'package.json',
  'apps/admin/package.json',
  'apps/api/package.json',
  'apps/e2e/package.json',
  'apps/web/package.json',
]);

const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  '.next',
  '.turbo',
]);

type DependencySection = Record<string, string> | undefined;

interface PackageManifest {
  dependencies?: DependencySection;
  devDependencies?: DependencySection;
  optionalDependencies?: DependencySection;
  overrides?: DependencySection;
  peerDependencies?: DependencySection;
}

function findManifests(directory: string, found: string[]): void {
  for (const entry of readdirSync(join(ROOT, directory), {
    withFileTypes: true,
  })) {
    if (SKIPPED_DIRECTORIES.has(entry.name)) {
      continue;
    }
    const relativePath = posix.join(directory, entry.name);
    if (entry.isDirectory()) {
      findManifests(relativePath, found);
    } else if (entry.name === 'package.json') {
      found.push(relativePath);
    }
  }
}

function dependencyVersion(
  manifest: PackageManifest,
  name: string,
): string | undefined {
  return (
    manifest.dependencies?.[name] ??
    manifest.devDependencies?.[name] ??
    manifest.optionalDependencies?.[name] ??
    manifest.peerDependencies?.[name]
  );
}

const manifestPaths = ['package.json'];
findManifests('apps', manifestPaths);
manifestPaths.sort((left, right) => left.localeCompare(right));

const violations: string[] = [];

for (const manifestPath of manifestPaths) {
  const manifest = JSON.parse(
    readFileSync(join(ROOT, manifestPath), 'utf8'),
  ) as PackageManifest;
  const typescriptVersion = dependencyVersion(manifest, 'typescript');
  const nativeVersion = dependencyVersion(manifest, '@typescript/native');

  if (LEGACY_API_CONSUMERS.has(manifestPath) && !typescriptVersion) {
    violations.push(
      `${manifestPath}: configured TypeScript API consumer must declare TypeScript ${TYPESCRIPT_6_VERSION}.`,
    );
  }

  if (typescriptVersion) {
    if (!LEGACY_API_CONSUMERS.has(manifestPath)) {
      violations.push(
        `${manifestPath}: TypeScript 6 is restricted to compiler-API consumers.`,
      );
    }
    if (typescriptVersion !== TYPESCRIPT_6_VERSION) {
      violations.push(
        `${manifestPath}: expected TypeScript API compatibility version ${TYPESCRIPT_6_VERSION}, found ${typescriptVersion}.`,
      );
    }
    if (nativeVersion !== TYPESCRIPT_7_ALIAS) {
      violations.push(
        `${manifestPath}: TypeScript API consumers must also declare @typescript/native ${TYPESCRIPT_7_ALIAS}.`,
      );
    }
  }

  if (nativeVersion && nativeVersion !== TYPESCRIPT_7_ALIAS) {
    violations.push(
      `${manifestPath}: expected @typescript/native ${TYPESCRIPT_7_ALIAS}, found ${nativeVersion}.`,
    );
  }

  const typescriptOverride = manifest.overrides?.typescript;
  if (
    typescriptOverride &&
    (typescriptOverride !== TYPESCRIPT_6_VERSION ||
      !LEGACY_API_CONSUMERS.has(manifestPath))
  ) {
    violations.push(
      `${manifestPath}: TypeScript override ${typescriptOverride} is restricted to compiler-API consumers; expected ${TYPESCRIPT_6_VERSION}.`,
    );
  }
}

for (const expectedConsumer of LEGACY_API_CONSUMERS) {
  if (!manifestPaths.includes(expectedConsumer)) {
    violations.push(
      `${expectedConsumer}: configured TypeScript API consumer manifest does not exist.`,
    );
  }
}

const compilerVersion = spawnSync(
  join(ROOT, 'node_modules/.bin/tsc'),
  ['--version'],
  {
    encoding: 'utf8',
  },
);
const compilerStdout = compilerVersion.stdout?.trim() ?? '';
if (
  compilerVersion.status !== 0 ||
  compilerStdout !== `Version ${TYPESCRIPT_7_VERSION}`
) {
  const diagnostic =
    [
      compilerStdout,
      compilerVersion.stderr?.trim(),
      compilerVersion.error?.message,
    ].find(Boolean) ?? 'no diagnostic output';
  violations.push(
    `node_modules/.bin/tsc must resolve to TypeScript ${TYPESCRIPT_7_VERSION}, found "${diagnostic}".`,
  );
}

const legacyApi = (await import('typescript')) as {
  createSourceFile?: unknown;
  version?: string;
};
if (
  legacyApi.version !== TYPESCRIPT_6_VERSION ||
  typeof legacyApi.createSourceFile !== 'function'
) {
  violations.push(
    `the TypeScript compiler API must resolve to ${TYPESCRIPT_6_VERSION} with createSourceFile available.`,
  );
}

if (violations.length > 0) {
  process.stderr.write('TypeScript toolchain boundary violations found:\n');
  for (const violation of violations) {
    process.stderr.write(`- ${violation}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  `TypeScript toolchain guard passed: ${TYPESCRIPT_7_VERSION} compiler, ${TYPESCRIPT_6_VERSION} API limited to ${LEGACY_API_CONSUMERS.size} manifests.\n`,
);
