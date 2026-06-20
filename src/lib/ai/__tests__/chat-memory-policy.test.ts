/**
 * Unit tests for src/lib/ai/chat-memory-policy.ts
 * [N3-memory-hybrid] 탭 차등 하이브리드 메모리 정책.
 * Covers: getTabPolicy, getMemoryWindow(순수), summary store, 디바운스 스케줄러, applyMemoryPolicy
 */

import {
  getTabPolicy,
  getMemoryWindow,
  buildProjectScopedMemoryKey,
  loadStoredSummary,
  clearStoredSummary,
  maybeScheduleSummary,
  applyMemoryPolicy,
  computeSummaryHash,
  verifySummaryLink,
  LIGHT_WINDOW_SIZE,
  SUMMARY_TURN_INTERVAL,
  type MemoryMsg,
  type StoredSummary,
} from '@/lib/ai/chat-memory-policy';

jest.mock('@/engine/episode-summarizer', () => ({
  generateDetailedSummary: jest.fn(),
}));

import { generateDetailedSummary } from '@/engine/episode-summarizer';

const mockSummarize = generateDetailedSummary as jest.MockedFunction<typeof generateDetailedSummary>;

/** user/assistant 교차 n개 메시지 생성 (짝수 index = user) */
function buildMessages(n: number, prefix = 'msg'): MemoryMsg[] {
  return Array.from({ length: n }, (_, i) => ({
    role: (i % 2 === 0 ? 'user' : 'assistant') as MemoryMsg['role'],
    content: `${prefix}-${i}`,
  }));
}

/** fire-and-forget 백그라운드 요약 flush */
async function flushAsync(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

beforeEach(() => {
  window.localStorage.clear();
  mockSummarize.mockReset();
});

// ============================================================
// PART 1 — getTabPolicy
// ============================================================

describe('getTabPolicy', () => {
  it.each(['writing', 'writing-chat', 'world', 'direction', 'plot'])(
    'heavy 탭: %s → full (Infinity window)',
    (tab) => {
      const p = getTabPolicy(tab);
      expect(p.tier).toBe('heavy');
      expect(p.windowSize).toBe(Number.POSITIVE_INFINITY);
    },
  );

  it.each(['characters', 'style', 'critique', 'unknown-tab', ''])(
    'light 탭: %s → sliding window 20',
    (tab) => {
      const p = getTabPolicy(tab);
      expect(p.tier).toBe('light');
      expect(p.windowSize).toBe(LIGHT_WINDOW_SIZE);
    },
  );

  it('project scoped key도 원래 탭 정책을 유지한다', () => {
    const scopedWriting = buildProjectScopedMemoryKey('writing-chat', 'project-A');
    const scopedStyle = buildProjectScopedMemoryKey('style', 'project-A');
    expect(getTabPolicy(scopedWriting).tier).toBe('heavy');
    expect(getTabPolicy(scopedStyle).tier).toBe('light');
  });
});

// ============================================================
// PART 2 — getMemoryWindow (순수함수)
// ============================================================

describe('getMemoryWindow', () => {
  it('heavy: 전체 이력 유지 + droppedCount 0', () => {
    const msgs = buildMessages(35);
    const w = getMemoryWindow('writing', msgs);
    expect(w.tier).toBe('heavy');
    expect(w.messages).toHaveLength(35);
    expect(w.droppedCount).toBe(0);
  });

  it('light: 최근 20개만 유지 + 잘린 수 보고', () => {
    const msgs = buildMessages(25);
    const w = getMemoryWindow('style', msgs);
    expect(w.tier).toBe('light');
    expect(w.messages).toHaveLength(LIGHT_WINDOW_SIZE);
    expect(w.messages[0].content).toBe('msg-5'); // 앞 5개 잘림
    expect(w.droppedCount).toBe(5);
  });

  it('light: 20개 이하면 전부 유지', () => {
    const msgs = buildMessages(8);
    const w = getMemoryWindow('style', msgs);
    expect(w.messages).toHaveLength(8);
    expect(w.droppedCount).toBe(0);
  });

  it('빈 배열 → 빈 window (빈값 edge)', () => {
    const w = getMemoryWindow('style', []);
    expect(w.messages).toEqual([]);
    expect(w.droppedCount).toBe(0);
    expect(w.summaryBlock).toBe('');
  });

  it('비배열 입력 방어 (런타임 안전)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = getMemoryWindow('style', undefined as any);
    expect(w.messages).toEqual([]);
  });

  it('summary 있으면 system 부착용 블록 생성', () => {
    const w = getMemoryWindow('style', buildMessages(2), '주인공이 마탑에 도착했다.');
    expect(w.summaryBlock).toContain('[이전 대화 요약');
    expect(w.summaryBlock).toContain('주인공이 마탑에 도착했다.');
  });

  it('summary null/공백 → 블록 없음 (무요약 폴백)', () => {
    expect(getMemoryWindow('style', buildMessages(2), null).summaryBlock).toBe('');
    expect(getMemoryWindow('style', buildMessages(2), '   ').summaryBlock).toBe('');
  });

  it('입력 배열 비변이 (순수성)', () => {
    const msgs = buildMessages(25);
    const snapshot = msgs.map((m) => ({ ...m }));
    getMemoryWindow('style', msgs);
    getMemoryWindow('writing', msgs);
    expect(msgs).toEqual(snapshot);
    expect(msgs).toHaveLength(25);
  });
});

