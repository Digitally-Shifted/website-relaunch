# Digitally Shifted — Website Design Spec

| | |
|---|---|
| Document | `docs/DESIGN-SPEC.md` |
| Purpose | Single source of truth for the Website Relaunch implementation (DIG-11 consumes this) |
| Token source | `brand/tokens/design-tokens.json` v4.1.0 and `brand/tokens/tokens.css` (approved final) |
| Analysis basis | Full visual pass over `designs/` (64 files) plus SVG inspection, PDF font metadata, and pixel measurement |
| Authority | Brand Book v4.1, owner-approved 2026-10-18. Do not change any value here without a new owner-approved version. |
| Status | Complete — all design assets catalogued, tokens extracted, components and layouts specified |

**How to read this spec.** Each value carries a provenance tag. `measured` values come from the legacy design files in `designs/`. `decided` values come from the owner-approved token file v4.1.0. `recommended` values are implementation defaults that no source fixes. Teams may tune them within the token system.

---

## 1. Sources and method

The `designs/` package is a corporate identity kit, not a website mockup set. It contains one monochrome logo system, a business card, a textured background, a lightning motif image, and stock source files. The website layout system therefore comes from the approved brand rules, and the legacy files supply the identity geometry, the palette anchors, and the art direction motifs.

Analysis method:

1. Visual read of every distinct artwork (PNG, JPG, rendered PDF pages, extracted ZIP contents).
2. Direct inspection of the nine `DS CI-*.svg` masters for exact geometry and fills.
3. `pdffonts` on `DS CI.ai` for embedded font names. Pixel sampling with Pillow for ground and fill values.
4. Archive extraction and inspection of the four stock ZIPs and the motion template.

Key legacy findings:

- Every legacy raster measures 0.000 color saturation. The legacy identity is strictly monochrome. The single accent `#FD4000` is an owner decision (2026-10-18), not a legacy value.
- `DS CI.ai` is a 9-page PDF (Adobe PDF library 15.00, created 2022-07-15 SAST). It embeds TrueType subsets named `Raleway-Thin`. This proves the Raleway family. Weights measured from the outlines: 900 for `DIGITALLY`, 300 for `SHIFTED`.
- The business card front ground samples exactly RGB(7, 8, 8) = `#070808`. This is the Carbon token.
- All nine CI artboards appear in three fills: white `#FFFFFF`, black `#000000`, grey `#4D4D4D`.

---

## 2. Design tokens

Consume tokens from `brand/tokens/tokens.css` (`:root` custom properties) or `brand/tokens/design-tokens.json` (W3C format). The tables below are the extracted values. Do not restate them in component code.

### 2.1 Color

Core colors (all `measured` from legacy fills):

| Token | Hex | Provenance | Use |
|---|---|---|---|
| `color.paper` | `#FFFFFF` | CI white fills (DS CI-01/02/03) | Light ground. Text and logo on dark |
| `color.ink` | `#000000` | CI black fills (DS CI-04/05/06) | Dark ground. Text on light. Logo Ink |
| `color.slate` | `#4D4D4D` | CI grey fills (DS CI-07/08/09) | Muted text on light. Subdued logo |
| `color.carbon` | `#070808` | Business card ground (sampled) | Dark surface: sections, cards, scrims |

Grey ramp (`decided`, anchored on the legacy stops. Grey-600 = slate. Grey-950 = carbon):

| Step | Hex | Step | Hex |
|---|---|---|---|
| grey-50 | `#FAFAFA` | grey-600 | `#4D4D4D` |
| grey-100 | `#F0F0F0` | grey-700 | `#383838` |
| grey-200 | `#DEDEDE` | grey-800 | `#262626` |
| grey-300 | `#C4C4C4` | grey-900 | `#141414` |
| grey-400 | `#A3A3A3` | grey-950 | `#070808` |
| grey-500 | `#808080` | | |

Accent (`decided`, owner direction 2026-10-18):

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `color.accent` | `#FD4000` | Links and icons on dark. Primary button fill with Ink text. 2px focus rings. Large or bold display accents. Small UI markers | 5.64:1 on Carbon. 5.91:1 with Ink text. 3.55:1 on Paper |

