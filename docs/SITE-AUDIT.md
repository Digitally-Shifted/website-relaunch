# Technical Site Audit — digitallyshifted.com

- Issue: DIG-54 (Website Relaunch project)
- Audit date: 2026-10-18
- Method: real-browser crawl (Chromium through the site's bot-protection layer). 14 unique URLs crawled. Machine-readable evidence and crawl scripts are in `docs/audit-evidence/`.

## 1. Summary

| Area | Result |
| --- | --- |
| Site size | 14 URLs, all HTTP 200 |
| CMS | WordPress 7.1.3 |
| Page builder | Elementor 4.3.5 + Elementor Pro |
| Theme | Hello Elementor |
| SEO plugin | Rank Math |
| Caching | LiteSpeed Cache (LSCache, hit) |
| Server | LiteSpeed, PHP 8.1.34 |
| Host | dshost.co.za (mars.dshost.co.za, 102.130.127.122, South Africa) |
| Edge protection | openresty proxy with a BitNinja-style JS challenge |
| Analytics | GA4 G-FL50ZZW66J, Google Ads AW-10906621784, Meta Pixel 181740028034184 |
| Main gaps | No service pages, stale blog, no security headers, WordPress endpoints exposed |

The site is small and fast. The stack is current. The relaunch must fix information architecture, blog freshness, and endpoint hardening.

## 2. Page inventory

All 14 URLs returned HTTP 200. Redirect tests: `http://`, `http://www`, and `https://www` all land on `https://digitallyshifted.com/`. One canonical host exists.

| URL | Type | Status | Notes |
| --- | --- | --- | --- |
| `/` | Homepage | 200 | 230 KB HTML, 17 images, 35 scripts |
| `/blog/` | Blog index | 200 | Lists 6 posts |
| `/contact-us/` | Contact | 200 | Form + WhatsApp CTA |
| `/privacy-policy/` | Legal | 200 | No canonical tag |
| `/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/` | Blog post | 200 | |
| `/2023/02/02/how-to-evaluate-the-effectiveness-of-your-digital-marketing-efforts/` | Blog post | 200 | |
| `/2023/02/09/ultimate-digital-marketing-guide-for-businesses/` | Blog post | 200 | |
| `/2024/07/04/unlock-your-online-potential-with-digitally-shifted-expert-domain-and-hosting-services/` | Blog post | 200 | |
| `/2024/07/15/maximizing-roi-with-precision-explore-paid-advertising-with-digitally-shifted/` | Blog post | 200 | |
| `/2024/08/12/elevate-your-online-presence-professional-website-development-at-digitally-shifted/` | Blog post | 200 | Newest post |
| `/category/digital-marketing/` | Category | 200 | |
| `/category/hosting-domains/` | Category | 200 | |
| `/category/paid-advertising/` | Category | 200 | |
| `/category/website-development/` | Category | 200 | |

Unknown URLs return a true HTTP 404 (not a soft 404).

## 3. Navigation structure

Main menu: `HOME`, `OUR SERVICES`, `BLOG`, `CONTACT US`, `CHAT NOW`.

- `OUR SERVICES` links to the homepage anchor `/#services`. The site has no dedicated service pages. SEO and lead capture both lose this surface.
- `CHAT NOW` links to `https://wa.me/+27631718750`. WhatsApp is the primary chat channel. No chat widget is installed.
- Footer: `sales@digitallyshifted.com`, copyright, `Privacy Policy`, Facebook, LinkedIn, WhatsApp, phone, email.
- External links in the homepage content point to client sites (about 20 domains, for example `bolandmotorgroup.co.za`, `shriveslaw.co.za`). These act as a portfolio with no dedicated case-study pages.

## 4. Tech stack and hosting

| Layer | Finding |
| --- | --- |
| Origin server | LiteSpeed, `x-turbo-charged-by: LiteSpeed`, HTTP/3 advertised, Brotli (`content-encoding: br`) |
| Edge | openresty 1.31.1.1 in front of the origin, serves a JS bot challenge ("One moment, please...", `wsidchk` cookie) to non-browser clients |
| PHP | 8.1.34 (`x-powered-by` exposed) |
| WordPress | 7.1.3 (generator meta exposed) |
| Plugins detected | Elementor, Elementor Pro, LiteSpeed Cache, Rank Math SEO, MonsterInsights (`google-analytics-premium`) |
| Theme | Hello Elementor |
| Server management | Plesk WordPress Toolkit (`wp-toolkit/api` REST namespace) |
| Site operations | Novamira (`novamira/v1`, `novamira-visual/v1` REST namespaces) |
| DNS | ns1/ns2.dshost.co.za, A record 102.130.127.122, `www` is a CNAME to the apex |
| rDNS | mars.dshost.co.za |
| Mail | SpamExperts (mx1–mx4-za.spamexperts.com) |
| TLS | Let's Encrypt, valid 2026-08-24 to 2026-11-22 |
| CDN | None in front. No Cloudflare, no edge cache for HTML |

Asset pipeline: LiteSpeed Cache combines and hashes JS and CSS (`/wp-content/litespeed/js/<hash>.js`, `css/<hash>.css`), and lazy-loads Elementor background images. Repeat requests served from LSCache in about 55–75 ms.

Crawl note: automated tools get a challenge page unless they run real JavaScript. Any future monitoring or migration tooling must use a browser context or an allowlisted client.

## 5. SEO baseline

### 5.1 Positive

- Every page has exactly one `h1`.
- Every image has alt text (0 images without alt on all 14 pages).
- Every page has a unique title and meta description.
- Canonical URLs on 13 of 14 pages (only `/privacy-policy/` has none).
- `robots.txt` is standard: `Disallow: /wp-admin/`, `Allow: /wp-admin/admin-ajax.php`, and points to the sitemap.
- Rank Math sitemap index at `/sitemap_index.xml` (also served at `/sitemap.xml`): 7 posts, 2 pages, 4 categories.
- Structured data (JSON-LD): homepage has `Place`, `ProfessionalService`/`Organization`, `WebSite`, `WebPage`, `Service`. Posts add `BlogPosting` + `Person`. Blog index has `CollectionPage`. Contact page has `ContactPage`.
- Open Graph tags complete on the homepage (type, title, description, url, image).
- Meta robots on all pages: `follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large`.

### 5.2 Gaps and risks

- No service pages exist. "Services" live only in a homepage section. This is the largest SEO gap for an agency site.
- Blog is stale: newest post is 2024-08-12 (about 14 months old at audit time).
- `/category/digital-marketing/` reuses the blog index title "Digital Marketing Insights". Category pages are indexable and near-duplicate the blog index.
- Post URLs are long and date-prefixed. Keep for existing pages under a redirect plan; use short slugs for new content.
- `/favicon.ico` returns 404. Icons are JPG uploads from 2022 (`Artboard-10.jpg`). No modern SVG/PNG icon set or manifest.

## 6. Analytics and tracking

| Tracker | ID | Loader |
| --- | --- | --- |
| Google Analytics 4 | `G-FL50ZZW66J` | MonsterInsights, script served from `/wp-content/uploads/monsterinsights/gtag/gtag.js` (first-party path) |
| Google Ads | `AW-10906621784` | Same gtag.js load |
| Meta (Facebook) Pixel | `181740028034184` | `connect.facebook.net/en_US/fbevents.js` |

- MonsterInsights adds scroll-depth tracking and click-conversion link tracking (`data-mi-conversion-event`).
- No Google Tag Manager container. No Clarity, Hotjar, Tawk.to, or other trackers.
- Primary conversion action is the WhatsApp deep link (`wa.me/+27631718750`), used in the header CTA and contact page.

Relaunch note: carry over the GA4 property, the Ads tag, and the Pixel. Plan consent management: the site loads GA and Meta Pixel with no cookie banner or consent gate.

## 7. Security and hardening findings

The bot shield at the edge filters generic scanners, but these items are visible to any browser client:

1. `/wp-json/wp/v2/users` returns user data. It leaks user id 1 and the author slug `admin_5lxv3f6v`, which exposes the author archive path.
2. `/wp-login.php` is reachable (HTTP 200) with no rate-limit gate observed.
3. `/xmlrpc.php` exists (HTTP 405 on GET, POST available).
4. `/readme.html` is reachable (HTTP 200) and discloses the WordPress version.
5. Generator meta tags disclose WordPress 7.1.3 and Elementor 4.3.5.
6. `x-powered-by: PHP/8.1.34` is sent on every response.
7. No security headers observed: no `Strict-Transport-Security`, no `Content-Security-Policy`, no `X-Frame-Options`, no `X-Content-Type-Options`, no `Referrer-Policy`.

None of these are emergencies on their own. Together they ease target mapping for attackers. Fix them in the relaunch: disable author enumerations, gate or move `xmlrpc.php`, add the missing headers, and strip version disclosures.

## 8. Recommendations for the relaunch

Priority order:

1. Build real service pages (one per service) and point `OUR SERVICES` at them.
2. Publish a content plan that restarts the blog; keep the 6 existing posts with redirects.
3. Decide the category model: either differentiate category pages from `/blog/` or `noindex` them.
4. Add the missing security headers and remove version disclosures (items 1–7 in section 7).
5. Replace the 2022 JPG favicon set with a full modern icon set (SVG, PNG, ICO, web manifest).
6. Add consent management before GA4/Pixel loads, or confirm the lawful-basis route with the client.
7. Keep the stack that works: WordPress, Elementor, Rank Math, LSCache, LiteSpeed hosting all performed well.
8. Plan migration tooling around the bot shield: browser-context crawls or an allowlisted source for the new site's monitoring.

## 9. Evidence

Machine-readable evidence and the exact crawl scripts live in `docs/audit-evidence/`:

- `manifest.json` — every crawled URL with status, byte size, and fetch method
- `analysis.json` — per-page title, meta, canonical, JSON-LD types, headings, image/script counts, tracker hits
- `sitemaps.json`, `urls.json`, `robots.txt`, sitemap XML files
- `home-headers.json` — origin response headers
- `final-checks.json` — redirects, 404 behavior, endpoint statuses, security headers, timing
- `scripts/` — the Playwright crawl and analysis programs used, so the audit is repeatable

Crawl configuration: Chromium (Playwright), viewport 1440×900, desktop user agent, 400 ms delay between requests, 2026-10-18.
