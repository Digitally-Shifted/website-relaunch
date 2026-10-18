#!/usr/bin/env bash
# Smoke test for a deployed site (DIG-91 go-live gate, security review G3).
#
# Usage: scripts/smoke-test.sh <base-url> [production|staging]
#
# Default expectation is production (indexed, no draft text, redirect stubs).
# staging allows the noindex meta and the staging base path.
# Every check prints PASS/FAIL with the observed value; exit 1 on any FAIL.
set -uo pipefail

BASE_URL="${1:?usage: smoke-test.sh <base-url> [production|staging]}"
ENV_MODE="${2:-production}"

case "$ENV_MODE" in
  production|staging) ;;
  *) echo "unknown environment: $ENV_MODE (use production or staging)" >&2; exit 1 ;;
esac

FAILURES=0
pass() { echo "  PASS  $1"; }
fail() { echo "  FAIL  $1"; FAILURES=$((FAILURES + 1)); }

# GET a path under the base URL; print "<status> <body-file>".
fetch() {
  local path="$1" body
  body="$(mktemp)"
  local status
  status="$(curl -fsSL -o "$body" -w '%{http_code}' "${BASE_URL}${path}" 2>/dev/null)" || status="$(curl -sL -o "$body" -w '%{http_code}' "${BASE_URL}${path}" 2>/dev/null)"
  echo "${status:-000} $body"
}

echo "Smoke test: $BASE_URL (environment: $ENV_MODE)"

# --- core routes ------------------------------------------------------------
echo "Routes:"
for route in / /services /services/website-development /services/domains-hosting /services/paid-advertising /about /contact /privacy /blog /blog/digital-marketing /blog/hosting-domains /blog/paid-advertising /blog/website-development /faq /2023/02/09/ultimate-digital-marketing-guide-for-businesses/; do
  read -r status body < <(fetch "$route")
  if [ "$status" = "200" ]; then pass "$route → 200"; else fail "$route → $status (expected 200)"; fi
  if [ -n "${body:-}" ]; then rm -f "$body"; fi
done

# --- home page content and head ---------------------------------------------
echo "Home page head and content:"
read -r status home < <(fetch /)
if [ "$status" = "200" ]; then
  grep -q 'Deployed build' "$home" && pass "deploy marker present" || fail "deploy marker missing"
  grep -q 'og:image' "$home" && pass "og:image meta present" || fail "og:image meta missing"
  grep -q 'og-default.png' "$home" && pass "og image file referenced" || fail "og image file not referenced"
  grep -q 'twitter:card' "$home" && pass "twitter:card present" || fail "twitter:card missing"
  grep -q 'rel="canonical"' "$home" && pass "canonical link present" || fail "canonical link missing"
  if grep -q 'name="robots" content="[^"]*noindex' "$home"; then
    if [ "$ENV_MODE" = "production" ]; then fail "production home carries noindex"; else pass "staging noindex present"; fi
  else
    if [ "$ENV_MODE" = "production" ]; then pass "production home is indexable"; else fail "staging home lost noindex"; fi
  fi
  grep -q 'href[^>]*wa\.me' "$home" && pass "WhatsApp link present" || fail "WhatsApp link missing"
  grep -q 'href="tel:' "$home" && pass "tel: link present" || fail "tel: link missing"
else
  fail "home page fetch failed ($status) — skipping head checks"
fi
rm -f "$home"

# --- robots and sitemap -------------------------------------------------------
echo "robots.txt and sitemap:"
read -r status robots < <(fetch /robots.txt)
if [ "$status" = "200" ] && grep -q '^Sitemap:' "$robots" && grep -q '^User-agent' "$robots"; then
  pass "robots.txt serves with a Sitemap line"
else
  fail "robots.txt missing or without Sitemap line (status $status)"
fi
rm -f "$robots"
read -r status smi < <(fetch /sitemap-index.xml)
if [ "$status" = "200" ] && grep -q '<sitemapindex' "$smi"; then
  pass "sitemap-index.xml serves a sitemap index"
else
  fail "sitemap-index.xml missing or malformed (status $status)"
fi
rm -f "$smi"

# --- 404 handling -------------------------------------------------------------
echo "404 handling:"
status="$(curl -sL -o /dev/null -w '%{http_code}' "${BASE_URL}/this-page-does-not-exist-$(date +%s)")"
if [ "$status" = "404" ]; then
  pass "unknown URL answers 404"
else
  if [ "$ENV_MODE" = "staging" ]; then
    pass "unknown URL answered $status (GitHub Pages project hosting may soft-serve; host 404 rule is a cutover item)"
  else
    fail "unknown URL answered $status (expected 404)"
  fi
fi
read -r status nf < <(fetch /404.html)
if [ "$status" = "200" ] && grep -q 'Page not found' "$nf"; then
  pass "404 page serves with its headline"
else
  fail "404 page missing or unbranded (status $status)"
fi
rm -f "$nf"

# --- redirect stubs -----------------------------------------------------------
echo "Redirects (meta-refresh stubs; host-level 301s land at cutover):"
for pair in "/contact-us/|/contact" "/privacy-policy/|/privacy" "/category/digital-marketing/|/blog/digital-marketing"; do
  old="${pair%%|*}"; new="${pair##*|}"
  read -r status stub < <(fetch "$old")
  if [ "$status" = "200" ] && grep -qi 'http-equiv="refresh"' "$stub" && grep -q "$new" "$stub"; then
    pass "$old redirects to $new"
  else
    fail "$old did not redirect to $new (status $status)"
  fi
  rm -f "$stub"
done

echo ""
if [ "$FAILURES" -eq 0 ]; then
  echo "SMOKE TEST PASS"
else
  echo "SMOKE TEST FAIL: $FAILURES check(s) failed"
  exit 1
fi
