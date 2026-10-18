# Website relaunch

Engineering home for the new Digitally Shifted website. The site is an
Astro static build styled with the DS design tokens v4.1
(`docs/DESIGN-SPEC.md`).

- Design spec (tokens, components, layouts): `docs/DESIGN-SPEC.md`
- Conversion goals, forms, and CTAs: `docs/conversion-spec.md`
- Deploy process, checks, and rollback: `docs/deploy-process.md`
- Security review checklist (launch gate): `docs/security-review.md`
- Dependency audit cadence: `docs/dependency-audit.md`
- Staging URL: https://digitally-shifted.github.io/website-relaunch/
- Staging deploys automatically on every push to `main`.
- Production releases are separate and need a manual approval step.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Astro 7, static output |
| Styling | Tailwind CSS 4, tokens from `brand/tokens/tokens.css` |
| Language | TypeScript, strict mode |
| Node | 24 (`.nvmrc`) |

Note: `astro check` does not support TypeScript 7 yet. The build and the
browser checks are the gates until Astro ships TypeScript 7 support.

## Local preview

```sh
npm install
npm run dev
# open http://localhost:4321/
```

## Production build

```sh
bash scripts/build-site.sh site
python3 -m http.server 8080 --directory site
```

Staging builds (the default `BUILD_ENV`) run under the GitHub Pages project
prefix and carry `noindex`. Production builds run with
`BUILD_ENV=production` and no prefix.

## Source layout

```text
brand/           DS brand kit: tokens, logo SVGs, fonts, icon exports
docs/            Design spec, conversion spec, deploy process, audits
public/          Favicons, fonts, logo SVGs, robots.txt
scripts/         Build, staging deploy, and rollback scripts
src/components/  Header, footer, mobile action bar, cards, CTAs
src/layouts/     BaseLayout (page shell) and ContentLayout (content pages)
src/lib/         Site facts and URL helpers
src/pages/       Routes: home, services, about, contact, privacy, 404
```

## Page and component inventory (DIG-71)

| Route | Template | Notes |
| --- | --- | --- |
| `/` | `src/pages/index.astro` | Hero, services summary, WaaS panel, closing CTA |
| `/services` | `src/pages/services.astro` | Four service sections, per-service `?need=` CTAs |
| `/about` | `src/pages/about.astro` | Who we are, how we work, one closing CTA |
| `/contact` | `src/pages/contact.astro` | Form slot is marked for DIG-69; CTA and mobile bar hidden |
| `/contact/thank-you` | `src/pages/contact/thank-you.astro` | noindex; focus moves to the headline |
| `/privacy` | `src/pages/privacy.astro` | Standard content page through `ContentLayout`; noindex |
| `404` | `src/pages/404.astro` | Headline, one line, one CTA |

Page copy is draft and marked `DRAFT COPY` in each page file. DIG-63 owns
the final copy. The contact form component and the remaining interactive
components belong to DIG-69 and DIG-72; the contact page marks the form
slot. CTA links carry `data-ds-location` attributes so the analytics
module (DIG-65) can bind its click events without layout changes.
