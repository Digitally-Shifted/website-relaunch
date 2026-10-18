#!/usr/bin/env node
/*
 * Redirect map verification — build gate (DIG-89, DIG-91).
 *
 * Source of truth: docs/migration/redirect-map.json. This script runs
 * against a build output directory and proves:
 *   1. Every 1:1 redirect entry shipped a meta-refresh stub page (works on
 *      any static host; the production .htaccess upgrades these to 301s).
 *   2. Every redirect destination resolves to a real page in the output
 *      (no redirect into a 404).
 *   3. Every old URL in the map is either served or redirected — the
 *      sameUrl entries must serve, the redirect entries must have stubs
 *      (no orphaned old URL).
 *
 * The host-engine and live-host redirect tests live with DIG-89
 * (docs/migration/redirect-map.json → verification).
 *
 * Usage: node scripts/test-redirects.mjs --dir <build-output-dir>
 * Exit code 1 on any failure.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mapPath = join(root, 'docs', 'migration', 'redirect-map.json');
const map = JSON.parse(readFileSync(mapPath, 'utf8'));

const argDir = process.argv[process.argv.indexOf('--dir') + 1];
if (!argDir) {
  console.error('usage: test-redirects.mjs --dir <build-output-dir>');
  process.exit(1);
}
const outDir = resolve(argDir);
if (!existsSync(outDir)) {
  console.error(`FAIL: build output directory not found: ${outDir}`);
  process.exit(1);
}

/* Staging builds live under the GitHub Pages project prefix. */
const rawBase = process.env.PUBLIC_BASE_PATH || '/';
const basePath = rawBase === '/' ? '' : rawBase.replace(/\/$/, '');

const failures = [];
const pass = (label, detail) => console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ''}`);
const fail = (label, detail) => {
  failures.push(label);
  console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
};

/** Strip the base prefix from an Astro href so paths resolve inside outDir. */
function stripBase(p) {
  if (basePath && p.startsWith(basePath)) return p.slice(basePath.length) || '/';
  return p;
}

/** True when a site path resolves to a page or file in the build output. */
function resolvesInOutput(sitePath) {
  const p = stripBase(sitePath).replace(/^\//, '');
  if (!p) return existsSync(join(outDir, 'index.html'));
  return (
    existsSync(join(outDir, p, 'index.html')) ||
    existsSync(join(outDir, `${p}.html`)) ||
    existsSync(join(outDir, p))
  );
}

const trim = (p) => (p === '/' ? '/' : p.replace(/\/+$/, ''));

console.log(`Redirect verification against ${outDir} (base: "${basePath || '/'}")\n`);

// --- 1 + 2: stub pages ship and destinations resolve -----------------------
console.log(`Redirect stubs (${map.redirects.length} entries):`);
for (const entry of map.redirects) {
  const from = trim(entry.old);
  const to = trim(entry.new);
  const stubPath = join(outDir, from.replace(/^\//, ''), 'index.html');
  if (!existsSync(stubPath)) {
    fail(`stub for ${entry.old}`, `expected ${stubPath}`);
    continue;
  }
  const html = readFileSync(stubPath, 'utf8');
  if (!html.includes('http-equiv="refresh"')) {
    fail(`stub for ${entry.old}`, 'meta refresh missing');
    continue;
  }
  if (!resolvesInOutput(to)) {
    fail(`destination of ${entry.old}`, `${entry.new} not found in build output`);
    continue;
  }
  pass(`${entry.old} → ${entry.new}`);
}

// --- 3: sameUrl pages must serve; no orphaned old URL ----------------------
console.log('\nOld-URL coverage (sameUrl serves, redirects stubbed):');
for (const entry of map.sameUrl) {
  if (resolvesInOutput(trim(entry.path))) {
    pass(`${entry.path} (served)`);
  } else {
    fail(entry.path, 'sameUrl entry not found in build output');
  }
}
for (const entry of map.redirects) {
  const stubPath = join(outDir, trim(entry.old).replace(/^\//, ''), 'index.html');
  if (existsSync(stubPath)) {
    pass(`${entry.old} (redirect stub)`);
  } else {
    fail(entry.old, 'old URL neither served nor redirected — orphaned');
  }
}

// --- report ----------------------------------------------------------------
console.log(`\n${failures.length === 0 ? 'Redirects OK' : 'REDIRECT FAILURES'}: ${failures.length} failure(s)`);
if (failures.length > 0) process.exit(1);
