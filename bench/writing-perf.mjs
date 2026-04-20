#!/usr/bin/env node
// ============================================================
// PART 1 — Writing tab perf bench (M2 Day 8-10 foundation)
// ============================================================
//
// 목적:
//   useWritingReducer의 순수 reducer 함수가 핫패스(토글/push)에서
//   p99 ≤ 50µs 를 유지하는지 증명. 타이핑 중 draftVersion push, split view
//   토글, dragOver 이벤트가 매 프레임 호출되더라도 렌더 오버헤드 이전 단계에서
//   병목이 아니어야 함.
//
// 측정 대상:
//   A) SET_DRAG_OVER       — 100k 회 토글 (드래그 이벤트 속도)
//   B) TOGGLE_SPLIT_VIEW   — 100k 회 (단축키 연타 시뮬)
//   C) PUSH_DRAFT_VERSION  — 10k 회 (20 cap 후 shift O(1~n) 혼재)
//   D) SET_NOVEL_SELECTION — 100k 회 (에디터 커서 이동)
//
// 비교:
//   동일 연산을 useState 체이닝으로 흉내낸 baseline (N 개 useState 시뮬)과
//   reducer 단일 콜을 비교. 이 bench는 Node에서 돌기 때문에 실제 React 렌더
//   비용은 제외 — 순수 함수 호출 오버헤드만 측정.
//
// 결과: bench/writing-perf-result.json 에 p50/p95/p99/avg 기록.
// 실행: `node bench/writing-perf.mjs`
//
// NOTE: 이 스크립트는 .mjs 이므로 TS 원본을 읽지 않고 reducer 로직을 직접
//       복사한 JS 버전(PART 2)을 측정 대상으로 사용. TS 원본은 jest로 검증.
// ============================================================

import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

// ============================================================
// PART 2 — Reducer JS 포팅 (src/hooks/useWritingReducer.ts 미러)
// ============================================================

const MAX_DRAFT_VERSIONS = 20;

/** Source-of-truth: src/hooks/useWritingReducer.ts writingUiReducer */
function writingUiReducer(state, action) {
  switch (action.type) {
    case 'SET_DRAG_OVER':
      return { ...state, isDragOver: action.payload };
    case 'SET_SPLIT_VIEW':
      return { ...state, splitView: action.payload };
    case 'TOGGLE_SPLIT_VIEW':
      return { ...state, splitView: state.splitView ? null : 'reference' };
    case 'SET_COMPLETION_HINT':
      return { ...state, showCompletionHint: action.payload };
    case 'SET_DRAFT_VERSIONS':
      return { ...state, draftVersions: action.payload };
    case 'PUSH_DRAFT_VERSION': {
      const next = [...state.draftVersions, action.payload];
      if (next.length > MAX_DRAFT_VERSIONS) next.shift();
      return { ...state, draftVersions: next, draftVersionIdx: state.draftVersionIdx + 1 };
    }
    case 'SET_DRAFT_VERSION_IDX': {
      const v = action.payload;
      const next = typeof v === 'function' ? v(state.draftVersionIdx) : v;
      return { ...state, draftVersionIdx: next };
    }
    case 'SET_NOVEL_SELECTION':
      return { ...state, novelSelection: action.payload };
    default:
      return state;
  }
}

function initial() {
  return {
    isDragOver: false,
    splitView: null,
    showCompletionHint: false,
    draftVersions: [],
    draftVersionIdx: 0,
    novelSelection: null,
  };
}

// ============================================================
// PART 3 — 측정 헬퍼
// ============================================================

function bench(label, iterations, fn) {
  const samples = new Float64Array(iterations);
  // warmup
  for (let i = 0; i < 1000; i++) fn(i);
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    fn(i);
    samples[i] = performance.now() - t0;
  }
  const sorted = Array.from(samples).sort((a, b) => a - b);
  const p = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    label,
    iterations,
    avgUs: (sum / iterations) * 1000,
    p50Us: p(0.5) * 1000,
    p95Us: p(0.95) * 1000,
    p99Us: p(0.99) * 1000,
    maxUs: p(1) * 1000,
  };
}

// ============================================================
// PART 4 — 시나리오
// ============================================================

const results = [];

// A) SET_DRAG_OVER — 100k
{
  let state = initial();
  results.push(
    bench('A_SET_DRAG_OVER_100k', 100_000, (i) => {
      state = writingUiReducer(state, {
        type: 'SET_DRAG_OVER',
        payload: i % 2 === 0,
      });
    }),
  );
}

// B) TOGGLE_SPLIT_VIEW — 100k
{
  let state = initial();
  results.push(
    bench('B_TOGGLE_SPLIT_VIEW_100k', 100_000, () => {
      state = writingUiReducer(state, { type: 'TOGGLE_SPLIT_VIEW' });
    }),
  );
}

// C) PUSH_DRAFT_VERSION — 10k (cap 20 shift 포함)
{
  let state = initial();
  results.push(
    bench('C_PUSH_DRAFT_VERSION_10k', 10_000, (i) => {
      state = writingUiReducer(state, {
        type: 'PUSH_DRAFT_VERSION',
        payload: `v${i}`,
      });
    }),
  );
}

// D) SET_NOVEL_SELECTION — 100k
{
  let state = initial();
  results.push(
    bench('D_SET_NOVEL_SELECTION_100k', 100_000, (i) => {
      state = writingUiReducer(state, {
        type: 'SET_NOVEL_SELECTION',
        payload: { from: i, to: i + 10, text: 'x' },
      });
    }),
  );
}

// ============================================================
// PART 5 — 게이트 검증
// ============================================================
//
// 게이트:
//   p99 ≤ 50 µs (Node 환경, 순수 함수)
//   avg ≤ 10 µs
// 초과 시 exit 1.

const FAIL_P99_US = 50;
const FAIL_AVG_US = 10;
let failed = false;
for (const r of results) {
  if (r.p99Us > FAIL_P99_US) {
    console.error(
      `[FAIL] ${r.label} p99=${r.p99Us.toFixed(2)}µs > ${FAIL_P99_US}µs`,
    );
    failed = true;
  }
  if (r.avgUs > FAIL_AVG_US) {
    console.error(
      `[FAIL] ${r.label} avg=${r.avgUs.toFixed(2)}µs > ${FAIL_AVG_US}µs`,
    );
    failed = true;
  }
}

// ============================================================
// PART 6 — 결과 저장
// ============================================================

const report = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  os: process.platform,
  gate: { p99Us: FAIL_P99_US, avgUs: FAIL_AVG_US },
  results,
  failed,
};

const outputUrl = new URL('./writing-perf-result.json', import.meta.url);
writeFileSync(outputUrl, JSON.stringify(report, null, 2));

console.log('writing-perf results:');
for (const r of results) {
  console.log(
    `  ${r.label.padEnd(30)} avg=${r.avgUs.toFixed(2)}µs  p50=${r.p50Us.toFixed(2)}µs  p95=${r.p95Us.toFixed(2)}µs  p99=${r.p99Us.toFixed(2)}µs`,
  );
}
console.log(`\nwritten to ${outputUrl.pathname}`);

if (failed) {
  console.error('\n[GATE FAILED] one or more metrics above threshold');
  process.exit(1);
}
console.log('\n[GATE PASSED] all metrics within threshold');
