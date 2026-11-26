# Security Policy

This service takes payments and handles purchase records, so please report
problems privately.

## Reporting a vulnerability

Do not report a suspected vulnerability in a public issue, discussion or pull
request.

**Preferred:** open a private report through GitHub's vulnerability reporting
form at
[github.com/genfeedai/shop.genfeed.ai/security/advisories/new](https://github.com/genfeedai/shop.genfeed.ai/security/advisories/new).
Only you and the maintainers can see it.

**Alternative:** email [support@genfeed.ai](mailto:support@genfeed.ai) with
`[SECURITY]` in the subject line.

Include the affected route or component, the commit SHA or release tag, steps
to reproduce, and the impact you expect. Remove credentials, tokens and
personal data from the report.

## What to expect

- We acknowledge a report within 72 hours.
- We confirm or close it within 7 days.
- We aim to fix confirmed issues within 90 days, sooner for anything that
  affects payments or customer data, and tell you before day 90 if we need
  longer.
- Reporters are credited in the advisory unless they ask not to be.

Reports are voluntary and unpaid. Genfeed does not run a bug bounty.

## Scope

In scope: the API in `apps/api`, the storefront in `apps/web`, and the
deployment workflows in `.github/`.

Out of scope: the main Genfeed application (report that at
[genfeedai/genfeed.ai](https://github.com/genfeedai/genfeed.ai/security/policy)),
Stripe, and findings that need physical access or a compromised device.
