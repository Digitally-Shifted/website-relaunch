/*
 * Site regression tests for the DIG-88 critical fixes. These tests build
 * the site once with the standard build script, then assert the built
 * output. They guard:
 *
 *   1. the contact form contract on /contact (was a placeholder — the core
 *      conversion journey was missing),
 *   2. the meta description length contract (155 characters, BaseLayout
 *      prop doc; the blog topic pages exceeded it),
 *   3. every internal fragment link resolves to an existing id (the guide
 *      post's #hosting and #seo links landed on a page without them),
 *   4. the analytics module is referenced by every page and carries the
 *      event contract (it was never loaded anywhere),
 *   5. the staging base path reaches the form's thank-you redirect.
 *
 * Run: node --test test/site-regression.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, relative } from 'node:path';

const execFileAsync = promisify(execFile);
const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), '..');
const redirectMap = JSON.parse(
  readFileSync(join(repoRoot, 'docs', 'migration', 'redirect-map.json'), 'utf8'),
);

let distDir;
let htmlFiles;

async function walkHtml(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walkHtml(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

before(async () => {
  distDir = await mkdtemp(join(tmpdir(), 'dig88-dist-'));
  await execFileAsync('bash', ['scripts/build-site.sh', distDir], { cwd: repoRoot });
  htmlFiles = await walkHtml(distDir);
  assert.ok(htmlFiles.length >= 15, `expected the full page set, got ${htmlFiles.length}`);
});

after(async () => {
  if (distDir) await rm(distDir, { recursive: true, force: true });
});

function readBuilt(path) {
  return readFile(join(distDir, path), 'utf8');
}

/* Astro ships one minimal meta-refresh stub per redirect-map entry. */
function isRedirectStub(html) {
  return html.includes('http-equiv="refresh"') && !html.includes('<html');
}

function findHtml(pathSuffix) {
  const hit = htmlFiles.find((file) => file.endsWith(pathSuffix));
  assert.ok(hit, `no built page ends with ${pathSuffix}`);
  return hit;
}

/* ---------- 1. contact form contract ---------- */

test('contact page renders the enquiry form, not the DIG-69 placeholder', async () => {
  const html = await readBuilt('contact/index.html');
  assert.ok(!html.includes('The enquiry form is built in DIG-69'), 'placeholder text must be gone');
  assert.match(html, /<form[^>]*data-ds-contact-form/);
  assert.match(html, /novalidate/);
});

test('the form carries the full conversion spec 4.1 field contract', async () => {
  const html = await readBuilt('contact/index.html');
  const form = html.match(/<form[^>]*data-ds-contact-form[\s\S]*?<\/form>/)?.[0];
  assert.ok(form, 'form element not found');

  const expectations = [
    ['name field', /id="field-name"[^>]*type="text"[^>]*maxlength="100"[^>]*autocomplete="name"/s],
    ['email field', /id="field-email"[^>]*type="email"[^>]*autocomplete="email"/s],
    ['phone field', /id="field-phone"[^>]*type="tel"[^>]*inputmode="tel"[^>]*autocomplete="tel"/s],
    ['business field', /id="field-business"[^>]*maxlength="120"[^>]*autocomplete="organization"/s],
    ['message field', /id="field-message"[^>]*rows="5"[^>]*maxlength="5000"/s],
    ['honeypot', /name="company_website"[^>]*tabindex="-1"[^>]*aria-hidden="true"/s],
  ];
  for (const [label, pattern] of expectations) {
    assert.match(form, pattern, `${label} missing or wrong`);
  }

  /* Email must not carry the native required attribute: phone alone is a
     valid route (spec 4.1 either-or rule). */
  const emailTag = form.match(/<input[^>]*id="field-email"[^>]*>/)?.[0] || '';
  assert.ok(!/\srequired/.test(emailTag), 'email must not be natively required');

  const options = [...form.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(options, ['general', 'new-website', 'redesign', 'waas', 'seo', 'hosting', 'quote']);
});

test('the form shows the consent line, direct routes, and never a dead end', async () => {
  const html = await readBuilt('contact/index.html');
  const form = html.match(/<form[^>]*data-ds-contact-form[\s\S]*?<\/form>/)?.[0];
  assert.match(form, /We use your details to reply to this enquiry\. We do not sell them\./);
  assert.match(form, /href="[^"]*\/privacy"/);
  /* No consent checkbox at launch (spec 4.6). */
  assert.ok(!/type="checkbox"/.test(form), 'consent must stay a line, not a checkbox');
  /* Server contract (spec 4.4): native POST to the form backend with the
     render-time and UTM fields the backend reads. */
  assert.match(form, /action="\/api\/contact"/);
  assert.match(form, /name="form_started_at"/);
  assert.match(form, /name="submission_id"/);
  assert.match(form, /name="utm_source"/);
  assert.match(form, /<noscript>/);
  assert.match(form, /tel:\+27631718750/);
});

/* ---------- 2. meta description contract ---------- */

test('every real page keeps its meta description at 155 characters or less', async () => {
  const offenders = [];
  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    /* Astro redirect stubs carry no head content on purpose. */
    if (isRedirectStub(html)) continue;
    const match = html.match(/<meta name="description" content="([^"]*)"/);
    assert.ok(match, `page without meta description: ${file}`);
    if (match[1].length > 155) offenders.push(`${file}: ${match[1].length}`);
  }
  assert.deepEqual(offenders, [], 'pages over the 155 character limit');
});

