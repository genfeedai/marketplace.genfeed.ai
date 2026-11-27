# Marketplace releases

Marketplace deploys from this repository. It does not check out Genfeed's
monorepo, call its workflows, apply its Terraform state, or update its ECS
services or Vercel projects.

Only the manual **Release** workflow ships production. Merging a PR, pushing
master, and creating a tag run no deployment. Keep Vercel Git auto-deploy
disabled. A maintainer must review the exact source commit, version, quality
results, infrastructure plan, and production settings before approving a cut.
Agents must not dispatch or retry a release without explicit user approval.

## Cut a release

1. Merge the reviewed change and wait for its required CI checks to pass.
2. Review the exact master SHA and proposed `vX.Y.Z` version. The release
   rejects a source SHA that differs from its own workflow SHA, so a changed
   master cannot silently replace the approved source or deployment code.
3. With explicit approval, dispatch **Release** from master with that full SHA,
   version, and `approval=deploy-production`. Configure required production
   reviewers in GitHub environment settings where the account plan supports
   them; the confirmation input does not replace organizational protection.
4. CI reruns lint, Action pin checks, secret scans, the dead-code check, type
   checking, builds, real database tests, deployment checks, and the production
   API image smoke test for the same commit. The image that
   passed those checks is retained as an artifact and pushed to ECR unchanged.
5. The API workflow uses only Marketplace state. It provisions dedicated
   database roles if needed, takes the pre-migration backup, migrates only the
   Marketplace database, updates its API in its own ECS cluster, requires a
   healthy target, and then points the API domain at it.
6. The web workflow builds and deploys only the Marketplace Vercel project,
   then checks the live pages and catalog.
7. Only after both production checks pass does Release create/publish the
   stable tag and GitHub release. A failed attempt never invents a new version;
   recover the same approved version, with a newly reviewed SHA when a code fix
   is required. An existing tag at another SHA fails closed for manual review.

## Production configuration

Create a `production` environment **in this repository**. No checkout
token is needed: every checkout is from the same repository and approved SHA.

| Variable | Meaning |
| --- | --- |
| `AWS_REGION` | Region of the existing network, database and Marketplace resources. |
| `AWS_DEPLOY_ROLE_ARN` | Dedicated Marketplace deploy role, with GitHub OIDC trust for the ID-based subject `repo:<owner>@<owner-id>/<repository>@<repository-id>:environment:production`. Read the exact prefix with `gh api repos/genfeedai/shop.genfeed.ai/actions/oidc/customization/sub`; the plain `repo:<owner>/<repository>` form is not sent. |
| `PROJECT` | Resource prefix and ECR repository prefix. |
| `DOMAIN` | Base domain: API is `api.shop.<DOMAIN>`, web is `shop.<DOMAIN>`. |
| `TF_STATE_BUCKET` | Terraform backend bucket. Sharing a bucket does not share the state key. |
| `TF_STATE_KEY` | Marketplace-only key beginning with `marketplace/`. Never use another app's key. |
| `RDS_INSTANCE_ID` | Existing PostgreSQL instance hosting the dedicated Marketplace database. |
| `SSM_PATH` | Dedicated Marketplace parameter namespace. |
| `DATABASE_ADMIN_PARAMETER` | Administrator URL SecureString for first-time provisioning; not injected into the running API. |
| `NETWORK` | Reviewed JSON with the network references listed below. No Terraform remote-state dependency. |
| `VERCEL_ORG_ID` | Marketplace's Vercel account/team. |
| `VERCEL_PROJECT_ID` | Marketplace project only, with `apps/web` as its root. |

Save `VERCEL_TOKEN` securely as a production environment secret. Do not commit
it or place it in workflow inputs.

`NETWORK` has these non-secret fields:

```json
{
  "vpc_id": "vpc-...",
  "task_subnets": ["subnet-...", "subnet-..."],
  "rds_security_group_ids": ["sg-..."],
  "alb_security_group_id": "sg-...",
  "https_listener_arn": "arn:aws:elasticloadbalancing:...:listener/app/...",
  "route53_zone_id": "Z...",
  "alb_dns_name": "existing-alb.region.elb.amazonaws.com",
  "alb_zone_id": "Z..."
}
```

