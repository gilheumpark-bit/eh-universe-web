// ============================================================
// PART 1 — Test setup
// ============================================================

import {
  BackupOrchestrator,
  getDefaultBackupOrchestrator,
  resetDefaultBackupOrchestratorForTests,
  TIER_STATUS_EVENT,
} from '../backup-tiers';

beforeEach(() => {
  resetDefaultBackupOrchestratorForTests();
});

afterEach(() => {
  resetDefaultBackupOrchestratorForTests();
});

// ============================================================
// PART 2 — Registration + state transitions
// ============================================================

describe('BackupOrchestrator — registration and state', () => {
  test('T1: 초기 상태는 모든 tier가 disabled', () => {
    const o = new BackupOrchestrator();
    expect(o.getStatus('primary')?.state).toBe('disabled');
    expect(o.getStatus('secondary')?.state).toBe('disabled');
    expect(o.getStatus('tertiary')?.state).toBe('disabled');
    o.dispose();
  });

  test('T2: registerTier + setEnabled true → state healthy', () => {
    const o = new BackupOrchestrator();
    o.registerTier('secondary', async () => { /* noop */ });
    o.setEnabled('secondary', true);
    expect(o.getStatus('secondary')?.state).toBe('healthy');
    o.dispose();
  });

  test('T3: setEnabled false → state disabled, failureCount reset', async () => {
    const o = new BackupOrchestrator();
    o.registerTier('secondary', async () => { throw new Error('boom'); });
    o.setEnabled('secondary', true);
    await o.executeTier('secondary');
    expect(o.getStatus('secondary')?.failureCount).toBe(1);
    o.setEnabled('secondary', false);
    const status = o.getStatus('secondary');
    expect(status?.state).toBe('disabled');
    expect(status?.failureCount).toBe(0);
    o.dispose();
  });

  test('T4: handler 없이 setEnabled true → 경고 + 무시', () => {
    const o = new BackupOrchestrator();
    o.setEnabled('secondary', true);
    expect(o.getStatus('secondary')?.state).toBe('disabled');
    o.dispose();
  });
});

// ============================================================
// PART 3 — Execution + isolation (Primary 독립성 핵심)
// ============================================================

describe('BackupOrchestrator — Primary 독립성', () => {
  test('T5: Secondary 실패 → Primary 상태 변화 없음', async () => {
    const o = new BackupOrchestrator();
    o.registerTier('primary', async () => { /* success */ });
    o.registerTier('secondary', async () => { throw new Error('secondary down'); });
    o.setEnabled('primary', true);
    o.setEnabled('secondary', true);

    await o.executeTier('primary');
    await o.executeTier('secondary');

    const primary = o.getStatus('primary');
    const secondary = o.getStatus('secondary');
    expect(primary?.state).toBe('healthy');
    expect(primary?.failureCount).toBe(0);
    expect(secondary?.state).toBe('degraded');
    expect(secondary?.failureCount).toBe(1);
    o.dispose();
  });

  test('T6: Tertiary 실패 → Primary/Secondary 무영향', async () => {
    const o = new BackupOrchestrator();
    o.registerTier('primary', async () => { /* success */ });
    o.registerTier('secondary', async () => { /* success */ });
    o.registerTier('tertiary', async () => { throw new Error('disk full'); });
    o.setEnabled('primary', true);
    o.setEnabled('secondary', true);
    o.setEnabled('tertiary', true);

    await o.executeTier('primary');
    await o.executeTier('secondary');
    await o.executeTier('tertiary');

    expect(o.getStatus('primary')?.state).toBe('healthy');
    expect(o.getStatus('secondary')?.state).toBe('healthy');
    expect(o.getStatus('tertiary')?.state).toBe('degraded');
    o.dispose();
  });

  test('T7: 연속 3회 실패 → state failing 전이', async () => {
    const o = new BackupOrchestrator();
    o.registerTier('secondary', async () => { throw new Error('fail'); });
    o.setEnabled('secondary', true);

    await o.executeTier('secondary');
    expect(o.getStatus('secondary')?.state).toBe('degraded');
    await o.executeTier('secondary');
    expect(o.getStatus('secondary')?.state).toBe('degraded');
    await o.executeTier('secondary');
    expect(o.getStatus('secondary')?.state).toBe('failing');
    expect(o.getStatus('secondary')?.failureCount).toBe(3);
    o.dispose();
  });

  test('T8: 성공 후 failureCount 리셋', async () => {
    const o = new BackupOrchestrator();
    let shouldFail = true;
    o.registerTier('secondary', async () => {
      if (shouldFail) throw new Error('fail');
    });
    o.setEnabled('secondary', true);

    await o.executeTier('secondary');
    await o.executeTier('secondary');
    expect(o.getStatus('secondary')?.failureCount).toBe(2);

    shouldFail = false;
    await o.executeTier('secondary');
    expect(o.getStatus('secondary')?.failureCount).toBe(0);
    expect(o.getStatus('secondary')?.state).toBe('healthy');
    o.dispose();
  });
});