// ============================================================
// PART 3 — Summary Store
// ============================================================

describe('summary store', () => {
  it('미저장 탭 → null', () => {
    expect(loadStoredSummary('world')).toBeNull();
  });

  it('손상된 JSON → null (throw X)', () => {
    window.localStorage.setItem('noa_chat_memory_summary_v1:world', '{broken');
    expect(loadStoredSummary('world')).toBeNull();
  });

  it('summary 필드 누락 → null', () => {
    window.localStorage.setItem('noa_chat_memory_summary_v1:world', JSON.stringify({ coveredTurns: 3 }));
    expect(loadStoredSummary('world')).toBeNull();
  });

  it('clearStoredSummary → 삭제', () => {
    window.localStorage.setItem(
      'noa_chat_memory_summary_v1:world',
      JSON.stringify({ summary: 's', coveredTurns: 1, updatedAt: 1 }),
    );
    clearStoredSummary('world');
    expect(loadStoredSummary('world')).toBeNull();
  });

  it('프로젝트별 scoped summary는 서로 격리된다', () => {
    const aKey = buildProjectScopedMemoryKey('world', 'project-A');
    const bKey = buildProjectScopedMemoryKey('world', 'project-B');
    window.localStorage.setItem(
      `noa_chat_memory_summary_v1:${aKey}`,
      JSON.stringify({ summary: 'A 세계관 요약', coveredTurns: 1, updatedAt: 1 }),
    );
    expect(loadStoredSummary(aKey)?.summary).toBe('A 세계관 요약');
    expect(loadStoredSummary(bKey)).toBeNull();
  });
});

// ============================================================
// PART 4 — 백그라운드 요약 스케줄러 (디바운스 + 폴백)
// ============================================================

