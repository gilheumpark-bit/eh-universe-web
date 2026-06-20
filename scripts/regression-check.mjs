#!/usr/bin/env node
// ============================================================
// PART 1 — Purpose
// ============================================================
//
// bench/baseline-*.json vs 현재 측정값 비교.
// 5% 이상 퇴보(regression) 발견 시 exit 1.
//
// Usage:
//   node scripts/regression-check.mjs bench/baseline-2026-04-20.json
//
// 옵션 환경 변수:
//   CURRENT_LIGHTHOUSE=bench/lighthouse-capture.json
//   CURRENT_MEMORY=bench/memory-12h-sim.json
//   CURRENT_TAB=bench/tab-traversal.json
//   REGRESSION_THRESHOLD=0.05   # 기본 5%
//
// 환경 변수가 가리키는 파일이 없으면 해당 섹션은 skip(탐지만 수행).
// ============================================================

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ============================================================
// PART 2 — Config & CLI parsing
// ============================================================

const THRESHOLD = Number(process.env.REGRESSION_THRESHOLD ?? 0.05);

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/regression-check.mjs <baseline.json>');
  process.exit(2);
}
const baselinePath = resolve(args[0]);
if (!existsSync(baselinePath)) {
  console.error(`[regression] baseline 파일 없음: ${baselinePath}`);
  process.exit(2);
}

const LH_CURRENT = resolve(process.env.CURRENT_LIGHTHOUSE || 'bench/lighthouse-capture.json');
const MEM_CURRENT = resolve(process.env.CURRENT_MEMORY || 'bench/memory-12h-sim.json');
const TAB_CURRENT = resolve(process.env.CURRENT_TAB || 'bench/tab-traversal.json');

// ============================================================
// PART 3 — Helpers
// ============================================================

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`[regression] JSON 읽기 실패: ${path} — ${err?.message || err}`);
    return null;
  }
}

/**
 * 숫자 비교 규칙:
 *   - 점수형(높을수록 좋음): baseline * (1 - threshold) 미만이면 regression
 *   - 비용형(낮을수록 좋음): baseline * (1 + threshold) 초과면 regression
 */
function isRegression(baseline, current, direction) {
  if (baseline == null || current == null) return false;
  if (baseline === 0) return false; // 0 baseline 은 비교 무의미
  if (direction === 'higher-is-better') {
    return current < baseline * (1 - THRESHOLD);
  }
  return current > baseline * (1 + THRESHOLD);
}

function pct(baseline, current) {
  if (baseline == null || current == null || baseline === 0) return null;
  return +(((current - baseline) / baseline) * 100).toFixed(2);
}

// ============================================================
// PART 4 — Lighthouse comparator
// ============================================================

function compareLighthouse(baseline, current, issues) {
  if (!baseline) {
    issues.skipped.push('lighthouse: baseline 섹션 없음');
    return;
  }
  if (!current) {
    issues.skipped.push('lighthouse: 현재 측정값 없음(skip)');
    return;
  }
  const bResults = baseline.results || {};
  const cResults = current.results || {};
  const keys = ['performance', 'accessibility', 'bestPractices', 'seo'];
  for (const route of Object.keys(bResults)) {
    const bRow = bResults[route] || {};
    const cRow = cResults[route] || {};
    for (const k of keys) {
      const b = bRow[k];
      const c = cRow[k];
      if (b == null || c == null) continue;
      if (isRegression(b, c, 'higher-is-better')) {
        issues.regressions.push({
          area: 'lighthouse',
          metric: `${route}.${k}`,
          baseline: b,
          current: c,
          changePct: pct(b, c),
        });
      }
    }
  }
}

// ============================================================
// PART 5 — Memory comparator
// ============================================================

