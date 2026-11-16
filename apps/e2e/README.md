# Browser flow

One Playwright flow that gates pull requests: browse, open a listing, claim a
free item and find it in the library, then download it.

It runs the real web app against the real API and a throwaway PostgreSQL
database. A stand-in for the Genfeed sign-in service answers `/v1/auth/token`.
Nothing needs Stripe credentials, production data or the network.

```bash
# PostgreSQL superuser the stack can create a throwaway database from
export MARKETPLACE_DB_TEST_ADMIN_URL=postgresql://postgres@127.0.0.1:5432/postgres

bunx turbo run build --filter=@marketplace/api
# NEXT_PUBLIC_* is inlined at build time, so build with these exact values.
NEXT_PUBLIC_MARKETPLACE_API_URL=http://127.0.0.1:3200 \
NEXT_PUBLIC_GENFEED_APP_URL=http://127.0.0.1:3299 \
  bun run --cwd apps/web build

bunx playwright install chromium   # once
bun run --cwd apps/e2e e2e
```

`apps/api/scripts/e2e-stack.ts` starts the database, the built API and the
sign-in stand-in, seeds one free listing, and tears everything down on exit.
