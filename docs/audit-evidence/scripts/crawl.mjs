// Crawl: fetch all sitemap URLs + homepage-discovered pages. Save status/headers/html.
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';

const EXE = '/home/baruch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = 'https://digitallyshifted.com';

const browser = await chromium.launch({
  executablePath: EXE, headless: true,
  args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
});
await context.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
const page = await context.newPage();

// Pass challenge once
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
for (let i = 0; i < 60; i++) {
  const t = await page.title().catch(() => '');
  if (t && !/one moment|loading\s*https?:/i.test(t)) break;
  await page.waitForTimeout(1000);
}
await context.storageState({ path: '/tmp/dig54/state.json' });

// Build URL list from sitemaps
function urlsFromSitemap(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
}
const sitemapSources = {};
for (const sm of ['/post-sitemap.xml', '/page-sitemap.xml', '/category-sitemap.xml']) {
  const res = await context.request.get(BASE + sm);
  const xml = await res.text();
  sitemapSources[sm] = { status: res.status(), urls: urlsFromSitemap(xml) };
  console.log(`${sm} -> ${res.status()} urls=${sitemapSources[sm].urls.length}`);
}
writeFileSync('/tmp/dig54/sitemaps.json', JSON.stringify(sitemapSources, null, 1));

// Master URL list: sitemap URLs first, then homepage links (internal, non-anchor)
const all = new Set();
for (const sm of Object.values(sitemapSources)) sm.urls.forEach(u => all.add(u));
const homeLinks = JSON.parse(readFileSync('/tmp/dig54/home-links.json', 'utf8'));
for (const l of homeLinks) {
  if (l.startsWith(BASE) && !l.includes('#')) all.add(l);
}
const urls = [...all].sort();
console.log('total_unique_urls=' + urls.length);
writeFileSync('/tmp/dig54/urls.json', JSON.stringify(urls, null, 1));

mkdirSync('/tmp/dig54/pages', { recursive: true });

async function fetchUrl(u, i) {
  let res = await context.request.get(u, { maxRedirects: 5 });
  let text = await res.text();
  // Challenge detection -> real navigation fallback
  if (res.status() === 403 || /one moment, please|please wait while your request/i.test(text)) {
    console.log(`  challenge on ${u}; falling back to page.goto`);
    const p2 = await context.newPage();
    const resp = await p2.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 });
    for (let k = 0; k < 45; k++) {
      const t = await p2.title().catch(() => '');
      if (t && !/one moment|loading\s*https?:|please wait/i.test(t)) break;
      await p2.waitForTimeout(1000);
    }
    text = await p2.content();
    const rec = { url: u, status: resp ? resp.status() : null, finalUrl: p2.url(), bytes: text.length, via: 'browser' };
    writeFileSync(`/tmp/dig54/pages/${String(i).padStart(3, '0')}.html`, text);
    await p2.close();
    return rec;
  }
  writeFileSync(`/tmp/dig54/pages/${String(i).padStart(3, '0')}.html`, text);
  return { url: u, status: res.status(), finalUrl: res.url(), bytes: text.length, via: 'request' };
}

const manifest = [];
for (let i = 0; i < urls.length; i++) {
  const u = urls[i];
  try {
    const rec = await fetchUrl(u, i);
    manifest.push(rec);
    console.log(`[${i + 1}/${urls.length}] ${rec.status} ${rec.bytes}B ${u}`);
  } catch (e) {
    manifest.push({ url: u, status: null, error: String(e).slice(0, 200) });
    console.log(`[${i + 1}/${urls.length}] ERROR ${u}: ${String(e).slice(0, 120)}`);
  }
  await new Promise(r => setTimeout(r, 400));
}
writeFileSync('/tmp/dig54/manifest.json', JSON.stringify(manifest, null, 1));
console.log('DONE pages=' + manifest.length);

// Also capture response headers of the homepage once for hosting details
const hres = await context.request.get(BASE + '/');
const hh = hres.headers();
writeFileSync('/tmp/dig54/home-headers.json', JSON.stringify(hh, null, 1));
console.log('home_headers_captured=' + Object.keys(hh).length);
await browser.close();
