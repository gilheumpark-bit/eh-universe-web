// ============================================================
// PART 1 — Journal performance bench (Spec Part 9 예산 검증)
// ============================================================
//
// 측정:
//   - append 1 엔트리 (p50/p95/p99)
//   - SHA-256 1KB / 100KB
//   - 저널 재생 100 엔트리
//   - 부팅 복구 (snapshot + 200 delta) 모의
//
// 실행: `node bench/journal-perf.mjs`
// 결과: bench/journal-perf.json

import { writeFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (!globalThis.performance) globalThis.performance = { now: () => Date.now() };

// ============================================================
// PART 2 — SHA-256 throughput
// ============================================================

async function sha256(bytes) {
  const d = await webcrypto.subtle.digest('SHA-256', bytes);
  return Buffer.from(d).toString('hex');
}

async function benchSha(sizeBytes, iterations) {
  const buf = Buffer.alloc(sizeBytes, 0xab);
  const durs = [];
  // warmup
  for (let i = 0; i < 20; i++) await sha256(buf);
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    await sha256(buf);
    durs.push(performance.now() - t0);
  }
  return stats(durs);
}

// ============================================================
// PART 3 — append 1 엔트리 (메모리/LS 경로 대체 — 순수 hash+append 시뮬)
// ============================================================
//
// 실제 IDB 성능은 프로덕션 환경에서 측정. 여기서는 hash + canonical JSON +
// serialization 단위의 CPU 시간을 기준으로 NFR-1 달성 가능성 검증.

function canonicalJson(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

async function benchAppendSim(iterations) {
  const durs = [];
  let parentHash = 'GENESIS';
  for (let i = 0; i < iterations; i++) {
    const payload = {
      projectId: 'p',
      ops: [{ op: 'replace', path: '/title', value: `t-${i}` }],
      target: 'manuscript',
      targetId: 'p:e',
      baseContentHash: parentHash,
    };
    const t0 = performance.now();
    const json = canonicalJson(payload);
    const bytes = Buffer.from(json, 'utf8');
    const hash = await sha256(bytes);
    // 실제 저장은 IDB tx.put(~5-15ms). 시뮬: setImmediate 왕복
    await new Promise((r) => setImmediate(r));
    parentHash = hash;
    durs.push(performance.now() - t0);
  }
  return stats(durs);
}

// ============================================================
// PART 4 — 저널 재생 100 엔트리 (JSON Patch apply)
// ============================================================

async function benchReplay(count) {
  const deltas = [];
  for (let i = 0; i < count; i++) {
    deltas.push([{ op: 'add', path: `/k${i}`, value: i }]);
  }
  const durs = [];
  for (let i = 0; i < 20; i++) {
    let state = {};
    const t0 = performance.now();
    for (const ops of deltas) {
      for (const op of ops) {
        if (op.op === 'add' || op.op === 'replace') {
          state = { ...state, [op.path.slice(1)]: op.value };
        }
      }
    }
    durs.push(performance.now() - t0);
  }
  return stats(durs);
}

// ============================================================
// PART 5 — Boot recovery 모의 (snapshot + 200 delta)
// ============================================================

async function benchBoot() {
  const projects = new Array(10).fill(null).map((_, i) => ({
    id: `p${i}`,
    title: `Project ${i}`,
    episodes: new Array(10).fill(null).map((__, j) => ({ id: `e${j}`, body: 'x'.repeat(500) })),
  }));
  const json = JSON.stringify(projects);
  const bytes = Buffer.from(json, 'utf8');

  const durs = [];
  for (let trial = 0; trial < 10; trial++) {
    const t0 = performance.now();
    // 1. snapshot 복원 = JSON parse
    const restored = JSON.parse(bytes.toString('utf8'));
    // 2. SHA 검증
    await sha256(bytes);
    // 3. 200 delta 재생
    let state = restored;
    for (let i = 0; i < 200; i++) {
      state = { ...state };
    }
    durs.push(performance.now() - t0);
  }
  return stats(durs);
}

// ============================================================
// PART 6 — Aggregate
// ============================================================

function stats(durs) {
  if (!durs.length) return { p50: 0, p95: 0, p99: 0, avg: 0 };
  const sorted = durs.slice().sort((a, b) => a - b);
  const p = (q) => sorted[Math.min(sorted.length - 1, Math.floor((q / 100) * sorted.length))];
  return {
    p50: round(p(50)),
    p95: round(p(95)),
    p99: round(p(99)),
    avg: round(durs.reduce((a, b) => a + b, 0) / durs.length),
    samples: durs.length,
  };
}
function round(n) { return Math.round(n * 1000) / 1000; }

async function main() {
  const results = {
    sha256_1kb: await benchSha(1024, 200),
    sha256_100kb: await benchSha(100 * 1024, 100),
    append_1_entry: await benchAppendSim(500),
    replay_100_entries: await benchReplay(100),
    boot_recovery: await benchBoot(),
    budgets: {
      append_p50_target_ms: 10,
      sha_1kb_p50_target_ms: 1,
      sha_100kb_p50_target_ms: 5,
      replay_100_p50_target_ms: 50,
      boot_p50_target_ms: 500,
    },
    ran_at: new Date().toISOString(),
  };
  writeFileSync('bench/journal-perf.json', JSON.stringify(results, null, 2), 'utf8');
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
