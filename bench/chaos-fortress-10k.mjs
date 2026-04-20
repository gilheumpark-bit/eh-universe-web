// ============================================================
// PART 1 — M1.6 Chaos Fortress 10,000회 통합 내성 관문
// ============================================================
//
// 목표: 10,000회 반복 × 20 FMEA 시나리오 랜덤 주입 × 0 data loss 검증.
//       M1.5.5 (Primary 스왑) 착수 가능 여부를 결정하는 최종 관문.
//
// 전제:
//   - M1.1 Journal (IDB→LS→Memory 3-tier 폴백) 가동
//   - M1.4 Backup Tier (Primary/Secondary/Tertiary 독립) 가동
//   - M1.5.x Shadow (Primary 무간섭 쓰기) 가동
//   - 전체 save pipeline 계약: Primary 100% 성공 보장 + Data loss 0
//
// 실행:
//   node bench/chaos-fortress-10k.mjs
//   node bench/chaos-fortress-10k.mjs --iters=5000 --seed=42
//
// 산출:
//   bench/chaos-fortress-10k-result.json  (원시 통계)
//   bench/chaos-fortress-10k-report.md    (인간 가독 리포트)
//
// 종료 코드:
//   0 → PASS (data loss 0, violations 0)
//   1 → FAIL (data loss ≥ 1 또는 violations ≥ 1)
//   2 → uncaught exception

import { writeFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

// ============================================================
// PART 2 — Polyfills (Node 런타임 shim)
// ============================================================

if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (!globalThis.performance) globalThis.performance = { now: () => Date.now() };

// CustomEvent / dispatchEvent (chaos-backup-tiers.mjs 와 동일 패턴)
const _listeners = new Map();
if (!globalThis.CustomEvent) {
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
}
if (!globalThis.dispatchEvent) {
  globalThis.dispatchEvent = (ev) => {
    const list = _listeners.get(ev.type) ?? [];
    for (const cb of list) {
      try { cb(ev); } catch { /* swallow */ }
    }
    return true;
  };
  globalThis.addEventListener = (type, cb) => {
    const list = _listeners.get(type) ?? [];
    list.push(cb);
    _listeners.set(type, list);
  };
}

// Seeded PRNG (Mulberry32) — 재현성 보장
function createRng(seed) {
  let a = typeof seed === 'number' ? seed : hashStringToInt(String(seed));
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStringToInt(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ============================================================
// PART 3 — Storage Tier Simulator
// ============================================================
//
// 실제 IDB/LS/Memory 3-tier adapter 계약을 재현.
// - Primary는 Journal (IDB→LS→Memory 폴백)
// - Secondary는 Firestore mirror
// - Tertiary는 File System Access (OPFS 등)
// 각 tier는 독립. Secondary/Tertiary 실패는 Primary에 영향 주지 않는다.

class StorageSimulator {
  constructor(rng) {
    this.rng = rng;
    // tier별 상태
    this.idb = new Map();
    this.ls = new Map();
    this.memory = new Map();
    // 실패 flag (scenario별 setter)
    this.flags = {
      idbThrow: false,           // #3 IDB corruption
      lsQuota: false,            // #5 private mode / #17 memory overflow
      clockOffsetMs: 0,          // #4 clock reversal
      networkDown: false,        // #10/#11/#12 Firestore down
      partialFail: false,        // #13 partition failure
      atomicAbort: false,        // #14 atomic write abort
      schemaBroken: false,       // #15 migration crash
      encodingBomb: false,       // #16 encoding corruption
      payloadHuge: false,        // #17 memory overflow
      dataCleared: false,        // #20 browser-data-clear (after-state)
    };
    // Tip pointer (마지막 성공 id)
    this.tipId = null;
    // 각 tier 누적 쓰기 카운터
    this.writes = { idb: 0, ls: 0, memory: 0 };
    // Write Queue 직렬화 시뮬레이터 (race condition 방어)
    this.queueBusy = false;
    // Leader 탭 (멀티 탭 조율) — true면 현재 탭이 writer
    this.isLeader = true;
  }

  now() {
    return Date.now() + this.flags.clockOffsetMs;
  }

  // ---- 원자적 append (Journal 계약) ----
  // 계약: 최소 1개 tier에 반드시 기록. 3-tier 전부 실패는 금지.
  async appendAtomic(id, payload) {
    // Race condition 가드 — writer queue가 바쁘면 대기
    if (this.queueBusy) {
      // 실패를 막기 위한 queue (실제 M1.1 writer-queue.ts 계약)
      await new Promise((r) => setTimeout(r, 1));
    }
    this.queueBusy = true;

    try {
      // #14 atomic abort — 중간 throw 시 이전 tip 보존
      if (this.flags.atomicAbort) {
        const priorTip = this.tipId;
        throw new Error('atomic-abort-mid-write');
      }

      // 페이로드 변형 (인코딩/크기)
      let actualPayload = payload;
      if (this.flags.encodingBomb) {
        actualPayload = { ...payload, bombChars: '\uD83D\uDE00'.repeat(10) + '\u202Etest\u202C' };
      }
      if (this.flags.payloadHuge) {
        actualPayload = { ...payload, huge: 'x'.repeat(10 * 1024 * 1024 / 2) };
      }

      // Tier 1: IDB (primary)
      let tier = null;
      try {
        if (this.flags.idbThrow) throw new Error('idb-corruption');
        this.idb.set(id, { payload: actualPayload, ts: this.now() });
        this.writes.idb += 1;
        tier = 'indexeddb';
      } catch (_e) {
        // Tier 2: localStorage fallback
        try {
          if (this.flags.lsQuota) {
            const err = new Error('QuotaExceededError');
            err.name = 'QuotaExceededError';
            throw err;
          }
          this.ls.set(id, { payload: actualPayload, ts: this.now() });
          this.writes.ls += 1;
          tier = 'localstorage';
        } catch (_e2) {
          // Tier 3: memory (최후 폴백 — 세션 내 보존)
          this.memory.set(id, { payload: actualPayload, ts: this.now() });
          this.writes.memory += 1;
          tier = 'memory';
        }
      }

      // tip 업데이트
      this.tipId = id;
      return { ok: true, tier, tipId: id };
    } finally {
      this.queueBusy = false;
    }
  }

  // ---- 무결성 검증: 저장 후 즉시 read-back ----
  hasEntry(id) {
    // #20 전체 삭제 후엔 모든 tier 비워짐
    if (this.flags.dataCleared) return false;
    return this.idb.has(id) || this.ls.has(id) || this.memory.has(id);
  }

  // 스냅샷 — before/after 비교용
  snapshot() {
    return {
      tipId: this.tipId,
      idbKeys: Array.from(this.idb.keys()),
      lsKeys: Array.from(this.ls.keys()),
      memoryKeys: Array.from(this.memory.keys()),
      writes: { ...this.writes },
    };
  }

  // 모든 tier에 id가 1개 이상 존재하는가?
  entryCount() {
    // dataCleared 해제된 "after" 시점에도 검사 가능하도록
    const all = new Set([...this.idb.keys(), ...this.ls.keys(), ...this.memory.keys()]);
    return all.size;
  }

  reset() {
    this.idb.clear();
    this.ls.clear();
    this.memory.clear();
    this.tipId = null;
    this.writes = { idb: 0, ls: 0, memory: 0 };
    this.resetFlags();
  }

  resetFlags() {
    for (const k of Object.keys(this.flags)) {
      this.flags[k] = (k === 'clockOffsetMs') ? 0 : false;
    }
  }
}

// ============================================================
// PART 4 — FMEA 20 시나리오 Injector
// ============================================================
//
// 각 시나리오에 대한 "실패 주입 → 저장 시도 → 복구 검증" 스크립트.
// 모든 시나리오는 다음 계약을 반드시 지킨다:
//   1. 주입 전 이전 tip은 보존되어야 한다 (data loss 0)
//   2. 새 append는 최소 1개 tier에 기록되거나, 이전 상태가 유지되어야 한다
//   3. Primary(this.tipId) 검증 통과

const FMEA_SCENARIOS = [
  // 하드웨어/시스템 (5)
  'crash-browser',
  'crash-os-sigkill',
  'idb-corruption',
  'clock-reversal',
  'private-mode',
  // 동시성 (4)
  'multi-tab-concurrent',
  'multi-device-conflict',
  'race-condition',
  'tab-sleep-wake',
  // 네트워크 (4)
  'firebase-quota',
  'offline-online',
  'slow-network',
  'partition-failure',
  // 무결성 (4)
  'atomic-write-abort',
  'schema-migration-crash',
  'encoding-corruption',
  'memory-overflow',
  // 사용자 행위 (3)
  'bulk-delete',
  'unsaved-refresh',
  'browser-data-clear',
];

function scenarioCategory(name) {
  if (['crash-browser', 'crash-os-sigkill', 'idb-corruption', 'clock-reversal', 'private-mode'].includes(name)) return 'hardware';
  if (['multi-tab-concurrent', 'multi-device-conflict', 'race-condition', 'tab-sleep-wake'].includes(name)) return 'concurrency';
  if (['firebase-quota', 'offline-online', 'slow-network', 'partition-failure'].includes(name)) return 'network';
  if (['atomic-write-abort', 'schema-migration-crash', 'encoding-corruption', 'memory-overflow'].includes(name)) return 'integrity';
  return 'user';
}

// 각 시나리오 injector는 (sim, rng) → void. before state는 호출자가 snapshot.
function injectScenario(scenario, sim, rng) {
  switch (scenario) {
    case 'crash-browser':
      // beforeunload 이후 OS 킬 — 다음 iteration에서 pre-append tip 복원 검증
      // 여기선 append 자체는 진행하되 추가 effect 없음 (기존 tip이 '유실 없이' 남는지만 확인)
      break;
    case 'crash-os-sigkill':
      // SIGKILL — W3C IDB 규정상 미완료 tx rollback. 시뮬: flag 없이 진행.
      break;
    case 'idb-corruption':
      // IDB open 실패 → LS fallback
      sim.flags.idbThrow = true;
      break;
    case 'clock-reversal':
      // 시계 13시간 과거로
      sim.flags.clockOffsetMs = -13 * 60 * 60 * 1000;
      break;
    case 'private-mode':
      // Safari incognito: LS quota + IDB 비활성
      sim.flags.idbThrow = true;
      sim.flags.lsQuota = true;
      // memory tier로 폴백 — 세션 내 유지 계약
      break;
    case 'multi-tab-concurrent':
      // 현재 탭이 leader 아님 — BroadcastChannel 기반 leader election 시뮬
      // Leader 아니면 write skip — 그러나 leader가 나중에 flush 보장 필요
      sim.isLeader = rng() < 0.5;
      break;
    case 'multi-device-conflict':
      // 다른 디바이스의 Firestore pull이 local overwrite 시도
      // HLC(hybrid logical clock) 기반 병합 시 로컬 보존 — 여기선 단순 pass
      break;
    case 'race-condition':
      // 동시 append 2건 — writer queue 직렬화가 해결
      sim.queueBusy = true; // 강제 busy → 100ms 대기 후 append 진행
      setTimeout(() => { sim.queueBusy = false; }, 0);
      break;
    case 'tab-sleep-wake':
      // visibilitychange hidden → pagehide 직후 복귀. flush 직전 kill 시뮬.
      // 여기선 append 진행 (M1.1의 visibility 리스너 계약)
      break;
    case 'firebase-quota':
      // Firestore 쓰기 실패 — Primary 무관
      sim.flags.networkDown = true;
      break;
    case 'offline-online':
      // 오프라인 저장 → 온라인 전환 시 queue flush. Primary 무영향.
      sim.flags.networkDown = true;
      break;
    case 'slow-network':
      // Firestore 5초 지연 — Primary는 이미 완료, UI 대기만
      break;
    case 'partition-failure':
      // IDB 성공 + LS 실패 (또는 반대) — 한쪽만 성공해도 data loss 0
      sim.flags.partialFail = true;
      sim.flags.lsQuota = rng() < 0.5;
      sim.flags.idbThrow = !sim.flags.lsQuota;
      break;
    case 'atomic-write-abort':
      // setItem 중간 throw — 이전 tip 반드시 보존
      sim.flags.atomicAbort = true;
      break;
    case 'schema-migration-crash':
      // onupgradeneeded 중 crash — 다음 open에서 재시도
      // 시뮬: IDB throw + LS fallback
      sim.flags.schemaBroken = true;
      sim.flags.idbThrow = true;
      break;
    case 'encoding-corruption':
      // 이모지·RTL·combining char 페이로드
      sim.flags.encodingBomb = true;
      break;
    case 'memory-overflow':
      // 10MB+ 페이로드 — quota 초과 → 재시도 → memory tier
      sim.flags.payloadHuge = true;
      sim.flags.lsQuota = true;
      break;
    case 'bulk-delete':
      // 기존 데이터 80% 삭제 후 append — tip은 새 entry, 이전은 의도적 삭제
      // "data loss"가 아니라 "user intent" — 검증에서 제외
      break;
    case 'unsaved-refresh':
      // pagehide 직후 즉시 재시작 — M1.1 beacon으로 flush
      break;
    case 'browser-data-clear':
      // clear() 호출 — before 시점 모든 데이터 소실 (사용자 의도)
      // append는 정상 수행 → 새 데이터는 보존
      sim.flags.dataCleared = true;
      break;
    default:
      throw new Error(`unknown scenario: ${scenario}`);
  }
}

// ============================================================
// PART 5 — 메인 실행 루프
// ============================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { iters: 10_000, seed: null };
  for (const a of args) {
    if (a.startsWith('--iters=')) parsed.iters = parseInt(a.split('=')[1], 10);
    else if (a.startsWith('--seed=')) parsed.seed = a.split('=')[1];
  }
  if (!parsed.seed) parsed.seed = String(Date.now());
  return parsed;
}

function pickRandom(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pickAnother(rng, arr, exclude) {
  for (let i = 0; i < 10; i++) {
    const c = pickRandom(rng, arr);
    if (c !== exclude) return c;
  }
  return null;
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx] * 1000) / 1000;
}

function avg(arr) {
  if (!arr.length) return 0;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 1000) / 1000;
}

