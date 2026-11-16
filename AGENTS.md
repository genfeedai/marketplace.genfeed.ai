# AGENTS.md — Genfeed Marketplace

This is the single rule file for every agent (Claude Code, Codex, Cursor). `CLAUDE.md`
only imports it, so edit rules here and nowhere else.

Content marketplace for Genfeed.ai. Open source (AGPL-3.0), its own repository, not in production yet. See `README.md`, `SECURITY.md` and `CONTRIBUTING.md`.

## Structure

- `apps/api` — NestJS marketplace API (port 3200)
- `apps/web` — Next.js public marketplace frontend (port 3204)

There is no `packages/` folder; types live in each app. There is no admin app:
listing review and sales run from the private operator console and the Genfeed CLI
against the `/admin/marketplace/*` routes (see `docs/README.md`).

## Dependencies

Consumes `@genfeedai/*` packages from NPM:
- `@genfeedai/contracts` — shared enums (ListingType, ListingStatus, SellerStatus, etc.) from its `/enums` entry, used by the api

## Domain

- Production: `marketplace.genfeed.ai`
- API: `api.marketplace.genfeed.ai`

## Architecture

- **Database target:** AWS Postgres cluster via `DATABASE_URL`
- **ORM/runtime:** Prisma + PostgreSQL for sellers, listings and purchases
- **Auth:** Better Auth JWTs, verified by `BetterAuthGuard` in the API (issuer, audience and JWKS URL come from `BETTER_AUTH_*` config)
- **Ids:** `id` is the only identifier on sellers, listings and purchases. The database generates it (a UUID as text); rows seeded earlier keep their 24-character ids, so never validate an id as a Mongo id or a UUID
- **Payments:** Stripe (checkout sessions + Stripe Connect for sellers)
- **Integration:** HTTP/SDK boundary with genfeed.ai (no compile-time imports)

## Commands

```bash
bun install            # install dependencies (also installs the Git hooks)
bun run lint           # Biome on every app plus scripts/, the same command CI runs
bun run typecheck      # tsc in every workspace
bun run test           # unit and real-database tests (needs MARKETPLACE_DB_TEST_ADMIN_URL)
bun run check          # Biome with --fix
bun run check:dead-code    # knip: unused files, exports and dependencies
bun run check:action-versions  # every GitHub Action pinned to a full commit SHA
bun run secretlint     # secret scan of the whole tree
bun run deps:update    # weekly bump, 3 hour release cooldown, Action pins included
```

## Workflow

- `master` is the single trunk. Never push to it; open a pull request from a short-lived
  branch (`feat/<topic>`, `fix/<topic>`, `chore/<topic>`).
- Open every pull request as a draft, push while it is a draft, and mark it ready once
  the branch is finished. Run `bun run lint`, `bun run typecheck` and `bun run test`
  before marking it ready. Squash-merge once CI is green.
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- No Dependabot. `.github/workflows/deps-update.yml` opens one weekly pull request.
- Search open pull requests and issues before starting, so work is not duplicated.

## Rules

1. No `any` types and no `@ts-ignore`.
2. No secrets in the repo, and none in issues, pull requests or comments, which are public:
   no customer names, production identifiers or credentials. The pre-commit hook and CI run
   secretlint and gitleaks; when one fails, remove the secret. Never add an allowlist entry
   to get past a real finding.
3. Prefer existing patterns over novel architecture. Keep changes minimal and scoped.
4. Use path aliases (`@api/*` in the API app), not deep relative imports.
5. Throw NestJS exceptions for errors; read configuration through `MarketplaceConfigService`,
   not `process.env`.
6. Delete dead code rather than keeping it. `check:dead-code` fails on unused files, exports
   and dependencies; do not add to `knip.json` to silence a finding.
7. Keep Biome's accessibility rules as errors. Every `<button>` has an explicit `type`; a
   click handler on a non-interactive element needs a keyboard path or a real control.
8. Test public behaviour (what a route returns, what the database holds), not call order.
   A bug fix comes with a test that fails before the fix.
9. Never loosen a CI gate or a lint rule to get a change through.