// ============================================================
// PART 4 — Pause / resume + ring buffer
// ============================================================

describe('BackupOrchestrator — pause/resume + buffer', () => {
  test('T9: pauseTier → executeTier no-op', async () => {
    const o = new BackupOrchestrator();
    let calls = 0;
    o.registerTier('secondary', async () => { calls++; });
    o.setEnabled('secondary', true);
    o.pauseTier('secondary', 'quota-exceeded');

    const ok = await o.executeTier('secondary');
    expect(ok).toBe(false);
    expect(calls).toBe(0);
    expect(o.getStatus('secondary')?.state).toBe('paused');
    expect(o.getStatus('secondary')?.pauseReason).toBe('quota-exceeded');
    o.dispose();
  });

  test('T10: resumeTier → 실행 재개', async () => {
    const o = new BackupOrchestrator();
    let calls = 0;
    o.registerTier('secondary', async () => { calls++; });
    o.setEnabled('secondary', true);
    o.pauseTier('secondary', 'quota');
    o.resumeTier('secondary');

    const ok = await o.executeTier('secondary');
    expect(ok).toBe(true);
    expect(calls).toBe(1);
    expect(o.getStatus('secondary')?.state).toBe('healthy');
    o.dispose();
  });

  test('T11: recentErrors ring buffer (max 20)', async () => {
    const o = new BackupOrchestrator();
    o.registerTier('secondary', async () => { throw new Error('e'); });
    o.setEnabled('secondary', true);

    for (let i = 0; i < 25; i++) {
      await o.executeTier('secondary');
    }
    const errs = o.getStatus('secondary')?.recentErrors ?? [];
    expect(errs.length).toBe(20);
    o.dispose();
  });
});

// ============================================================
// PART 5 — Listener + global event
// ============================================================

describe('BackupOrchestrator — listener + event', () => {
  test('T12: onChange listener 호출 + dispose', async () => {
    const o = new BackupOrchestrator();
    o.registerTier('secondary', async () => { /* ok */ });
    const calls: string[] = [];
    const off = o.onChange((s) => calls.push(s.state));

    o.setEnabled('secondary', true);
    expect(calls).toContain('healthy');

    off();
    await o.executeTier('secondary');
    const before = calls.length;
    o.setEnabled('secondary', false);
    expect(calls.length).toBe(before); // 해제 후 추가 호출 없음
    o.dispose();
  });

  test('T13: TIER_STATUS_EVENT 글로벌 이벤트 발행', () => {
    const o = new BackupOrchestrator();
    o.registerTier('secondary', async () => { /* ok */ });
    const received: unknown[] = [];
    const handler = (ev: Event) => received.push((ev as CustomEvent).detail);
    globalThis.addEventListener(TIER_STATUS_EVENT, handler);

    o.setEnabled('secondary', true);
    globalThis.removeEventListener(TIER_STATUS_EVENT, handler);

    expect(received.length).toBeGreaterThan(0);
    const detail = received[0] as { tier: string; state: string };
    expect(detail.tier).toBe('secondary');
    expect(detail.state).toBe('healthy');
    o.dispose();
  });

  test('T14: Primary 실패 → noa:alert critical 발행', async () => {
    const o = new BackupOrchestrator();
    o.registerTier('primary', async () => { throw new Error('idb-write-failed'); });
    o.setEnabled('primary', true);

    const alerts: unknown[] = [];
    const handler = (ev: Event) => alerts.push((ev as CustomEvent).detail);
    globalThis.addEventListener('noa:alert', handler);

    await o.executeTier('primary');
    globalThis.removeEventListener('noa:alert', handler);

    expect(alerts.length).toBe(1);
    const detail = alerts[0] as { tone: string; message: string };
    expect(detail.tone).toBe('critical');
    expect(detail.message).toMatch(/idb-write-failed/);
    o.dispose();
  });

  test('T15: getDefaultBackupOrchestrator 싱글톤', () => {
    const a = getDefaultBackupOrchestrator();
    const b = getDefaultBackupOrchestrator();
    expect(a).toBe(b);
  });
});
