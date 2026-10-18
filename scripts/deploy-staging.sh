#!/usr/bin/env bash
# Deploy the current main branch to staging and watch the run.
#
# Usage: scripts/deploy-staging.sh
#
# A push to main triggers the "Deploy staging" workflow automatically. This
# script pushes and then waits for the run to finish, so the caller sees the
# result. Run it from a repository checkout.
set -euo pipefail

REPO="${REPO:-Digitally-Shifted/website-relaunch}"
URL="https://digitally-shifted.github.io/website-relaunch/"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" = "main" ] || { echo "ERROR: switch to main first (current branch: $BRANCH)" >&2; exit 1; }

git pull --ff-only origin main
git push origin main
echo "Pushed $(git rev-parse --short HEAD). Waiting for the staging run to appear..."

RUN_ID=""
for _ in $(seq 1 12); do
  RUN_ID="$(gh run list -R "$REPO" --workflow deploy-staging.yml --event push --limit 1 --json databaseId --jq '.[0].databaseId // empty')"
  [ -n "$RUN_ID" ] && break
  sleep 5
done
[ -n "$RUN_ID" ] || { echo "ERROR: staging run did not appear" >&2; exit 1; }

echo "Watching run $RUN_ID"
gh run watch "$RUN_ID" -R "$REPO" --exit-status

echo
echo "Deployed. Checking $URL ..."
sleep 5
BODY="$(curl -fsS "$URL")"
echo "$BODY" | grep -q "Deployed build" || { echo "ERROR: staging URL did not serve the new build" >&2; exit 1; }
echo "$BODY" | grep -oE "Deployed build: <strong>[a-f0-9]+" | head -1
echo "Staging OK: $URL"
