#!/usr/bin/env node
/**
 * Token contrast table (spec DIG-26 sections 7 and 12, gate 5).
 *
 * Measures every token pair in brand-tokens.json with WCAG 2.2 math and
 * writes results/token-contrast.md and results/token-contrast.json.
 *
 * Exit code 0 unless --gate is set and a pair misses its minimum.
 *
 * Usage:
 *   npm run audit:a11y:contrast
 *   npm run audit:a11y:contrast -- --gate
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { contrastRatio, ratio as r2 } from '../lib/contrast.mjs';

const tokensPath = fileURLToPath(new URL('../brand-tokens.json', import.meta.url));
const tokensFile = JSON.parse(readFileSync(tokensPath, 'utf8'));
const outDir = fileURLToPath(new URL('../results/', import.meta.url));
const gate = process.argv.includes('--gate');

const rows = [];
for (const pair of tokensFile.pairs) {
  const fg = tokensFile.tokens[pair.fg];
  const bg = tokensFile.tokens[pair.bg];
  const value = r2(contrastRatio(fg, bg));
  const pass = value >= pair.minimum;
  rows.push({ ...pair, fgHex: fg, bgHex: bg, measured: value, pass });
}

const failures = rows.filter((row) => !row.pass);
const stamp = new Date().toISOString();

const json = { generatedAt: stamp, source: tokensFile.source, pairsMeasured: rows.length, failures: failures.length, rows };
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}token-contrast.json`, JSON.stringify(json, null, 2));

const md = [
  `# Token contrast table — ${stamp}`,
  '',
  `Source: ${tokensFile.source}. Method: WCAG 2.2 relative luminance.`,
  `Pairs measured: ${rows.length} · Below minimum: ${failures.length}`,
  '',
  '| Foreground | Background | Theme | Use | Criterion | Minimum | Measured | Verdict |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map(
    (row) =>
      `| \`${row.fg}\` ${row.fgHex} | \`${row.bg}\` ${row.bgHex} | ${row.theme} | ${row.use} | ${row.criterion} | ${row.minimum}:1 | ${row.measured}:1 | ${row.pass ? 'Pass' : '**Fail**'} |`
  ),
  '',
];
if (failures.length) {
  md.push('## Pairs below their minimum', '');
  for (const f of failures) {
    md.push(`- \`${f.fg}\` on \`${f.bg}\` (${f.theme}): ${f.measured}:1 against ${f.minimum}:1 — ${f.use}`);
  }
  md.push('');
}
writeFileSync(`${outDir}token-contrast.md`, md.join('\n'));

console.log(`Token contrast: ${rows.length} pairs measured, ${failures.length} below minimum.`);
console.log(`Results: ${outDir}token-contrast.md`);
process.exit(gate && failures.length ? 1 : 0);
