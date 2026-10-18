// Probe: open the site, pass the JS challenge, save cookies + report.
import { chromium } from 'playwright-core';

const EXE = '/home/baruch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = 'https://digitallyshifted.com';

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
});
const page = await context.newPage();

const t0 = Date.now();
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });

// Wait for the challenge to clear: title should stop being "One moment, please..."
let title = '';
for (let i = 0; i < 40; i++) {
  title = await page.title();
  if (title && !/one moment/i.test(title)) break;
  await page.waitForTimeout(1000);
}
console.log('elapsed_ms=' + (Date.now() - t0));
console.log('final_url=' + page.url());
console.log('title=' + title);

// Give SPA/JS a moment, then dump key facts.
await page.waitForTimeout(3000);
title = await page.title();
const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 600);
console.log('---BODY START---');
console.log(bodyText);
console.log('---BODY END---');

await context.storageState({ path: '/tmp/dig54/state.json' });
const ua = await page.evaluate(() => navigator.userAgent);
console.log('UA=' + ua);

// Raw HTML of the settled homepage for analysis
const html = await page.content();
const { writeFileSync } = await import('fs');
writeFileSync('/tmp/dig54/home.html', html);
console.log('home_html_bytes=' + html.length);

await browser.close();
