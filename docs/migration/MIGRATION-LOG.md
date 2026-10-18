# Migration log — DIG-73 (content migration from digitallyshifted.com)

Date: 2026-10-18 · Issue: DIG-73 · Inputs: `docs/CONTENT-INVENTORY.md` (DIG-52),
`docs/CONTENT-AUDIT.md` (DIG-51), crawl evidence `docs/audit-evidence/` +
`docs/migration/extracted/` (structured records for all 14 pages).

This log records what moved where, what changed on purpose, what was
preserved without publishing, and what still needs an owner decision.
Verification evidence: `docs/migration/VERIFICATION.md` (78 checks, 0 fail).

## 1. Source records

`docs/migration/extracted/` holds one JSON + one readable Markdown record per
crawled page (`000` = home, `001`–`003` = 2023 posts, `004`–`006` = 2024 promo
posts, `007` = blog index, `008`–`011` = category archives, `012` = contact,
`013` = privacy policy). Each record carries the meta title, meta
description, canonical, robots value, full heading tree, body blocks, images
with alt text, and (home only) the client carousel links and hero videos.
These records are the durable copy of the old content; the live old site is
not needed to redo or audit this migration.

Regenerate pages with `python3 docs/migration/tools/generate_pages.py`.
Re-verify with `python3 docs/migration/tools/verify_migration.py`.

## 2. Page-by-page mapping (inventory rows 1–14)

| Row | Old URL | Status | Where it lives now |
|---|---|---|---|
| 1 | `/` | Rewrite | Not migrated. Scaffold home kept. Issue: home rewrite (assets ready in `assets/media/`). Copy preserved in `extracted/000.*`. |
| 2 | `/contact-us/` | Keep | `contact/index.html`. Copy verbatim; title, H1, meta description preserved. New form per conversion spec §4. |
| 3 | `/blog/` | Keep | `blog/index.html`. H1 pipe suffix removed; title + meta description preserved; featured-guide slot; four topic blocks carry the category descriptions verbatim. |
| 4 | `/privacy-policy/` | Rewrite | Not migrated. `privacy/index.html` carries the conversion-spec §3.6 launch default. Old policy text preserved in `extracted/013.*`. Issue: POPIA rewrite + client sign-off. |
| 5 | `/2023/02/01/...trends/` | Rewrite | Not migrated. Title, description, and body preserved in `extracted/001.*`. Issue: refresh to current year. |
| 6 | `/2023/02/02/...effectiveness/` | Rewrite | Not migrated. Preserved in `extracted/002.*`. Issue: light rewrite (~800 words, local example, end CTA). |
| 7 | `/2023/02/09/...guide/` | Keep | `2023/02/09/ultimate-digital-marketing-guide-for-businesses/index.html`. Full text migrated; URL, title, description, canonical preserved; 57-link TOC; tags kept; 2 internal links added to `/services/`. Follow-ups: statistics sources, author, content-upgrade CTA (issues). |
| 8 | `/2024/07/04/...domain-and-hosting/` | Merge | Merged into `services/index.html` §02 Hosting and management (domains: extensions + WHOIS privacy; hosting: LiteSpeed/TTFB, scalability, Imunify360, SpamExperts, 24/7 support). Two unverified statistics excluded (see §4). URL becomes a 301 after launch (DIG-18). |
| 9 | `/2024/07/15/...paid-advertising/` | Merge | No target section exists in the new service IA (see §3.1). Full text preserved in `extracted/005.*`; not published. Issue: placement decision + 301. |
| 10 | `/2024/08/12/...website-development/` | Merge | Merged into `services/index.html` §01 Website design and development (all five "why choose" points verbatim). Off-topic thumbnail not reused (audit flag); URL becomes a 301 (DIG-18). |
| 11–14 | `/category/...` (4 archives) | Merge | Descriptions kept verbatim as topic blocks on `blog/index.html` (`#digital-marketing`, `#hosting-domains`, `#paid-advertising`, `#website-development`). No new URLs, so no 301s needed. Duplicate blog title resolved (only `/blog/` carries it now). |

## 3. Decisions and deviations (all intentional, all recorded)

