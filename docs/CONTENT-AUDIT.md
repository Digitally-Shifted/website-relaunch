# Content Audit — digitallyshifted.com

Issue: DIG-51 (Website Relaunch project)
Audit date: 2026-10-18
Auditor: Senior Developer agent (content audit for redesign input)
Status: Complete — feeds DIG-52 (content inventory), DIG-55 (design spec), DIG-17 (migration), DIG-18 (redirect map)

## 1. Scope and method

- Crawled every public page of `https://digitallyshifted.com`.
- URL sources: `robots.txt`, `sitemap_index.xml`, page/post/category sitemaps, and link extraction from every crawled page.
- Full DOM capture of all 14 unique pages with a real headless Chromium session (the site sits behind an Imunify360-style browser check, `wssplashchk` cookie; plain HTTP clients receive a "One moment, please..." interstitial).
- Extracted per page: title, meta description, robots, canonical, Open Graph/Twitter tags, JSON-LD, heading tree, visible copy, forms, images with alt text, media files, links, word counts.
- Word counts below are body words: visible main-content words after removing the shared navigation, sticky bars, and footer (approximate, ±5%).

### Confirmed page inventory (14 pages, all HTTP 200)

| # | URL | Type | Body words |
|---|-----|------|-----------|
| 1 | `/` (home) | One-page home + service hub | ~577 |
| 2 | `/contact-us/` | Contact page with form | ~113 |
| 3 | `/blog/` | Blog index | ~383 |
| 4 | `/privacy-policy/` | Legal (Privacy + Terms combined) | ~1137 |
| 5 | `/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/` | Blog post (listicle) | ~973 |
| 6 | `/2023/02/02/how-to-evaluate-the-effectiveness-of-your-digital-marketing-efforts/` | Blog post (how-to) | ~418 |
| 7 | `/2023/02/09/ultimate-digital-marketing-guide-for-businesses/` | Blog post (pillar guide) | ~5833 |
| 8 | `/2024/07/04/unlock-your-online-potential-with-digitally-shifted-expert-domain-and-hosting-services/` | Blog post (service promo) | ~588 |
| 9 | `/2024/07/15/maximizing-roi-with-precision-explore-paid-advertising-with-digitally-shifted/` | Blog post (service promo) | ~440 |
| 10 | `/2024/08/12/elevate-your-online-presence-professional-website-development-at-digitally-shifted/` | Blog post (service promo) | ~441 |
| 11 | `/category/digital-marketing/` | Category archive (3 posts) | ~296 |
| 12 | `/category/hosting-domains/` | Category archive (1 post) | ~159 |
| 13 | `/category/paid-advertising/` | Category archive (1 post) | ~148 |
| 14 | `/category/website-development/` | Category archive (1 post) | ~146 |

Feeds and system endpoints (`/feed/`, `/comments/feed/`, `/wp-json/`, `/xmlrpc.php`) exist but are not content pages.

### Site information architecture (as crawled)

- Primary navigation: Home | Our Services (anchor link `/#services`) | Blog | Contact us. The site is effectively a one-pager plus blog.
- Home sections in order: hero with background ad video → "The Digital Chain" (12-step process, circular diagram) → "Still Doubt it?" client proof strip (logos + outbound client links) → Our Services (8 title-only cards) → "Ready to elevate Your Online Presence?" CTA → Our Clients (logo carousel, 24 logo images) → Our Blog (6 post cards) → footer contact strip.
- Persistent CTAs: floating WhatsApp "Chat Now" (`wa.me/+27631718750`), "Schedule Free Consultation" (WhatsApp deep link with prefilled message), phone `tel:+27631718750`, email `mailto:sales@digitallyshifted.com`, Facebook, LinkedIn.
- Tech evidence: WordPress, Elementor + Elementor Pro, Rank Math SEO, LiteSpeed Cache + QUIC.cloud, MonsterInsights (Google Analytics installed), SiteGround-style hosting stack with Imunify360 and SpamExperts (mentioned in hosting post; consistent with observed challenge page).

## 2. Page-by-page audit

### 2.1 Home — `/`

