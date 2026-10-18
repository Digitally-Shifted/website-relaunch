# Content Inventory — digitallyshifted.com

Issue: DIG-52 (Website Relaunch project)
Inventory date: 2026-10-18
Inputs: `docs/CONTENT-AUDIT.md` (DIG-51), `docs/SITE-AUDIT.md` (DIG-54), `docs/audit-evidence/analysis.json` (crawl evidence, 2026-10-18)
Scope: all 14 public pages of the live site, all HTTP 200
Feeds: DIG-17 (migration), DIG-18 (redirect map), DIG-55 (design spec)

## 1. How to read this inventory

- **Words** is visible main-content body text after removal of shared navigation and footer. Crawl tolerance is ±5 percent.
- **Images** counts `<img>` elements in the rendered desktop DOM. This count includes logos, icons, and repeated template images.
- **Last updated** uses the `og:updated_time` tag. Archive pages do not carry this tag. Post publish dates come from the URL path.
- **Status** is the keep / rewrite / merge / drop verdict from the DIG-51 content audit. No page earned a drop verdict.
- **Owner** identifies who published the page. The site has no named author bylines. `DS` means Digitally Shifted.
- **Priority** orders migration work. Critical covers the homepage, key landing pages, and the legal page that gates launch. Secondary pages carry SEO value or supporting content.

## 2. Page inventory (14 pages)

| # | URL | Title | Type | Words | Images | Last updated | Status | Owner | Priority | Migration notes |
|---|-----|-------|------|------:|-------:|--------------|--------|-------|----------|-----------------|
| 1 | `/` | Digital Marketing Agency South Africa \| Digitally Shifted | One-page home + service hub | ~577 | 17 | 2026-05-22 | Rewrite | DS admin (`admin_5lxv3f6v`) | **Critical** | Keep the IA concept, 24 client logos, and both hero ad videos. Expand the thin copy. Wire the 8 service cards to new service pages. |
| 2 | `/contact-us/` | Contact Digitally Shifted \| Digital Marketing Agency SA | Contact page with form | ~113 | 2 | 2026-05-22 | Keep | DS admin (`admin_5lxv3f6v`) | **Critical** | Primary conversion point. Add address and trading hours. Add a POPIA consent checkbox. Align the form service list with the new service IA. |
| 3 | `/blog/` | Digital Marketing Insights \| Digitally Shifted | Blog index | ~383 | 8 | — (template; newest post 2024-08-12) | Keep | DS admin (`admin_5lxv3f6v`) | **Critical** | Key nav hub. Fix the duplicate title and the pipe suffix in the H1. Add featured-post and subscribe slots. Restart publishing. |
| 4 | `/privacy-policy/` | Privacy Policy and Terms \| Digitally Shifted | Legal (Privacy + Terms) | ~1137 | 2 | 2026-05-22 | Rewrite | DS admin (`admin_5lxv3f6v`) | **Critical** | Launch gate, not a marketing page. Replace WordPress boilerplate with a POPIA-aware policy. Keep `noindex`. Align `info@` to `sales@`. Client sign-off required before publish. |
| 5 | `/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/` | 2023 Digital Marketing Trends \| Digitally Shifted | Blog post (listicle) | ~973 | 4 | 2026-05-22 (published 2023-02-01) | Rewrite | DS admin (`admin_5lxv3f6v`) | Secondary | Refresh into a current-year trends article with local examples. Fallback: drop and 301 to `/blog/`. Featured image needs alt text. |
| 6 | `/2023/02/02/how-to-evaluate-the-effectiveness-of-your-digital-marketing-efforts/` | Measure Digital Marketing ROI \| Digitally Shifted | Blog post (how-to) | ~418 | 3 | 2026-05-22 (published 2023-02-02) | Rewrite | DS admin (`admin_5lxv3f6v`) | Secondary | Light rewrite. Expand to ~800 words with a South African SME example and an end-of-post CTA. |
| 7 | `/2023/02/09/ultimate-digital-marketing-guide-for-businesses/` | Digital Marketing Guide \| Digitally Shifted | Blog post (pillar guide) | ~5833 | 3 | 2026-05-22 (published 2023-02-09) | Keep | DS admin (`admin_5lxv3f6v`) | Secondary | Strongest SEO asset on the site. Refresh statistics. Add internal links to new service pages. Add an author and a content-upgrade CTA. |
| 8 | `/2024/07/04/unlock-your-online-potential-with-digitally-shifted-expert-domain-and-hosting-services/` | Domain and Hosting Services \| Digitally Shifted | Blog post (service promo) | ~588 | 3 | 2026-05-22 (published 2024-07-04) | Merge | DS admin (`admin_5lxv3f6v`) | Secondary | Merge source for the new Domains & Hosting service page. Verify two unattributed statistics first. 301 this URL after the merge. |
| 9 | `/2024/07/15/maximizing-roi-with-precision-explore-paid-advertising-with-digitally-shifted/` | Paid Advertising Management \| Digitally Shifted | Blog post (service promo) | ~440 | 3 | 2026-05-22 (published 2024-07-15) | Merge | DS admin (`admin_5lxv3f6v`) | Secondary | Merge source for the new Paid Advertising service page. Add proof (results, packages) during the merge. 301 this URL after the merge. |
| 10 | `/2024/08/12/elevate-your-online-presence-professional-website-development-at-digitally-shifted/` | Website Development Services \| Digitally Shifted | Blog post (service promo) | ~441 | 3 | 2026-05-22 (published 2024-08-12) | Merge | DS admin (`admin_5lxv3f6v`) | Secondary | Merge source for the new Website Development service page. Swap the off-topic thumbnail image. 301 this URL after the merge. |
| 11 | `/category/digital-marketing/` | Digital Marketing Insights \| Digitally Shifted | Category archive (3 posts) | ~296 | 8 | — (template) | Merge | DS admin (`admin_5lxv3f6v`) | Secondary | Keep the category description verbatim as a blog topic filter. Duplicate blog-index title must not survive. 301 if the slug changes. |
| 12 | `/category/hosting-domains/` | Hosting and Domain Guides \| Digitally Shifted | Category archive (1 post) | ~159 | 8 | — (template) | Merge | DS admin (`admin_5lxv3f6v`) | Secondary | Keep the description verbatim as a blog topic filter. 301 if the slug changes. |
| 13 | `/category/paid-advertising/` | Paid Advertising Insights \| Digitally Shifted | Category archive (1 post) | ~148 | 8 | — (template) | Merge | DS admin (`admin_5lxv3f6v`) | Secondary | Keep the description verbatim as a blog topic filter. 301 if the slug changes. |
| 14 | `/category/website-development/` | Website Development Insights \| Digitally Shifted | Category archive (1 post) | ~146 | 8 | — (template) | Merge | DS admin (`admin_5lxv3f6v`) | Secondary | Keep the description verbatim as a blog topic filter. 301 if the slug changes. |

