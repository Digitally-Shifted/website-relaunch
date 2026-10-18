#!/usr/bin/env node
/**
 * End-to-end proof for the scan harness (DIG-26).
 *
 * Runs the axe scan machinery against two fixture pages:
 *   - bad.html:  seeds four known defects.
 *   - good.html: a clean page that must report zero violations.
 *
 * Compares outcomes with test-fixture/expected.json and writes
 * results/fixture-verification.md. Exit code 1 on any mismatch.
 *
 * Usage: npm run audit:a11y:fixture
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const here = fileURLToPath(new URL('../test-fixture/', import.meta.url));
const outDir = fileURLToPath(new URL('../results/', import.meta.url));
const expected = JSON.parse(readFileSync(`${here}expected.json`, 'utf8'));
const executablePath = process.env.A11Y_CHROMIUM ?? '/usr/bin/chromium';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

async function scanFile(browser, file) {
  const page = await browser.newPage();
  await page.goto(`file://${file}`, { waitUntil: 'load' });
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async (tagList) => {
    const r = await window.axe.run(document, {
      runOnly: { type: 'tag', values: tagList },
    });
    return {
      violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
      incomplete: r.incomplete.map((v) => v.id),
    };
  }, TAGS);
  await page.close();
  return result;
}

const browser = await chromium.launch({ executablePath });
let badResult;
let goodResult;
try {
  badResult = await scanFile(browser, `${here}${expected.bad.path}`);
  goodResult = await scanFile(browser, `${here}${expected.good.path}`);
} finally {
  await browser.close();
}

const badIds = badResult.violations.map((v) => v.id);
const missing = expected.bad.mustFindRules.filter((rule) => !badIds.includes(rule));
const goodViolations = goodResult.violations.length;
const goodClean = goodViolations <= expected.good.maxViolations;
const pass = missing.length === 0 && goodClean;
const stamp = new Date().toISOString();

const md = [
  `# Fixture verification — ${stamp}`,
  '',
  `Purpose: prove the scan harness finds seeded defects and stays silent on a clean page.`,
  `Harness: axe-core on Chromium (${executablePath}), tags: ${TAGS.join(', ')}.`,
  '',
  `## bad.html — seeded defects`,
  '',
  ...expected.bad.mustFindRules.map((rule) => {
    const hit = badResult.violations.find((v) => v.id === rule);
    return `- ${rule}: ${hit ? `found, impact ${hit.impact}, ${hit.nodes} node(s)` : '**NOT FOUND**'}`;
  }),
  '',
  `Other rule hits on bad.html: ${badIds.filter((id) => !expected.bad.mustFindRules.includes(id)).join(', ') || 'none'}`,
  `Needs review (incomplete): ${badResult.incomplete.join(', ') || 'none'}`,
  '',
  `## ${expected.good.path} — clean page`,
  '',
  `- Violations: ${goodViolations} (limit ${expected.good.maxViolations}) — ${goodClean ? 'clean' : '**NOT CLEAN**'}`,
  `- Needs review (incomplete): ${goodResult.incomplete.join(', ') || 'none'}`,
  '',
  `## Verdict: ${pass ? 'Pass — harness verified' : '**Fail — harness not verified**'}`,
  '',
];

mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}fixture-verification.md`, md.join('\n'));

console.log(md.join('\n'));
process.exit(pass ? 0 : 1);