### 3.1 New service IA (conversion spec §3.2) supersedes the old 8-card list

The approved conversion spec (DIG-66) defines four services: website design
and development; hosting and management; WaaS; SEO. The old home page listed
eight services. Mapping of old service mentions:

| Old service (home card / contact form) | New home |
|---|---|
| Website Development | §01 Website design and development |
| Domains & Hosting | §02 Hosting and management |
| (new) | §03 WaaS (spec copy; prices only from the copy task) |
| Search Engine Optimization (SEO) | §04 SEO |
| Marketing Plan & Execution | none — preserved in this log and `extracted/000.*` |
| Paid Advertising | none — issue open (placement or retirement) |
| Social Media & PR | none — preserved in records |
| Brand & Content Creation | none — preserved in records |
| Software Development | none — preserved in records |
| Machine Learning & AI | none — preserved in records |

The old contact form's 9-option service list is replaced by the spec's
" What do you need?" select (7 options). The old list is preserved in
`extracted/012.json` and checked by the verifier.

### 3.2 Contact details follow the approved conversion spec §2.2

Email on the new contact page and footer is `baruch@digitallyshifted.com`
(brand-book verified details). The old site showed
`sales@digitallyshifted.com`; the privacy rewrite must not reintroduce the
old `info@`/`sales@` mix. Phone and WhatsApp are unchanged
(+27 63 171 8750).

### 3.3 Consent: line, not checkbox

The inventory asked for a POPIA consent checkbox. The approved conversion
spec §4.6 (newer, owner-approved) specifies a consent line linking to
`/privacy` and states "no checkbox, no tracking consent gate at launch".
The spec wins; the privacy rewrite issue carries the POPIA wording.

### 3.4 Blog features deferred or dropped

- Search box: the old WordPress search has no static-site equivalent. The
  framework work (DIG-71/72) can add search; not faked here.
- Subscribe slot: conflicts with the approved "exactly one form" rule
  (conversion spec §4). Owner decides: newsletter capture needs a change to
  that rule or a landing-page pattern.
- Comments: not migrated (1 generic comment on the trends post; audit judged
  it valueless; static site has no comment system).

### 3.5 Statistics handling

- Hosting post (row 8): the Google "32% bounce" and Symantec "one in
  thirteen" claims are excluded from the services page until verified.
  Both are preserved verbatim in `extracted/004.*`; an issue asks for
  verification or removal.
- Pillar guide (row 7): statistics sections with parenthesised sources
  (Statista, BrightLocal, Sprout Social, Retailing Today) migrated as-is;
  issue open to add source links / refresh figures.

### 3.6 Staging SEO guards

Every migrated page ships `noindex` and a canonical pointing at its
production URL (`https://digitallyshifted.com/...`). DIG-20 (go-live) must
remove the `noindex` metas, add a production `robots.txt` and `sitemap.xml`,
and confirm the canonicals.

## 4. Media migration (89 unique old files → 47 assets)

Downloaded the largest variant of every unique upload referenced by the 14
pages. `assets/media/` keeps the original base names; photographic JPEG/PNG
files were converted to WebP (max 1600 px, quality 82); logos with
transparency, existing WebP illustrations and both videos are untouched.

| Asset | Old file | New file | Use |
|---|---|---|---|
| Guide/contact photo | `pexels-ketut-subiyanto-4350093.jpg` | `.webp` | blog card, guide, contact |
| Hosting photo | `pexels-brett-sayles-1597776.jpg` | `.webp` | services §02 |
| Website illustration | `websites.webp` | unchanged | services §01 |
| Digital illustration | `digital.webp` | unchanged | services §03 |
| Marketing illustration | `marketing.webp` | unchanged | services §04 |
| Ads artwork | `Advertising.png` | `.webp` | library (row 9 decision) |
| Web-dev thumbnail | `Untitled-design-7.png` | `.webp` | library only (off-topic alt; audit says swap) |
| Trends image | `AI-Trends-2023.jpg` | `.webp` | library; old page had empty alt — rewrite issue assigns one |
| Analytics image | `Analytics.jpg` | `.webp` | library; alt preserved in record |
| Client logos (24) | `Digitally-Shifted-Clients-Logos-01..24.png` | unchanged | library; home rewrite needs permission check |
| Hero videos + posters | `Digitally-Shifted-Ad.mp4`, `Digitally-Shifted-Ad-9x16-1.mp4`, `Video-Banner.jpg`, `Phonebanner.jpg` | videos unchanged; posters `.webp` | library; home rewrite |
| Banners | `Home-page-banner.jpg`, `Facebook-Banner.jpg` | `.webp` | OG images (home rewrite; general fallback) |
| Brand marks | `Digitally-Shifted-Logo-White.png`, `logo-e1659285869632.png`, `scroll.png`, `Artboard-10.jpg` | unchanged | library; favicon uses `Artboard-10.webp` |
| Extra illustrations | `software.webp`, `hosting.webp`, `ml.webp` | unchanged | library |
| Home photo | `pexels-magnus-mueller-2818118.jpg` | `.webp` | library |

