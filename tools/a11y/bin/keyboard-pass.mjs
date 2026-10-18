#!/usr/bin/env node
/**
 * Keyboard pass runner (spec DIG-26 section 4, pass 2; checks S3, K1 to K7, A10).
 *
 * Drives the real site in Chromium with real key events at audit widths and
 * records: skip link, focus order and visibility, focus-not-obscured against
 * the fixed mobile action bar (2.4.11), mobile menu open/trap/Escape/return,
 * and the WaaS dialog open/trap/Escape/return.
 *
 * Output: results/keyboard-pass.json and results/keyboard-pass.md.
 * Exit code 0 always: this pass records evidence; severity is judged in the
 * report, not here.
 *
 * Usage: npm run audit:a11y:keyboard
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { config } from '../audit.config.mjs';

const outDir = config.resultsDir;
const stamp = new Date().toISOString();
const flag = process.argv.includes('--strict');

/** Describe the focused element for the transcript. */
async function describe(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { tag: 'body', none: true };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      cls: (el.getAttribute('class') || '').split(/\s+/).slice(0, 3).join(' ') || null,
      text: (el.textContent || '').trim().slice(0, 40) || el.getAttribute('aria-label') || null,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      ariaExpanded: el.getAttribute('aria-expanded'),
      outline: cs.outlineStyle !== 'none' ? `${cs.outlineWidth} ${cs.outlineStyle}` : 'none',
    };
  });
}

/** True when the fixed mobile action bar covers any part of the focused rect. */
async function coveredByActionBar(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    const bar = document.querySelector('.mobile-action-bar');
    if (!el || !bar || getComputedStyle(bar).display === 'none') return false;
    const a = el.getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    if (a.width === 0 && a.height === 0) return false;
    return a.top < b.bottom && a.bottom > b.top && a.left < b.right && a.right > b.left;
  });
}

async function tabStep(page, i) {
  await page.keyboard.press('Tab');
  const d = await describe(page);
  const covered = await coveredByActionBar(page);
  return { step: i + 1, ...d, coveredByActionBar: covered };
}

