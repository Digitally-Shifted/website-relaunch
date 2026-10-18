// Final checks: redirects, 404, WP endpoints, security headers, timing.
import { chromium } from 'playwright-core';
import { writeFileSync } from 'fs';

const EXE = '/home/baruch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const B = 'https://digitallyshifted.com';

const browser = await chromium.launch({
  executablePath: EXE, headless: true,
  args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage'],
});
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
});
await context.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
const page = await context.newPage();

// pass challenge once
await page.goto(B + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
for (let i = 0; i < 60; i++) {
  const t = await page.title().catch(() => '');
  if (t && !/one moment|loading\s*https?:|please wait/i.test(t)) break;
  await page.waitForTimeout(1000);
}

const out = {};
async function probe(name, url) {
  try {
    const res = await context.request.get(url, { maxRedirects: 0 }).catch(async e => {
      // maxRedirects 0 throws on redirect in some versions; fall back to manual
      return null;
    });
    if (res) {
      out[name] = { url, status: res.status(), location: res.headers()['location'] || null, server: res.headers()['server'] || null };
      console.log(`${name}: ${res.status()} loc=${out[name].location} server=${out[name].server}`);
      return;
    }
    // fallback: follow fully
    const r2 = await context.request.get(url);
    out[name] = { url, status: r2.status(), finalUrl: r2.url() };
    console.log(`${name}: ${r2.status()} final=${r2.url()}`);
  } catch (e) {
    out[name] = { url, error: String(e).slice(0, 160) };
    console.log(`${name}: ERROR ${String(e).slice(0, 120)}`);
  }
}

// redirect checks with a page-level goto to observe final URLs
const redirectTests = [
  ['http_apex', 'http://digitallyshifted.com/'],
  ['http_www', 'http://www.digitallyshifted.com/'],
  ['https_www', 'https://www.digitallyshifted.com/'],
];
for (const [name, url] of redirectTests) {
  const p = await context.newPage();
  const resp = await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  let title = '';
  for (let i = 0; i < 40; i++) {
    title = await p.title().catch(() => '');
    if (title && !/one moment|loading\s*https?:|please wait/i.test(title)) break;
    await p.waitForTimeout(1000);
  }
  out[name] = { requested: url, finalUrl: p.url(), status: resp ? resp.status() : null, title };
  console.log(`${name}: final=${p.url()} status=${out[name].status}`);
  await p.close();
}

await probe('status_404', B + '/this-page-does-not-exist-xyz123/');
await probe('wp_json_root', B + '/wp-json/');
await probe('wp_json_users', B + '/wp-json/wp/v2/users');
await probe('wp_login', B + '/wp-login.php');
await probe('xmlrpc', B + '/xmlrpc.php');
await probe('readme', B + '/readme.html');

// security headers on a fresh page hit
const sec = await context.request.get(B + '/contact-us/');
const sh = sec.headers();
out.security_headers = Object.fromEntries(Object.entries(sh).filter(([k]) =>
  ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'server', 'x-powered-by', 'x-litespeed-cache'].includes(k)));
console.log('security_headers=' + JSON.stringify(out.security_headers, null, 1));

// timing: 3 runs through browser network stack
const timings = [];
for (let i = 0; i < 3; i++) {
  const t0 = Date.now();
  await context.request.get(B + '/');
  timings.push(Date.now() - t0);
}
out.ttfb_request_ms = timings;
console.log('request_ms=' + timings.join(','));

writeFileSync('/tmp/dig54/final-checks.json', JSON.stringify(out, null, 1));
await browser.close();
console.log('DONE');