- **Content type:** Hero copy, process explainer (The Digital Chain, 12 steps), social proof strip, 8 service cards, CTA band, client logo carousel, blog preview, footer contact block. No form on this page.
- **Key messages:**
  - H1: "Digital Marketing Agency South Africa".
  - Hero subline: "Unlock your brand's potential with our cost-effective, dedicated team of digital experts."
  - Core value proposition: the "Digital Chain" — a 12-step delivery model from Corporate Identity through Domain, Hosting, Cybersec, Website, CMS/CRM/ERP, Advertising, Social Media & PR, Content Creation, Analytics, SEO, to Sales & Growth, "designed & refined to provide clients with a clear roadmap to online business triumph."
  - 8 services listed: Marketing Plan & Execution, Website Development, Paid Advertising, Social Media & PR, Domains & Hosting, Brand & Content Creation, Software Development, Machine Learning & AI.
  - Proof: ~20 outbound client-site links (bolandmotorgroup.co.za, labri.co.za, shriveslaw.co.za, deuxlions.za.com, and others) plus 24 client logo images.
- **Content quality:** Mixed. The hero and Digital Chain framing are distinctive and on-brand. The service cards carry titles only — no descriptions and no links to service pages (all point nowhere; "Our Services" is an anchor to the same page). The Digital Chain steps show two inconsistent label sets on one page (circle widget: "Cybersec"; numbered list: "Cybersecurity"; list order vs circle order differ). Body copy is thin (~577 words for the whole commercial pitch). No testimonials with names, quotes, or results; the "Still Doubt it?" heading promises proof but the section shows only logos.
- **Media assets:** Desktop + mobile hero ad videos (`Digitally-Shifted-Ad.mp4`, `Digitally-Shifted-Ad-9x16-1.mp4`), `Home-page-banner.jpg`, `Video-Banner.jpg.webp` poster, 24 client logo PNGs, service illustrations (inline SVG/WebP, several with descriptive alt text), scroll indicator. Videos and logos are reusable; service illustrations reusable if the new design keeps an illustrative style.
- **SEO:** Title "Digital Marketing Agency South Africa | Digitally Shifted" (strong keyword target). Meta description present and on-target. Canonical, OG image (`Home-page-banner.jpg`), Twitter card, JSON-LD with `WebSite` + `SearchAction` + `Place`/`ProfessionalService` data. H1 present. Logo image has no alt text (repeats on every page).
- **Gaps:** No service detail pages behind the 8 cards (biggest IA gap on the site). No named testimonials, results, or case studies. No pricing signal. No About/Team link. No Instagram (agency runs only Facebook + LinkedIn). Service card hover/click leads nowhere.
- **Migration strategy: REWRITE.** Keep the information architecture concept (hero, Digital Chain, services, proof, blog), keep client logos and the ad videos, and rewrite/expand the copy. The new design must resolve what each of the 8 service cards opens (real pages are required — see Gaps).

### 2.2 Contact — `/contact-us/`

- **Content type:** Contact intro copy, contact details block, Elementor Pro service-request form.
- **Key messages:** "Tell us what you want to improve online and the Digitally Shifted team will guide the next step." Positioning as a practical guide for South African businesses across SEO, web development, Google Ads, social media, hosting, strategy. Multi-channel contact: form, call, WhatsApp, email.
- **Content quality:** Clear, current, and on-brand; the best short-form copy on the site. Form fields: Name, Telephone, Email, Company, Services (checkbox list of 9 services), Message, Send. The 9 service options in the form do not exactly match the 8 service cards on the home page ("Search Engine Optimization (SEO)" and "Public Relations" appear in the form; "Marketing Plan & Execution" and "Brand & Content Creation" do not).
- **Media assets:** Featured photo (`pexels-ketut-subiyanto-4350093.jpg`, alt text present). Reusable.
- **SEO:** Title "Contact Digitally Shifted | Digital Marketing Agency SA". Meta description present. Canonical, OG/Twitter set, JSON-LD present. H1 "Contact Digitally Shifted". Correctly indexed.
- **Gaps:** No physical address (only "South Africa"), no trading hours, no map. No privacy/POPIA consent checkbox on the form. No response-time promise. Form service list is inconsistent with the home service cards.
- **Migration strategy: KEEP** with small additions (address/hours, consent checkbox, align service list with the new IA).

### 2.3 Blog index — `/blog/`

