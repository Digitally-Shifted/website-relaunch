# DIG-71 verification log — core page layouts

Recorded on 2026-10-18 by the DIG-71 implementation run. Each step below
was executed against the built site and the live staging URL.

| # | Step | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Clean install builds staging output | `npm ci` (209 packages) then `BUILD_ENV=staging bash scripts/build-site.sh site` → `Build OK` | PASS |
| 2 | Production build passes the same checks | `BUILD_ENV=production bash scripts/build-site.sh site-prod` → `Build OK`, no `/website-relaunch` prefix in output, `index, follow` robots | PASS |
| 3 | Staging build is noindex and base-prefixed | `noindex, nofollow` on every page; all links carry `/website-relaunch/` | PASS |
| 4 | Token utilities resolve to brand values | Built CSS: `.text-accent{color:var(--color-accent)}`, `:root --color-accent:#fd4000` from `tokens.css`; no restated hex values in component CSS | PASS |
| 5 | Raleway variable font serves as woff2 | `public/fonts/raleway-variable.woff2` (126 KB, `wght` 100–900), preloaded in every head, `font-display: swap` | PASS |
| 6 | Desktop render, all pages | Headless Chromium 1280px screenshots: home, services, about, contact, privacy, 404 — DS tokens, 900/300 display pairing, corner-cut panels, hairline cards | PASS |
| 7 | Mobile render at 375px | Hamburger replaces nav and header CTA; `display-xl` scales down one ramp step; cards stack; Call/WhatsApp bar fixed with reserved height | PASS |
| 8 | Mobile menu interaction (CDP, 14 checks) | open/close button state, `aria-expanded`, focus moves into menu, body scroll locks, Escape closes, focus returns to opener, Tab wraps inside menu, desktop hamburger hidden, skip link first | PASS |
| 9 | Canonical URLs and per-route robots | Production canonicals at root (`https://digitallyshifted.com/services`); thank-you and privacy `noindex` in production; sitemap excludes noindex routes | PASS |
| 10 | DIG-73 legacy content keeps serving | `legacy-static/` (blog index, 2023 guide post, content.css, 47 media files) copied into the output; `/blog/` and the post return 200 with their links resolving into the Astro routes (`/#hosting`, `/#seo` anchors exist) | PASS |
| 11 | Staging deploy of merge commit | Run `39156744591`, commit `531f2f8`, build+deploy jobs green | PASS |
| 12 | Staging URL serves the new build | `curl` shows `Deployed build: 531f2f8…`, `Environment: staging`; all 13 routes return 200 | PASS |
| 13 | Live staging renders at the project prefix | Headless screenshots of `https://digitally-shifted.github.io/website-relaunch/` (desktop home) and `/services/` (375px) | PASS |

## Known limits

- `astro check` does not support TypeScript 7 yet; the build and the
  browser checks are the gates until Astro ships support.
- Page copy is draft (`DRAFT COPY` markers in page files). DIG-63 owns
  final copy.
- The contact form slot is marked for DIG-69. DIG-73's generated contact
  page (with the spec §4 form markup) is kept in
  `docs/migration/generated/contact-index.html` for the port.
- Legacy blog pages keep their pre-port styling and their `noindex` meta;
  they leave the site noindex-free when ported to Astro routes.
