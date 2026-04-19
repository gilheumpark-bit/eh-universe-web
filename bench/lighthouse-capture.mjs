#!/usr/bin/env node
// ============================================================
// PART 1 — Purpose & policy
// ============================================================
//
// Loreguard v2.2.0-alpha baseline capture — Lighthouse 경로 5개 측정.
//
// 정책:
//   - 의존성 추가 금지(package.json 오염 방지).
//   - lighthouse / chrome-launcher 가 node_modules 에 있으면 자동 실행.
//   - 없으면 수동 측정 가이드(`bench/MANUAL-LIGHTHOUSE.md`)로 폴백.
//
// Usage:
//   node bench/lighthouse-capture.mjs                       # 기본 포트 3005
//   BASE_URL=http://127.0.0.1:3000 node bench/lighthouse-capture.mjs
//
// 출력: stdout JSON + (자동 모드) bench/lighthouse-capture.json
// ============================================================

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================
// PART 2 — Config
// ============================================================

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const OUT_PATH = join(__dirname, 'lighthouse-capture.json');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3005';
const ROUTES = [
  { id: 'home', path: '/' },
  { id: 'studio', path: '/studio' },
  { id: 'archive', path: '/archive' },
  { id: 'network', path: '/network' },
  { id: 'translation', path: '/translation-studio' },
];

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

// ============================================================
// PART 3 — Capability probe
// ============================================================

async function canAutomate() {
  try {
    await import('lighthouse');
    await import('chrome-launcher');
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// PART 4 — Automated Lighthouse run (opt-in)
// ============================================================

async function runAutomated() {
  const lighthouse = (await import('lighthouse')).default;
  const chromeLauncher = await import('chrome-launcher');

  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
  const options = {
    logLevel: 'error',
    output: 'json',
    onlyCategories: CATEGORIES,
    port: chrome.port,
  };

  const results = {};
  try {
    for (const route of ROUTES) {
      const url = `${BASE_URL}${route.path}`;
      process.stdout.write(`[lighthouse] ${route.id} ${url} ... `);
      const runner = await lighthouse(url, options);
      const lhr = runner?.lhr;
      if (!lhr) {
        process.stdout.write('skip (no lhr)\n');
        continue;
      }
      const scores = {};
      for (const cat of CATEGORIES) {
        const raw = lhr.categories?.[cat]?.score;
        // score is 0..1, null for N/A — convert to 0..100 integer
        scores[toKey(cat)] = raw == null ? null : Math.round(raw * 100);
      }
      results[route.id] = scores;
      process.stdout.write(JSON.stringify(scores) + '\n');
    }
  } finally {
    await chrome.kill();
  }
  return results;
}

function toKey(cat) {
  // Lighthouse uses 'best-practices'; we normalize to camelCase.
  return cat === 'best-practices' ? 'bestPractices' : cat;
}

// ============================================================
// PART 5 — Fallback skeleton (manual measurement)
// ============================================================

function buildManualSkeleton(reason) {
  const results = {};
  for (const r of ROUTES) {
    results[r.id] = {
      performance: null,
      accessibility: null,
      bestPractices: null,
      seo: null,
    };
  }
  return {
    mode: 'manual',
    reason,
    device: 'desktop',
    throttling: 'simulated-4g',
    baseUrl: BASE_URL,
    routes: ROUTES.map((r) => r.path),
    results,
    guide: 'bench/MANUAL-LIGHTHOUSE.md',
  };
}

// ============================================================
// PART 6 — Entry
// ============================================================

async function main() {
  const automatable = await canAutomate();
  if (!automatable) {
    const payload = buildManualSkeleton(
      'lighthouse/chrome-launcher 미설치 — 의존성 추가 금지 정책에 따라 수동 측정 필요',
    );
    console.log(JSON.stringify(payload, null, 2));
    console.error('\n[안내] 자동 측정을 하려면 아래를 추가 설치한 뒤 재실행:');
    console.error('       npm i -D lighthouse chrome-launcher');
    console.error('       수동 측정 가이드: bench/MANUAL-LIGHTHOUSE.md');
    // 수동 경로에서는 파일을 생성하지 않음(잘못된 baseline 저장 방지).
    process.exit(0);
  }

  const results = await runAutomated();
  const payload = {
    mode: 'auto',
    device: 'desktop',
    throttling: 'simulated-4g',
    baseUrl: BASE_URL,
    capturedAt: new Date().toISOString(),
    results,
  };
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`\n[lighthouse] wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error('[lighthouse] fatal:', err?.stack || err);
  process.exit(1);
});