Accent rules:

- Exactly one accent exists. Do not add a second hue. Do not tint it.
- Never apply the accent to the logo. Never use it as decoration.
- Never set white text on the accent fill (3.55:1 fails).
- Never set body-size accent text on light grounds (3.55:1 fails AA). Use Ink links on light.
- Gradients run on greys, black and white only.

Text colors (`decided`):

| Token | Hex | Use |
|---|---|---|
| `color.text.onLight` | `#000000` | Body text on Paper and light greys |
| `color.text.onLightMuted` | `#4D4D4D` | Secondary text on light |
| `color.text.onDark` | `#F0F0F0` | Body text on Carbon and dark greys |
| `color.text.onDarkMuted` | `#A3A3A3` | Secondary text on dark |

Interactive states (`decided`):

| Token | Value | Use |
|---|---|---|
| `color.interactive.linkOnDark` | `#FD4000` | Link text on dark. Always underlined. |
| `color.interactive.linkOnLight` | `#000000` | Link text on light. Always underlined. |
| `color.interactive.focusOnDark` | `#FD4000` | 2px focus ring on dark. |
| `color.interactive.focusOnLight` | `#FD4000` | 2px focus ring on light. Passes the 3:1 UI minimum. |
| `color.interactive.disabledOnDark` | `#5A5A5A` | Disabled controls on dark. |
| `color.interactive.disabledOnLight` | `#A3A3A3` | Disabled controls on light. |

### 2.2 Typography

Family. The weights are `measured` from the embedded outlines. The stack is `decided`:

- Raleway variable, weight axis 100–900. License SIL OFL 1.1. File `brand/fonts/Raleway-Variable.ttf`.
- Stack: `"Raleway", ui-sans-serif, system-ui, "Segoe UI", Arial, sans-serif`.
- Load once with `font-weight: 100 900`. Set `font-display: swap`. Preload the woff2 in production.

Wordmark rule (`measured`): `DIGITALLY` in weight 900, `SHIFTED` in weight 300, shared cap height, word gap 0.5 em. Display type uses the same heavy/light pairing. Never re-typeset the wordmark. Use the SVG masters in `brand/logo/`.

Tagline (`decided`): `DIGITAL AGENCY` in Raleway Regular 400, caps, tracking 0.65 em. It lives only inside the vertical lockup.

Type scale (`decided`, ramp 1.25 on a 16px base):

| Token | Size | Leading | Weight | Notes |
|---|---|---|---|---|
| `display-xl` | 4.75 rem | 1.05 | 900 | Hero statements, tracking −0.015em |
| `display` | 3 rem | 1.08 | 900 | Section statements, tracking −0.01em |
| `h1` | 2.25 rem | 1.12 | 800 | |
| `h2` | 1.75 rem | 1.18 | 700 | |
| `h3` | 1.375 rem | 1.25 | 700 | |
| `h4` | 1.125 rem | 1.35 | 600 | |
| `body-lg` | 1.125 rem | 1.6 | 400 | Long-form opener |
| `body` | 1 rem | 1.65 | 400 | Default body |
| `body-sm` | 0.875 rem | 1.55 | 400 | Dense UI |
| `caption` | 0.8125 rem | 1.4 | 500 | Meta text |
| `eyebrow` | 0.8125 rem | 1.0 | 500 | Caps, tracking 0.32em |

Rules: headings in sentence case. Only eyebrows and the tagline use letterspaced caps. Body lines measure 60–75 characters.

### 2.3 Spacing

`decided`, 4px base:

| Token | Value | Token | Value |
|---|---|---|---|
| `space-1` | 4px | `space-7` | 48px |
| `space-2` | 8px | `space-8` | 64px |
| `space-3` | 12px | `space-9` | 96px |
| `space-4` | 16px | `space-10` | 128px |
| `space-5` | 24px | `space-11` | 192px |
| `space-6` | 32px | `space-12` | 256px |

### 2.4 Radius and the signature corner cut

`decided`. The mark has no curves, so sharp corners are the default.

