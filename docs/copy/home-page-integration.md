# Home page copy — CMO review and integration (DIG-79)

| | |
|---|---|
| Issue | DIG-79 (parent effort: DIG-73 content migration) |
| Date | 2026-10-20 |
| Author | Chief Marketing Officer |
| Inputs | DIG-100 document `home-copy` = `docs/copy/home-page-copy.md`; DIG-101 document `seo-requirements`; DIG-102 document `logo-permission-check` |
| Result | Copy is final for engineering wiring. Three deliverables pass review. Six integration rulings recorded. One owner decision card filed on this issue. A wiring child issue is created for the VP of Engineering. Nothing publishes until the owner answers the card. |

## 1. Review verdicts

### DIG-100 — home page copy (Content Creator). PASS.

Checks:

- All four conversion-spec 3.1 sections are present: hero, services summary, proof, closing CTA.
- CTA labels are verbatim: `Get a quote` three times, `See what is included` once. All links match the spec.
- Offer names follow the approved ladder: Launch and Care plan. Prices show as ranges.
- The SEO block matches the DIG-101 preserve list. I compared the strings field by field.
- One H1. No banned claims: no metrics, testimonials, case studies, or result promises. The claim trace lists an approved source for every on-page claim.
- The workspace file and the issue document are identical. I compared them. Only one trailing newline differs; the content is the same.

Accepted deviation: on-page copy is about 650 words. The brief asked for 700 to 1 000 words. The no-invented-proof rule and the brand voice cap what the page can say without padding. I accept the lean draft. Two owner-directed expansions can add words later: value-theme cards after DIG-25 section 4 clears, and a Launch deliverables list after the owner confirms scope lines.

### DIG-101 — SEO requirements (SEO Specialist). PASS.

All six rulings are present and grounded in the extracted record. The verbatim list quotes `000.json` exactly. The single-H1 ruling confirms my decision 4 on this thread: the old DOM defect was not intent. The document adds three implementation notes that now go to engineering: title suffix, og:image defaults, robots value. No code changed.

### DIG-102 — logo permission check (VP of Sales). PASS.

All 24 logo files have a row, a status, and a record source. No client contact happened. The result is clear: zero logo-use permissions exist in company records. Six of 24 entries are current clients; 18 are unknown. Recommendation: hold the whole strip, ship proof Variant B. I accept this recommendation. Flag HC3 resolves to held. The strip can return only after a board-approved permission round and written consents.

## 2. Integration rulings

R1 — Section headings. DIG-101's heading names are recommendations, not requirements. I accept the copy headings: `What we do`, `How we work`, `Ready when you are`. DIG-101 itself allows `How we work` for a process-led proof section. The binding part of DIG-101 ruling 3 stands, and the copy satisfies it: one H1, one H2 per section, H3 only for sub-items, no stacked heading tags, no decorative heading tags.

R2 — Care plan panel heading. The copy puts the Care plan panel inside the services summary section. Its heading `One monthly plan. Everything included.` renders as H3. DIG-101's rule "H3 only for the four service names" extends to this fifth sub-item. The hierarchy stays clean: H1, then one H2 per section, then H3 sub-items.

R3 — Card 3 naming. The card heading and link text are `Care plan`. The approved DIG-25 ladder name supersedes the WaaS name on this thread (my decision 2). The link target stays `/services#waas` for now. The live `/services` page H2 still says `Website-as-a-Service (WaaS)`; that name is behind the approved ladder. The wiring child issue renames the `/services` section heading to the approved name, so the home page link text names its destination (DIG-101 ruling 4).

R4 — Card 4 AIO. The heading `SEO and AIO` and the AIO sentence are one decision gate (flag HC4). If the owner approves the wording, the heading stays `SEO and AIO`. If the owner declines, the heading renders `SEO` and the sentence drops. This satisfies DIG-101 ruling 4 in both states.

R5 — og:image. Preserve the alt string verbatim: `Digitally Shifted digital marketing agency hero banner`. Serve the banner from the new host, never from the `/wp-content/` path. Convert `legacy-static/assets/media/Home-page-banner.webp` to JPEG at 1904×901 for share compatibility. Override the layout defaults per DIG-101: the title gets no ` — Digitally Shifted` suffix, and the robots meta carries the full preserved value with the snippet and preview directives.

R6 — Proof section. Variant B (`How we work`) ships. Variant A (the strip) stays out of the build until written consents exist. DIG-102 sections 4 and 6 are the basis.

## 3. Owner decision card

One card on this issue collects every publish gate. Copy v1.2 set the precedent: flagged lines wait for the owner. The card covers:

| Gate | Item |
|---|---|
| HC1 | Prices on the home page: Launch R12 000–R50 000 per project; Care plan R1 000–R6 000 per month |
| HC2 | Delivery promise wording: live in 15 working days from complete content |
| HC3 / B1 | Strip route: hold all 24 logos; ship Variant B |
| B2 | Optional consent email round to the six current clients |
| HC4 | AIO sentence and heading |
| HC5 | Small-changes clause |
| HC6 | Who-it-is-for block |
| HC7 | Reply-time line |
| HC8a | Meta description: keep verbatim or rewrite |

The wiring child issue and every deploy wait for these answers.

## 4. Wiring handoff

Child issue assigned to the VP of Engineering: wire the final copy into `src/pages/index.astro`, apply the DIG-101 implementation notes, and rename the `/services` WaaS heading to the approved Care plan name. Staging work can start now. Production deploy waits for the owner answers on this issue.

## 5. Status

- Copy: final for wiring.
- SEO rulings: satisfied. Two refinements recorded (R2, R3). One gate recorded (R4).
- Logo strip: held. Variant B ships.
- Publish gate: owner decision card pending on this issue.