### Totals and status summary

- Pages: 14. Total body words: ~11,650 (approximate, ±5 percent). Total `<img>` occurrences: 80. Unique media files on the site: 89.
- Status: Keep 3, Rewrite 4, Merge 7, Drop 0.
- Priority: Critical 4 (rows 1–4), Secondary 10.

### Owner notes

- One WordPress admin account (`admin_5lxv3f6v`, user ID 1) published every page and post. The account name is exposed through the public `/wp-json/wp/v2/users` endpoint (see `docs/SITE-AUDIT.md` section 7).
- No named author bylines exist anywhere. The relaunch should add authors to posts for E-E-A-T.
- Client logos (24 files) and outbound client links are third-party assets. Confirm current clients and permissions before re-publishing the proof strip.

## 3. New pages the relaunch requires (not existing URLs)

The inventory covers existing pages only. The DIG-51 audit found these content gaps. New pages must exist before their related migration steps finish.

| New page | Priority | Content source |
|----------|----------|----------------|
| Service pages for the 8 home-page services (at minimum: Website Development, Paid Advertising, Domains & Hosting) | **Critical** | Home service cards plus the three 2024 service-promo posts (rows 8–10) |
| About / Team | Secondary | New content; add company registration details removed from the legal rewrite |
| Testimonials / case studies with named results | Secondary | New content; use the 20 outbound client links as the starting list |
| FAQ | Secondary | Candidate questions: pricing, process, timelines, POPIA, hosting |
| Newsletter / lead-magnet capture | Secondary | New component; the pillar guide (row 7) is the natural content upgrade |

## 4. Redirect implications for DIG-18

- Certain 301s: rows 8, 9, and 10 (three service-promo posts) after their merge into new service pages.
- Possible 301s: rows 11–14 (category archives) if the new blog IA changes topic slugs.
- Row 5 has a conditional path: drop-and-301 to `/blog/` if the client declines a refresh.
- All other URLs survive the relaunch unchanged.

## 5. Media summary (from DIG-51 audit, section 3)

- 89 unique files. All are reusable except two small repairs: the AI-Trends-2023 featured image needs alt text, and the web-development post thumbnail should change to an on-topic image.
- The desktop and mobile hero ad videos migrate as-is. The 24 client logos are reusable pending permission checks.

## 6. Handoffs

- **DIG-17 (migration):** this table is the per-URL work list. Migrate Critical rows first (1–4).
- **DIG-18 (redirect map):** use section 4.
- **DIG-55 (design spec):** the new-page table in section 3 defines required templates. The contact page copy and the 2024 category descriptions are the calibration standard for the new brand voice.
