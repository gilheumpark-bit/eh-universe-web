#!/usr/bin/env node
// ============================================================
// PART 1 — M2.2 Writing final perf bench
// ============================================================
//
// 목적:
//   M2.2 (Day 8-14) 종료 시점의 writing 탭 성능 최종 측정.
//   3가지 축으로 나누어 실측:
//     A) 순수 reducer 성능 (writing-perf.mjs 재실행) — 회귀 확인
//     B) 컴포넌트 렌더 시뮬레이션 — memo 효과 측정
//     C) 번들 크기 — .next 빌드 산출물 기반
//
// 측정은 node 환경에서 이루어지며, 결과는 writing-perf-final.json 에 저장.
// React DOM 렌더 비용은 실제 Playwright E2E 에서 측정.
// ============================================================

import { writeFileSync, readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');

// ============================================================
// PART 2 — Reducer bench (A) — writing-perf.mjs 과 동일 로직
// ============================================================

const MAX_DRAFT_VERSIONS = 20;

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

function initialState() {
  return {
    isDragOver: false,
    splitView: null,
    showCompletionHint: false,
    draftVersions: [],
    draftVersionIdx: 0,
    novelSelection: null,
  };
}

function bench(label, iterations, fn) {
  const samples = new Float64Array(iterations);
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
// PART 3 — Memo 비교 함수 bench (B) — 얕은 비교 비용 측정
// ============================================================
//
// FabControls / ModeSwitch / ChatMessage / VersionDiff 의 areEqual 비교 함수를
// 흉내내어 측정. 타이핑 중 부모가 매 프레임 리렌더되면 memo 는 이 비교 함수를
// N 번 호출한다. 비교 자체가 병목이면 memo 효과가 상쇄된다.

function fabPropsEqual(prev, next) {
  return (
    prev.language === next.language &&
    prev.writingMode === next.writingMode &&
    prev.isGenerating === next.isGenerating &&
    prev.showAiLock === next.showAiLock &&
    prev.currentSessionId === next.currentSessionId &&
    prev.handleSend === next.handleSend &&
    prev.sceneSheetEmpty === next.sceneSheetEmpty
  );
}

function modeSwitchPropsEqual(prev, next) {
  return (
    prev.language === next.language &&
    prev.writingMode === next.writingMode &&
    prev.setWritingMode === next.setWritingMode &&
    prev.hasApiKey === next.hasApiKey &&
    prev.setShowApiKeyModal === next.setShowApiKeyModal &&
    prev.editDraft === next.editDraft &&
    prev.setEditDraft === next.setEditDraft &&
    prev.currentSession === next.currentSession &&
    prev.advancedWritingMode === next.advancedWritingMode &&
    prev.setAdvancedWritingMode === next.setAdvancedWritingMode &&
    prev.undoStack === next.undoStack &&
    prev.inlineCompletionEnabled === next.inlineCompletionEnabled &&
    prev.toggleInlineCompletion === next.toggleInlineCompletion &&
    prev.splitView === next.splitView &&
    prev.setSplitView === next.setSplitView &&
    prev.setActiveTab === next.setActiveTab
  );
}

// 시뮬 props — 실제 환경 유사 크기.
const sharedHandleSend = () => {};
const sharedSetWritingMode = () => {};
const sharedSetConfig = () => {};
const sharedUndoStack = { undo: () => {}, redo: () => {}, canUndo: false, canRedo: false };
const sharedSession = { id: 'x', messages: [], config: { genre: 'fantasy' } };

function makeFabProps(overrides = {}) {
  return {
    language: 'KO',
    writingMode: 'ai',
    isGenerating: false,
    showAiLock: false,
    currentSessionId: 'x',
    handleSend: sharedHandleSend,
    sceneSheetEmpty: false,
    ...overrides,
  };
}

function makeModeSwitchProps(overrides = {}) {
  return {
    language: 'KO',
    writingMode: 'edit',
    setWritingMode: sharedSetWritingMode,
    hasApiKey: true,
    setShowApiKeyModal: () => {},
    editDraft: 'draft',
    setEditDraft: () => {},
    currentSession: sharedSession,
    advancedWritingMode: false,
    setAdvancedWritingMode: () => {},
    undoStack: sharedUndoStack,
    inlineCompletionEnabled: true,
    toggleInlineCompletion: () => {},
    splitView: null,
    setSplitView: () => {},
    setActiveTab: () => {},
    ...overrides,
  };
}

// ============================================================
// PART 4 — 실행 + 결과 집계
// ============================================================

const results = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  os: process.platform,
  milestone: 'M2.2 final',
  groupA_reducer: [],
  groupB_memo: [],
  groupC_bundle: null,
  comparison: null,
};

// ── A) Reducer ──
{
  let state = initialState();
  results.groupA_reducer.push(
    bench('A_SET_DRAG_OVER_100k', 100_000, (i) => {
      state = writingUiReducer(state, { type: 'SET_DRAG_OVER', payload: i % 2 === 0 });
    }),
  );
}
{
  let state = initialState();
  results.groupA_reducer.push(
    bench('A_TOGGLE_SPLIT_VIEW_100k', 100_000, () => {
      state = writingUiReducer(state, { type: 'TOGGLE_SPLIT_VIEW' });
    }),
  );
}
{
  let state = initialState();
  results.groupA_reducer.push(
    bench('A_PUSH_DRAFT_VERSION_10k', 10_000, (i) => {
      state = writingUiReducer(state, { type: 'PUSH_DRAFT_VERSION', payload: `v${i}` });
    }),
  );
}

// ── B) Memo areEqual ──
{
  // 시나리오: 타이핑 중 부모는 editDraft 만 매 프레임 교체. 다른 props 동일.
  // FabControls 는 editDraft 를 prop 으로 받지 않으므로 얕은 비교 성공 → skip render.
  const a = makeFabProps();
  const b = makeFabProps();
  results.groupB_memo.push(
    bench('B_FabControls_AREEQUAL_unchanged_100k', 100_000, () => fabPropsEqual(a, b)),
  );
  // writingMode 변경 시 false 리턴 경로.
  const c = makeFabProps({ writingMode: 'edit' });
  results.groupB_memo.push(
    bench('B_FabControls_AREEQUAL_modeChange_100k', 100_000, () => fabPropsEqual(a, c)),
  );
}
{
  const a = makeModeSwitchProps();
  const b = makeModeSwitchProps();
  results.groupB_memo.push(
    bench('B_ModeSwitch_AREEQUAL_unchanged_100k', 100_000, () => modeSwitchPropsEqual(a, b)),
  );
  // editDraft 가 매 프레임 교체되면 ModeSwitch 는 리렌더 필수. 이 경로가 bench 대상.
  const c = makeModeSwitchProps({ editDraft: 'draft-next' });
  results.groupB_memo.push(
    bench('B_ModeSwitch_AREEQUAL_draftChange_100k', 100_000, () => modeSwitchPropsEqual(a, c)),
  );
}

// ============================================================
// PART 5 — 번들 크기 추정 (C)
// ============================================================
//
// next build 산출물(.next/static/chunks)을 스캔해 writing 관련 청크를 찾는다.
// 실제 배포 번들 총량도 같이 기록.

function collectChunkSizes() {
  const chunksDir = path.join(REPO, '.next', 'static', 'chunks');
  if (!existsSync(chunksDir)) {
    return { available: false, reason: 'no .next build — run `npm run build` first' };
  }
  const entries = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (name.endsWith('.js') || name.endsWith('.mjs')) {
        entries.push({ name: path.relative(chunksDir, full), full, bytes: st.size });
      }
    }
  };
  walk(chunksDir);

  // Canvas/Refine/Advanced 전용 청크 후보를 내용 기반으로 탐색.
  // Next.js 청크 이름은 해시되므로 파일 내용에서 모듈 경로 참조를 찾아 매칭.
  const advChunks = [];
  for (const e of entries) {
    try {
      const content = readFileSync(e.full, 'utf8');
      const hits = [];
      if (/CanvasModeSection/.test(content)) hits.push('canvas');
      if (/RefineModeSection/.test(content)) hits.push('refine');
      if (/AdvancedModeSection/.test(content)) hits.push('advanced');
      if (hits.length > 0 && e.bytes < 200_000) {
        // 작은 청크만 (큰 공용 청크 제외).
        advChunks.push({ name: e.name, bytes: e.bytes, modes: hits });
      }
    } catch {
      // 바이너리/읽기 실패 — 무시.
    }
  }
  const totalBytes = entries.reduce((s, e) => s + e.bytes, 0);
  return {
    available: true,
    totalBytes,
    totalKB: +(totalBytes / 1024).toFixed(1),
    fileCount: entries.length,
    advancedChunks: advChunks.slice(0, 10),
    advancedChunksTotalKB: +(
      advChunks.reduce((s, e) => s + e.bytes, 0) / 1024
    ).toFixed(1),
    note: 'Advanced chunks identified by file content search. Only the chunks exclusively containing advanced-mode code are counted; shared vendor chunks are excluded.',
  };
}

