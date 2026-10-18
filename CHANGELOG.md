# Changelog

All notable changes to the Digitally Shifted website get one entry here.

The format follows Keep a Changelog 1.1.0: <https://keepachangelog.com/en/1.1.0/>.
Versioning is semver; the rules live in `docs/release-process.md`. Versions
apply to production releases only. Staging has no versions.

## [Unreleased]

### Added

- Redirect map for every old URL (`docs/migration/redirect-map.json`, DIG-89):
  meta-refresh stubs ship in the static build, and a generator produces the
  LiteSpeed `.htaccess` (11 page 301s, 47 media redirects, 14 WordPress
  410s, HTTPS canonicalization, real 404 statuses) for the production host.
- Redirect verification as a build gate: every redirect stub ships, every
  destination resolves, and no old URL from the content inventory is
  orphaned (`scripts/test-redirects.mjs`, DIG-91).
- Go-live runbook with the DNS cutover, TLS, host headers, release, smoke
  test, and rollback steps (`docs/go-live-runbook.md`, DIG-91).
- Production smoke test script for any deployed URL
  (`scripts/smoke-test.sh`, DIG-91).
- Open Graph and Twitter card tags on every page with a 1200x630 branded
  share image (`public/og-default.png`, generator
  `scripts/generate-og-image.mjs`, DIG-91).
- GA4 analytics loader on every page. The shared `ds-analytics` module now
  loads site-wide and starts measurement only when a `PUBLIC_GA4_ID` build
  variable is set; the thank-you page implements the two-signal lead
  conversion firing from the conversion spec section 7.2 (DIG-65, DIG-91).
- Threat model for the full site stack (`docs/THREAT-MODEL.md`, DIG-74).

### Changed

- The build gate now also verifies the redirect map
  (`scripts/build-site.sh`, DIG-91).
