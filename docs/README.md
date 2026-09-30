# Marketplace Documentation

Run the API, web app, and admin app in parallel with Bun 1.3.14 and Node 24:

```bash
bun install --frozen-lockfile
cp .env.example apps/api/.env.local
```

Set `DATABASE_URL` in `apps/api/.env.local` to a dedicated local PostgreSQL
database. Use your existing PostgreSQL instance, or start the optional Compose
service with `docker compose -f docker/docker-compose.yml up -d postgres`.
Compose exposes PostgreSQL on port 5433 to avoid competing with an existing
database on 5432. Marketplace does not use MongoDB.

Initialize the schema in that local database, then start the apps:

```bash
cd apps/api
bun --env-file=.env.local run prisma:generate
bun --env-file=.env.local run prisma db push --schema prisma/schema.prisma
cd ../..
bun run dev
```

Run `db push` only against a disposable local development database. Production
database changes require the deployment's migration process.

The API reads `.env.local` before `.env`. API, web, and admin listen on ports
3200, 3204, and 3205 respectively. Verify `http://localhost:3200/health` and
`http://localhost:3200/marketplace/listings`; both should return HTTP 200.

Local public catalog browsing works without Stripe or Clerk credentials.
Authenticated routes require Clerk, and payment operations require Stripe.
Missing Stripe credentials disable payment operations in development;
production still requires a Stripe key at startup. Configure real test keys
only when testing those integrations.

For local gallery data, set `NEXT_PUBLIC_GENFEED_API_URL` in
`apps/web/.env.local` to your running Genfeed API, normally
`https://api.genfeed.localhost`. The admin app uses
`NEXT_PUBLIC_MARKETPLACE_API_URL`, defaulting to `http://localhost:3200`.

The retired npm prompt/workflow catalog importers and their seed commands have
been removed. Manage listings through Marketplace's API instead.

Validation commands:

```bash
bun run --cwd apps/api typecheck
bun run --cwd apps/api test
bun run build
```
