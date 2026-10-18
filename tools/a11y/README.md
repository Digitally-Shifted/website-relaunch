# Accessibility audit harness — DIG-26

Executable tooling for the WCAG 2.2 Level AA audit defined in the
`audit-spec` document on issue DIG-26. The automated passes of the spec
(section 4) run from this directory. The keyboard, screen reader, and manual
code passes stay human work; `manual-checklist` produces their recording
sheets.

## Commands

| Command | Spec section | What it does |
| --- | --- | --- |
| `npm run audit:a11y` | 4 pass 1, 5 to 9 (automated parts) | axe-core scan of every configured page at every width and theme, plus offline HTML validation. Writes `results/scan.json` and `results/scan-summary.md`. |
| `npm run audit:a11y -- --strict` | 12 gate 3 | Same scan; exits non-zero when any violation exists (CI gate). |
| `npm run audit:a11y:contrast` | 7, 12 gate 5 | Measures every brand token pair with WCAG 2.2 math. Writes `results/token-contrast.md`. |
| `npm run audit:a11y:contrast -- --gate` | 12 gate 5 | Same; exits non-zero when a pair misses its minimum. |
| `npm run audit:a11y:fixture` | — | End-to-end proof: the harness must catch four seeded defects on `test-fixture/bad.html` and report zero violations on `test-fixture/good.html`. Writes `results/fixture-verification.md`. |
| `npm run audit:a11y:checklist` | 4 passes 2 to 4 | Generates the per-page manual recording sheet in `results/manual-checklist.md`. |

## Setup

Serve the production build, then scan it:

```sh
npm install
# serve the built site on 127.0.0.1:4173 (or set A11Y_BASE_URL)
npm run audit:a11y
```

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `A11Y_BASE_URL` | `http://127.0.0.1:4173` | Where the built site is served. |
| `A11Y_CHROMIUM` | `/usr/bin/chromium` | Chromium binary for playwright-core. |

## How to add pages

The Engineer appends one entry per route to `pages` in `audit.config.mjs`
when DIG-15 and DIG-16 land:

```js
pages: [
  { name: 'home', path: '/' },
  { name: 'landing-service', path: '/services/website-management/' },
],
```

The template must expose its current theme on the root element as
`data-theme="light" | "dark"` so scans can switch themes. A different
attribute name goes in `themeAttribute`.

## What stays manual

Per the spec, these checks need a human and are recorded in
`results/manual-checklist.md`: keyboard pass (K1 to K10), screen reader spot
check (S1, S3, A3, A4, A6, A10), focus appearance (K4), focus-not-obscured
at real widths (K5), and template-level checks T1 to T8. The automated scan
supports several of them (axe `target-size`, `color-contrast`, focus rules)
but does not replace the manual pass.

## Files

```
audit.config.mjs        pages, widths, themes, axe tags
brand-tokens.json       brand token values and the pair matrix to measure
bin/scan.mjs            automated axe + HTML validation runner
bin/token-contrast.mjs  token pair contrast table
bin/verify-fixture.mjs  E2E proof for the scan machinery
bin/manual-checklist.mjs per-page manual recording sheet
lib/contrast.mjs        WCAG 2.2 contrast math
test-fixture/           seeded bad page, clean page, expected outcomes
results/                committed evidence of each run
```
