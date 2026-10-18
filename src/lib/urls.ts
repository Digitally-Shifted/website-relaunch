/*
 * URL helpers. Internal links go through these so the site works both at a
 * root domain and under the GitHub Pages project prefix (staging).
 */

/** Prefix an absolute site path with the configured base path. */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const trimmed =
    base === '/' ? '' : base.endsWith('/') ? base.slice(0, -1) : base;
  return `${trimmed}${path}`;
}

/** Absolute canonical URL for a site path. */
export function canonical(path: string): string {
  const site = import.meta.env.SITE || 'https://digitallyshifted.com';
  return new URL(withBase(path), site.endsWith('/') ? site : `${site}/`).toString();
}