- **Content type:** Archive listing with search box; 6 post cards with category labels, excerpts, dates, "No Comments"/"1 Comment" counts.
- **Key messages:** "Read practical digital marketing insights from Digitally Shifted on SEO, website development, paid advertising, hosting, analytics and online growth for South African businesses." Positions the blog as the educational hub.
- **Content quality:** Functional and current. No featured/pillar post treatment, no newsletter capture, no topic filters in the UI (categories exist but are only reachable via post card labels). No posts since August 2024 (stale by 14 months at audit date).
- **Media assets:** Post thumbnails (WebP, with descriptive alt text). Reusable.
- **SEO:** Title and H1 are both "Digital Marketing Insights | Digitally Shifted" — identical to `/category/digital-marketing/` (duplicate title across two indexed URLs; H1 should not carry the "| Digitally Shifted" suffix). Meta description present and unique. Canonical, OG/Twitter set. Category and blog indexes overlap in content (the category shows a subset of the blog list).
- **Gaps:** No subscribe/newsletter option. No featured article. No author attribution anywhere.
- **Migration strategy: KEEP** the index as a template; REWRITE the title/H1 to remove the duplicate and the pipe suffix; add featured-post and subscribe slots in the new design.

### 2.4 Privacy Policy & Terms — `/privacy-policy/`

- **Content type:** Legal — privacy policy and terms & conditions combined on one page. Correctly `noindex`.
- **Key messages:** Standard data collection/use/retention statements; payment and service terms; contact for questions.
- **Content quality:** Mixed provenance. The opening is a short custom policy, then it switches to raw WordPress template text (Gravatar, comments, login cookies, "Where your data is sent") and LiteSpeed/QUIC.cloud boilerplate, then a short custom Terms section. Problems: the contact email is `info@digitallyshifted.com` while the whole site otherwise uses `sales@digitallyshifted.com` (inconsistent); no POPIA-specific clauses (South African operation); no company registration details; references to comments/login features that the site barely uses.
- **Media assets:** Logo as OG image only. None to migrate.
- **SEO:** Title "Privacy Policy and Terms | Digitally Shifted", `noindex` (correct for legal). H1 present.
- **Gaps:** POPIA compliance language; data subject rights in South African terms; PAIA/manual reference; consistent contact address.
- **Migration strategy: REWRITE.** Keep the URL and `noindex`. Replace WordPress boilerplate with a POPIA-aware policy; align email to one address; add company details. Do not publish without client sign-off (legal text).

### 2.5 Post — "Stay Ahead of the Game: 2023's Top Digital Marketing Trends" (2023-02-01)

- **Content type:** Blog listicle; 10 trends; tags list; table of contents; comments open historically (1 comment).
- **Key messages:** AI, personalization, voice search, interactive content, influencer and micro-influencer marketing, micro-moments, data privacy, interactive video, immersive experiences.
- **Content quality:** Outdated (a 2023 trends piece read in late 2026). A patch banner already exists at the top: "2026 update: This article was originally published as a 2023 trend overview. Use it as a historical checklist and review current platform, privacy and AI changes before applying each tactic." Generic, unattributed statistics; no South African context; no internal links to services. The single comment ("Sarah", May 2024) reads as generic praise and adds no value.
- **Media assets:** Featured image `AI-Trends-2023` (WebP set; **missing alt text**). Reusable image; alt needs adding.
- **SEO:** Title "2023 Digital Marketing Trends | Digitally Shifted"; description honestly reframed as historical checklist. Canonical, OG/Twitter set, JSON-LD present. Single H1, clean H2-per-trend structure.
- **Gaps:** No current-year trends content exists; this is the site's only trends piece.
- **Migration strategy: REWRITE** (or drop + 301 to blog if the client prefers a clean slate). Preferred: refresh into a current-year trends article with local examples; keep URL only if the year-neutral slug can be kept, otherwise new URL + 301 from this one. If kept as-is, keep the update banner.

### 2.6 Post — "How to Evaluate the Effectiveness of Your Digital Marketing Efforts" (2023-02-02)

