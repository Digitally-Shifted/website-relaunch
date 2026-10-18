# URL redirect map — DIG-89

Every old `digitallyshifted.com` URL has a defined destination in the new
site. This document explains the map, the decisions behind it, and how to
regenerate and test the redirect configuration.

- Source of truth: `docs/migration/redirect-map.json`
- Generator: `docs/migration/tools/generate_redirects.py`
- Test: `docs/migration/tools/test_redirects.py`
- Latest evidence: `docs/migration/redirect-test-results.md`
- Evidence inputs: `docs/audit-evidence/` (14-page crawl, sitemaps, host
  checks), `docs/migration/extracted/` (all internal links of the old pages),
  `docs/migration/media-manifest.json` (47 migrated uploads),
  `docs/CONTENT-AUDIT.md` (page decisions), `docs/migration/MIGRATION-LOG.md`

## Platform

| Environment | Host | Redirect handling |
| --- | --- | --- |
| Production | LiteSpeed at dshost.co.za (Plesk), same host as the old WordPress site | `build-site.sh` writes `.htaccess` into the build output. Upload it with the site at go-live (DIG-20). |
| Staging | GitHub Pages project hosting | GitHub Pages cannot execute `.htaccess`. The file ships inert; staging routes serve directly under `/website-relaunch`. |

The old host already forced `http://`, `http://www` and `https://www` onto
`https://digitallyshifted.com` (recorded in
`docs/audit-evidence/final-checks.json`). The generated `.htaccess` keeps that
behaviour. Host rules stay off while the site builds under a base path.

## Page map (the 14 crawled pages)

| Old URL | Response | Target | Why |
| --- | --- | --- | --- |
| `/` | serves as-is | — | Same URL; Astro home (content rewrite is DIG-63). |
| `/contact-us/` | 301 | `/contact/` | Page moved to the new IA route. |
| `/privacy-policy/` | 301 | `/privacy/` | Page moved; POPIA rewrite is a separate content issue. |
| `/blog/` | serves as-is | — | Same URL; served from `legacy-static/` until ported. |
| `/2023/02/01/…top-digital-marketing-trends/` | 301 | `/blog/` | Interim: the post is pending a year refresh, not removed. Update the row when the rewrite publishes. |
| `/2023/02/02/…effectiveness…/` | 301 | `/blog/` | Interim: post pending a light rewrite. Update on publish. |
| `/2023/02/09/ultimate-digital-marketing-guide-for-businesses/` | serves as-is | — | Pillar guide keeps its exact URL (migration log row 7). |
| `/2024/07/04/…domain-and-hosting-services/` | 301 | `/services/domains-hosting/` | Content merged into the service page (rows 8; audit 2.8). |
| `/2024/07/15/…paid-advertising…/` | 301 | `/services/paid-advertising/` | Content merged into the service page (row 9; audit 2.9). |
| `/2024/08/12/…website-development…/` | 301 | `/services/website-development/` | Content merged into the service page (row 10; audit 2.10). |
| `/category/<topic>/` (4) | 301 | `/blog/<topic>/` | Category archives became the blog topic pages; descriptions carried over verbatim (rows 11–14). |

No crawled content page qualifies for 410 Gone. Every page has a recorded
KEEP, REWRITE or MERGE decision, and a REWRITE page must not tell search
engines that it is gone forever. The two interim `/blog/` rows flip to their
final URLs when the rewrites publish; if the owner later chooses the audit's
"drop" option for a post, change that row's status to 410 and regenerate.

## 410 Gone (intentionally removed)

WordPress infrastructure goes away with WordPress:

- Feeds: `/feed/`, `/comments/feed/`, per-post comment feeds
- System: `/wp-admin/`, `/wp-login.php`, `/xmlrpc.php`, `/wp-json/` (all
  sub-routes), `/wp-cron.php`, `/readme.html`
- Asset trees: `/wp-includes/`, `/wp-content/plugins/`, `/wp-content/themes/`,
  `/wp-content/litespeed/`, `/wp-content/cache/`, `/wp-content/upgrade/`
- Archives: `/author/*`, date archives (`/2023/`, `/2023/02/`), `/page/N/`
- Old upload files that do not ship in the deploy output (see media section)
- Any unknown date-permalink post URL (`/YYYY/MM/DD/…`) — the six known posts
  have exact rules above; nothing else comes back

The old site answered 200 on `/wp-json/`, `/wp-login.php` and
`/readme.html`; the 410s remove those endpoints for good.

## Pattern redirects (structural changes)

| Pattern | Response | Target |
| --- | --- | --- |
| `/category/<slug>/` (unknown slugs) | 301 | `/blog/` — never into a 404 |
| `/tag/<slug>/` (69 URLs linked from old posts) | 301 | `/blog/` |
| Query URLs `?p=`, `?page_id=`, `?cat=`, `?s=`, `?attachment_id=` | 301 | `/blog/` |

Tag and query targets go to the blog hub because the new IA has no per-tag
or numeric-ID equivalents. Guard conditions (`!-f`, `!-d`) keep every rule
from overriding a file that really exists, so same-URL pages stay safe.
Explicit rules always run before the patterns.

## Media (`/wp-content/uploads/…`)

All 47 migrated upload files are known by name from
`docs/migration/media-manifest.json`. `scripts/build-site.sh` prunes media
that no deploy page references (DIG-90), so the generator emits a 301 only
for files that ship in the build output — currently 3 (`Analytics.webp`,
`Artboard-10.webp`, `pexels-ketut-subiyanto-4350093.webp`). Every other old
upload URL returns 410 until a page that reuses the asset ships and the file
re-enters the output; then the same build regenerates the 301 automatically.

## Regenerate and test

```sh
# Regenerate the file alone (what the build does):
python3 docs/migration/tools/generate_redirects.py --out /tmp/.htaccess

# Full local end-to-end test: builds the site, serves it through an engine
# that executes the generated .htaccess, requests every mapped URL, checks
# every 301 target exists, and proves no recorded old URL is orphaned.
python3 docs/migration/tools/test_redirects.py
```

The test writes `docs/migration/redirect-test-results.md`. Latest run:
117/117 request cases pass, 0 orphans over 145 distinct recorded old URLs,
0 redirect targets missing, media 3 x 301 and 44 x 410.

The local engine executes the same mod_rewrite subset LiteSpeed runs
(`R=301`/`G`/`L`/`QSA`/`NC`; the `HTTPS`, `HTTP_HOST`, `QUERY_STRING` and
`REQUEST_FILENAME` conditions). One step remains host-side and belongs to the
DIG-20 go-live checklist: upload `.htaccess` with the release, then spot-check
with curl against the live host (one page move, one tag, one 410, and the
`http`/`www` canonicalization).