describe('maybeScheduleSummary', () => {
  it('이전 구간 없음(≤20) → 요약 호출 X (비용 가드)', async () => {
    maybeScheduleSummary('style', buildMessages(LIGHT_WINDOW_SIZE), 'KO');
    await flushAsync();
    expect(mockSummarize).not.toHaveBeenCalled();
  });

  it('첫 overflow → 1회 요약 + store 저장', async () => {
    mockSummarize.mockResolvedValue('이전 구간 요약본');
    maybeScheduleSummary('style', buildMessages(LIGHT_WINDOW_SIZE + 2), 'KO');
    await flushAsync();
    expect(mockSummarize).toHaveBeenCalledTimes(1);
    const stored = loadStoredSummary('style');
    expect(stored?.summary).toBe('이전 구간 요약본');
    expect(stored?.coveredTurns).toBeGreaterThan(0);
  });

  it('디바운스: 직전 요약 후 10턴 미만 누적 → 재호출 X', async () => {
    mockSummarize.mockResolvedValue('요약 v1');
    const msgs = buildMessages(LIGHT_WINDOW_SIZE + 4); // older 4 msgs = user 2턴
    maybeScheduleSummary('style', msgs, 'KO');
    await flushAsync();
    expect(mockSummarize).toHaveBeenCalledTimes(1);

    // older 6 msgs (user 3턴) — covered 2턴 대비 +1턴 < 10 → skip
    maybeScheduleSummary('style', buildMessages(LIGHT_WINDOW_SIZE + 6), 'KO');
    await flushAsync();
    expect(mockSummarize).toHaveBeenCalledTimes(1);
  });

  it('디바운스: 10턴 누적 시 재요약 (rolling — 직전 요약 포함)', async () => {
    mockSummarize.mockResolvedValue('요약 v1');
    maybeScheduleSummary('style', buildMessages(LIGHT_WINDOW_SIZE + 2), 'KO');
    await flushAsync();

    mockSummarize.mockResolvedValue('요약 v2');
    // older = 2 + 10턴*2 메시지 → olderTurns - covered ≥ SUMMARY_TURN_INTERVAL
    const grown = buildMessages(LIGHT_WINDOW_SIZE + 2 + SUMMARY_TURN_INTERVAL * 2);
    maybeScheduleSummary('style', grown, 'KO');
    await flushAsync();

    expect(mockSummarize).toHaveBeenCalledTimes(2);
    // rolling: 두 번째 호출 입력에 직전 요약이 포함된다
    expect(mockSummarize.mock.calls[1][0]).toContain('요약 v1');
    expect(loadStoredSummary('style')?.summary).toBe('요약 v2');
  });

  it('요약 실패(null) → 무요약 폴백 (store 미변경·throw X)', async () => {
    mockSummarize.mockResolvedValue(null);
    maybeScheduleSummary('style', buildMessages(LIGHT_WINDOW_SIZE + 2), 'KO');
    await flushAsync();
    expect(loadStoredSummary('style')).toBeNull();
  });

  it('요약 reject → 삼켜짐 (대화 흐름 차단 X)', async () => {
    mockSummarize.mockRejectedValue(new Error('network down'));
    expect(() => {
      maybeScheduleSummary('style', buildMessages(LIGHT_WINDOW_SIZE + 2), 'KO');
    }).not.toThrow();
    await flushAsync();
    expect(loadStoredSummary('style')).toBeNull();
  });

  it('in-flight 가드: 동시 2회 호출 → 요약 1회만 (동시성)', async () => {
    let resolveFn: (v: string) => void = () => {};
    mockSummarize.mockImplementation(
      () => new Promise<string | null>((resolve) => { resolveFn = resolve; }),
    );
    const msgs = buildMessages(LIGHT_WINDOW_SIZE + 2);
    maybeScheduleSummary('style', msgs, 'KO');
    await flushAsync(); // dynamic import 완료 → summarize in-flight
    maybeScheduleSummary('style', msgs, 'KO');
    resolveFn('done');
    await flushAsync();
    expect(mockSummarize).toHaveBeenCalledTimes(1);
  });

  it('heavy 탭도 요약 수행 (truncate 안전망 대비 장기 기억)', async () => {
    mockSummarize.mockResolvedValue('세계관 장기 요약');
    maybeScheduleSummary('world', buildMessages(LIGHT_WINDOW_SIZE + 2), 'KO');
    await flushAsync();
    expect(loadStoredSummary('world')?.summary).toBe('세계관 장기 요약');
  });
});

// ============================================================
// PART 4.5 — 해시연결요약 [특허 청구 9]
// ============================================================

