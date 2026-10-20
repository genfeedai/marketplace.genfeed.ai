#!/usr/bin/env bash
# Fail before deployment if approval, the reviewed SHA, or version is ambiguous.
set -euo pipefail
test "$GITHUB_REF" = refs/heads/master
test "$APPROVAL" = deploy-production
[[ "$SOURCE_SHA" =~ ^[0-9a-f]{40}$ ]]
[[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]
test "$SOURCE_SHA" = "$WORKFLOW_SHA"
git merge-base --is-ancestor "$SOURCE_SHA" origin/master
if git show-ref --verify --quiet "refs/tags/$VERSION"; then
  test "$(git rev-list -n 1 "$VERSION")" = "$SOURCE_SHA"
fi
printf 'source_sha=%s\nversion=%s\n' "$SOURCE_SHA" "$VERSION" >> "$GITHUB_OUTPUT"