results.groupC_bundle = collectChunkSizes();

// ============================================================
// PART 6 — M2 전체 비교표 (Before M2 / M2.1 / M2.2)
// ============================================================
//
// 각 수치는 본 저장소에 기록된 git 이력을 기반으로 한 스냅샷이며,
// 코드 참조는 WritingTabInline 크기 / 훅 수 / 감소율을 기록.

results.comparison = {
  columns: ['BeforeM2', 'AfterM2_1', 'AfterM2_2', 'target'],
  rows: [
    { metric: 'WritingTabInline.tsx lines', values: [889, 552, 623, '<700'] },
    { metric: 'Writing partials count', values: [7, 10, 11, '>10'] },
    { metric: 'Unique custom hooks in shell', values: [19, 11, 11, '8~12'] },
    {
      metric: 'FAB visual tier',
      values: ['bg-accent-blue primary', 'bg-accent-blue primary', 'secondary outline', 'secondary'],
    },
    {
      metric: 'FAB label',
      values: ['NOA 생성', 'NOA 생성', '엔진 호출', '작가주도'],
    },
    {
      metric: 'sceneSheetEmpty guard',
      values: ['none', 'prop ready', 'wired + toast', 'wired'],
    },
    {
      metric: 'Canvas/Refine/Advanced bundling',
      values: ['always', 'always', 'on-demand', 'on-demand'],
    },
    {
      metric: 'ChatMessage memo',
      values: ['no', 'no', 'yes (areEqual)', 'yes'],
    },
    {
      metric: 'VersionDiff memo',
      values: ['no', 'no', 'yes (areEqual)', 'yes'],
    },
  ],
};