describe('hash-chained summary [청구 9]', () => {
  /** 요약 2회 연쇄 생성 → [first, second] StoredSummary 반환 */
  async function buildChain(tab: string): Promise<[StoredSummary, StoredSummary]> {
    mockSummarize.mockResolvedValue('요약 v1');
    maybeScheduleSummary(tab, buildMessages(LIGHT_WINDOW_SIZE + 2), 'KO');
    await flushAsync();
    const first = loadStoredSummary(tab);
    expect(first).not.toBeNull();

    mockSummarize.mockResolvedValue('요약 v2');
    maybeScheduleSummary(
      tab,
      buildMessages(LIGHT_WINDOW_SIZE + 2 + SUMMARY_TURN_INTERVAL * 2),
      'KO',
    );
    await flushAsync();
    const second = loadStoredSummary(tab);
    expect(second).not.toBeNull();
    return [first as StoredSummary, second as StoredSummary];
  }

  it('genesis 요약 → prevSummaryHash = "" (직전 블록 없음)', async () => {
    mockSummarize.mockResolvedValue('요약 v1');
    maybeScheduleSummary('style', buildMessages(LIGHT_WINDOW_SIZE + 2), 'KO');
    await flushAsync();
    expect(loadStoredSummary('style')?.prevSummaryHash).toBe('');
  });

  it('요약 2회 연쇄 — 두 번째 블록이 첫 블록의 해시를 참조', async () => {
    const [first, second] = await buildChain('style');
    expect(second.summary).toBe('요약 v2');
    expect(second.prevSummaryHash).toBe(await computeSummaryHash(first));
    expect(await verifySummaryLink(first, second)).toBe(true);
  });

  it('첫 블록 변조 시 링크 불일치 검출', async () => {
    const [first, second] = await buildChain('style');
    const tampered: StoredSummary = { ...first, summary: '변조된 요약' };
    expect(await verifySummaryLink(tampered, second)).toBe(false);
  });

  it('coveredTurns/updatedAt 변조도 검출 (해시 입력 포함)', async () => {
    const [first, second] = await buildChain('style');
    expect(await verifySummaryLink({ ...first, coveredTurns: first.coveredTurns + 1 }, second)).toBe(false);
    expect(await verifySummaryLink({ ...first, updatedAt: first.updatedAt + 1 }, second)).toBe(false);
  });

  it('legacy 레코드(해시 미부착) → 링크 검증 false (보수적)', async () => {
    const legacy: StoredSummary = { summary: 's', coveredTurns: 1, updatedAt: 1 };
    expect(await verifySummaryLink(legacy, legacy)).toBe(false);
  });

  it('prevSummaryHash store round-trip — 재로드 후에도 체인 유지', async () => {
    const [first, second] = await buildChain('style');
    const reloaded = loadStoredSummary('style');
    expect(reloaded?.prevSummaryHash).toBe(second.prevSummaryHash);
    expect(await verifySummaryLink(first, reloaded as StoredSummary)).toBe(true);
  });
});

// ============================================================
// PART 5 — applyMemoryPolicy (통합)
// ============================================================

describe('applyMemoryPolicy', () => {
  it('저장된 요약을 summaryBlock으로 반환 + light window 적용', () => {
    window.localStorage.setItem(
      'noa_chat_memory_summary_v1:style',
      JSON.stringify({ summary: '문체 논의 요약', coveredTurns: 5, updatedAt: Date.now() }),
    );
    const w = applyMemoryPolicy('style', buildMessages(30), 'KO');
    expect(w.messages).toHaveLength(LIGHT_WINDOW_SIZE);
    expect(w.summaryBlock).toContain('문체 논의 요약');
  });

  it('요약 없으면 빈 블록 — 대화는 정상 진행', () => {
    const w = applyMemoryPolicy('characters', buildMessages(4), 'KO');
    expect(w.summaryBlock).toBe('');
    expect(w.messages).toHaveLength(4);
  });

  it('탭별 store 격리 — writing-chat과 writing 미혼선', () => {
    window.localStorage.setItem(
      'noa_chat_memory_summary_v1:writing',
      JSON.stringify({ summary: 'TabAssistant 요약', coveredTurns: 3, updatedAt: Date.now() }),
    );
    const w = applyMemoryPolicy('writing-chat', buildMessages(4), 'KO');
    expect(w.summaryBlock).toBe(''); // writing 키의 요약이 새지 않는다
  });
});
