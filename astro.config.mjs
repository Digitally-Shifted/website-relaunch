// Astro configuration for the Digitally Shifted website relaunch.
//
// Public environment variables (set by scripts/build-site.sh):
//   PUBLIC_BASE_PATH - URL prefix for staging under GitHub Pages project
//                      hosting ("/website-relaunch"). Empty for a root deploy.
//   PUBLIC_BUILD_ENV - "staging" or "production". Staging pages are noindex.
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const basePath = process.env.PUBLIC_BASE_PATH || '/';

export default defineConfig({
  site: 'https://digitallyshifted.com',
  base: basePath,
  trailingSlash: 'ignore',
  output: 'static',
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
