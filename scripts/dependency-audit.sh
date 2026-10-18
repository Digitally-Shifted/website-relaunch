#!/usr/bin/env bash
# Dependency audit for this repository. Runs weekly in CI and on demand.
# Cadence and patch classes: docs/dependency-audit.md.
#
# Checks:
#   1. External scripts that the site loads match the known inventory.
#   2. Pinned GitHub Actions exist, and newer majors appear as upgrade findings.
#
# Exit 1 on any FAIL. WARN findings go to the monthly review. They do not
# fail the run.
set -euo pipefail

failures=0
warnings=0
SUMMARY_FILE="${GITHUB_STEP_SUMMARY:-/dev/null}"

append_summary() { printf '%s\n' "$1" >> "$SUMMARY_FILE" 2>/dev/null || true; }
fail() { echo "FAIL: $1" >&2; append_summary "| FAIL | $1 |"; failures=$((failures + 1)); }
warn() { echo "WARN: $1" >&2; append_summary "| WARN | $1 |"; warnings=$((warnings + 1)); }
ok() { echo "OK: $1"; }

append_summary "## Dependency audit"
append_summary ""
append_summary "| Level | Finding |"
append_summary "| --- | --- |"

# --- Check 1: external runtime scripts --------------------------------------
# Class D rule: every external script host must be in this inventory after a
# reviewed change. The probe fetches the base URL once; per-id responses from
# the vendor can vary, so only transport errors and 5xx fail the run.
ALLOWED_EXTERNAL_HOSTS=(
  "www.googletagmanager.com"
)
ALLOWED_EXTERNAL_URLS=(
  "https://www.googletagmanager.com/gtag/js"
)

# || true keeps set -e alive when a grep finds nothing (pipefail makes an
# unmatched grep a pipeline failure).
collect_external_urls() {
  {
    grep -hoE '(src|href)="https?://[^"]+"' index.html 2>/dev/null | sed -E 's/^[a-z]+="//; s/"$//' || true
    grep -hoE "https?://[^'\"[:space:]]+" analytics/*.js 2>/dev/null || true
  } | sort -u
}

while IFS= read -r url; do
  [ -n "$url" ] || continue
  host="$(printf '%s' "$url" | sed -E 's#^https?://([^/?#]+).*#\1#')"
  known=0
  matched_url=""
  for allowed in "${ALLOWED_EXTERNAL_URLS[@]}"; do
    case "$url" in
      "$allowed"|"$allowed"?*) known=1; matched_url="$allowed"; break ;;
    esac
  done
  if [ "$known" -eq 0 ]; then
    fail "unknown external URL in site sources: $url (review it, then add it here per docs/dependency-audit.md, class D)"
    continue
  fi
  host_ok=0
  for allowed_host in "${ALLOWED_EXTERNAL_HOSTS[@]}"; do
    if [ "$host" = "$allowed_host" ]; then host_ok=1; fi
  done
  if [ "$host_ok" -eq 0 ]; then
    fail "external URL on unexpected host: $url"
    continue
  fi
  probe_url="$matched_url"
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$probe_url" 2>/dev/null)" || code="000"
  case "$code" in
    200) ok "external script reachable: $allowed" ;;
    403|404) warn "vendor answered HTTP $code for $allowed (probe can be blocked; check vendor status)" ;;
    000) fail "external script unreachable (transport error): $allowed" ;;
    *) fail "external script answered HTTP $code: $allowed" ;;
  esac
done < <(collect_external_urls)

# --- Check 2: GitHub Actions versions ----------------------------------------
# Newer major -> WARN (class C upgrade at the monthly review). Missing
# repository -> FAIL.
append_summary ""
append_summary "### GitHub Actions versions"
append_summary ""
append_summary "| Used | Latest | Result |"
append_summary "| --- | --- | --- |"

declare -A seen=()
refs="$(grep -rhoE 'uses: *[^ ]+@[A-Za-z0-9._-]+' .github/workflows | sed -E 's/^uses: *//' | sort -u)" || refs=""
while IFS= read -r ref; do
  [ -n "$ref" ] || continue
  repo="${ref%@*}"
  want="${ref##*@}"
  case "$repo" in
    ./*|docker/*|"") continue ;;
  esac
  if [ -n "${seen[$ref]:-}" ]; then continue; fi
  seen[$ref]=1

  if ! gh api "repos/$repo" --jq .full_name >/dev/null 2>&1; then
    fail "action repository not found: $repo"
    continue
  fi
  latest="$(gh api "repos/$repo/releases/latest" --jq .tag_name 2>/dev/null)" || latest=""
  if [ -z "$latest" ]; then
    warn "no latest release for $repo (check manually)"
    append_summary "| $ref | ? | WARN |"
    continue
  fi
  used_major="${want%%.*}"; used_major="${used_major#v}"
  new_major="${latest%%.*}"; new_major="${new_major#v}"
  if [[ "$used_major" =~ ^[0-9]+$ && "$new_major" =~ ^[0-9]+$ ]] && [ "$used_major" -lt "$new_major" ]; then
    warn "upgrade available: $repo@$want -> $latest"
    append_summary "| $ref | $latest | WARN |"
  else
    ok "action current: $repo@$want (latest $latest)"
    append_summary "| $ref | $latest | OK |"
  fi
done <<< "$refs"

append_summary ""
append_summary "**Result: $failures failures, $warnings warnings.**"
echo "Dependency audit: $failures failures, $warnings warnings."
[ "$failures" -eq 0 ]
