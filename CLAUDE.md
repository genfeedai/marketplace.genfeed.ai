# Marketplace

Private content marketplace for Genfeed.ai — standalone cloud product, not deployed yet.

## Structure

- `apps/api` — NestJS marketplace API (port 3200)
- `apps/web` — Next.js public marketplace frontend (port 3204)
- `apps/admin` — Next.js operator/admin panel (port 3205)

There is no `packages/` folder; types live in each app.

## Dependencies

Consumes `@genfeedai/*` packages from NPM:
- `@genfeedai/enums` — shared enums (ListingType, ListingStatus, SellerStatus, etc.), used by api, web and admin
- `@genfeedai/constants` — used by admin

## Domain

- Production: `marketplace.genfeed.ai`
- API: `api.marketplace.genfeed.ai`

## Architecture

- **Database target:** AWS Postgres cluster via `DATABASE_URL`
- **ORM/runtime:** Prisma + PostgreSQL for sellers, listings, purchases, and seed scripts
- **Auth:** Better Auth JWTs, verified by `BetterAuthGuard` in the API (issuer, audience and JWKS URL come from `BETTER_AUTH_*` config)
- **Ids:** `id` is the only identifier on sellers, listings and purchases. The database generates it (a UUID as text); rows seeded earlier keep their 24-character ids, so never validate an id as a Mongo id or a UUID
- **Payments:** Stripe (checkout sessions + Stripe Connect for sellers)
- **Integration:** HTTP/SDK boundary with genfeed.ai (no compile-time imports)

## Rules

1. No `any` types in TypeScript.
2. No secrets in repo.
3. Conventional commits.
4. Prefer existing patterns over novel architecture.
5. Keep changes minimal and scoped.
6. Use path aliases (`@api/*` in API app).