- **Content type:** Blog how-to; KPIs, analytics, ROI calculation; 5 sections.
- **Key messages:** Set KPIs aligned to goals, analyze with tools such as Google Analytics, compute ROI as revenue vs cost, review continuously.
- **Content quality:** Evergreen topic but thin (~418 words) and generic; zero local examples, no tool screenshots, no internal links. Reads as unedited AI-era boilerplate.
- **Media assets:** Featured image `Analytics.jpg` (alt present). Reusable.
- **SEO:** Title "Measure Digital Marketing ROI | Digitally Shifted"; description present; canonical/OG/Twitter/JSON-LD set. Clean heading tree.
- **Gaps:** No worked example with numbers; no link to the paid advertising or analytics-related content; no CTA at the end.
- **Migration strategy: REWRITE (light).** Keep the structure and message; expand to ~800+ words with a South African SME example and end-of-post CTA.

### 2.7 Post — "The Ultimate Digital Marketing Guide for Businesses" (2023-02-09)

- **Content type:** Pillar guide, ~5,833 words; 13 top-level sections (foundations, website optimization, SEO, PPC, analytics, local SEO, email, social, content, video, influencer, landing pages, mobile); deep heading tree (h2→h5); table of contents.
- **Key messages:** Digital marketing foundations for small businesses; prerequisites (corporate identity, domain/hosting, website, SSL, professional email, social accounts); channel-by-channel guidance; measurement.
- **Content quality:** The strongest SEO asset on the site by depth. Structure is complete and genuinely useful. Weaknesses: unattributed statistics sections, some headings are near-duplicates ("Importance of X" repeated), no internal links to the service promos or contact page, and the tone is generic rather than South African.
- **Media assets:** Featured photo `pexels-ketut-subiyanto-4350093` (alt present). Reusable.
- **SEO:** Title "Digital Marketing Guide | Digitally Shifted"; description present; canonical/OG/Twitter/JSON-LD set; single H1 with clean hierarchy. This page can rank for broad informational queries.
- **Gaps:** No author/E-E-A-T signals; statistics lack sources; no content upgrades (checklist download) despite being a natural lead magnet.
- **Migration strategy: KEEP** as the pillar post. Refresh statistics and add internal links to new service pages during migration. Add an author and a content-upgrade CTA in the new design.

### 2.8 Post — "Unlock Your Online Potential... Domain and Hosting Services" (2024-07-04)

- **Content type:** Service-promo article (effectively a hosting/domains service page published as a blog post).
- **Key messages:** Domain registration breadth (.com/.net/.tech/.shop), WHOIS privacy, LiteSpeed dedicated servers (low TTFB), Imunify360 security, SpamExperts email protection, 24/7 support, scalability.
- **Content quality:** Clear and specific — the most concrete product content on the site. Two named third-party claims need verification before migration: a Google bounce-rate statistic and a Symantec "one in thirteen web requests" statistic (both unattributed/unlinked). "Visit us at Digitally Shifted" links to the home page, not a hosting service page.
- **Media assets:** Featured image `pexels-brett-sayles-1597776` (alt present). Reusable.
- **SEO:** Title "Domain and Hosting Services | Digitally Shifted"; description present; canonical/OG/Twitter/JSON-LD set.
- **Gaps:** This content is where the future Domains & Hosting service page should live; today it sits in the blog with a blog-length CTA.
- **Migration strategy: MERGE.** Fold the concrete claims (LiteSpeed, Imunify360, SpamExperts, domain privacy, 24/7 support) into the new Domains & Hosting service page. Keep the post as a support article (rewritten short) or 301 it to the service page — recommend 301 after merge.

### 2.9 Post — "Maximizing ROI with Precision: Explore Paid Advertising with Digitally Shifted" (2024-07-15)

- **Content type:** Service-promo article (paid ads).
- **Key messages:** Paid ads give instant, precisely targeted visibility; Google Ads/Facebook/Instagram/LinkedIn management; custom strategy; continuous A/B testing and reporting.
- **Content quality:** Message is right; copy is generic with no proof (no results, no spend ranges, no case study). No link to a paid-ads service page; CTAs point to contact.
- **Media assets:** Featured image `Advertising.png` (alt present). Reusable.
- **SEO:** Title "Paid Advertising Management | Digitally Shifted"; description present; canonical/OG/Twitter/JSON-LD set.
- **Gaps:** No package/pricing signal; no results evidence.
- **Migration strategy: MERGE** into the new Paid Advertising service page; keep or 301 the article the same way as 2.8.

