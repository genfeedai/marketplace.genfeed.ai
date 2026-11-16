# Marketplace Documentation

Run the API, web app, and admin app in parallel with Bun 1.4.4 and Node 26:

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
bun --env-file=.env.local run prisma db push
cd ../..
bun run dev
```

Run `db push` only against a disposable local development database. Production
database changes require the deployment's migration process.

Prisma 7 reads the schema path and the database URL from
`apps/api/prisma.config.ts` and does not load `.env` files itself, which is why
the commands above pass `--env-file`. `prisma:generate` needs no database;
`prisma:migrate` and `db push` stop with "Connection url is empty" when
`DATABASE_URL` is not set.

Create `apps/web/.env.local` and `apps/admin/.env.local` with the local API
and app origins before starting their development servers:

```dotenv
NEXT_PUBLIC_MARKETPLACE_API_URL=http://localhost:3200
NEXT_PUBLIC_GENFEED_API_URL=https://api.genfeed.localhost
NEXT_PUBLIC_GENFEED_APP_URL=https://app.genfeed.localhost
```

The API reads `.env.local` before `.env`. API, web, and admin listen on ports
3200, 3204, and 3205 respectively. Verify `http://localhost:3200/health` and
`http://localhost:3200/health/ready` and
`http://localhost:3200/marketplace/listings`; all should return HTTP 200.

Local public catalog browsing works without Stripe or Better Auth credentials.
Authenticated routes require a Genfeed Better Auth JWT. Sign in through the
Genfeed app, then refresh the library or dashboard. The browser obtains a
short-lived token from the app's `/v1/auth/token` proxy with its existing
host-scoped session. Tokens stay in memory; Marketplace has no separate auth
provider or shared signing secret. The API verifies the issuer, audience,
expiry and public JWKS, and takes user/organization identity from signed claims.
Operator routes additionally require the signed platform-superadmin claim.
Payment operations require Stripe.
Missing Stripe credentials disable payment operations in development;
production still requires a Stripe key at startup. Configure real test keys
only when testing those integrations.

For local gallery data, set `NEXT_PUBLIC_GENFEED_API_URL` in
`apps/web/.env.local` to your running Genfeed API, normally
`https://api.genfeed.localhost`. The admin app uses
`NEXT_PUBLIC_MARKETPLACE_API_URL`, defaulting to `http://localhost:3200`.

The retired npm prompt/workflow catalog importers and their seed commands have
been removed. Create a seller profile and listing from `/dashboard`, submit
the draft for review, then approve it as a platform superadmin (see below).
Published products appear in `/workflows`, `/prompts`, and `/skills`.
Free claims and paid purchases appear in `/library`; download data is never
returned by public catalog or listing endpoints.

### Reviewing listings

A listing is published only after a platform superadmin approves it. Review
runs from the Genfeed CLI (`@genfeedai/cli`, releases after 0.6.0), with the
session `genfeed admin login` stores:

```bash
genfeed admin marketplace listings                 # listings waiting for review
genfeed admin marketplace approve <listing id>     # preview; add --yes to publish
genfeed admin marketplace reject <listing id> --reason "<text>" --yes
```

The CLI derives the Marketplace API URL from its Genfeed API URL
(`api.example.com` becomes `api.marketplace.example.com`, local port 3010
becomes 3200); `--marketplace-url` overrides it. The commands call
`GET /admin/marketplace/listings` and
`POST /admin/marketplace/listings/:id/approve` or `/reject`. Only a listing in
`pending_review` can be approved or rejected, and the reject reason is shown to
the seller. The local admin app on port 3205 calls the same routes.

## Production release

Production ships from this repository through the manual **Release** workflow,
with an exact Marketplace master SHA. Keep Vercel Git auto-deploy disabled. See
[deployment.md](deployment.md) for the release steps, the `production`
environment settings, and the infrastructure in `infra/production`. The
workflow never checks out or calls the Genfeed monorepo.
There is no production deployment of the standalone admin app.

`docker/Dockerfile.api` builds the production API and migration/provisioning
commands. Use `prisma:migrate` with the migration role's `DATABASE_URL`; the
running API uses a distinct role with data access and no schema privileges.
The initial migration targets a fresh database. Existing databases initialized
with `db push` require a verified migration baseline before production deploy.

Configure Stripe to deliver signed events to `/webhooks/stripe`, including
`checkout.session.completed`, `checkout.session.expired` and `charge.refunded`.
Each event id is stored and applied once; a purchase completes only when the
session is paid and its amount and currency match, and a fully refunded charge
refunds its purchase. Invalid signatures return 400; processing failures
return 500 so Stripe retries. Real payment and
payout verification still requires an authorized Stripe test environment.

Validation commands:

```bash
bun run --cwd apps/api typecheck
bun run --cwd apps/api test
bun run build
```

Database isolation and the signed seller/buyer journey run when
`MARKETPLACE_DB_TEST_ADMIN_URL` points to a disposable PostgreSQL 17 instance.
The test administrator needs role/database creation permissions; each test
uses random dedicated database/role names and cleans them up. CI supplies this
fixture and gates on the API tests, frontend tests, builds, and API image smoke.