| Token | Value | Use |
|---|---|---|
| `radius-none` | 0 | Default for all surfaces |
| `radius-sm` / `md` / `lg` | 2 / 4 / 8px | Media and embeds only |
| `radius-pill` | 9999px | Tags and avatars only |

Signature corner cut (`derived` from the monogram notch, `decided` sizes): a 45-degree cut on the top-right and bottom-left corners. Tokens `corner-cut-sm` 6px, `corner-cut-md` 10px, `corner-cut-lg` 16px. Helper classes `.corner-cut-sm|md|lg` ship in `tokens.css` as `clip-path` polygons. Use one cut surface per view section.

### 2.5 Elevation

`decided`. Prefer borders over shadows.

| Token | Value | Ground |
|---|---|---|
| `shadow.raisedDark` | `0 2px 8px rgba(0,0,0,.35)` | Dark |
| `shadow.overlayDark` | `0 8px 32px rgba(0,0,0,.5)` | Dark, modals and menus |
| `shadow.raisedLight` | `0 1px 3px rgba(7,8,8,.12)` | Light |

### 2.6 Motion

`decided`. Movement enters on the 45-degree diagonal, like the mark.

| Token | Value |
|---|---|
| `duration-fast` | 120ms |
| `duration-base` | 200ms |
| `duration-slow` | 320ms |
| `duration-reveal` | 560ms |
| `easing-standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `shift-enter` | `translate(-8px, 8px)` to `translate(0, 0)`, opacity 0 to 1 |

Rules: one orchestrated entrance per view. Hover and press feedback stays under 200ms. Respect `prefers-reduced-motion`: drop the shift, keep opacity (helper block in `tokens.css`). Logo moments may use a brightness sweep along the 45-degree diagonal. This references the legacy reveal video (see section 7.4).

### 2.7 Layout

`decided`:

| Token | Value |
|---|---|
| `layout.containerMax` | 1200px |
| `layout.gridColumns` | 12 |
| `layout.gutter` | 24px |
| `layout.pageMarginSm` | 24px |
| `layout.pageMarginLg` | 64px |
| `layout.sectionSpacing` | 96px |

Breakpoints (`recommended` — no source fixes these):

| Name | Width | Behavior |
|---|---|---|
| `sm` | ≥ 480px | Single column. Page margin 24px |
| `md` | ≥ 768px | Two-column layouts open. Page margin 24px |
| `lg` | ≥ 1024px | Full 12-column grid. Page margin 64px |
| `xl` | ≥ 1280px | Container caps at 1200px and centers |

Keep the switch from `pageMarginSm` to `pageMarginLg` at `lg`.

---

## 3. Identity system

### 3.1 The mark

`measured` from `DS CI-03.svg` (viewBox `0 0 140 139`). The monogram is a 129 × 129 square built from two pieces:

- Bottom-left triangle, path `M5.5,22 V134 h112 Z`.
- Top-right bracket with 45-degree cut corners, polygon `134.5,119 134.5,5 21.5,5 40.5,24 115.5,24 115.5,100 134.5,119`.

Arm thickness equals the notch: 19 units, or 14.7% of the square side. The gap between the pieces runs on the 45-degree diagonal. Never round the corners. Never change the cut angle.

### 3.2 Lockups

`measured` from the CI masters:

| Master set | ViewBox | Composition |
|---|---|---|
| `DS CI-01` / `-04` / `-07` | `0 0 1324 247` | Wordmark only, with the mark cropped at the frame edges: bracket fragment top-right, triangle fragment bottom-left |
| `DS CI-02` / `-05` / `-08` | `0 0 1223.13 155` | Compact horizontal lockup: full mark left, wordmark right |
| `DS CI-03` / `-06` / `-09` | `0 0 140 139` | Monogram only |

Wordmark construction: cap height 78.1 units, baseline y = 162.76, first letter starts x = 173.58. Fill variants per set: `-01/-02/-03` white, `-04/-05/-06` black, `-07/-08/-09` grey `#4D4D4D`.

