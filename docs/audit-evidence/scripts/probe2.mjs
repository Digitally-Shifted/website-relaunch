// Probe v2: stealth-ish headless, patient challenge wait.
import { chromium } from 'playwright-core';

const EXE = '/home/baruch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = 'https://digitallyshifted.com';

const browser = await chromium.launch({
  executablePath: EXE,
  headless: true,
  args: [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
});
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
});
const page = await context.newPage();

const t0 = Date.now();
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });

let title = '';
let bodyLen = 0;
let settled = false;
for (let i = 0; i < 90; i++) {
  title = await page.title().catch(() => '');
  const body = await page.locator('body').innerText().catch(() => '');
  bodyLen = body.trim().length;
  const challengey = /one moment|please wait|loading\s*https?:/i.test(title) || /please wait while/i.test(body);
  if (!challengey && bodyLen > 300) { settled = true; break; }
  await page.waitForTimeout(1000);
}
console.log('elapsed_ms=' + (Date.now() - t0) + ' settled=' + settled);
console.log('final_url=' + page.url());
console.log('title=' + title);
console.log('body_len=' + bodyLen);

await context.storageState({ path: '/tmp/dig54/state.json' });
const html = await page.content();
const { writeFileSync } = await import('fs');
writeFileSync('/tmp/dig54/home.html', html);
console.log('home_html_bytes=' + html.length);
console.log('---BODY HEAD---');
console.log((await page.locator('body').innerText().catch(() => '')).slice(0, 800));
await browser.close();
