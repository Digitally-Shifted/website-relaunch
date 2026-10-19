# Digitally Shifted — home page copy (final, for the new design)

| | |
|---|---|
| Version | 1.0 |
| Date | 2026-10-19 |
| Author | Content Creator — DIG-100 (child of DIG-79) |
| Status | Final draft for engineering wiring. Owner-gated items in the flag table block publishing of those lines only. |
| Structure | Conversion spec (DIG-66) section 3.1: hero, services summary, proof, closing CTA |
| Facts | DIG-25 document `services` (canonical offer ladder, approved 2026-10-19); DIG-38 document `product-marketing-brief` v1.2; extracted old home record `docs/migration/extracted/000.md` and `000.json` |
| Reused lines | Owner-approved website copy v1.2 (DIG-63 document `website-copy`), updated to the new offer names |

Engineering wires this copy into `src/pages/index.astro`. This document does not change site code. Nothing here publishes until the flag table says so.

## How engineering wires this copy

- Exactly one H1 on the page. Text exactly: `Digital Marketing Agency South Africa`. The old DOM repeated this text twice; render it once.
- Use CTA labels verbatim: `Get a quote`, `See what is included`. Links exactly as given.
- Three `Get a quote` buttons on the page: hero, after the services summary, closing band. One primary button per page region (conversion spec 2.4).
- Proof section: ship **Variant B** by default. **Variant A** (logo strip) may not publish before the permissions check completes (flag HC3).
- The old draft display statement ("Your website, built, hosted and managed.") is retired. The fixed SEO H1 is the only display heading, so the page does not carry two competing headlines (flag HC8).
- Footer contact block and mobile action bar follow conversion spec 2.2 and 2.3. This copy adds no other phone or WhatsApp links.
- Do not render the optional reply-time line unless the owner confirms flag HC7.

## SEO block (preserved from the extracted record)

| Field | Value |
|---|---|
| Title tag | `Digital Marketing Agency South Africa \| Digitally Shifted` |
| Meta description | `Digitally Shifted helps South African businesses generate leads with SEO, web design, Google Ads, social media and digital strategy.` |
| H1 (exactly one) | `Digital Marketing Agency South Africa` |
| og:image alt | `Digitally Shifted digital marketing agency hero banner` |

Assumptions are recorded in flag HC8. An SEO Specialist runs the parallel check on DIG-79 and rules on refinements.

---

## 1. Hero

- **Eyebrow:** WEBSITES, HOSTING AND SEO
- **H1:** Digital Marketing Agency South Africa
- **Intro line (body-lg):** Digitally Shifted designs, builds, hosts, and manages websites for South African businesses, so new customers find you and contact you.
- **Primary button:** `Get a quote` → `/contact?need=quote`
- **Secondary text link:** `See what is included` → `/services`

## 2. Services summary

**H2:** What we do

**Opener:** Four services cover the whole life of your website. Buy a website once with Launch, and own it outright. Or put your website on the Care plan and let us run it for a monthly fee. Choose what you need today and add more later.

**Card 1 — heading and link: Website design and development → `/services#web-design`**

> We design and build your website around your customers and your goals. Fast pages, clear structure, and a site you can grow. You own the result, and we stay available to look after it. Right for your first website, or a rebuild of an old one. The once-off build is Launch: live in 15 working days from complete content, from R12 000 to R50 000 per project. You approve the quote before any work starts.

**Card 2 — heading and link: Hosting and management → `/services#hosting`**

> We host your site, keep its software current, and fix problems before visitors see them. Backups, updates, and security are our job, not your weekend. Your site stays fast and safe while you run your business. Take hosting and management on its own, or as part of the Care plan. Right if your site is live but nobody looks after it.

**Card 3 — heading and link: Care plan → `/services#waas`**

> The monthly bundle. One price covers design, hosting, management, SEO basics, and small changes: the everyday edits your site needs. From R1 000 to R6 000 per month. Your website stays current without a large upfront cost, and we keep improving it. No new quote every time something changes. Take it with a new build, or on its own.

**Card 4 — heading and link: SEO and AIO → `/services#seo`**

> Technical foundations, clear content, and steady improvement help the right people find you on Google. AIO extends that work to visibility in AI-generated answers. No tricks that put your domain at risk. Right if customers search for what you do, and they cannot find you.

**Care plan panel (inside this section, after the cards)**

- **H2:** One monthly plan. Everything included.
- **Body:** The Care plan turns your website into a service we run for you. You never touch the technical work. Your site stays current, and the cost stays predictable.
- **Covers list:** Design. Hosting. Management. SEO basics. Small changes.

**Custom-builds line (small text under the panel):** Need an online shop, a booking system, or a member area? Those are custom builds, quoted per project. They sit outside the fixed Launch scope.

**Repeat CTA (after this section):** `Get a quote` → `/contact?need=quote`

## 3. Proof

### Variant A — client logo strip (GATED, flag HC3)

- **H2:** Our clients
- **Intro line:** A few of the businesses we work with.
- **[Logo strip — real client logos exist in the extracted record. Do not publish before the permissions check completes.]**

### Variant B — no third-party assets (ships by default)

- **H2:** How we work
- **Opener:** Your customers are already online. You do not have the time or the skill to run a website, and you should not have to. That is our job.

1. **You send the short form.** We talk about your business, and then you get a clear quote. You decide with the price in front of you.
2. **We design and build.** Your website takes shape around your customers. You see it and approve it before it goes live.
3. **We look after it.** After launch, we host it, manage it, and improve it. Every month.

