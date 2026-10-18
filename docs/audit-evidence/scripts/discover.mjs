// Discover: robots.txt, sitemaps, homepage links via browser network stack.
import { chromium } from 'playwright-core';
import { writeFileSync } from 'fs';

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

// Warm up challenge on a real navigation
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
for (let i = 0; i < 60; i++) {
  const t = await page.title().catch(() => '');
  if (t && !/one moment|loading\s*https?:/i.test(t)) break;
  await page.waitForTimeout(1000);
}
await context.storageState({ path: '/tmp/dig54/state.json' });

async function grab(path, saveAs) {
  const res = await context.request.get(BASE + path);
  const text = await res.text().catch(() => '');
  console.log(`GET ${path} -> ${res.status()} ${res.headers()['content-type'] || ''} bytes=${text.length}`);
  if (saveAs) writeFileSync('/tmp/dig54/' + saveAs, text);
  return { status: res.status(), text, headers: res.headers() };
}

await grab('/robots.txt', 'robots.txt');
await grab('/sitemap.xml', 'sitemap.xml');
await grab('/sitemap_index.xml', 'sitemap_index.xml');
await grab('/wp-sitemap.xml', 'wp-sitemap.xml');

// Links from the settled homepage DOM
const links = await page.evaluate(() => {
  const out = new Set();
  document.querySelectorAll('a[href]').forEach(a => out.add(a.href));
  return [...out];
});
writeFileSync('/tmp/dig54/home-links.json', JSON.stringify(links, null, 1));
console.log('home_links=' + links.length);
await browser.close();
