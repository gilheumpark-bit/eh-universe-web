#!/usr/bin/env node
/**
 * tools/scripts/contrast-check.mjs
 *
 * WCAG AA contrast verifier for theme.css token combinations.
 *
 * Reads apps/desktop/renderer/styles/theme.css, parses both
 * dark and light scopes, and asserts that critical text-on-bg
 * pairs meet AA (4.5:1 for normal text, 3:1 for large text).
 *
 * Run from repo root:
 *   node tools/scripts/contrast-check.mjs
 *
 * Exits 1 on any failure (suitable for CI).
 */

import { readFileSync } from 'node:fs';

// ============================================================
// PART 1 — sRGB → relative luminance
// ============================================================

function srgbChannelToLinear(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb) {
  const r = srgbChannelToLinear(rgb[0]);
  const g = srgbChannelToLinear(rgb[1]);
  const b = srgbChannelToLinear(rgb[2]);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ============================================================
// PART 2 — Color parser (#rgb, #rrggbb, rgba(), with optional alpha)
// ============================================================

function parseColor(input, fallbackBg) {
  const value = input.trim();

  // #rrggbb
  let m = value.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const hex = m[1];
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  // #rgb
  m = value.match(/^#([0-9a-f]{3})$/i);
  if (m) {
    const hex = m[1];
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
    ];
  }
  // rgba(r, g, b, a)
  m = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i);
  if (m) {
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    const a = m[4] !== undefined ? Number(m[4]) : 1;
    if (a === 1 || !fallbackBg) return [r, g, b];
    // Composite over fallbackBg
    return [
      Math.round(r * a + fallbackBg[0] * (1 - a)),
      Math.round(g * a + fallbackBg[1] * (1 - a)),
      Math.round(b * a + fallbackBg[2] * (1 - a)),
    ];
  }
  return null;
}

// ============================================================
// PART 3 — Theme block extractor
// ============================================================

function extractTheme(css, selector) {
  // Match ALL :root[data-theme='X'] { ... } blocks (multiple in PART 1+3+4+5)
  const re = new RegExp(`${selector.replace(/[.[\]'"]/g, '\\$&')}\\s*\\{([^}]*)\\}`, 'g');
  const tokens = {};
  let match;
  while ((match = re.exec(css)) !== null) {
    const body = match[1];
    for (const line of body.split('\n')) {
      const m = line.match(/^\s*--([\w-]+):\s*([^;]+);/);
      if (m) tokens[m[1]] = m[2].trim();
    }
  }
  return tokens;
}

// ============================================================
// PART 4 — Critical pair manifest
// ============================================================

const PAIRS = [
  // [fgToken, bgToken, label, minRatio]
  ['text-primary',   'bg-primary',   'body text on primary surface', 4.5],
  ['text-primary',   'bg-secondary', 'body text on secondary surface', 4.5],
  ['text-primary',   'bg-tertiary',  'body text on tertiary surface', 4.5],
  ['text-primary',   'bg-elevated',  'body text on elevated surface', 4.5],
  ['text-secondary', 'bg-primary',   'secondary text on primary', 4.5],
  ['text-secondary', 'bg-secondary', 'secondary text on secondary', 4.5],
  ['text-muted',     'bg-primary',   'muted text on primary', 3.0], // large text only
  ['accent-blue',    'bg-primary',   'accent text on primary', 4.5],
  ['accent-blue',    'bg-secondary', 'accent text on secondary', 4.5],
  ['accent-purple',  'bg-primary',   'purple text on primary', 4.5],
  ['status-error',   'bg-primary',   'error text on primary', 4.5],
  ['status-warning', 'bg-primary',   'warning text on primary', 4.5],
  ['status-success', 'bg-primary',   'success text on primary', 4.5],
  ['severity-p0',    'bg-primary',   'P0 indicator on primary', 4.5],
  ['severity-p1',    'bg-primary',   'P1 indicator on primary', 4.5],
  ['severity-p2',    'bg-primary',   'P2 indicator on primary', 4.5],
];

// ============================================================
// PART 5 — Run
// ============================================================

const cssPath = 'apps/desktop/renderer/styles/theme.css';
const css = readFileSync(cssPath, 'utf8');

const themes = {
  dark: extractTheme(css, ":root[data-theme='dark']"),
  light: extractTheme(css, ":root[data-theme='light']"),
};

let failures = 0;
let passes = 0;

for (const [themeName, tokens] of Object.entries(themes)) {
  console.log(`\n=== ${themeName.toUpperCase()} THEME ===`);
  const bgPrimary = parseColor(tokens['bg-primary'] ?? '#000');

  for (const [fgKey, bgKey, label, minRatio] of PAIRS) {
    const fgRaw = tokens[fgKey];
    const bgRaw = tokens[bgKey];
    if (!fgRaw || !bgRaw) {
      console.log(`  ⚠  ${fgKey} on ${bgKey} — token missing`);
      continue;
    }
    const bg = parseColor(bgRaw);
    const fg = parseColor(fgRaw, bg ?? bgPrimary);
    if (!fg || !bg) {
      console.log(`  ⚠  ${fgKey} on ${bgKey} — could not parse`);
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    const ok = ratio >= minRatio;
    const mark = ok ? '✓' : '✗';
    const ratioStr = ratio.toFixed(2);
    console.log(
      `  ${mark} ${fgKey.padEnd(16)} on ${bgKey.padEnd(14)} = ${ratioStr.padStart(5)} (need ${minRatio}) — ${label}`,
    );
    if (ok) passes += 1;
    else failures += 1;
  }
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures > 0 ? 1 : 0);
