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
the draft for review, then approve it through the operator API or local admin.
Published products appear in `/workflows`, `/prompts`, and `/skills`.
Free claims and paid purchases appear in `/library`; download data is never
returned by public catalog or listing endpoints.

## Production release

Production runs through the public `genfeedai/genfeed.ai` hosted SaaS workflow,
with exact Genfeed and Marketplace master SHAs. Keep Vercel Git auto-deploy
disabled. See that repository's `infra/tofu/marketplace/README.md` for the
dedicated AWS service, database roles, SSM parameters, and release settings.
There is no production deployment of the standalone admin app.

`docker/Dockerfile.api` builds the production API and migration/provisioning
commands. Use `prisma:migrate` with the migration role's `DATABASE_URL`; the
running API uses a distinct role with data access and no schema privileges.
The initial migration targets a fresh database. Existing databases initialized
with `db push` require a verified migration baseline before production deploy.

Configure Stripe to deliver signed events to `/webhooks/stripe`, including
`checkout.session.completed` and `checkout.session.expired`. Invalid signatures
return 400; processing failures return 500 so Stripe retries. Real payment and
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