### 2.10 Post — "Elevate Your Online Presence: Professional Website Development at Digitally Shifted" (2024-08-12)

- **Content type:** Service-promo article (web development).
- **Key messages:** Custom responsive WordPress builds; conversion focus; SEO-optimized design; modern CMS/frameworks and security; ongoing support after launch.
- **Content quality:** Same pattern as 2.8/2.9: right message, generic proof. Note the mismatch: the post's featured image alt says "Code editor screen representing custom software development" — image reuse is slightly off-topic.
- **Media assets:** Featured image `Untitled-design-7.png` (alt present but describes software development). Reusable; consider a web-development-specific image.
- **SEO:** Title "Website Development Services | Digitally Shifted"; description present; canonical/OG/Twitter/JSON-LD set.
- **Gaps:** No portfolio link, no process/timeline, no pricing signal.
- **Migration strategy: MERGE** into the new Website Development service page; same post/301 treatment as 2.8.

### 2.11–2.14 Category archives — `/category/{digital-marketing, hosting-domains, paid-advertising, website-development}/`

- **Content type:** Category listing templates. Each has a custom, well-written description paragraph in the current brand voice (e.g., digital-marketing: "Explore practical digital marketing guidance from Digitally Shifted for South African businesses that want stronger online visibility, better leads and clearer reporting..."). Digital-marketing also renders an "Other Articles" cross-list block.
- **Key messages:** Topic hubs for the four practice areas.
- **Content quality:** Descriptions are good and current. Archive depth is weak (1–3 posts each). Titles/H1s: category pages use SEO titles like "Hosting and Domain Guides | Digitally Shifted" with bare H1s ("Hosting & Domains") — acceptable. One defect: `/category/digital-marketing/` duplicates the blog index title exactly.
- **Media assets:** Post thumbnails reused from posts; a shared `Facebook-Banner.jpg` serves as OG image for all four (template-level fallback, not category-specific).
- **SEO:** All four set canonical/OG/Twitter/JSON-LD. All indexed. Thin-archive risk is low today but grows if publishing stops.
- **Gaps:** Categories are not exposed as navigation or filters; they duplicate the blog index at 6-post scale.
- **Migration strategy: MERGE into the new blog hub.** Keep the four category descriptions verbatim (they are strong) and expose them as topic filters on the redesigned blog. If the new IA uses different topic slugs, 301 old category URLs to the new ones. Alternatively keep these URLs and fix the duplicate title — decide at design time.

## 3. Media asset inventory (summary)

- 89 unique uploaded media files referenced across pages (excluding duplicates by responsive size).
- Reusable as-is:
  - Brand: `Digitally-Shifted-Logo-White.png` (needs alt text), `logo-e1659285869632.png`.
  - Client proof: 24 `Digitally-Shifted-Clients-Logos-01..24.png`.
  - Video: `Digitally-Shifted-Ad.mp4` + `Digitally-Shifted-Ad-9x16-1.mp4` (desktop/mobile hero pair) with `Video-Banner.jpg.webp` poster.
  - Post featured images (all served as WebP with original fallbacks): AI-Trends-2023, Analytics, pexels-brett-sayles (hosting), pexels-ketut-subiyanto (guide/contact), Advertising.png, Untitled-design-7.png.
  - Service illustrations (inline SVG/WebP on home), scroll indicator, `Home-page-banner.jpg`, `Facebook-Banner.jpg` (OG fallback).
- Needs replacement or repair:
  - `AI-Trends-2023` featured image: missing alt text.
  - `Untitled-design-7.png` (web-dev post thumbnail): alt describes software development; swap for a web-development image at redesign.
  - Client logo strip: confirm current clients and permissions before re-publishing (the "Still Doubt it?" section shows logos without named endorsements).
- No broken media references were observed in the crawl. No YouTube/Vimeo embeds exist; the only video assets are the two self-hosted MP4s.

## 4. Site-wide SEO findings

Working well:

- Rank Math is configured on every page: unique meta descriptions, canonicals, Open Graph + Twitter cards, JSON-LD (WebSite+SearchAction on home; ProfessionalService/Place data sitewide).
- robots.txt is clean and points to `sitemap_index.xml`; sitemaps list pages, posts, and categories.
- Headings are single-H1 with logical hierarchy on posts and the home page.
- Featured images carry descriptive alt text on 5 of 6 posts and on archive thumbnails.
- Privacy policy is `noindex` (correct).

