# Token contrast table — 2026-10-18T20:16:43.520Z

Source: DS design tokens v4.1.0 (2026-10-18), brand/tokens/design-tokens.json. Method: WCAG 2.2 relative luminance.
Pairs measured: 27 · Below minimum: 5

| Foreground | Background | Theme | Use | Criterion | Minimum | Measured | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `text-on-light` #000000 | `paper` #FFFFFF | light | Body text on light ground | 1.4.3 | 4.5:1 | 21:1 | Pass |
| `text-on-light-muted` #4D4D4D | `paper` #FFFFFF | light | Muted text on light ground | 1.4.3 | 4.5:1 | 8.45:1 | Pass |
| `text-on-light` #000000 | `grey-50` #FAFAFA | light | Body text on subtle light surface | 1.4.3 | 4.5:1 | 20.12:1 | Pass |
| `text-on-light-muted` #4D4D4D | `grey-50` #FAFAFA | light | Muted text on subtle light surface | 1.4.3 | 4.5:1 | 8.1:1 | Pass |
| `link-on-light` #000000 | `paper` #FFFFFF | light | Links on light ground | 1.4.3 | 4.5:1 | 21:1 | Pass |
| `ink` #000000 | `accent` #FD4000 | light | Primary button label on accent fill; skip-link label | 1.4.3 | 4.5:1 | 5.91:1 | Pass |
| `paper` #FFFFFF | `grey-700` #383838 | light | Primary button label on hover fill | 1.4.3 | 4.5:1 | 11.73:1 | Pass |
| `ink` #000000 | `grey-200` #DEDEDE | light | Secondary-light button active fill label | 1.4.3 | 4.5:1 | 15.61:1 | Pass |
| `grey-600` #4D4D4D | `paper` #FFFFFF | light | Secondary-light hover label (slate) | 1.4.3 | 4.5:1 | 8.45:1 | Pass |
| `text-on-dark` #F0F0F0 | `carbon` #070808 | dark | Body text on carbon ground (hero, feature panel, CTA band) | 1.4.3 | 4.5:1 | 17.6:1 | Pass |
| `text-on-dark-muted` #A3A3A3 | `carbon` #070808 | dark | Muted text on carbon ground | 1.4.3 | 4.5:1 | 7.95:1 | Pass |
| `link-on-dark` #FD4000 | `carbon` #070808 | dark | Accent links on carbon ground | 1.4.3 | 4.5:1 | 5.64:1 | Pass |
| `grey-100` #F0F0F0 | `carbon` #070808 | dark | Secondary-dark button label | 1.4.3 | 4.5:1 | 17.6:1 | Pass |
| `paper` #FFFFFF | `carbon` #070808 | dark | Secondary-dark hover label on carbon | 1.4.3 | 4.5:1 | 20.05:1 | Pass |
| `text-on-dark` #F0F0F0 | `ink` #000000 | dark | Body text on ink footer | 1.4.3 | 4.5:1 | 18.43:1 | Pass |
| `grey-400` #A3A3A3 | `ink` #000000 | dark | Footer nav links and column headings on ink | 1.4.3 | 4.5:1 | 8.33:1 | Pass |
| `grey-500` #808080 | `ink` #000000 | dark | Footer legal captions on ink | 1.4.3 | 4.5:1 | 5.32:1 | Pass |
| `accent` #FD4000 | `ink` #000000 | dark | Footer contact links (link-dark) on ink | 1.4.3 | 4.5:1 | 5.91:1 | Pass |
| `paper` #FFFFFF | `disabled-on-light` #A3A3A3 | light | Disabled button label — 1.4.3 exempts disabled controls; advisory constraint, do not rely on it for enabled UI | 1.4.3 | 4.5:1 | 2.52:1 | **Fail** |
| `accent` #FD4000 | `paper` #FFFFFF | light | Focus ring on light (non-text UI); large display accents only, never body-size text on light | 1.4.11 / 2.4.13 | 3:1 | 3.55:1 | Pass |
| `accent` #FD4000 | `carbon` #070808 | dark | Focus ring on carbon | 1.4.11 / 2.4.13 | 3:1 | 5.64:1 | Pass |
| `grey-200` #DEDEDE | `paper` #FFFFFF | light | Card border at rest on light — decorative boundary, text carries identification | 1.4.11 | 3:1 | 1.35:1 | **Fail** |
| `grey-300` #C4C4C4 | `paper` #FFFFFF | light | Reserved — unused since AC-012 moved card hover borders to grey-500 | 1.4.11 | 3:1 | 1.74:1 | **Fail** |
| `grey-800` #262626 | `carbon` #070808 | dark | Hairline separators on carbon/ink — decorative | 1.4.11 | 3:1 | 1.33:1 | **Fail** |
| `grey-700` #383838 | `carbon` #070808 | dark | Decorative hairline borders on carbon (feature panel, dialog) — decorative boundary, text carries identification | 1.4.11 | 3:1 | 1.71:1 | **Fail** |
| `grey-500` #808080 | `carbon` #070808 | dark | Interactive card hover border on carbon — state indication (AC-012) | 1.4.11 | 3:1 | 5.08:1 | Pass |
| `grey-500` #808080 | `paper` #FFFFFF | light | Interactive card hover border on light — state indication (AC-012) | 1.4.11 | 3:1 | 3.95:1 | Pass |

## Pairs below their minimum

- `paper` on `disabled-on-light` (light): 2.52:1 against 4.5:1 — Disabled button label — 1.4.3 exempts disabled controls; advisory constraint, do not rely on it for enabled UI
- `grey-200` on `paper` (light): 1.35:1 against 3:1 — Card border at rest on light — decorative boundary, text carries identification
- `grey-300` on `paper` (light): 1.74:1 against 3:1 — Reserved — unused since AC-012 moved card hover borders to grey-500
- `grey-800` on `carbon` (dark): 1.33:1 against 3:1 — Hairline separators on carbon/ink — decorative
- `grey-700` on `carbon` (dark): 1.71:1 against 3:1 — Decorative hairline borders on carbon (feature panel, dialog) — decorative boundary, text carries identification