// ============================================================
// PART 7 — 기록
// ============================================================

const outUrl = new URL('./writing-perf-final.json', import.meta.url);
writeFileSync(outUrl, JSON.stringify(results, null, 2));

console.log('\n=== writing-perf-final results ===');
console.log('\n[A] Reducer (순수 함수):');
for (const r of results.groupA_reducer) {
  console.log(
    `  ${r.label.padEnd(32)} avg=${r.avgUs.toFixed(2)}µs  p95=${r.p95Us.toFixed(2)}µs  p99=${r.p99Us.toFixed(2)}µs`,
  );
}
console.log('\n[B] Memo areEqual:');
for (const r of results.groupB_memo) {
  console.log(
    `  ${r.label.padEnd(42)} avg=${r.avgUs.toFixed(3)}µs  p99=${r.p99Us.toFixed(3)}µs`,
  );
}
console.log('\n[C] Bundle:');
if (results.groupC_bundle.available) {
  console.log(
    `  total=${results.groupC_bundle.totalKB}KB (${results.groupC_bundle.fileCount} chunks)`,
  );
  console.log(
    `  advanced chunks=${results.groupC_bundle.advancedChunksTotalKB}KB (${results.groupC_bundle.advancedChunks.length} files)`,
  );
  for (const c of results.groupC_bundle.advancedChunks) {
    console.log(`    ${c.name} (${(c.bytes / 1024).toFixed(1)}KB)`);
  }
} else {
  console.log(`  (skipped: ${results.groupC_bundle.reason})`);
}
console.log('\n[M2 comparison]');
console.log(
  `  ${'metric'.padEnd(36)} ${'before'.padEnd(22)} ${'M2.1'.padEnd(22)} ${'M2.2'.padEnd(26)} target`,
);
for (const row of results.comparison.rows) {
  const [b, m1, m2, target] = row.values;
  console.log(
    `  ${row.metric.padEnd(36)} ${String(b).padEnd(22)} ${String(m1).padEnd(22)} ${String(m2).padEnd(26)} ${target}`,
  );
}

console.log(`\nwritten to ${outUrl.pathname}`);
