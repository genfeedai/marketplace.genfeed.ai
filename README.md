# Genfeed Marketplace

The store for [Genfeed.ai](https://genfeed.ai) prompts, workflows, presets and
skills. It launches with Genfeed's own listings only; outside sellers come
later. The store is its own application: it shares sign-in with Genfeed
through signed tokens and calls the main app only over HTTP.

Licensed under [AGPL-3.0](LICENSE) (see also [NOTICE](NOTICE)). The store is not in production yet.

## What is in this repository

| Path | What it is | Port |
| --- | --- | --- |
| `apps/api` | NestJS API: listings, sellers, checkout, purchases, Stripe webhooks. Prisma and PostgreSQL. | 3200 |
| `apps/web` | Next.js storefront for buyers. | 3204 |
| `apps/admin` | Next.js panel for the operator: listings, sellers, sales. | 3205 |

Sign-in is Better Auth: the API verifies Genfeed's signed tokens against its
public keys and holds no auth secret. Payments are Stripe Checkout.

## Run it locally

You need [Bun](https://bun.sh) 1.3 and Node 26 (see `.node-version`).

```bash
bun install
cp .env.example .env                 # then set DATABASE_URL
docker compose -f docker/docker-compose.yml up -d    # PostgreSQL on :5433
cd apps/api
bunx prisma generate --schema prisma/schema.prisma
bunx prisma migrate deploy --schema prisma/schema.prisma
cd ../..
bun run dev
```

Browsing the catalog needs no Stripe keys. Payment calls stay disabled until
`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set; use Stripe test keys
and never real ones in a development environment.

## Checks

```bash
bun run lint
bun run typecheck
bun run test
```

The database suites run against a throwaway PostgreSQL. Point
`MARKETPLACE_DB_TEST_ADMIN_URL` at a PostgreSQL superuser URL to run them
locally; without it they are skipped. CI always runs them.

## Deploying

Production is shipped only by the manual Release workflow. See
[docs/deployment.md](docs/deployment.md).

## Security and contributing

- Report vulnerabilities privately: see [SECURITY.md](SECURITY.md).
- Contributions are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md).
