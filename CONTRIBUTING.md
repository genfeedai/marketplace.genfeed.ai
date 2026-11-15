# Contributing

Contributions are welcome through pull requests to `master`, the single trunk.
Contributing is voluntary and unpaid; an issue or an accepted pull request does
not promise payment.

## Before you start

- Report vulnerabilities through [SECURITY.md](SECURITY.md), never in a public
  issue.
- Search existing issues and pull requests so work is not duplicated.
- For anything larger than a typo or docs fix, open an issue first so the
  scope is agreed before the code exists.
- Issues and pull requests here are public. Leave out credentials, `.env`
  files, customer data and production identifiers.

## Setup

Follow [Run it locally](README.md#run-it-locally).

## Pull requests

- Branch from `master` as `feat/<topic>` or `fix/<topic>`. One change per pull
  request.
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- Run `bun run lint`, `bun run typecheck` and `bun run test` before you push.
  Biome formats the code: `bun run check`.
- A bug fix comes with a test that fails before the fix. A feature comes with
  evidence it works: a database test, or the flow walked in the browser.
- Squash-merge once CI is green.

## Code standards

- TypeScript with no `any` and no `@ts-ignore`.
- Throw NestJS exceptions for errors; read configuration through
  `MarketplaceConfigService`, not `process.env`.
- Identifiers are opaque strings. Never validate an id as a Mongo id or a
  UUID.
- Use the `@api/*` path alias in the API.
- Test public behaviour (what a route returns, what the database holds), not
  call order.

## License

By contributing you agree that your work is licensed under
[AGPL-3.0](LICENSE), the license of this repository. Genfeed's main repository
describes a contributor license agreement in its
[contributing guide](https://github.com/genfeedai/genfeed.ai/blob/master/CONTRIBUTING.md#contributor-license-agreement);
a maintainer will tell you here if it applies to your pull request.