- **H3: Who it is for**
- Owner-run businesses with 1 to 50 people. Service industries, hospitality, and tourism, in and near Gauteng, the Western Cape, and KwaZulu-Natal. If your customers find you through Google and word of mouth, you are who we built this for.

- **H3: One supplier**
- One supplier stays accountable for your whole website. When something needs fixing, you do not chase three suppliers. You pay a predictable monthly cost, not a large upfront sum. The technical work stays with us.

## 4. Closing

- **H2:** Ready when you are
- **Line:** Tell us what your business needs. We reply with a clear quote, and work starts only when you approve it.
- **Button:** `Get a quote` → `/contact?need=quote`
- **Optional line (only if flag HC7 is confirmed):** We aim to reply within one business day.

---

## Owner-gated items (flag table)

Do not publish a flagged line before the owner resolves its flag. Prices were flagged in copy v1.2 as F7; that precedent carries over.

| # | Item | Where | What the owner must decide or supply | Trace |
|---|---|---|---|---|
| HC1 | Prices: Launch R12 000 to R50 000 per project; Care plan R1 000 to R6 000 per month | Card 1; Card 3; opening prices in the services summary | Approve publishing the price ranges on the home page at all. If declined, remove the price sentences; the offer names and links stay. | DIG-25 section 2 (canonical ladder); v1.2 flag F7 |
| HC2 | Delivery promise, exact wording: live in 15 working days from complete content | Card 1 | This is an owner commitment. Publish only with this wording. Optional companion line if approved: "Late content moves the launch date by the same number of days." | DIG-25 section 2, naming rule 3 |
| HC3 | Variant A client logo strip | Proof section | The logo strip may not publish before a permissions check completes (client consent for logo use). Variant B ships by default; swap to Variant A only after the check passes. | Extracted 000.json client logo carousel; permissions not yet verified |
| HC4 | AIO wording: "AIO extends that work to visibility in AI-generated answers" | Card 4 | The owner added AIO on 2026-10-18; the public wording and scope are still open. Confirm this line, or replace it with the owner-approved wording. | DIG-38 (AIO directive, glossary); v1.2 flag F10 |
| HC5 | "Small changes: the everyday edits your site needs" | Card 3 | Confirm the monthly task list behind "small changes". If unconfirmed, keep "small changes" undefined and drop the clause after the colon. | DIG-25 section 2 (Care plan); v1.2 flag F4 |
| HC6 | Who-it-is-for block: size band 1 to 50; sector list; metros | Proof Variant B | The size band and sector shortlist are hypotheses to validate in sales calls; the ICP and metros are owner-confirmed. Approve the block, or soften to "Owner-run South African businesses. If your customers find you through Google and word of mouth, this is for you." | DIG-38 confirmed ICP; v1.2 flag F3 |
| HC7 | Reply-time line: "We aim to reply within one business day." | Closing (optional) | Owner promise. Default is not to render it. Confirm or decline. | Conversion spec 3.5 launch default, owner confirmation open; v1.2 flag F12 |
| HC8 | SEO block assumptions | SEO block; wiring notes | (a) The title tag and meta description are preserved verbatim per the brief; the meta description names retired offers (Google Ads, social media, digital strategy). The SEO Specialist on DIG-79 rules on any refinement. (b) The current `index.astro` title ("Websites that work as hard as you do") must be replaced by the title tag above. (c) The old draft display statement is retired so the fixed H1 stays the only headline. (d) The old DOM repeated the H1 text; the new page renders it once. | Extracted 000.json and 000.md; DIG-38 offer changes; conversion spec 3.1 |

## Claim trace

Every on-page claim traces to an approved source:

- **Hero intro, card bodies, panel, custom-builds line** — DIG-25 (offer ladder, Care plan contents, Launch delivery promise and price basis, custom builds quoted per project and outside fixed Launch scope); live `/services` section copy in `src/pages/services.astro`; reused lines from owner-approved copy v1.2 (home intro, value lines, process steps, who-it-is-for, accountable-supplier lines), updated to the new offer names.
- **"So new customers find you and contact you", "Your customers are already online", who-it-is-for, predictable monthly cost, one accountable supplier, no large upfront cost** — DIG-38 (jobs to be done, ICP, emotional tension, differentiation, bundle facts, words to use).
- **"Our clients" heading and Variant A intro** — the extracted old home record (client logo carousel is real and listed in 000.json). Gated by HC3.
- **SEO block** — extracted 000.json and 000.md, preserved verbatim.
- **CTA labels and links, page structure** — conversion spec 2.5 and 3.1 (approved).

Excluded by instruction: Paid Advertising (open decision DIG-83), Grow and Engine (v2 offers), retired old services (MIGRATION-LOG section 3.1), metrics, testimonials, case studies, and result promises (none exist; DIG-25 section 6 and DIG-38 proof rules).

## Length note

The on-page copy is about 650 words. The brief asked for roughly 700 to 1 000 words of purposeful copy. The conversion-spec structure (hero, four-card summary, gated proof, closing) with the no-invented-proof rule and the brand voice caps what can be said without padding or duplication of `/services`. Two owner-directed expansions can lift the page into the range when approved: value-theme cards (quality, bundle, speed) once the competitive-intel task clears DIG-25 section 4 for publication, and a Launch deliverables list once the owner confirms scope lines. Neither exists yet, so this draft ships lean rather than padded.
