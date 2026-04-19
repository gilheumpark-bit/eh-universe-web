#!/usr/bin/env node
// ============================================================
// PART 1 — Purpose & policy
// ============================================================
//
// 장기 세션 메모리 추세 측정(Studio 탭 타이핑 시뮬).
//
// 실제 12시간 돌리는 건 로컬 CI 비현실적 → 스케일다운 가능:
//   DURATION_MIN=30        # 기본 30분 (권장)
//   DURATION_MIN=3         # 빠른 smoke
//   DURATION_MIN=720       # 진짜 12시간 (서버 유지 필요)
//
//   SNAPSHOT_EVERY_MIN=10  # 스냅샷 간격(기본 10분)
//
// 의존성: Playwright(이미 설치). lighthouse/puppeteer 불필요.
//
// 사전 요건:
//   다른 터미널에서 프로덕션 서버 구동
//     npm run build && npx next start -p 3005
//
// Usage:
//   DURATION_MIN=30 node bench/memory-12h-sim.mjs
//
// 출력: bench/memory-12h-sim.json
// ============================================================

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================
// PART 2 — Config
// ============================================================

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const OUT_PATH = join(__dirname, 'memory-12h-sim.json');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3005';
const STUDIO_URL = `${BASE_URL}/studio`;

const DURATION_MIN = Number(process.env.DURATION_MIN ?? 30);
const SNAPSHOT_EVERY_MIN = Number(process.env.SNAPSHOT_EVERY_MIN ?? 10);

// 타이핑 청크 (Studio editor 에 붙여넣는 텍스트). 너무 크면 브라우저 처리 비용 과대.
const CHUNK = '가'.repeat(120) + '\n';
const TYPE_INTERVAL_MS = 500; // 0.5초마다 CHUNK 추가 → 분당 240자 ≈ 웹소설 중속 타자

// ============================================================
// PART 3 — Playwright lazy import
// ============================================================

async function loadPlaywright() {
  try {
    const mod = await import('@playwright/test');
    return mod;
  } catch (err) {
    console.error('[memory-sim] Playwright 를 불러올 수 없습니다:', err?.message || err);
    console.error('  npx playwright install chromium 을 먼저 실행했는지 확인하세요.');
    process.exit(2);
  }
}

// ============================================================
// PART 4 — Memory snapshot helpers
// ============================================================

/**
 * performance.memory 는 Chromium 전용. headless chromium 에서만 안정.
 * totalJSHeapSize / usedJSHeapSize / jsHeapSizeLimit (bytes).
 */
async function snapshotMemory(page) {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mem = performance && (performance).memory;
    if (!mem) return null;
    return {
      usedJSHeapBytes: mem.usedJSHeapSize ?? null,
      totalJSHeapBytes: mem.totalJSHeapSize ?? null,
      jsHeapLimitBytes: mem.jsHeapSizeLimit ?? null,
      ts: Date.now(),
    };
  });
}

// ============================================================
// PART 5 — Typing simulation loop
// ============================================================

async function simulateTyping(page, stopAt) {
  // 에디터 선택자: Tiptap 은 [contenteditable="true"] — 실패 시 body 로 폴백.
  const selector = '[contenteditable="true"], textarea';
  let target;
  try {
    target = await page.waitForSelector(selector, { timeout: 5000 });
  } catch {
    target = null;
  }

  let typed = 0;
  while (Date.now() < stopAt) {
    try {
      if (target) {
        await target.focus().catch(() => undefined);
        // page.keyboard.insertText 는 contenteditable / input 모두 호환.
        await page.keyboard.insertText(CHUNK);
      } else {
        // 폴백: body 에 직접 누적 (메모리 상승 패턴 여전히 유효).
        await page.evaluate((c) => {
          const el = document.body;
          el.dataset.benchMem = (el.dataset.benchMem || '') + c;
        }, CHUNK);
      }
      typed += CHUNK.length;
    } catch {
      // 페이지 상태 변화 — 루프 계속
    }
    await page.waitForTimeout(TYPE_INTERVAL_MS);
  }
  return typed;
}

