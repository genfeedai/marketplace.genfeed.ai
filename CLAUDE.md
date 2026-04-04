# Marketplace

Open source content marketplace for Genfeed.ai.

## Structure
- `apps/api` — NestJS marketplace API
- `apps/web` — Next.js marketplace frontend
- `packages/types` — Marketplace-specific types

## Dependencies
Consumes `@genfeedai/*` packages from NPM (ui, interfaces, enums, config, fonts, styles).

## Rules
1. No `any` types.
2. No secrets in repo.
3. Conventional commits.
