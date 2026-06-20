import { classifyStorageQuota } from '../quota-policy';

describe('quota-policy', () => {
  it('quota가 없으면 unknown으로 판정한다', () => {
    const decision = classifyStorageQuota(100, 0);
    expect(decision.tier).toBe('unknown');
    expect(decision.level).toBe('unknown');
    expect(decision.writeMode).toBe('unknown');
    expect(decision.percentUsed).toBeNull();
  });

  it('80% 미만은 persist 가능한 ok 상태다', () => {
    const decision = classifyStorageQuota(79, 100);
    expect(decision.tier).toBe('ok');
    expect(decision.level).toBe('ok');
    expect(decision.writeMode).toBe('persist');
  });

  it('80% 이상은 warning tier로 백업 준비를 요구한다', () => {
    const decision = classifyStorageQuota(80, 100);
    expect(decision.tier).toBe('warn');
    expect(decision.level).toBe('warning');
    expect(decision.writeMode).toBe('persist');
    expect(decision.message).toContain('80.0%');
  });

  it('90% 이상은 IndexedDB eviction 이후 저장 모드다', () => {
    const decision = classifyStorageQuota(90, 100);
    expect(decision.tier).toBe('evict-idb');
    expect(decision.level).toBe('warning');
    expect(decision.writeMode).toBe('evict-then-persist');
    expect(decision.shouldEvictIndexedDb).toBe(true);
    expect(decision.shouldPromptExport).toBe(false);
  });

  it('98% 이상은 memory queue와 export prompt를 요구한다', () => {
    const decision = classifyStorageQuota(98, 100);
    expect(decision.tier).toBe('critical-export');
    expect(decision.level).toBe('critical');
    expect(decision.writeMode).toBe('memory-queue');
    expect(decision.shouldUseMemoryQueue).toBe(true);
    expect(decision.shouldPromptExport).toBe(true);
  });

  it('잘못된 threshold 입력은 기본 정책으로 폴백한다', () => {
    const decision = classifyStorageQuota(90, 100, {
      warningRatio: 0.95,
      evictionRatio: 0.8,
      criticalRatio: 1.2,
    });
    expect(decision.tier).toBe('evict-idb');
  });
});
