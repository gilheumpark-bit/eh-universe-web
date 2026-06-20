#!/usr/bin/env node
// ============================================================
// PART 1 — Purpose
// ============================================================
//
// Studio 탭 6종에서 키보드 Tab 순회를 측정.
// - 전체 focusable 개수
// - 전체 순회 시간(ms)
// - Tab 으로 도달 불가(trap / skip) 의심 지점
//
// 의존성: Playwright only (이미 설치됨).
//
// Usage:
//   node bench/tab-traversal.mjs
//   BASE_URL=http://127.0.0.1:3005 node bench/tab-traversal.mjs
//
// 사전 요건: 프로덕션 서버가 떠 있어야 함
//   npm run build && npx next start -p 3005
// ============================================================

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================
// PART 2 — Config
// ============================================================

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const OUT_PATH = join(__dirname, 'tab-traversal.json');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3005';

// Studio 내부 탭은 SPA 클릭으로 전환됨. 간단화를 위해 라우트 기반 측정.
// 라우트는 현재 v2.1.3 에서 안정적으로 접근 가능한 페이지만 포함.
const TARGETS = [
  { id: 'writing', url: `${BASE_URL}/studio`, label: '집필 스튜디오' },
  { id: 'rulebook', url: `${BASE_URL}/rulebook`, label: '규칙서' },
  { id: 'reference', url: `${BASE_URL}/reference`, label: '레퍼런스' },
  { id: 'archive', url: `${BASE_URL}/archive`, label: '아카이브' },
  { id: 'codex', url: `${BASE_URL}/codex`, label: '코덱스' },
  { id: 'network', url: `${BASE_URL}/network`, label: '네트워크' },
];

// 안전 가드: Tab 루프가 무한히 돌지 않도록 상한.
const MAX_TABS = 400;
const PER_TAB_DELAY_MS = 25; // 너무 빠르면 포커스 전환이 씹힘

// ============================================================
// PART 3 — Playwright lazy import
// ============================================================

async function loadPlaywright() {
  try {
    return await import('@playwright/test');
  } catch (err) {
    console.error('[tab-traversal] Playwright 로드 실패:', err?.message || err);
    process.exit(2);
  }
}

// ============================================================
// PART 4 — Single-page traversal
// ============================================================

async function traversePage(page) {
  // 1) 초기 포커스: body 에서 시작 → Tab 한 번으로 첫 focusable 진입
  await page.evaluate(() => {
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur?.();
    }
    document.body.focus?.();
  });

  // 2) Tab 루프: 동일 시그니처 재방문 시 loop 종료(사이클 감지).
  const seen = new Set();
  const order = [];
  let stalls = 0;
  let firstElementSignature = null;
  const start = Date.now();

  for (let i = 0; i < MAX_TABS; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(PER_TAB_DELAY_MS);

    const sig = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const tag = el.tagName?.toLowerCase() ?? '';
      const id = el.id ? `#${el.id}` : '';
      const cls = el.classList && el.classList.length
        ? '.' + Array.from(el.classList).slice(0, 3).join('.')
        : '';
      const role = el.getAttribute?.('role') ?? '';
      const label =
        el.getAttribute?.('aria-label') ||
        el.getAttribute?.('name') ||
        (el.textContent || '').trim().slice(0, 40);
      return `${tag}${id}${cls}${role ? `[role=${role}]` : ''}|${label}`;
    });

    if (sig == null) {
      stalls += 1;
      // body 에 되돌아갔거나 포커스 소실 — 루프 종료 조건 중 하나
      if (stalls >= 3) break;
      continue;
    }
    stalls = 0;

    if (firstElementSignature == null) firstElementSignature = sig;
    else if (sig === firstElementSignature) {
      // 사이클 완료
      break;
    }

    if (seen.has(sig)) {
      // 동일 요소 재방문 — 보통 사이클이나 동적 포커스 트랩
      order.push({ sig, revisited: true });
    } else {
      seen.add(sig);
      order.push({ sig, revisited: false });
    }
  }
  const elapsedMs = Date.now() - start;

  // 간이 휴리스틱: revisited 비율이 높으면 trap 가능성.
  const revisitedCount = order.filter((o) => o.revisited).length;
  const trapSuspected = revisitedCount > Math.max(3, Math.floor(order.length * 0.15));

  return {
    focusableCount: seen.size,
    totalTabPresses: order.length,
    elapsedMs,
    revisitedCount,
    trapSuspected,
    sampleOrder: order.slice(0, 15).map((o) => o.sig),
  };
}

// ============================================================
// PART 5 — Main driver
// ============================================================

async function main() {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
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

  const perTab = {};
  const errors = [];
  for (const t of TARGETS) {
    process.stdout.write(`[tab-traversal] ${t.id} ${t.url} ... `);
    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForTimeout(800); // 초기 포커스 안정
      const result = await traversePage(page);
      perTab[t.id] = { label: t.label, url: t.url, ...result };
      process.stdout.write(
        `focusable=${result.focusableCount} ms=${result.elapsedMs} trap=${result.trapSuspected}\n`,
      );
    } catch (err) {
      process.stdout.write(`ERR\n`);
      errors.push({ id: t.id, url: t.url, error: String(err?.message || err) });
    }
  }

  await browser.close();

  const payload = {
    capturedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    maxTabs: MAX_TABS,
    perTabDelayMs: PER_TAB_DELAY_MS,
    targets: Object.keys(perTab).length,
    errors,
    results: perTab,
  };
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[tab-traversal] wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error('[tab-traversal] fatal:', err?.stack || err);
  process.exit(1);
});
