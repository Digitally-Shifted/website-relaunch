#!/usr/bin/env node
/**
 * Automated accessibility scan (spec DIG-26 section 4, pass 1).
 *
 * For every page in audit.config.mjs, at every width and theme:
 *   1. axe-core scan with WCAG 2.2 A/AA rule collections.
 *   2. Offline HTML validation with html-validate.
 *
 * Output: results/scan.json and results/scan-summary.md.
 * Exit code 0 unless --strict is set and violations exist.
 *
 * Usage:
 *   npm run audit:a11y            (record findings)
 *   npm run audit:a11y -- --strict
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { HtmlValidate } from 'html-validate';
import { createRequire } from 'node:module';
import { config } from '../audit.config.mjs';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');

const flag = process.argv.includes('--strict');
const stamp = new Date().toISOString();

/** Inject and run axe-core on the current page. */
async function runAxe(page, tags) {
  await page.addScriptTag({ path: axePath });
  return page.evaluate(async (tagList) => {
    const axe = window.axe;
    const results = await axe.run(document, {
      runOnly: { type: 'tag', values: tagList },
      resultTypes: ['violations', 'incomplete'],
    });
    const slim = (list) =>
      list.map((v) => ({
        id: v.id,
        impact: v.impact ?? null,
        tags: v.tags,
        help: v.help,
        helpUrl: v.helpUrl,
        criteria: (v.tags ?? [])
          .filter((t) => /^wcag\d+$/.test(t))
          .map((t) => t.replace('wcag', '').split('').join('.')),
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      }));
    return {
      violations: slim(results.violations),
      incomplete: slim(results.incomplete),
      passCount: results.passes.length,
    };
  }, tags);
}

/** Validate raw HTML offline. Returns [] when clean. */
function validateHtml(html) {
  const vnu = new HtmlValidate();
  const report = vnu.validateString(html);
  return (report.results ?? []).flatMap((r) =>
    (r.messages ?? []).map((m) => ({ rule: m.ruleId, severity: m.severity, message: m.message, selector: m.selector }))
  );
}

if (config.pages.length === 0) {
  const baseline = {
    generatedAt: stamp,
    pagesScanned: 0,
    note:
      'No pages configured. The site template (DIG-15) and client starter (DIG-16) do not exist yet. ' +
      'Add routes to tools/a11y/audit.config.mjs when they land, then re-run.',
  };
  mkdirSync(config.resultsDir, { recursive: true });
  writeFileSync(`${config.resultsDir}scan.json`, JSON.stringify(baseline, null, 2));
  console.log('No pages configured. Wrote a baseline record to tools/a11y/results/scan.json.');
  console.log('DIG-15 (site template) and DIG-16 (client starter) must land first.');
  process.exit(0);
}

const browser = await chromium.launch({ executablePath: config.executablePath });
const scan = { generatedAt: stamp, baseUrl: config.baseUrl, tags: config.axeTags, pages: [] };

try {
  for (const entry of config.pages) {
    const url = new URL(entry.path, config.baseUrl).href;
    const context = await browser.newContext();
    const page = await context.newPage();
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    const rawHtml = await page.content();

    const pageResult = {
      name: entry.name,
      path: entry.path,
      httpStatus: response?.status() ?? null,
      htmlErrors: config.htmlValidate ? validateHtml(rawHtml) : [],
      scans: [],
    };

    for (const width of config.widths) {
      for (const theme of config.themes) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(
          ([attr, value]) => document.documentElement.setAttribute(attr, value),
          [config.themeAttribute, theme]
        );
        await page.waitForTimeout(100);
        const result = await runAxe(page, config.axeTags);
        pageResult.scans.push({ width, theme, ...result });
      }
    }

    scan.pages.push(pageResult);
    await context.close();
  }
} finally {
  await browser.close();
}

const violationCount = scan.pages.reduce(
  (sum, p) => sum + p.scans.reduce((s, sc) => s + sc.violations.length, 0),
  0
);
const htmlErrorCount = scan.pages.reduce((sum, p) => sum + p.htmlErrors.length, 0);
scan.summary = { pages: scan.pages.length, axeViolationRules: violationCount, htmlErrors: htmlErrorCount };

mkdirSync(config.resultsDir, { recursive: true });
writeFileSync(`${config.resultsDir}scan.json`, JSON.stringify(scan, null, 2));

const lines = [
  `# Automated scan — ${stamp}`,
  '',
  `Base URL: ${config.baseUrl} · Pages: ${scan.pages.length} · axe rule hits: ${violationCount} · HTML errors: ${htmlErrorCount}`,
  '',
];
for (const p of scan.pages) {
  lines.push(`## ${p.name} (${p.path}) — HTTP ${p.httpStatus ?? '?'}`);
  if (p.htmlErrors.length) {
    lines.push('', '### HTML validation', ...p.htmlErrors.map((e) => `- [${e.severity}] ${e.rule}: ${e.message} (${e.selector})`));
  }
  for (const sc of p.scans) {
    lines.push('', `### ${sc.width}px · ${sc.theme} — ${sc.violations.length} rule hits, ${sc.incomplete.length} needs review`);
    for (const v of sc.violations) {
      lines.push(`- **${v.id}** (${v.impact ?? 'n/a'}) ${v.help} — criteria ${v.criteria.join(', ') || '?'} — ${v.nodes.length} node(s)`);
    }
    for (const v of sc.incomplete) {
      lines.push(`- needs review: **${v.id}** ${v.help} — ${v.nodes.length} node(s)`);
    }
  }
}
writeFileSync(`${config.resultsDir}scan-summary.md`, lines.join('\n'));

console.log(`Scan complete: ${scan.pages.length} page(s), ${violationCount} axe rule hits, ${htmlErrorCount} HTML errors.`);
console.log(`Results: ${config.resultsDir}scan.json, scan-summary.md`);
process.exit(flag && violationCount > 0 ? 1 : 0);