Missing or broken:

1. Duplicate title: `/blog/` and `/category/digital-marketing/` both use "Digital Marketing Insights | Digitally Shifted".
2. Missing alt text: site logo (all 14 pages) and the AI-Trends-2023 featured image; 17 inline SVG placeholders render without alt (verify each is decorative).
3. No breadcrumbs output on posts/categories (no visible or JSON-LD BreadcrumbList).
4. No author bylines or Person schema on posts (E-E-A-T gap).
5. Page-sitemap omits the home page and privacy page (home canonical resolves it; harmless but the sitemap should list the canonical home URL).
6. Blog title/H1 carries the "| Digitally Shifted" suffix inside the H1.
7. The blog has not published since 2024-08-12; freshness decay is now material.

## 5. Content gaps (site-wide)

1. **No service pages.** The nav's "Our Services" scrolls to 8 title-only cards. The three 2024 posts carry the only real service substance. This is the highest-priority content gap for the relaunch.
2. **No About/Team page.** No company story, team, credentials, or registration details anywhere.
3. **No named social proof.** No testimonials, reviews, results, or case studies; the "Still Doubt it?" section shows logos only.
4. **No pricing or packages signal** on any page.
5. **No FAQ** content despite obvious candidate questions (pricing, process, timelines, POPIA, hosting).
6. **No lead capture.** No newsletter, lead magnet, or content upgrade; the only conversion paths are WhatsApp/phone/email/form.
7. **No POPIA-facing privacy content** (see 2.4) and no consent checkbox on the contact form.
8. **No Instagram presence** linked (Facebook + LinkedIn only).
9. **Contact form service list** (9 options) does not match the home page service cards (8) — align during redesign.
10. **Freshness:** one 2023-era post needs refresh; the blog stopped updating in August 2024.

## 6. Migration strategy summary

| Page | Strategy | Notes |
|------|----------|-------|
| `/` | **Rewrite** | Keep IA concept, logos, videos; expand thin copy; wire service cards to new pages |
| `/contact-us/` | **Keep** | Add address/hours, POPIA consent, align service list |
| `/blog/` | **Keep** (template) | Fix duplicate title/H1; add featured + subscribe slots |
| `/privacy-policy/` | **Rewrite** | POPIA-aware policy; client sign-off required; keep noindex |
| Trends post (2023) | **Rewrite** | Refresh to current year; else drop + 301 |
| ROI post (2023) | **Rewrite** (light) | Expand with local example + CTA |
| Ultimate guide (2023) | **Keep** | Refresh stats; add internal links; add author |
| Domain & hosting post | **Merge** | Core claims → new service page; then 301 |
| Paid advertising post | **Merge** | Core claims → new service page; then 301 |
| Web development post | **Merge** | Core claims → new service page; then 301 |
| 4 category archives | **Merge** | Descriptions kept verbatim as blog topic filters; 301 if slugs change |

Redirect implications for DIG-18: up to three post URLs may become 301s after merge; category slugs may move with the new blog IA. All other URLs can survive the relaunch unchanged.

Copy-quality note for the new voice: the 2024 category descriptions and the contact page show the target voice (concrete, South African, benefit-led). The 2023 posts and the service promos do not match it yet; use the category/contact copy as the calibration standard when rewriting.

## 7. Inputs this audit hands to downstream milestones

- DIG-52 (content inventory): use the page table in section 1 plus per-page strategies in sections 2 and 6; body word counts and media counts are pre-computed.
- DIG-55 (design spec): section 1 IA, section 5 gaps, and the media reuse list define what templates and components the new design must cover (home one-pager or full IA decision, blog hub with topic filters, service page template, contact template, legal template).
- DIG-17 (migration): section 6 table is the keep/rewrite/merge/drop record.
- DIG-18 (redirect map): section 6 notes list the only expected URL changes (3 merge-301 posts, possible category moves).
- DIG-20 (pre-launch): MonsterInsights/GA is installed and must be re-verified post-launch; logo/alt fixes should land with the redesign.
