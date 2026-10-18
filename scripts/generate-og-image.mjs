#!/usr/bin/env node
/*
 * Generate public/og-default.png — the Open Graph / Twitter share card
 * (DIG-91). 1200x630 per the og:image standard. Design: Carbon ground,
 * one accent rule, the DS horizontal lockup in Paper. Only vector logo
 * paths are rendered, so no system fonts are needed and CI output is
 * identical everywhere.
 *
 * Usage: node scripts/generate-og-image.mjs   (writes public/og-default.png)
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lockupSvg = join(root, 'brand', 'logo', 'ds-lockup-horizontal-paper.svg');
const outFile = join(root, 'public', 'og-default.png');

const W = 1200;
const H = 630;
const LOCKUP_W = 900;
const LOCKUP_H = Math.round((LOCKUP_W / 1324) * 247); // lockup viewBox 1324x247
const BAR_W = 72;
const BAR_H = 8;
const GAP = 36;
const GROUP_H = BAR_H + GAP + LOCKUP_H;
const TOP = Math.round((H - GROUP_H) / 2);

const lockup = await sharp(lockupSvg)
  .resize(LOCKUP_W, LOCKUP_H)
  .png()
  .toBuffer();
const bar = await sharp({
  create: { width: BAR_W, height: BAR_H, channels: 4, background: '#FD4000' },
})
  .png()
  .toBuffer();

await sharp({
  create: { width: W, height: H, channels: 4, background: '#070808' },
})
  .composite([
    { input: bar, left: Math.round((W - BAR_W) / 2), top: TOP },
    { input: lockup, left: Math.round((W - LOCKUP_W) / 2), top: TOP + BAR_H + GAP },
  ])
  .png({ compressionLevel: 9 })
  .toFile(outFile);

const meta = await sharp(outFile).metadata();
console.log(`OK ${outFile} ${meta.width}x${meta.height}`);