Production files: use the cleaned masters in `brand/logo/` — `ds-mark-*`, `ds-lockup-horizontal-*`, `ds-lockup-horizontal-compact-*`, `ds-lockup-vertical-*`, each in `paper` (#FFFFFF), `ink` (#000000), `slate` (#4D4D4D). The vertical lockup adds the tagline `DIGITAL AGENCY`. `designs/DS CI.ai` stays the print master for offset work.

### 3.3 Logo rules

- Clear space: one bracket arm on all sides — 15% of the mark side, or 9% of the lockup height.
- Minimum sizes (`decided`): monogram 24px screen and 8mm print. Horizontal lockup 140px and 35mm. Compact 120px and 30mm. Vertical 200px and 50mm. Below 24px use the favicon or app icon.
- One-color reproduction only. Paper on dark grounds, Ink on light, Slate for subdued use on light. No gradients, outlines, or effects on the logo.
- On photography, put a Carbon scrim of at least 40% opacity behind the logo, or use a solid panel.
- Misuse: never stretch, rotate, or skew logo assets. Never recolor beyond the three fills. Never re-typeset the wordmark. Never detach the tagline. Never attach the tagline to other lockups.

### 3.4 App icon and favicon

`measured`: legacy `1x/Artboard 1.png` places the mark at 59.6% of a 743 × 744 near-black square. Spec: Paper mark at 60% of an Ink `#000000` square, centered. Files: `brand/exports/icon/` (1024, 512, 192, apple-touch 180) and `brand/exports/favicon/` (ICO 16/32/48, PNGs).

---

## 4. Component library

All components consume the tokens in section 2. Dark-first default: Carbon or Ink grounds, Paper type. Use Paper sections for rhythm.

### 4.1 Header and navigation

- Ground Carbon, height 64px (`space-8`), bottom border 1px grey-800.
- Left: compact horizontal lockup, `paper` fill, minimum 120px wide.
- Links: `body` size, Paper color, no underline at rest. Underline plus accent on hover and current page. Focus ring 2px accent.
- Mobile: full-screen Carbon overlay menu, `display` size links, close button top-right. Entrance uses `shift-enter` at `duration-slow`.

### 4.2 Footer

- Ground Ink, top border 1px grey-800, padding `space-9` vertical.
- Vertical lockup with tagline, `paper` fill, minimum 200px wide.
- Nav columns: `body-sm`, grey-400 links, Paper on hover, underlined on hover and focus.
- Legal line: `caption`, grey-500.

### 4.3 Buttons

| Variant | Rest | Hover | Pressed | Disabled |
|---|---|---|---|---|
| Primary | Accent `#FD4000` fill, Ink text, sharp corners | Ground shifts one grey step darker | Inverse: Ink fill, Paper text | `disabledOn*` fill and text, no shadow |
| Secondary | Transparent fill, 1px Paper border (dark) or Ink border (light), text follows ground | Border and text shift one grey step | Fill flips to ground-inverse | `disabledOn*` border and text |
| Ghost | Text only, ground color, underlined on hover | Underline | Text dims one step | `disabledOn*` text |

Sizes: height 48px (`space-6`) default, 40px compact. Padding `space-5` horizontal. Label `body` weight 600, verb-first copy ("Get a quote", never "Submit"). Radius 0. Focus ring 2px accent on both grounds.

### 4.4 Links

- Dark grounds: accent color, always underlined. Hover: brightness up one step, underline stays.
- Light grounds: Ink, always underlined. Hover: Slate.
- Never signal a link with color alone — the underline is required in every state.

### 4.5 Cards and panels

- Default: sharp corners, 1px grey-800 border on dark or grey-200 on light, no shadow at rest.
- Feature panel: `corner-cut-md` surface, Carbon ground, 1px grey-700 border. One per view section.
- Hover (interactive cards): `shadow-raisedDark`, border lifts one grey step, `duration-fast`.
- Padding `space-6`. Title `h3`. Body `body-sm`. Muted text grey-400 on dark.

### 4.6 Forms

- Inputs: 48px height, transparent or grey-900 fill on dark, 1px grey-700 border, radius 0, text Paper. On light: Paper fill, grey-300 border, Ink text.
- Focus: 2px accent ring, border drops to accent. Never remove the ring.
- Labels: `body-sm` weight 500 above the field. Errors: `body-sm`, use text plus a marker, not color alone. On dark use grey-100 text with an accent marker. Success and error copy states the fix, per the voice rules.
- Disabled: `disabledOn*` colors, no ring.

### 4.7 Section headers

- Eyebrow (`eyebrow` token, caps) above `display` heading with the 900/300 pairing on the key words. Optional `body-lg` opener below, 60–75 character measure.
- Optional 2px accent rule, 48px wide, above the eyebrow as a small marker.

### 4.8 Tags and badges

- `radius-pill`, `caption` size, 1px border, transparent fill, ground-appropriate text. Optional 6px square accent marker (small UI marker use).

### 4.9 Media and imagery

- Photography: monochrome, high contrast, real work and real people. Convert to greyscale. Never tint. Color appears only inside client work screenshots. Radius `radius-lg` is allowed. Sharp corners are preferred.
- Texture: thin line patterns from the legacy stationery as Carbon-section texture, maximum 8% visible contrast (source: `designs/Business Cards/line-patterns-*.zip`, 100 monochrome swatches).
- Motifs: the 45-degree diagonal as cropped corners and diagonal dividers. The lightning image ("Night Lightning") only in campaign headers, never in page chrome.
- Diagrams and UI mockups: Paper lines on Ink, 1px strokes, square corners, no 3D perspective.

---

## 5. Page layouts

### 5.1 Grid and page anatomy

- 12-column grid, container 1200px, gutter 24px, margins 24px (sm/md) and 64px (lg/xl).
- Section spacing is 96px between sections. Allow 128–192px before hero closers.
- Ground rotation: dark sections dominate (Carbon, Ink, grey-900/950). Insert a Paper section where rhythm needs air. Never place body-size grey-on-grey text.
- Hero: eyebrow, `display-xl` statement with the 900/300 pairing, `body-lg` opener, primary button. Mark or wordmark may anchor the composition on the 45-degree diagonal.
- Content sections: `display` header block per 4.7, 12-column content, cards in 2-up (md) or 3-up (lg) grids.
- Footer per 4.2. Every page ends with it.

### 5.2 Responsive shifts

| Range | Change |
|---|---|
| < 768px | Single column. Nav collapses to an overlay menu. `display-xl` scales down one ramp step. Cards stack full width |
| 768–1023px | Two-column card grids. Page margin still 24px |
| ≥ 1024px | Full 12-column grid. Page margin 64px. Three-up card grids |
| ≥ 1280px | Container caps at 1200px and centers |

Motion, contrast, and focus rules stay identical at every width.

### 5.3 Application reference: business card

`measured` from `designs/Business Cards/business-card.png` and `business-card2.png` (1004 × 591 render of a 1050 × 600 CMYK PSD, 3.5 × 2 in at 300 dpi):

- Front: Carbon `#070808` ground. Horizontal lockup in Paper, centered, with the tagline `DIGITAL AGENCY` letterspaced below.
- Back: Paper ground. Name in letterspaced caps top-left, role right, thin 1px rule, contact rows (EMAIL / PHONE / OFFICE) right of center, domain bold below, mark block bleeding off the bottom-left edge, small square bleeding off the top-right.
- The legacy card type is not canonical (older, narrower bold face). The current spec: Raleway per section 2.2, live details Baruch Truter, per Brand Book section 08. The stock template files carry specimen data ("Daniel Band", "dan@digitallyshifted.com"). Do not publish that data.

---

## 6. Asset inventory

Catalogue of `designs/` (64 files). "Disposition" says what the website build does with each item.

### 6.1 Canonical identity masters (use these)

| File | Format | Size | Content | Disposition |
|---|---|---|---|---|
| `DS CI-01.svg` | SVG | 3.7K | Wordmark, white fill, cropped mark fragments (1324 × 247) | Reference. Production file is `brand/logo/ds-lockup-horizontal-*` |
| `DS CI-02.svg` | SVG | 3.7K | Compact lockup, white (1223.13 × 155) | Reference. Use `ds-lockup-horizontal-compact-*` |
| `DS CI-03.svg` | SVG | 304B | Monogram, white (140 × 139) | Reference. Use `ds-mark-*` |
| `DS CI-04.svg` | SVG | 3.4K | Wordmark, black | Reference |
| `DS CI-05.svg` | SVG | 3.4K | Compact lockup, black | Reference |
| `DS CI-06.svg` | SVG | 230B | Monogram, black | Reference |
| `DS CI-07.svg` | SVG | 3.7K | Wordmark, grey #4D4D4D | Reference |
| `DS CI-08.svg` | SVG | 3.7K | Compact lockup, grey | Reference |
| `DS CI-09.svg` | SVG | 307B | Monogram, grey | Reference |
| `DS CI.ai` | AI/PDF | 385K | 9-page editable master, 2022-07-15, embedded Raleway-Thin subsets | Print master for offset work only |
| `DSlogo.ai`, `DSlogowhite.ai` | AI/PDF | 48K / 41K | Alternate single-page masters | Superseded by the CI sheets |
| `Artboard 1 copy 2–7.svg` (6 files) | SVG | 3.4–3.7K each | Per-artboard exports of the same three formats and three fills: copy 2/3 white, copy 4/5 black, copy 6/7 grey | Duplicates of CI-01/02/04/05/07/08. Reference only |

### 6.2 Raster logo exports (superseded, keep for provenance)

| File | Dimensions | Content | Disposition |
|---|---|---|---|
| `Artboard 1 copy 2.png` / `.jpg` | 5517×1030 / 1128×191 | Wordmark, white fill, cropped fragments | Replaced by SVG masters |
| `Artboard 1 copy 3.png` / `.jpg` | 5098×646 / 1224×155 | Compact lockup, white | Replaced |
| `Artboard 1 copy 4.png` / `.jpg` | 5517×1030 / 1324×247 | Wordmark, black fill (PNG ground transparent) | Replaced |
| `Artboard 1 copy 5.png` / `.jpg` | 5097×646 / 1224×155 | Compact lockup, black | Replaced |
| `Artboard 1 copy 6.png` / `.jpg` | 5517×1030 / 1324×247 | Wordmark, grey #4D4D4D | Replaced |
| `Artboard 1 copy 7.png` / `.jpg` | 5097×646 / 1224×155 | Compact lockup, grey | Replaced |
| `Artboard 10.jpg` / `.svg` | 189×189 / 140×139 | Monogram, white fill (SVG on transparent) | Replaced by `ds-mark-paper` exports |
| `Artboard 10 copy.png` / `.jpg` / `.svg` | 140×139 | Monogram, black (SVG fill default black) | Replaced |
| `Artboard 10 copy 2.png` / `.jpg` / `.svg` | 140×139 | Monogram, grey #4D4D4D | Replaced |
| `Hi quality/Artboard 10.png`, `copy`, `copy 2` | 584×580 | Monogram white / black / grey | Replaced |
| `Hi quality/Artboard 1 copy 2–7.png` | 5517×1030 or 5097×646 | High-res wordmark ramp, three fills | Replaced |
| `Hi quality/DSlogo.png` | 742×743 | Mark, white on black | Replaced |
| `Digitally Shifted Logo White.png` | 140×139 | Paper mark, transparent | Replaced by `ds-mark-paper.svg` |
| `Digitally-Shifted-Favicon.ico` / `.png` | ICO / 95×95 | Greyscale mark on near-black ground | Replaced by `brand/exports/favicon/` |
| `1x/Artboard 1.png` | 743×744 | App icon composition: mark at 59.6% of a near-black square | Source of the 60% app icon ratio. Use `brand/exports/icon/` |

### 6.3 Backgrounds, motifs, and stationery

| File | Dimensions | Content | Disposition |
|---|---|---|---|
| `Background.jpg` / `.psd` | 1920×1080 | Black ground, lockup and domain rotated 180° (video overlay layout) | Motif reference only. Not a web asset |
| `Business Cards/business-card.png` | 1004×591 | Card front: Carbon ground, lockup, tagline | Layout reference (section 5.3). Ground = Carbon token |
| `Business Cards/business-card2.png` | 1004×591 | Card back: name, rule, contacts, mark block | Layout reference |
| `Business Cards/business-card.psd` | 1050×600 CMYK | Card print source | Print only |
| `Business Cards/business-card.indd` | InDesign | Card layout source | Print only |
| `Business Cards/Night Lightning.jpg` | 7559×7559 | White lightning on black marble | Campaign header motif only, never page chrome |
| `Business Cards/business-card-2021-11-03-*.zip` | ZIP | Stock card template (PSD, EPS, AI, README) | Source archive. Contains specimen data. Do not publish |
| `Business Cards/business-card-2022-02-08-*.zip` | ZIP | Stock card template (INDD, IDML, README) | Source archive |
| `Business Cards/line-patterns-2022-02-08-*.zip` | ZIP | 100 monochrome line-pattern swatches (PNG, AI, PAT) | Section texture source, max 8% contrast |
| `Business Cards/night-lightning-2022-05-31-*.zip` | ZIP | Lightning art (AI, EPS, JPG, PAT) | Source archive for the motif |

### 6.4 Motion reference

| File | Content | Disposition |
|---|---|---|
| `mixkit-neon-logo-reveal-798.zip` | After Effects neon logo reveal, 8.0s, multi-hue neon (magenta/teal sampled), black ground | Motion reference only, for the diagonal brightness sweep idea. Its colors are rejected (owner decision, v2.1). Never publish its colors |

---

## 7. Legacy findings and constraints

### 7.1 Color

All legacy rasters measure 0.000 saturation. The system is monochrome plus one accent. Do not introduce a second hue, tints of the accent, or colored gradients.

### 7.2 Typography provenance

`DS CI.ai` embeds `Raleway-Thin` TrueType subsets (verified with `pdffonts`). Outline measurements give weight 900 for `DIGITALLY` and 300 for `SHIFTED`. The re-typeset wordmark in `brand/logo/` matches the legacy outlines pixel-exactly (AE = 0 at 5% fuzz). Never substitute a font or re-typeset the wordmark.

### 7.3 Geometry constants

Mark: 129 × 129 square in a 140 × 139 viewBox, arm 19, notch 19 × 19, cut angle 45 degrees. The canonical lockups are 1324 × 247 and 1223.13 × 155. The app icon mark ratio is 0.6. These constants are frozen. Build derived UI (corner cuts) from them, not by eye.

### 7.4 Motion reference

The Mixkit reveal (8.0s) shows a logo emerging through a neon sweep on black. The approved adaptation: a greyscale brightness sweep along the 45-degree diagonal for logo moments only. The neon palette is rejected and must not appear in any deliverable.

### 7.5 Superseded assets

The raster exports in section 6.2, the two `.ai` alternates, and the legacy favicon stay in `designs/` for provenance. Production uses only `brand/logo/`, `brand/exports/`, and `brand/fonts/`. The stock business card zips contain template license files and specimen data. Do not publish their contents.

---

## 8. Implementation notes

1. Link `brand/tokens/tokens.css` once per page. Read every value from the custom properties. Do not restate hex values in component CSS.
2. Preload the Raleway variable font as woff2 in production with `font-display: swap`.
3. Favicon: serve `brand/exports/favicon/favicon.ico` (16/32/48) plus `apple-touch-icon-180.png`.
4. Logo SVGs come from `brand/logo/`. Inline them or serve them as files. Never use raster.
5. Keep the reduced-motion block from `tokens.css`. It maps `prefers-reduced-motion` to near-zero durations.
6. Contrast pairings pass WCAG 2.2 AA as approved. If a new pairing appears, measure it before shipping and keep links underlined.
7. `recommended` items (section 2.7 breakpoints) are the only values in this spec open to tuning. Record any change in the project notes.

---

*Extracted from `designs/` on 2026-10-19 by the design-ingestion pass for DIG-55. Values follow `brand/tokens/design-tokens.json` v4.1.0 and Brand Book v4.1 (owner-approved 2026-10-18, interaction `9f14485c`).*
