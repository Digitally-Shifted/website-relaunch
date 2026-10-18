#!/usr/bin/env node
/**
 * Manual pass checklist (spec DIG-26 sections 4 and 6 to 9).
 *
 * Generates results/manual-checklist.md with one structured checklist per
 * configured page. The keyboard pass, the screen reader spot check, and the
 * template-level checks stay human work; this file is the recording sheet.
 *
 * Usage: npm run audit:a11y:checklist
 */
import { config } from '../audit.config.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const outDir = fileURLToPath(new URL('../results/', import.meta.url));
const stamp = new Date().toISOString();

const sections = [
  {
    title: 'Keyboard pass (unplug the mouse)',
    items: [
      ['S3', 'One working skip link reaches `main` first', '2.4.1'],
      ['K1', 'Every action works with keyboard only', '2.1.1'],
      ['K2', 'Focus order follows the visual and logical reading order', '2.4.3'],
      ['K3', 'Focus indicator always visible', '2.4.7 / 2.4.13'],
      ['K5', 'Nothing covers the focused element at any width', '2.4.11'],
      ['K6', 'No keyboard trap; modals return focus to the trigger on close', '2.1.2'],
      ['K7', 'Escape closes every modal, menu, and popover', 'Best practice'],
      ['K9', 'Nothing moves or auto-advances while tabbing', '3.2.1'],
      ['K10', 'Drag gestures have button or key alternatives', '2.5.7'],
    ],
  },
  {
    title: 'Screen reader spot check (one screen reader)',
    items: [
      ['S1/S2', 'Heading order has no skips; landmarks announce once each', '1.3.1'],
      ['A3', 'Custom widgets announce name, role, state, and value', '4.1.2'],
      ['A4', 'aria-expanded, aria-current, aria-selected update with state', '4.1.2'],
      ['A6', 'Async results announce in a polite live region', '4.1.3'],
      ['A10', 'Mobile menu trigger announces expanded state; drawer traps focus', '4.1.2 / 2.1.2'],
    ],
  },
  {
    title: 'Template-level checks',
    items: [
      ['T1', 'prefers-reduced-motion respected; no autoplaying motion over 5s without pause', '2.2.2'],
      ['T2', 'No content flashes more than 3 times per second', '2.3.1'],
      ['T3', 'Works at 200% zoom and 320px width without loss of content or function', '1.4.4 / 1.4.10'],
      ['T4', 'Error messages name the field, state the problem, suggest a fix', '3.3.1 / 3.3.3'],
      ['T5', 'Error, success, and required states never use color alone', '1.4.1'],
      ['T6', 'Time limits can be extended, adjusted, or turned off', '2.2.1'],
      ['T7', 'Auth flows allow paste, password managers, and autocomplete attributes', '3.3.8'],
      ['T8', 'Help entry points keep their position across pages', '3.2.6'],
    ],
  },
];

const lines = [
  `# Manual audit checklist — ${stamp}`,
  '',
  `Widths per spec: ${config.widths.join(', ')} px. Themes: ${config.themes.join(', ')}.`,
  '',
];

if (config.pages.length === 0) {
  lines.push(
    'No pages configured yet. DIG-15 (site template) and DIG-16 (client starter) must land first. This generator produced no per-page sheets.'
  );
} else {
  for (const page of config.pages) {
    lines.push(`## ${page.name} (${page.path})`, '');
    for (const section of sections) {
      lines.push(`### ${section.title}`, '', '| ID | Check | Criterion | Result | Finding ID |', '| --- | --- | --- | --- | --- |');
      for (const [id, check, criterion] of section.items) {
        lines.push(`| ${id} | ${check} | ${criterion} |  |  |`);
      }
      lines.push('');
    }
  }
}

mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}manual-checklist.md`, lines.join('\n'));
console.log(`Manual checklist written: ${outDir}manual-checklist.md (${config.pages.length} page(s)).`);