The database, VPC, private subnets/NAT, HTTPS listener, and DNS zone already
exist. Marketplace owns its ECS cluster, service, IAM task roles, security
group, database ingress rule, target group, certificate, listener rule, API DNS
record, image repository/lifecycle policy, and logs. It shares the existing ALB
and PostgreSQL instance but does not apply or roll the applications that own
them. Changing shared network references requires an explicit reviewed plan.

The RDS backup is an **instance snapshot**, which includes the other databases
on that shared instance. Only Marketplace's database is migrated. Never restore
the snapshot over the shared production instance as an automatic rollback.
Restore to a separate instance and recover the Marketplace database deliberately.

The deploy role needs read access to the referenced network and Marketplace
state, writes to only its state key, image repository, IAM task-role prefix and
Marketplace resources, permission to pass its ECS roles, create/tag/wait for
its pre-migration RDS snapshots, and add its database ingress, API listener rule,
certificate and DNS records, and `logs:FilterLogEvents` on the `operations` log
group so a failed run can print the task output. The Genfeed deployment role's
OIDC trust does not automatically authorize this repository; provision a
dedicated role before an approved release. None of these account settings are applied by merging this PR.

## Recovering a failed API deploy

Every infrastructure step reads the Marketplace state, so a failed attempt leaves
what it created and the next attempt continues from it. Dispatch Release again
with the same `vX.Y.Z`; no tag exists until the last job passes. The source SHA
must be the current master head, so it moves once a fix has merged.

- Each attempt uploads its own image tag and registers a new task definition.
- Database provisioning is skipped when the dedicated parameters exist, the
  migration task is idempotent, and every attempt takes another RDS snapshot.
- The API domain stays unpointed until the service has a healthy target, so a
  failed attempt never serves traffic.
- `api.shop.<DOMAIN>` carries its own CAA set that allows Amazon. Without
  it the lookup climbs to `shop.<DOMAIN>`, which is a CNAME to Vercel, and
  ACM fails the certificate with `CAA_ERROR`. A certificate in `FAILED` cannot
  be validated again, so changing the CAA set replaces the certificate.
- `listener_priority` must be a number no other application uses on the shared
  listener. A `PriorityInUse` error means it is taken; choose a free one.

## Dedicated database and payment parameters

The running API receives only `DATABASE_URL`, `STRIPE_SECRET_KEY`, and
`STRIPE_WEBHOOK_SECRET` under `SSM_PATH`. The migration task alone receives
`MIGRATION_DATABASE_URL`; the provisioning task alone receives the admin URL.
Provisioning creates the `marketplace` database with distinct
`marketplace_runtime` and `marketplace_migrator` roles. Keep TLS verification
and the runtime's readable RDS CA bundle enabled.

Configure the Stripe webhook for `https://api.shop.<DOMAIN>/webhooks/stripe`
with its dedicated signing secret and the checkout completed, checkout expired
and charge refunded events. Payment
parameters must exist before infrastructure changes; the workflow checks their
metadata without printing secret values.

Genfeed is an external identity provider. Its generic
`BETTER_AUTH_TRUSTED_ORIGINS` setting must allow `https://shop.<DOMAIN>`;
Marketplace releases never modify or deploy the identity provider. The API
validates its signed Better Auth JWTs against that provider's public JWKS.

## Local verification

```sh
python3 -m unittest discover -s scripts/deploy -p 'test_*.py' -v
shellcheck scripts/deploy/*.sh
actionlint
tofu -chdir=infra/production init -backend=false -input=false
tofu -chdir=infra/production fmt -check
tofu -chdir=infra/production validate
```

These checks do not deploy or validate account permissions. Review a read-only
plan using the approved account settings before authorizing the first cut, then
follow the actual release jobs and production checks. A green source check or
HTTP 200 from the old web deployment is not evidence that the new API is live.