const findings = [];
const add = (page, check, detail, ok) => {
  findings.push({ page, check, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${page} — ${check}: ${detail}`);
};

const browser = await chromium.launch({ executablePath: config.executablePath });
const run = { generatedAt: stamp, baseUrl: config.baseUrl, pages: [] };

try {
  for (const entry of config.pages) {
    if (!['home', 'services-hub', 'faq', 'contact'].includes(entry.name)) continue;
    const url = new URL(entry.path, config.baseUrl).href;
    const context = await browser.newContext({ viewport: { width: 375, height: 900 } });
    const page = await context.newPage();
    const record = { name: entry.name, path: entry.path, width: 375, steps: [] };

    await page.goto(url, { waitUntil: 'networkidle' });

    /* S3: skip link is the first tab stop and reaches main. */
    const s1 = await tabStep(page, 0);
    record.steps.push({ phase: 'skip-link', ...s1 });
    const skipOk = s1.cls?.includes('skip-link');
    if (skipOk) {
      await page.keyboard.press('Enter');
      const inMain = await page.evaluate(() => document.activeElement.closest('#main') !== null);
      add(entry.name, 'S3 skip link first and reaches main', `skip link focused, Enter lands in main: ${inMain}`, inMain);
    } else {
      add(entry.name, 'S3 skip link first and reaches main', `first tab stop was ${s1.tag}.${s1.cls ?? ''}`, false);
    }

    /* Walk the tab order. */
    let steps = 0;
    let seen = new Set();
    while (steps < 40) {
      const s = await tabStep(page, steps);
      record.steps.push({ phase: 'walk', ...s });
      if (s.none || (s.id === 'menu-open')) break;
      const key = `${s.tag}|${s.id}|${s.text}`;
      if (seen.has(key) && !s.cls?.includes('btn')) break;
      seen.add(key);
      steps++;
      if (s.outline === 'none' && !s.none) {
        add(entry.name, 'K3 focus indicator visible', `no outline on ${s.tag} ${s.text ?? ''}`, false);
      }
      if (s.coveredByActionBar) {
        add(entry.name, 'K5 focus not obscured (2.4.11)', `mobile action bar covers focused ${s.tag} "${s.text}"`, false);
      }
    }

    /* A10/K6/K7: mobile menu open, trap, Escape, focus return (375px). */
    const menuBtn = page.locator('#menu-open');
    if (await menuBtn.count()) {
      await menuBtn.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(150);
      const expanded = await menuBtn.getAttribute('aria-expanded');
      const focusInMenu = await page.evaluate(() => !!document.activeElement.closest('#mobile-menu'));
      const firstInMenu = await describe(page);
      record.steps.push({ phase: 'menu-open', expanded, focusInMenu, firstInMenu });
      add(entry.name, 'A10 menu opens with expanded state', `aria-expanded=${expanded}, focus in menu: ${focusInMenu}`, expanded === 'true' && focusInMenu);

      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      const stillInside = await page.evaluate(() => !!document.activeElement.closest('#mobile-menu'));
      add(entry.name, 'K6 focus stays inside open menu', `after 2 tabs focus in menu: ${stillInside}`, stillInside);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      const closedHidden = await page.evaluate(() => document.getElementById('mobile-menu').hidden);
      const backOnTrigger = await page.evaluate(() => document.activeElement?.id === 'menu-open');
      const expAfter = await menuBtn.getAttribute('aria-expanded');
      record.steps.push({ phase: 'menu-close', closedHidden, backOnTrigger, expAfter });
      add(entry.name, 'K7 Escape closes menu and returns focus', `hidden=${closedHidden}, focus on trigger=${backOnTrigger}, aria-expanded=${expAfter}`, closedHidden && backOnTrigger && expAfter === 'false');
    }

    /* K6/K7: WaaS dialog on the services hub. */
    const trigger = page.locator('[data-open-dialog="waas-modal"]');
    if (entry.name === 'services-hub' && (await trigger.count())) {
      await trigger.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(150);
      const dialogOpen = await page.evaluate(() => document.getElementById('waas-modal').open);
      const focusInDialog = await page.evaluate(() => !!document.activeElement.closest('#waas-modal'));
      record.steps.push({ phase: 'dialog-open', dialogOpen, focusInDialog });
      add(entry.name, 'K1 dialog opens from keyboard', `open=${dialogOpen}, focus inside=${focusInDialog}`, dialogOpen && focusInDialog);

      for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
      const staysIn = await page.evaluate(() => !!document.activeElement.closest('#waas-modal'));
      add(entry.name, 'K6 focus stays inside dialog', `after 6 tabs focus in dialog: ${staysIn}`, staysIn);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      const dialogClosed = await page.evaluate(() => !document.getElementById('waas-modal').open);
      const focusBack = await page.evaluate(() => document.activeElement?.hasAttribute('data-open-dialog'));
      add(entry.name, 'K7 Escape closes dialog and returns focus', `closed=${dialogClosed}, focus on trigger=${focusBack}`, dialogClosed && focusBack);
    }

    run.pages.push(record);
    await context.close();
  }
} finally {
  await browser.close();
}

const failures = findings.filter((f) => !f.ok);
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}keyboard-pass.json`, JSON.stringify({ generatedAt: stamp, findings, run }, null, 2));

const md = [
  `# Keyboard pass — ${stamp}`,
  '',
  `Widths: 375 px focus pass · Pages: ${run.pages.length} · Checks: ${findings.length} · Failures: ${failures.length}`,
  '',
  ...findings.map((f) => `- ${f.ok ? 'Pass' : '**Fail**'} — ${f.page} — ${f.check}: ${f.detail}`),
  '',
  'Tab-order transcripts per page are in keyboard-pass.json.',
  '',
];
writeFileSync(`${outDir}keyboard-pass.md`, md.join('\n'));
console.log(`\nKeyboard pass: ${findings.length} checks, ${failures.length} failures.`);
console.log(`Results: ${outDir}keyboard-pass.md`);
process.exit(flag && failures.length ? 1 : 0);
