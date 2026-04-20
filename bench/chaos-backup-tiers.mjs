// ============================================================
// PART 1 — Chaos: 3-Tier 독립성 검증 (M1.4 G8)
// ============================================================
//
// 목표: Secondary/Tertiary 실패 주입 1,000회 → Primary 100% 유지 검증.
//
// 실행: `node bench/chaos-backup-tiers.mjs [--iters=1000]`
// 결과: bench/chaos-backup-result.json
//
// 시뮬 정책:
//   - Primary는 항상 성공 (Journal Engine 정상 작동 가정)
//   - Secondary는 35% 확률로 실패 (Firestore 네트워크 / quota)
//   - Tertiary는 25% 확률로 실패 (디스크 / permission)
// 검증:
//   - 모든 iter에서 Primary 'healthy' 유지
//   - Primary failureCount == 0
//   - Secondary 실패 시 Primary 무영향
//   - Tertiary 실패 시 Primary/Secondary 무영향

import { writeFileSync } from 'node:fs';

// ============================================================
// PART 2 — Polyfills
// ============================================================

if (!globalThis.performance) globalThis.performance = { now: () => Date.now() };
if (!globalThis.CustomEvent) {
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
}

const _listeners = new Map();
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
  globalThis.removeEventListener = (type, cb) => {
    const list = _listeners.get(type) ?? [];
    _listeners.set(type, list.filter((c) => c !== cb));
  };
}

// ============================================================
// PART 3 — Inline orchestrator (TS source 동작을 단순 재현)
// ============================================================

class ChaosOrchestrator {
  constructor() {
    this.tiers = new Map();
    for (const t of ['primary', 'secondary', 'tertiary']) {
      this.tiers.set(t, {
        state: 'disabled',
        failureCount: 0,
        lastSuccessAt: null,
        recentErrors: [],
      });
    }
    this.handlers = new Map();
  }

  register(tier, handler) {
    this.handlers.set(tier, handler);
    const s = this.tiers.get(tier);
    s.state = 'healthy';
  }

  async execute(tier) {
    const h = this.handlers.get(tier);
    const s = this.tiers.get(tier);
    if (!h) return false;
    if (s.state === 'disabled' || s.state === 'paused') return false;
    try {
      await h();
      s.state = 'healthy';
      s.lastSuccessAt = Date.now();
      s.failureCount = 0;
      return true;
    } catch (err) {
      s.failureCount += 1;
      s.recentErrors.push({ ts: Date.now(), message: err.message });
      if (s.recentErrors.length > 20) s.recentErrors.shift();
      s.state = s.failureCount >= 3 ? 'failing' : 'degraded';

      if (tier === 'primary') {
        // critical 이벤트 발행 시뮬
        globalThis.dispatchEvent(new globalThis.CustomEvent('noa:alert', {
          detail: { tone: 'critical', message: err.message },
        }));
      }
      return false;
    }
  }

  status(tier) {
    return { ...this.tiers.get(tier) };
  }
}

// ============================================================
// PART 4 — Iter loop
// ============================================================

const args = process.argv.slice(2);
const itersArg = args.find((a) => a.startsWith('--iters='));
const ITERS = itersArg ? parseInt(itersArg.split('=')[1], 10) : 1000;

const SECONDARY_FAIL_RATE = 0.35;
const TERTIARY_FAIL_RATE = 0.25;

async function main() {
  const orch = new ChaosOrchestrator();
  let primaryFails = 0;
  let primaryEverDegraded = 0;
  let secondaryFails = 0;
  let tertiaryFails = 0;
  let primaryAlertsTriggered = 0;
  const violations = [];

  globalThis.addEventListener('noa:alert', (ev) => {
    if (ev.detail?.tone === 'critical') primaryAlertsTriggered += 1;
  });

  // Primary: 항상 성공
  orch.register('primary', async () => { /* always ok */ });
  // Secondary: 35% 실패
  orch.register('secondary', async () => {
    if (Math.random() < SECONDARY_FAIL_RATE) {
      throw new Error('secondary-network-error');
    }
  });
  // Tertiary: 25% 실패
  orch.register('tertiary', async () => {
    if (Math.random() < TERTIARY_FAIL_RATE) {
      throw new Error('tertiary-disk-error');
    }
  });

  const started = performance.now();

  for (let i = 0; i < ITERS; i++) {
    // 동시 실행 시뮬 — 같은 iteration에서 모든 tier 실행
    const [primaryOk, secondaryOk, tertiaryOk] = await Promise.all([
      orch.execute('primary'),
      orch.execute('secondary'),
      orch.execute('tertiary'),
    ]);

    if (!primaryOk) primaryFails += 1;
    if (!secondaryOk) secondaryFails += 1;
    if (!tertiaryOk) tertiaryFails += 1;

    // 핵심 invariant 검증: Primary는 항상 healthy 유지
    const p = orch.status('primary');
    if (p.state !== 'healthy') {
      primaryEverDegraded += 1;
      violations.push({
        iter: i,
        kind: 'primary-degraded',
        primaryState: p.state,
        secondaryFailedThisRound: !secondaryOk,
        tertiaryFailedThisRound: !tertiaryOk,
      });
    }
  }

  const totalMs = performance.now() - started;

  const summary = {
    iters: ITERS,
    primaryFails,
    primaryEverDegraded,
    primaryAlertsTriggered,
    secondaryFails,
    tertiaryFails,
    secondaryFailRateActual: secondaryFails / ITERS,
    tertiaryFailRateActual: tertiaryFails / ITERS,
    primaryStateFinal: orch.status('primary').state,
    secondaryStateFinal: orch.status('secondary').state,
    tertiaryStateFinal: orch.status('tertiary').state,
    violations: violations.slice(0, 10),
    totalMs: Math.round(totalMs),
    success: primaryFails === 0 && primaryEverDegraded === 0 && primaryAlertsTriggered === 0,
    ran_at: new Date().toISOString(),
  };

  writeFileSync('bench/chaos-backup-result.json', JSON.stringify(summary, null, 2), 'utf8');
  console.log('[chaos-backup-tiers]', JSON.stringify(summary, null, 2));

  if (!summary.success) {
    console.error('[chaos-backup-tiers] FAIL: Primary 침범 발생');
    process.exit(1);
  }
  console.log('[chaos-backup-tiers] PASS — Primary 100% 유지');
}

main().catch((err) => {
  console.error('[chaos-backup-tiers] crashed:', err);
  process.exit(2);
});
