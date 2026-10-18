/**
 * Audit configuration for the WCAG 2.2 Level AA audit (issue DIG-26).
 *
 * The site (DIG-71 core layouts, DIG-72 remaining pages) exposes one theme:
 * paper grounds with carbon feature sections. There is no theme switch and
 * no `data-theme` attribute, so `themes` holds the single default theme and
 * the scanner labels rows honestly. If a dark theme ships later, add it here.
 */
const resultsDir = new URL('./results/', import.meta.url).pathname;

export const config = {
  // Base URL of the built site. Serve the production build before scanning.
  baseUrl: process.env.A11Y_BASE_URL ?? 'http://127.0.0.1:4173',

  // Every route in src/pages (DIG-71 + DIG-72 output, 2026-10-18).
  pages: [
    { name: 'home', path: '/' },
    { name: 'about', path: '/about/' },
    { name: 'services-hub', path: '/services/' },
    { name: 'service-website-development', path: '/services/website-development/' },
    { name: 'service-domains-hosting', path: '/services/domains-hosting/' },
    { name: 'service-paid-advertising', path: '/services/paid-advertising/' },
    { name: 'blog-index', path: '/blog/' },
    { name: 'blog-website-development', path: '/blog/website-development/' },
    { name: 'blog-digital-marketing', path: '/blog/digital-marketing/' },
    { name: 'blog-hosting-domains', path: '/blog/hosting-domains/' },
    { name: 'blog-paid-advertising', path: '/blog/paid-advertising/' },
    { name: 'faq', path: '/faq/' },
    { name: 'contact', path: '/contact/' },
    { name: 'contact-thank-you', path: '/contact/thank-you/' },
    { name: 'privacy', path: '/privacy/' },
    { name: 'not-found', path: '/404.html' },
  ],

  // Spec section 4: audit widths.
  widths: [375, 768, 1280, 1920],

  // The site ships one theme (no data-theme switch). Rows are labelled with
  // this value. Add 'dark' here when a theme attribute exists.
  themes: ['default'],
  themeAttribute: 'data-theme',

  // axe-core rule collections that map to the spec target (WCAG 2.2 A/AA)
  // plus best practices that back the spec checks.
  axeTags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],

  // Local Chromium binary. Override with A11Y_CHROMIUM when needed.
  executablePath: process.env.A11Y_CHROMIUM ?? '/usr/bin/chromium',

  // Offline HTML validation (html-validate). No page markup leaves the machine.
  htmlValidate: true,

  resultsDir,
};