function compareMemory(baseline, current, issues) {
  if (!baseline) {
    issues.skipped.push('memory: baseline 섹션 없음');
    return;
  }
  if (!current) {
    issues.skipped.push('memory: 현재 측정값 없음(skip)');
    return;
  }
  const bTrend = baseline.trend || {};
  const cTrend = current.trend || {};
  if (!bTrend.measurable || !cTrend.measurable) {
    issues.skipped.push('memory: performance.memory 미측정(Chromium 아님?)');
    return;
  }
  // lastUsedMB (lower-is-better), growthMBPerHour (lower-is-better)
  for (const metric of ['lastUsedMB', 'growthMBPerHour']) {
    const b = bTrend[metric];
    const c = cTrend[metric];
    if (isRegression(b, c, 'lower-is-better')) {
      issues.regressions.push({
        area: 'memory',
        metric,
        baseline: b,
        current: c,
        changePct: pct(b, c),
      });
    }
  }
}

// ============================================================
// PART 6 — Tab traversal comparator
// ============================================================

function compareTab(baseline, current, issues) {
  if (!baseline) {
    issues.skipped.push('tabTraversal: baseline 섹션 없음');
    return;
  }
  if (!current) {
    issues.skipped.push('tabTraversal: 현재 측정값 없음(skip)');
    return;
  }
  const bResults = baseline.results || {};
  const cResults = current.results || {};
  for (const id of Object.keys(bResults)) {
    const b = bResults[id] || {};
    const c = cResults[id] || {};
    // focusableCount: higher-is-better (탭이 도달하는 요소가 많을수록 좋음)
    if (isRegression(b.focusableCount, c.focusableCount, 'higher-is-better')) {
      issues.regressions.push({
        area: 'tabTraversal',
        metric: `${id}.focusableCount`,
        baseline: b.focusableCount,
        current: c.focusableCount,
        changePct: pct(b.focusableCount, c.focusableCount),
      });
    }
    // elapsedMs: lower-is-better
    if (isRegression(b.elapsedMs, c.elapsedMs, 'lower-is-better')) {
      issues.regressions.push({
        area: 'tabTraversal',
        metric: `${id}.elapsedMs`,
        baseline: b.elapsedMs,
        current: c.elapsedMs,
        changePct: pct(b.elapsedMs, c.elapsedMs),
      });
    }
    // trap 이 새로 발생한 경우 → 무조건 regression
    if (!b.trapSuspected && c.trapSuspected) {
      issues.regressions.push({
        area: 'tabTraversal',
        metric: `${id}.trapSuspected`,
        baseline: false,
        current: true,
        changePct: null,
      });
    }
  }
}

// ============================================================
// PART 7 — Main
// ============================================================

function main() {
  const baseline = readJson(baselinePath);
  if (!baseline) process.exit(2);

  const lhCurrent = existsSync(LH_CURRENT) ? readJson(LH_CURRENT) : null;
  const memCurrent = existsSync(MEM_CURRENT) ? readJson(MEM_CURRENT) : null;
  const tabCurrent = existsSync(TAB_CURRENT) ? readJson(TAB_CURRENT) : null;

  const issues = { regressions: [], skipped: [] };
  compareLighthouse(baseline.lighthouse, lhCurrent, issues);
  compareMemory(baseline.memory, memCurrent, issues);
  compareTab(baseline.tabTraversal, tabCurrent, issues);

  console.log('[regression] threshold =', `${(THRESHOLD * 100).toFixed(1)}%`);
  console.log('[regression] baseline  =', baselinePath);
  console.log('[regression] lighthouse=', existsSync(LH_CURRENT) ? LH_CURRENT : '(missing — skip)');
  console.log('[regression] memory    =', existsSync(MEM_CURRENT) ? MEM_CURRENT : '(missing — skip)');
  console.log('[regression] tab       =', existsSync(TAB_CURRENT) ? TAB_CURRENT : '(missing — skip)');

  if (issues.skipped.length) {
    console.log('\n[regression] skipped:');
    for (const s of issues.skipped) console.log('  -', s);
  }

  if (issues.regressions.length === 0) {
    console.log('\n[regression] OK — 5% 초과 퇴보 없음');
    process.exit(0);
  }

  console.error(`\n[regression] FAIL — ${issues.regressions.length}건 퇴보 감지`);
  for (const r of issues.regressions) {
    console.error(
      `  - [${r.area}] ${r.metric}: ${r.baseline} → ${r.current} (${r.changePct ?? 'n/a'}%)`,
    );
  }
  process.exit(1);
}

main();