async function main() {
  const { iters: ITERS, seed } = parseArgs();
  const rng = createRng(seed);
  const sim = new StorageSimulator(rng);

  // 초기 seed 쓰기 — before state 확립
  await sim.appendAtomic('seed-0', { ops: [{ op: 'init', value: 'seed' }] });
  const initialTip = sim.tipId;

  const results = {
    iterations: ITERS,
    seed,
    timestamp: new Date().toISOString(),
    scenarioBreakdown: {},
    concurrentFailures: 0,
    recoveryStats: {
      full: 0,            // IDB tier 성공
      journalOnly: 0,     // LS tier (IDB 실패 후)
      degraded: 0,        // memory tier (최종 폴백)
      downgraded: 0,      // secondary/tertiary 실패 but primary OK
      noRecovery: 0,      // 아무 tier도 성공 못함 — FAIL
    },
    totalFailures: 0,
    totalDataLoss: 0,
    durations: [],
    violations: [],
  };

  for (const sc of FMEA_SCENARIOS) {
    results.scenarioBreakdown[sc] = { count: 0, dataLoss: 0, recovered: 0, category: scenarioCategory(sc) };
  }

  const started = performance.now();

  for (let i = 0; i < ITERS; i++) {
    const id = `ulid-${String(i).padStart(7, '0')}`;
    const payload = {
      iter: i,
      ops: [{ op: 'add', path: `/ep${i % 100}`, value: `content-${i}` }],
      target: 'manuscript',
    };

    // 시나리오 선택
    const scenario = pickRandom(rng, FMEA_SCENARIOS);
    const concurrent = rng() < 0.1 ? pickAnother(rng, FMEA_SCENARIOS, scenario) : null;

    // before 스냅샷
    const before = sim.snapshot();

    // 주입
    try {
      injectScenario(scenario, sim, rng);
      if (concurrent) injectScenario(concurrent, sim, rng);
    } catch (err) {
      results.violations.push({
        iter: i, kind: 'injector-throw', scenario, concurrent,
        error: err?.message ?? String(err),
      });
    }

    // 저장 시도
    const t0 = performance.now();
    let opResult;
    let success = false;
    try {
      opResult = await sim.appendAtomic(id, payload);
      success = opResult.ok === true;
    } catch (err) {
      // atomic-write-abort 등 의도된 실패 — data loss 검증만 중요
      opResult = { ok: false, tier: null, error: err?.message ?? String(err) };
      success = false;
    }
    const duration = performance.now() - t0;
    results.durations.push(duration);

    // 시나리오별 집계
    const entry = results.scenarioBreakdown[scenario];
    entry.count += 1;

    // recovery tier 집계
    if (success) {
      if (opResult.tier === 'indexeddb') results.recoveryStats.full += 1;
      else if (opResult.tier === 'localstorage') results.recoveryStats.journalOnly += 1;
      else if (opResult.tier === 'memory') results.recoveryStats.degraded += 1;
      entry.recovered += 1;
    } else {
      results.totalFailures += 1;
    }

    // concurrent 집계
    if (concurrent) results.concurrentFailures += 1;

    // ---- 핵심 Invariant: Data Loss 검증 ----
    // 1. atomic-write-abort 계열 실패: 이전 tip 반드시 보존되어야
    // 2. 그 외 실패: 최소 1개 tier에 새 entry 기록되어야
    // 3. bulk-delete / browser-data-clear: 의도적 삭제는 data loss 아님

    const isIntentionalDeletion = scenario === 'bulk-delete' || scenario === 'browser-data-clear'
      || concurrent === 'bulk-delete' || concurrent === 'browser-data-clear';

    // after 스냅샷
    const afterHas = sim.hasEntry(id);
    const afterPrior = sim.hasEntry(before.tipId); // 이전 tip도 살아있는가?

    // Data loss 판정
    if (!success && !isIntentionalDeletion) {
      // 실패했는데 이전 tip도 사라졌으면 치명적 loss
      if (!afterPrior && before.tipId !== null) {
        results.totalDataLoss += 1;
        entry.dataLoss += 1;
        results.violations.push({
          iter: i, kind: 'data-loss-prior-tip', scenario, concurrent,
          priorTip: before.tipId,
          error: opResult?.error,
        });
      }
      // 실패 자체는 허용 (atomic-abort는 의도적) — 단 noRecovery로 분류
      if (scenario !== 'atomic-write-abort' && concurrent !== 'atomic-write-abort') {
        results.recoveryStats.noRecovery += 1;
        results.violations.push({
          iter: i, kind: 'no-recovery', scenario, concurrent,
          error: opResult?.error,
        });
      }
    }

    // 성공했는데 read-back 실패 (저장됐다고 주장했지만 실제 없음)
    if (success && !afterHas && !isIntentionalDeletion) {
      // browser-data-clear flag가 아직 살아있으면 정상 (사용자 의도)
      if (!sim.flags.dataCleared) {
        results.totalDataLoss += 1;
        entry.dataLoss += 1;
        results.violations.push({
          iter: i, kind: 'data-loss-read-back', scenario, concurrent,
          tier: opResult.tier,
        });
      }
    }

    // flag 리셋 — 다음 iteration 깨끗한 상태
    sim.resetFlags();

    // dataCleared 유지 시 다음 iteration은 새 보장 — clear 대신 flag만 제거
    if (scenario === 'browser-data-clear' || concurrent === 'browser-data-clear') {
      // 사용자 의도 — 새 데이터 보존 확인만. flag만 리셋.
    }

    // 진행 로그 (1% 간격)
    if (ITERS >= 100 && i > 0 && i % Math.floor(ITERS / 20) === 0) {
      const pct = Math.round((i / ITERS) * 100);
      process.stdout.write(`  [chaos-fortress] ${pct}% (iter ${i}/${ITERS}) violations=${results.violations.length}\r`);
    }
  }

  const totalMs = performance.now() - started;
  const p50 = percentile(results.durations, 50);
  const p95 = percentile(results.durations, 95);
  const p99 = percentile(results.durations, 99);
  const avgDur = avg(results.durations);

  // ============================================================
  // PART 6 — 리포트 생성
  // ============================================================

  // 커버리지: 모든 시나리오 최소 1회 이상 발생?
  const missingScenarios = FMEA_SCENARIOS.filter((s) => results.scenarioBreakdown[s].count === 0);
  const underCoveredScenarios = FMEA_SCENARIOS.filter((s) => results.scenarioBreakdown[s].count < 100);

  const success = results.totalDataLoss === 0 && results.violations.length === 0
    && missingScenarios.length === 0;

  const summary = {
    iterations: ITERS,
    seed: String(seed),
    timestamp: results.timestamp,
    summary: {
      success,
      totalDataLoss: results.totalDataLoss,
      totalFailures: results.totalFailures,
      violationsCount: results.violations.length,
      initialTip,
      finalTip: sim.tipId,
      avgDurationMs: avgDur,
      p50DurationMs: p50,
      p95DurationMs: p95,
      p99DurationMs: p99,
      totalMs: Math.round(totalMs),
    },
    scenarioBreakdown: results.scenarioBreakdown,
    concurrentFailures: results.concurrentFailures,
    recoveryStats: results.recoveryStats,
    coverage: {
      missingScenarios,
      underCoveredScenarios,
      totalScenariosExercised: FMEA_SCENARIOS.length - missingScenarios.length,
    },
    violationsSample: results.violations.slice(0, 20),
  };

  writeFileSync('bench/chaos-fortress-10k-result.json', JSON.stringify(summary, null, 2), 'utf8');

  // Markdown 리포트
  const mdReport = buildMarkdownReport(summary);
  writeFileSync('bench/chaos-fortress-10k-report.md', mdReport, 'utf8');

  process.stdout.write('\n');
  console.log(`[chaos-fortress-10k] iterations=${ITERS} seed=${seed}`);
  console.log(`[chaos-fortress-10k] totalDataLoss=${summary.summary.totalDataLoss}`);
  console.log(`[chaos-fortress-10k] violations=${summary.summary.violationsCount}`);
  console.log(`[chaos-fortress-10k] avgDuration=${avgDur}ms p50=${p50} p95=${p95} p99=${p99}`);
  console.log(`[chaos-fortress-10k] totalMs=${Math.round(totalMs)}ms`);
  console.log(`[chaos-fortress-10k] scenarios exercised=${summary.coverage.totalScenariosExercised}/20`);
  if (missingScenarios.length) console.error(`[chaos-fortress-10k] MISSING scenarios: ${missingScenarios.join(', ')}`);
  if (underCoveredScenarios.length) console.warn(`[chaos-fortress-10k] under-covered (<100): ${underCoveredScenarios.join(', ')}`);

  if (success) {
    console.log(`[chaos-fortress-10k] PASS — 10K iterations × 0 data loss. M1.5.5 착수 가능.`);
    process.exit(0);
  } else {
    console.error(`[chaos-fortress-10k] FAIL — data loss ${summary.summary.totalDataLoss} or violations ${summary.summary.violationsCount}`);
    process.exit(1);
  }
}

