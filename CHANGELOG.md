# Changelog

All notable changes to the Digitally Shifted website get one entry here.

The format follows Keep a Changelog 1.1.0: <https://keepachangelog.com/en/1.1.0/>.
Versioning is semver; the rules live in `docs/release-process.md`. Versions
apply to production releases only. Staging has no versions.

## [Unreleased]

### Added

- The enquiry form end to end: the `ContactForm` component (validation,
  honeypot, time trap, UTM capture, quote-intent button) and the
  zero-dependency backend behind `POST /api/contact` (SQLite leads store,
  email notification with retries, rate limit, idempotency) with 14
  end-to-end tests and 14 real-browser checks (DIG-69, DIG-91).
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
- Blog index page at `/blog/` that lists the four blog topics (DIG-92, AC-009).

### Changed

- The build gate now also verifies the redirect map
  (`scripts/build-site.sh`, DIG-91).
- The form backend accepts cPanel/Passenger mounts: `MOUNT_PATH=/api`
  makes both the prefixed and the stripped request path reach the same
  routes (DIG-91).

### Fixed

- The skip link now moves keyboard focus into the page content (DIG-92, AC-007).
- Blog topic and service detail pages use ink links on light grounds; the
  previous accent links failed the 4.5:1 text contrast minimum (DIG-92, AC-006).
- Keyboard focus on mobile now rests above the fixed action bar, never under
  it (DIG-92, AC-008).
- Section headings carry ids, so every `aria-labelledby` section label
  resolves to its heading (DIG-92, AC-010).
- The mobile action bar is a navigation landmark named "Quick actions"
  (DIG-92, AC-011).
- Interactive card hover borders use grey-500, which meets the 3:1 non-text
  contrast minimum on both grounds (DIG-92, AC-012).
- Smooth scrolling is disabled for users who prefer reduced motion (DIG-92).
