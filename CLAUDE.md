# Marketplace

Open source content marketplace for Genfeed.ai — standalone cloud product.

## Structure

- `apps/api` — NestJS marketplace API (port 3200)
- `apps/web` — Next.js public marketplace frontend (port 3204)
- `apps/admin` — Next.js operator/admin panel (port 3205)
- `packages/types` — Marketplace-specific TypeScript interfaces

## Dependencies

Consumes `@genfeedai/*` packages from NPM:
- `@genfeedai/enums` — shared enums (ListingType, ListingStatus, SellerStatus, etc.)
- `@genfeedai/ui` — shared UI primitives (when frontend is built out)

## Domain

- Production: `marketplace.genfeed.ai`
- API: `api.marketplace.genfeed.ai`

## Architecture

- **Database target:** AWS Postgres cluster via `DATABASE_URL`
- **ORM/runtime:** Prisma + PostgreSQL for sellers, listings, purchases, and seed scripts
- **Auth:** Clerk (shared application with genfeed.ai)
- **Payments:** Stripe (checkout sessions + Stripe Connect for sellers)
- **Integration:** HTTP/SDK boundary with genfeed.ai (no compile-time imports)

## Rules

1. No `any` types in TypeScript.
2. No secrets in repo.
3. Conventional commits.
4. Prefer existing patterns over novel architecture.
5. Keep changes minimal and scoped.
6. Use path aliases (`@api/*` in API app).