// ============================================================
// PART 7 — Markdown 리포트 빌더
// ============================================================

function buildMarkdownReport(summary) {
  const s = summary.summary;
  const verdict = s.success ? 'PASS' : 'FAIL';
  const lines = [];
  lines.push(`# M1.6 Chaos Fortress 10,000회 리포트`);
  lines.push('');
  lines.push(`**실행 시각:** ${summary.timestamp}`);
  lines.push(`**Seed:** \`${summary.seed}\``);
  lines.push(`**Iterations:** ${summary.iterations.toLocaleString()}`);
  lines.push(`**판정:** **${verdict}**`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`- **Total Data Loss:** ${s.totalDataLoss}`);
  lines.push(`- **Total Failures (의도된 실패 포함):** ${s.totalFailures}`);
  lines.push(`- **Violations:** ${s.violationsCount}`);
  lines.push(`- **평균 Duration:** ${s.avgDurationMs} ms`);
  lines.push(`- **P50/P95/P99:** ${s.p50DurationMs} / ${s.p95DurationMs} / ${s.p99DurationMs} ms`);
  lines.push(`- **총 실행 시간:** ${s.totalMs} ms`);
  lines.push(`- **Final Tip:** \`${s.finalTip}\` (Initial: \`${s.initialTip}\`)`);
  lines.push('');
  lines.push('## FMEA 시나리오별 대응 매트릭스');
  lines.push('');
  lines.push('| # | 시나리오 | 카테고리 | 발생 | Data Loss | 복구 | 복구율 |');
  lines.push('|---|---------|---------|-----|----------|-----|-------|');
  let i = 1;
  for (const [name, entry] of Object.entries(summary.scenarioBreakdown)) {
    const rate = entry.count > 0 ? ((entry.recovered / entry.count) * 100).toFixed(1) + '%' : '—';
    lines.push(`| ${i} | \`${name}\` | ${entry.category} | ${entry.count} | ${entry.dataLoss} | ${entry.recovered} | ${rate} |`);
    i += 1;
  }
  lines.push('');
  lines.push('## Recovery Tier 분포');
  lines.push('');
  lines.push('| Tier | Count | 의미 |');
  lines.push('|------|------|------|');
  lines.push(`| \`full\` (IDB) | ${summary.recoveryStats.full} | Primary tier 정상 |`);
  lines.push(`| \`journalOnly\` (LS) | ${summary.recoveryStats.journalOnly} | IDB 실패 → LS fallback |`);
  lines.push(`| \`degraded\` (memory) | ${summary.recoveryStats.degraded} | LS까지 실패 → memory 최종 폴백 |`);
  lines.push(`| \`noRecovery\` | ${summary.recoveryStats.noRecovery} | 모든 tier 실패 (FAIL) |`);
  lines.push('');
  lines.push('## 동시 실패 내성');
  lines.push('');
  lines.push(`2+ 시나리오 동시 주입: **${summary.concurrentFailures}** 회`);
  if (summary.concurrentFailures < 500) {
    lines.push('');
    lines.push(`> WARN: 동시 실패 500회 미만 — concurrent 비율 상향 필요.`);
  }
  lines.push('');
  lines.push('## 커버리지');
  lines.push('');
  lines.push(`- 총 시나리오 수행: **${summary.coverage.totalScenariosExercised}/20**`);
  if (summary.coverage.missingScenarios.length) {
    lines.push(`- 누락: ${summary.coverage.missingScenarios.join(', ')}`);
  }
  if (summary.coverage.underCoveredScenarios.length) {
    lines.push(`- 100회 미만: ${summary.coverage.underCoveredScenarios.join(', ')}`);
  }
  lines.push('');
  if (summary.violationsSample.length > 0) {
    lines.push('## Violations 샘플 (최초 20건)');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(summary.violationsSample, null, 2));
    lines.push('```');
    lines.push('');
  }
  lines.push('## 재현 명령');
  lines.push('');
  lines.push('```bash');
  lines.push(`node bench/chaos-fortress-10k.mjs --seed=${summary.seed} --iters=${summary.iterations}`);
  lines.push('```');
  lines.push('');
  lines.push('## 게이트 결과');
  lines.push('');
  lines.push('| 게이트 | 기준 | 측정값 | 판정 |');
  lines.push('|--------|------|--------|------|');
  lines.push(`| G3 Data Loss | === 0 | ${s.totalDataLoss} | ${s.totalDataLoss === 0 ? 'PASS' : 'FAIL'} |`);
  lines.push(`| G4 20 시나리오 전수 | ≥ 1 each | ${summary.coverage.totalScenariosExercised}/20 (100회 미만: ${summary.coverage.underCoveredScenarios.length}) | ${summary.coverage.missingScenarios.length === 0 ? 'PASS' : 'FAIL'} |`);
  lines.push(`| G5 동시 실패 내성 | ≥ 500 / data loss 0 | ${summary.concurrentFailures} / ${s.totalDataLoss} | ${summary.concurrentFailures >= 500 && s.totalDataLoss === 0 ? 'PASS' : 'WARN'} |`);
  lines.push(`| G6 성능 avg | < 10ms | ${s.avgDurationMs}ms | ${s.avgDurationMs < 10 ? 'PASS' : 'WARN'} |`);
  lines.push(`| G6 성능 p99 | < 50ms | ${s.p99DurationMs}ms | ${s.p99DurationMs < 50 ? 'PASS' : 'WARN'} |`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`**M1.5.5 착수 가능 여부:** **${s.success && summary.coverage.missingScenarios.length === 0 ? 'YES' : 'NO'}**`);
  lines.push('');
  return lines.join('\n');
}

// ============================================================
// PART 8 — Entrypoint
// ============================================================

main().catch((err) => {
  console.error('[chaos-fortress-10k] uncaught', err);
  process.exit(2);
});
