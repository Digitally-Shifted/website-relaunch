# DIG-72 implementation and verification record

Issue: DIG-72 (Implement remaining pages and components) · Date: 2026-10-18
Base: main `1a4c87e` (DIG-71 Astro build). Branch: `dig-72-astro-completions`.

## What landed

The DIG-71 Astro build covers the core pages (home, services, about, contact,
thank-you, privacy, 404). DIG-72 adds the pages and components that build did
not include, in the same component system:

| Route | File | Purpose |
| --- | --- | --- |
| `/faq/` | `src/pages/faq.astro` | Eight-question accordion (native `details`/`summary`, no JS needed). Pricing, process, timelines, POPIA, hosting. |
| Services hub modal | `src/pages/services.astro` | WaaS "See what the plan covers" native dialog: inclusion list, quote CTA, overlay scrim (interactive element per the issue). |
| `/services/website-development/` | `src/pages/services/website-development.astro` | Service detail; merge target of the 2024-08-12 post. CTA preselects `new-website`. |
| `/services/paid-advertising/` | `src/pages/services/paid-advertising.astro` | Service detail; merge target of the 2024-07-15 post. CTA uses `quote` (spec 4.2 has no paid-advertising value). |
| `/services/domains-hosting/` | `src/pages/services/domains-hosting.astro` | Service detail; merge target of the 2024-07-04 post. CTA preselects `hosting`. |
| `/blog/digital-marketing/` | `src/pages/blog/digital-marketing.astro` | Topic filter, verbatim category description, links the pillar guide. |
| `/blog/hosting-domains/`, `/blog/paid-advertising/`, `/blog/website-development/` | `src/pages/blog/*.astro` | Topic filters; merged posts point at their service pages. |

Wiring:

- `src/lib/site.config.ts`: nav gains Blog and FAQ (header, overlay, footer).
- `src/pages/services.astro`: sections 01 and 02 link to their detail pages.
- `legacy-static/blog/index.html`: topic cards link to the four filter routes.

All new pages reuse the DIG-71 components (BaseLayout, PageHero,
SectionHeader, Card, CtaBand) so tokens, chrome, responsive behaviour, and
staging noindex handling stay identical site-wide.

## Verification results (local builds, 2026-10-18)

Build: `bash scripts/build-site.sh <dir>` — staging (`/website-relaunch`
prefix, noindex) and production (root, indexable) both pass, including the
whole-output local-reference check.

| # | Check | Result |
| --- | --- | --- |
| 1 | Build passes in staging and production modes; 15 pages built | PASS |
| 2 | `/faq/`, three service detail routes, four topic routes serve 200 under the staging prefix | PASS (browser) |
| 3 | Nav shows Home, Services, About, Blog, FAQ, Contact; current page marked with accent underline | PASS (browser) |
| 4 | FAQ accordion opens and closes; works without JavaScript; keyboard accessible | PASS (browser) |
| 5 | Raleway renders on the new pages (computed font check) | PASS (browser) |
| 6 | Production build: new pages indexable; thank-you keeps `noindex` | PASS |
| 7 | Sitemap excludes thank-you and privacy (DIG-71 filter); new pages included | PASS (build log) |
| 8 | CTA labels come from the approved list (conversion spec 2.5) | PASS |
| 9 | Services hub links to the two detail pages; blog topic cards link to the filters | PASS |
| 10 | WaaS modal: opens from "See what the plan covers", centred with the overlay scrim, closes on Close/backdrop/Escape | PASS (browser) |

Screenshot evidence: 21-astro-faq, 22-astro-faq-accordion, 23-astro-detail,
25-astro-waas-modal (delivered on the issue).

## Open items

1. **Enquiry form** — DIG-69 owns the form component (the contact page marks
   the slot). Conversion-spec 4.3 validation, the lead_pending write, and the
   thank-you two-signal firing (7.2) land with it. The client-side logic was
   built and browser-verified during this issue's first pass and is preserved
   in the branch history (`dig-72-pages-components`, `assets/site.js`) for
   DIG-69 to reuse.
2. **Paid advertising `need` value** — the form option list (spec 4.2) has no
   paid-advertising value; the page uses `quote`. Owner can extend the list.
3. **`legacy-static/` pages** — the pre-port blog and post pages keep their
   older 3-link chrome until DIG-73 ports them to Astro routes; the topic
   filter links are relative and survive the port.
4. **GA4 measurement ID** — still `TO FILL` in the DIG-65 IDs table; analytics
   stays dormant until a person sets it.
