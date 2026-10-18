// Astro configuration for the Digitally Shifted website relaunch.
//
// Public environment variables (set by scripts/build-site.sh):
//   PUBLIC_BASE_PATH - URL prefix for staging under GitHub Pages project
//                      hosting ("/website-relaunch"). Empty for a root deploy.
//   PUBLIC_BUILD_ENV - "staging" or "production". Staging pages are noindex.
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

const basePath = process.env.PUBLIC_BASE_PATH || '/';

/*
 * Redirect map (DIG-89): docs/migration/redirect-map.json is the single
 * source of truth. Astro ships one meta-refresh stub page per 1:1 entry, so
 * every old page URL resolves on any static host. The production host
 * upgrades these to real 301s through the generated .htaccess at cutover
 * (docs/go-live-runbook.md). Host-level patterns (410s, queries, media)
 * stay in the host config and are not stubbed here.
 */
const redirectMap = JSON.parse(
  readFileSync(new URL('./docs/migration/redirect-map.json', import.meta.url), 'utf8'),
);
const trim = (p) => (p === '/' ? '/' : p.replace(/\/+$/, ''));

/*
 * Prefix the active base path onto stub destinations. Without this, a
 * staging stub refreshes to /blog and misses the /website-relaunch prefix,
 * which lands on a 404 (DIG-88). Production builds run with no base path
 * and keep the map's own root-relative destinations.
 */
const prefixBase = (p) =>
  basePath && basePath !== '/' && !/^https?:\/\//.test(p) ? `${basePath}${p}` : p;
const redirects = Object.fromEntries(
  redirectMap.redirects.map((r) => [trim(r.old), prefixBase(trim(r.new))]),
);

export default defineConfig({
  site: 'https://digitallyshifted.com',
  base: basePath,
  trailingSlash: 'ignore',
  output: 'static',
  redirects,
  integrations: [
    sitemap({
      /* Keep noindex pages (thank-you, privacy) out of the sitemap. */
      filter: (page) => !page.endsWith('contact/thank-you/') && !page.endsWith('/privacy/'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