// ============================================================
// PART 6 — Main driver
// ============================================================

async function main() {
  const { chromium } = await loadPlaywright();
  console.log(`[memory-sim] duration=${DURATION_MIN}min  snapshot=${SNAPSHOT_EVERY_MIN}min`);
  console.log(`[memory-sim] url=${STUDIO_URL}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  // Seed onboarding so /studio renders immediately.
  await context.addInitScript(() => {
    try {
      localStorage.setItem('eh-onboarded', '1');
      localStorage.setItem('noa_studio_lang', 'KO');
      localStorage.setItem('noa_first_visit_seen', '1');
    } catch {
      /* ignore */
    }
  });
  const page = await context.newPage();

  const navStart = Date.now();
  try {
    await page.goto(STUDIO_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  } catch (err) {
    console.error('[memory-sim] /studio 접속 실패:', err?.message || err);
    await browser.close();
    process.exit(3);
  }

  const snapshots = [];
  const initial = await snapshotMemory(page);
  snapshots.push({ phase: 'initial', ...(initial || {}) });

  const stopAt = Date.now() + DURATION_MIN * 60_000;
  const snapshotIntervalMs = SNAPSHOT_EVERY_MIN * 60_000;

  // 백그라운드 스냅샷 타이머 — setInterval 은 Node; 이벤트 루프가 살아있는 동안 동작.
  let typedChars = 0;
  const timer = setInterval(async () => {
    try {
      const snap = await snapshotMemory(page);
      if (snap) snapshots.push({ phase: 'ongoing', typedChars, ...snap });
    } catch {
      // 페이지 크래시 등 — 무시, 메인 루프에서 처리
    }
  }, snapshotIntervalMs);

  try {
    typedChars = await simulateTyping(page, stopAt);
  } finally {
    clearInterval(timer);
  }

  const finalSnap = await snapshotMemory(page);
  snapshots.push({ phase: 'final', typedChars, ...(finalSnap || {}) });

  await browser.close();

  const trend = computeTrend(snapshots);
  const payload = {
    capturedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    durationMin: DURATION_MIN,
    snapshotEveryMin: SNAPSHOT_EVERY_MIN,
    typedChars,
    navDurationMs: Date.now() - navStart,
    snapshots,
    trend,
  };
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[memory-sim] wrote ${OUT_PATH}`);
  console.log(`[memory-sim] trend: ${JSON.stringify(trend)}`);
}

// ============================================================
// PART 7 — Trend computation
// ============================================================

function computeTrend(snapshots) {
  const withHeap = snapshots.filter((s) => typeof s.usedJSHeapBytes === 'number');
  if (withHeap.length < 2) {
    return { measurable: false, reason: 'performance.memory unavailable (non-Chromium?)' };
  }
  const first = withHeap[0];
  const last = withHeap[withHeap.length - 1];
  const deltaBytes = last.usedJSHeapBytes - first.usedJSHeapBytes;
  const elapsedMin = (last.ts - first.ts) / 60_000;
  const growthBytesPerMin = elapsedMin > 0 ? deltaBytes / elapsedMin : 0;
  return {
    measurable: true,
    samples: withHeap.length,
    firstUsedMB: +(first.usedJSHeapBytes / (1024 * 1024)).toFixed(2),
    lastUsedMB: +(last.usedJSHeapBytes / (1024 * 1024)).toFixed(2),
    deltaMB: +(deltaBytes / (1024 * 1024)).toFixed(2),
    growthMBPerHour: +((growthBytesPerMin * 60) / (1024 * 1024)).toFixed(2),
  };
}

main().catch((err) => {
  console.error('[memory-sim] fatal:', err?.stack || err);
  process.exit(1);
});