/* ---------- 3. fragment links resolve ---------- */

test('every internal fragment link resolves to an existing id', async () => {
  const idCache = new Map();
  const idsOf = async (file) => {
    if (!idCache.has(file)) {
      const html = await readFile(file, 'utf8');
      idCache.set(file, new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1])));
    }
    return idCache.get(file);
  };

  const broken = [];
  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    for (const match of html.matchAll(/href="([^"]*)"/g)) {
      const href = match[1];
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) continue;
      const hashIndex = href.indexOf('#');
      if (hashIndex === -1) continue;
      const fragment = href.slice(hashIndex + 1);
      if (!fragment) continue;
      /* Resolve the target file. Absolute hrefs resolve against the
         output root; relative ones against the current page's directory. */
      const rawPath = href.slice(0, hashIndex);
      let targetDir;
      if (rawPath.startsWith('/')) {
        targetDir = join(distDir, rawPath.replace(/\/$/, '').replace(/^\//, ''));
      } else {
        targetDir = resolve(dirname(file), rawPath.replace(/\/$/, ''));
      }
      const candidates = [join(targetDir, 'index.html'), targetDir + '.html'];
      const targetFile = candidates.find((candidate) => htmlFiles.includes(candidate));
      if (!targetFile) {
        broken.push(`${relative(distDir, file)} -> ${href} (page not built)`);
        continue;
      }
      if (!(await idsOf(targetFile)).has(fragment)) {
        broken.push(`${relative(distDir, file)} -> ${href} (missing id)`);
      }
    }
  }
  assert.deepEqual(broken, [], 'fragment links that point nowhere');
});

test('the services page carries the hosting and seo anchor targets', async () => {
  const html = await readBuilt('services/index.html');
  for (const id of ['web-design', 'hosting', 'waas', 'seo']) {
    assert.match(html, new RegExp(`id="${id}"`), `services section id ${id} missing`);
  }
});

/* ---------- 4. analytics wiring ---------- */

test('every page loads the analytics module and the wiring keeps the event contract', async () => {
  /* Astro inlines the BaseLayout bundle (module + bootstrap) into each
     page; the ContactForm bundle stays an external chunk. */
  const chunkDir = join(distDir, '_astro');
  const chunks = (await readdir(chunkDir)).map((name) => join(chunkDir, name));
  const bundled = await Promise.all(chunks.map((file) => readFile(file, 'utf8').catch(() => '')));

  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    if (isRedirectStub(html)) continue;
    assert.match(html, /DSAnalytics/, `page without analytics module: ${file}`);
    /* Astro pages inline the module (with the GA4 URL); legacy pages get
       the injected standalone script tag. Either wiring is valid. */
    const wired = /googletagmanager\.com\/gtag/.test(html) || /src="[^"]*\/analytics\/ds-analytics\.js"/.test(html);
    assert.ok(wired, `page without GA4 wiring: ${file}`);
    assert.ok(
      /<script type="module">/.test(html) || /<script type="module" src=/.test(html) || /<script defer src=/.test(html),
      `page without module script: ${file}`,
    );
  }

  const everything = (await Promise.all(htmlFiles.map((file) => readFile(file, 'utf8')))).join('\n') + bundled.join('\n');
  for (const marker of ['contact_form_submit', 'quote_request', 'call_click', 'whatsapp_click']) {
    assert.ok(everything.includes(marker), `analytics wiring lost marker ${marker}`);
  }
  /* The bootstrap regex that guards init against a missing or malformed ID. */
  assert.match(everything, /G-\[A-Z0-9\]\{6,12\}/, 'measurement ID guard not found');
});

/* ---------- 5. base path reaches the form ---------- */
test('the form posts to /api/contact; the server owns the 303 redirect', async () => {
  const html = await readBuilt('contact/index.html');
  /* Native POST (spec 4.3): no client-side navigation target. The
     backend answers 303 with the base path from its BASE_PATH env, so
     the staging prefix is a server concern, not a markup attribute. */
  assert.match(html, /action="\/api\/contact"/);
  assert.ok(!html.includes('data-thankyou-href'), 'client-side redirect target must be gone');
  const thankYou = findHtml(join('contact', 'thank-you', 'index.html'));
  assert.ok(thankYou);
});

test('redirect stub refresh targets carry the staging base path (DIG-88)', async () => {
  /* On staging, a stub refreshing to a base-less URL 404s. Every stub
     must send the visitor to the prefixed destination. */
  const stubs = [];
  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    if (!isRedirectStub(html)) continue;
    stubs.push(file);
    const match = html.match(/url=([^\">]+)/);
    assert.ok(match, `stub without refresh target: ${file}`);
    assert.match(
      match[1],
      /^\/website-relaunch\//,
      `stub target misses the base path: ${match[1]} in ${file}`,
    );
  }
  /* One stub page ships per redirect-map row. The row count shrinks when
     a rewrite publishes at its exact URL (DIG-107, DIG-117), so the
     expectation follows the map instead of a hardcoded number. */
  assert.equal(
    stubs.length,
    redirectMap.redirects.length,
    `expected one stub per redirect-map row (${redirectMap.redirects.length}), got ${stubs.length}`,
  );
});
