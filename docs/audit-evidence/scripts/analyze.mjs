// Analyze all crawled pages: SEO, structured data, analytics, tech, headings.
import { readFileSync, writeFileSync, readdirSync } from 'fs';

const dir = '/tmp/dig54/pages';
const manifest = JSON.parse(readFileSync('/tmp/dig54/manifest.json', 'utf8'));
const files = readdirSync(dir).sort();

function m1(re, s) { const m = s.match(re); return m ? m[1] : null; }

const ANALYTICS = {
  'GA4 (gtag.js)': /googletagmanager\.com\/gtag\/js|gtag\(\s*['"]config/,
  'GTM container': /googletagmanager\.com\/gtm-|dataLayer/,
  'MonsterInsights': /monsterinsights|google-analytics-premium/,
  'Meta Pixel (fbq)': /connect\.facebook\.net[^"']*fbevents\.js|fbq\(\s*['"]init/,
  'Tawk.to chat': /tawk\.to|Tawk_API/,
  'Microsoft Clarity': /clarity\.ms/,
  'Hotjar': /hotjar\.com/,
  'WordPress REST link': /wp-json/,
  'Rank Math SEO': /rank-math|rankmath/,
  'Elementor': /elementor/i,
  'LiteSpeed Cache': /litespeed/,
  'WooCommerce': /woocommerce/i,
  'reCAPTCHA': /recaptcha/i,
  'hCaptcha': /hcaptcha/i,
  'WhatsApp widget': /wa\.me|whatsapp/,
};

const results = [];
for (let i = 0; i < files.length; i++) {
  const html = readFileSync(`${dir}/${files[i]}`, 'utf8');
  const rec = manifest[i] || {};
  const title = m1(/<title>([^<]*)<\/title>/i, html);
  const metas = {};
  for (const mm of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const tag = mm[0];
    const name = m1(/name=["']([^"']+)["']/i, tag);
    const prop = m1(/property=["']([^"']+)["']/i, tag);
    const content = m1(/content=["']([^"']*)["']/i, tag);
    if (name && content) metas[name] = content;
    if (prop && content) metas[prop] = content;
  }
  const canonical = m1(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i, html);
  const jsonLd = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => {
    try { return JSON.parse(m[1].trim()); } catch { return { _parse_error: true, _raw: m[1].slice(0, 120) }; }
  });
  const jsonLdTypes = [];
  for (const j of jsonLd) {
    const t = j && (j['@type'] || (j['@graph'] && j['@graph'].map(g => g['@type'])));
    if (t) jsonLdTypes.push(...(Array.isArray(t) ? t : [t]));
  }
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(x => x[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  const counts = {
    h1: (html.match(/<h1[\s>]/gi) || []).length,
    h2: (html.match(/<h2[\s>]/gi) || []).length,
    h3: (html.match(/<h3[\s>]/gi) || []).length,
    img: (html.match(/<img[\s>]/gi) || []).length,
    imgNoAlt: (html.match(/<img(?![^>]*\salt=)[^>]*>/gi) || []).length,
    scripts: (html.match(/<script[\s>]/gi) || []).length,
    externalScripts: [...html.matchAll(/<script[^>]*src=["']([^"']+)["']/gi)].map(x => x[1]).filter(s => /^https?:/.test(s)),
    stylesheets: (html.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi) || []).length,
  };
  const hits = {};
  for (const [k, re] of Object.entries(ANALYTICS)) if (re.test(html)) hits[k] = true;
  const forms = [...html.matchAll(/<form[^>]*>/gi)].map(f => f[0]);
  const generators = [...html.matchAll(/<meta\s+name=["']generator["']\s+content=["']([^"']+)["']/gi)].map(x => x[1]);

  results.push({
    file: files[i], url: rec.url, status: rec.status, bytes: rec.bytes,
    title, metas, canonical, jsonLdTypes, generators,
    h1, counts, forms: forms.length, analytics: Object.keys(hits),
    metaRobots: metas['robots'] || null,
    ogTitle: metas['og:title'] || null,
    description: metas['description'] || null,
  });
}
writeFileSync('/tmp/dig54/analysis.json', JSON.stringify(results, null, 1));
console.log('analyzed=' + results.length);
// Compact summary table
for (const r of results) {
  console.log('---');
  console.log(r.url);
  console.log('  title: ' + (r.title || 'MISSING'));
  console.log('  desc: ' + (r.description ? r.description.slice(0, 90) : 'MISSING'));
  console.log('  canonical: ' + (r.canonical || 'MISSING'));
  console.log('  meta-robots: ' + (r.metaRobots || '-'));
  console.log('  jsonld: ' + JSON.stringify(r.jsonLdTypes));
  console.log('  h1(' + r.counts.h1 + '): ' + r.h1.slice(0, 2).join(' | ').slice(0, 100));
  console.log('  img=' + r.counts.img + ' noAlt=' + r.counts.imgNoAlt + ' scripts=' + r.counts.scripts + ' ext=' + r.counts.externalScripts.length);
  console.log('  analytics: ' + r.analytics.join(', '));
}