Not downloaded: the LiteSpeed avatar cache file (a Gravatar copy, not site
content). Known old-site media defects stay attached to their owners: empty
alt on `AI-Trends-2023` (row 5 issue) and the off-topic web-dev thumbnail
(row 10 / services page uses the audit-recommended replacement approach).

## 5. Handoff to other issues

- **DIG-18 (redirect map):** add 301s for rows 8, 9, 10 after launch;
  rows 11–14 need no redirects (descriptions moved onto `/blog/`, old
  category URLs may keep resolving independently until the map lands —
  decide whether to keep or 301 them).
- **DIG-20 (go-live):** remove staging `noindex`, add production
  `robots.txt` + `sitemap.xml`, wire the form endpoint (`POST /api/contact`,
  303 → `/contact/thank-you/`), confirm canonicals.
- **DIG-63 (copy):** home rewrite inputs, WaaS section wording (prices),
  about/FAQ/testimonial pages, guide author byline + content-upgrade CTA.
- **DIG-69/71/72 (framework):** form validation and submit handling per
  conversion spec §4.3–4.4; styling migration from `assets/content.css` to
  the component library; optional blog search.

## 6. Issues created by this migration

- **DIG-79** (Critical): home page rewrite — copy expansion, 8→4 service
  card wiring, client-logo permission check, hero videos.
- **DIG-80** (Critical): privacy policy rewrite — POPIA-aware text, client
  sign-off, keep `noindex`.
- **DIG-81** (High): trends post rewrite — refresh to current year with
  local examples; fallback drop + 301 to `/blog/`.
- **DIG-82** (High): ROI post light rewrite — ~800 words, South African SME
  example, end CTA.
- **DIG-83** (High): Paid Advertising content decision — placement or
  retirement; 301 for row 9; feeds DIG-18.
- **DIG-84** (High): statistics verification — hosting post's
  Google/Symantec claims, guide source links.
- **DIG-85** (Low): pillar guide content upgrades — author byline,
  content-upgrade CTA.

## 5. Redirect map (DIG-89, 2026-10-18)

Every old URL now has a defined destination. Source of truth:
`docs/migration/redirect-map.json`; decisions and regeneration steps:
`docs/migration/REDIRECTS.md`; the build writes `.htaccess` into every output
and `docs/migration/tools/test_redirects.py` verifies it locally (117/117
cases, 0 orphans over 145 recorded old URLs).

Updates to this log's rows:

- Rows 5 and 6 (2023 posts, REWRITE pending): interim 301 to `/blog/`.
  Update the map rows when the rewrites publish (DIG-81, DIG-82).
- Row 9 (paid advertising post): 301 to `/services/paid-advertising/`
  (the service page exists since DIG-72; closes this log's open placement
  question for the redirect itself, DIG-83 still owns the content decision).
- Rows 11–14 (category archives): this log said "no 301s needed" because the
  descriptions moved into the blog index. DIG-72 then added real topic pages,
  so the four category URLs now 301 to `/blog/<topic>/` — the stronger
  outcome the audit's "301 to the new slugs" option described.
- Media (section 4): upload URLs only 301 while the file ships in the deploy
  output (DIG-90 prune); the rest return 410 until a page reuses the asset.
