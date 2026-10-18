# Fixture verification — 2026-10-18T20:07:36.060Z

Purpose: prove the scan harness finds seeded defects and stays silent on a clean page.
Harness: axe-core on Chromium (/usr/bin/chromium), tags: wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice.

## bad.html — seeded defects

- html-has-lang: found, impact serious, 1 node(s)
- image-alt: found, impact critical, 1 node(s)
- label: found, impact critical, 1 node(s)
- color-contrast: found, impact serious, 1 node(s)

Other rule hits on bad.html: landmark-one-main, page-has-heading-one, region
Needs review (incomplete): none

## good.html — clean page

- Violations: 0 (limit 0) — clean
- Needs review (incomplete): none

## Verdict: Pass — harness verified
