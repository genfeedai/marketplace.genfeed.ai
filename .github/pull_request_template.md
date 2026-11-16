<!--
Title = squash commit subject, Conventional Commits: `type(scope): summary`
(feat, fix, docs, refactor, test, chore, build, ci). Lowercase, imperative,
no trailing period. Issues and pull requests here are public: no customer
names, production identifiers or credentials.
-->

## Summary

<!-- What changed, and what outcome does it produce? -->

## Related issue

<!-- `Closes #123`, or `Refs #123`. Not needed for a typo or docs-only fix. -->

## Verification

<!-- Commands you ran and their results. Bug fixes: the test that failed before the fix. Features: the database test or the flow you walked. -->

## Screenshots

<!-- Required for visible UI changes; otherwise "Not applicable". -->

## Checklist

- [ ] The title is a Conventional Commits subject.
- [ ] `bun run lint`, `bun run typecheck` and `bun run test` pass locally, or the PR says why not.
- [ ] I reviewed the final diff for unrelated changes.
- [ ] No secrets, credentials, customer names or production identifiers are in the diff or this description.
