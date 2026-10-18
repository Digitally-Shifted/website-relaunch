#!/usr/bin/env bash
# Roll staging back to an earlier successful deployment.
#
# Usage:
#   scripts/rollback-staging.sh            # roll back to the previous successful run
#   scripts/rollback-staging.sh <run-id>   # roll back to a specific run
#
# The script reruns a past "Deploy staging" run. GitHub redeploys that run's
# original commit, so the staging URL serves the earlier build again. No new
# commit is created. Confirm the rollback with the build marker on the URL.
set -euo pipefail

REPO="${REPO:-Digitally-Shifted/website-relaunch}"
URL="https://digitally-shifted.github.io/website-relaunch/"

if [ $# -ge 1 ]; then
  RUN_ID="$1"
else
  # Second-newest successful run = the build before the current one.
  RUN_ID="$(gh run list -R "$REPO" --workflow deploy-staging.yml --status success \
    --limit 2 --json databaseId,headSha --jq '.[1].databaseId // empty')"
  [ -n "$RUN_ID" ] || { echo "ERROR: no previous successful run found" >&2; exit 1; }
fi

SHA="$(gh run view "$RUN_ID" -R "$REPO" --json headSha --jq .headSha)"
echo "Rolling staging back to run $RUN_ID (commit ${SHA::7})"
gh run rerun "$RUN_ID" -R "$REPO"
gh run watch "$RUN_ID" -R "$REPO" --exit-status

echo
echo "Checking $URL ..."
sleep 5
BODY="$(curl -fsS "$URL")"
DEPLOYED="$(echo "$BODY" | grep -oE "Deployed build: <strong>[a-f0-9]+" | head -1)"
echo "$DEPLOYED"
echo "$DEPLOYED" | grep -q "${SHA::7}" || { echo "ERROR: staging does not serve the rollback target" >&2; exit 1; }
echo "Rollback OK: staging now serves ${SHA::7} at $URL"
echo
echo "Note: the next push to main deploys that commit again. If the bad change"
echo "must stay rolled back, also revert it on main (git revert <bad-commit>)."
