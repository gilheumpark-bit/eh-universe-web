// ============================================================
// work-receipt-journal 테스트 — 정상 · 빈입력 · 경계 · localStorage I/O
// ============================================================

import {
  appendDecision,
  appendEntry,
  buildDecisionReceipt,
  clearJournal,
  JOURNAL_KEY,
  loadJournal,
  MAX_ENTRIES,
  saveJournal,
  type ReceiptJournalEntry,
} from '../work-receipt-journal';
import { buildReceipt } from '../work-receipt';

// ============================================================
// localStorage mock (jsdom 기본 가능 — 초기화 헬퍼만 정의)
// ============================================================
beforeEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
});

const makeEntry = (overrides: Partial<ReceiptJournalEntry> = {}): ReceiptJournalEntry => ({
  id: 'r-1',
  at: 1_000,
  fixId: 'src/app/page.tsx',
  decision: 'approved',
  reason: '안전성 [C] None 가드',
  scoreDelta: 8,
  receipt: { did: [{ action: 'fix 승인 — page.tsx', evidence: '안전성' }], skipped: [] },
  ...overrides,
});

// ============================================================
// buildDecisionReceipt
// ============================================================
describe('buildDecisionReceipt', () => {
  it('approved → did 1건이 들어간 receipt 를 만든다', () => {
    const r = buildDecisionReceipt('a.ts', 'approved', '이유', 5);
    expect(r.did).toHaveLength(1);
    expect(r.did[0].action).toContain('승인');
    expect(r.did[0].evidence).toBe('이유');
    expect(r.skipped).toHaveLength(0);
    expect(r.metrics?.keyInfo).toBe(5);
  });

  it('rejected → skipped 1건이 들어간 receipt 를 만든다', () => {
    const r = buildDecisionReceipt('b.ts', 'rejected', '거절 사유', -3);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0].action).toContain('거절');
    expect(r.skipped[0].reason).toBe('거절 사유');
    expect(r.metrics?.keyInfo).toBe(3); // 절댓값
  });

  it('빈 fixId/reason 은 (미상) 폴백', () => {
    const r = buildDecisionReceipt('', 'approved', '', null);
    expect(r.did[0].action).toContain('(미상)');
    expect(r.did[0].evidence).toBe('(미상)');
    expect(r.metrics).toBeUndefined();
  });

  it('buildReceipt 와 결합하여 표준 [검사 적용] 문자열을 만든다', () => {
    const r = buildDecisionReceipt('foo.ts', 'approved', '이유', 8);
    const text = buildReceipt(r);
    expect(text).toContain('[검사 적용]');
    expect(text).toContain('✓');
  });
});

// ============================================================
// appendEntry / clearJournal
// ============================================================
describe('appendEntry', () => {
  it('정상 엔트리 추가 시 길이가 1 증가한다', () => {
    const next = appendEntry([], makeEntry());
    expect(next).toHaveLength(1);
  });

  it('잘못된 엔트리(null/필드누락)는 기존 목록 그대로', () => {
    const next = appendEntry([makeEntry()], null);
    expect(next).toHaveLength(1);
    const next2 = appendEntry([makeEntry()], { id: '' } as ReceiptJournalEntry);
    expect(next2).toHaveLength(1);
  });

  it('MAX_ENTRIES 초과 시 가장 오래된 것부터 폐기 (at 기준 내림차순)', () => {
    const base: ReceiptJournalEntry[] = [];
    for (let i = 0; i < MAX_ENTRIES; i += 1) {
      base.push(makeEntry({ id: `r-${i}`, at: i }));
    }
    // 가장 최신 (at=999) 추가
    const next = appendEntry(base, makeEntry({ id: 'newest', at: 999_999 }));
    expect(next).toHaveLength(MAX_ENTRIES);
    expect(next[0].id).toBe('newest'); // 최신순 정렬 결과 첫 번째
    // at=0 (가장 오래된) 폐기 확인
    expect(next.find((e) => e.id === 'r-0')).toBeUndefined();
  });

  it('null list 입력도 빈 배열로 안전 처리', () => {
    const next = appendEntry(null, makeEntry());
    expect(next).toHaveLength(1);
  });
});

describe('clearJournal', () => {
  it('빈 배열을 반환한다', () => {
    expect(clearJournal()).toEqual([]);
  });
});

// ============================================================
// loadJournal / saveJournal — localStorage I/O
// ============================================================
describe('loadJournal / saveJournal', () => {
  it('save → load 가 동일 데이터를 반환한다', () => {
    const entries = [makeEntry({ id: 'a' }), makeEntry({ id: 'b', at: 2_000 })];
    saveJournal(entries);
    const loaded = loadJournal();
    expect(loaded).toHaveLength(2);
    // 정렬은 save 시점에 at 내림차순으로 됨
    expect(loaded[0].id).toBe('b');
  });

  it('빈 localStorage 면 빈 배열 반환', () => {
    expect(loadJournal()).toEqual([]);
  });

  it('손상된 JSON 은 무시하고 빈 배열 반환', () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(JOURNAL_KEY, '{not json');
    }
    expect(loadJournal()).toEqual([]);
  });

  it('null/undefined 저장은 빈 배열로 정규화', () => {
    saveJournal(null);
    expect(loadJournal()).toEqual([]);
  });

  it('손상된 항목은 폐기하고 정상만 보존', () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        JOURNAL_KEY,
        JSON.stringify([
          makeEntry({ id: 'ok' }),
          { id: '', at: 1 }, // 깨진 엔트리
          null,
        ]),
      );
    }
    const loaded = loadJournal();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('ok');
  });
});

// ============================================================
// appendDecision — 통합 도우미 (load → append → save)
// ============================================================
describe('appendDecision', () => {
  it('빈 저널에 결정 1건 추가 후 영속된다', () => {
    const list = appendDecision({
      id: 'r-1',
      at: 100,
      fixId: 'a.ts',
      decision: 'approved',
      reason: '이유',
      scoreDelta: 5,
    });
    expect(list).toHaveLength(1);
    expect(loadJournal()).toHaveLength(1);
  });

  it('연속 호출 시 누적되며 최신순으로 정렬된다', () => {
    appendDecision({
      id: 'r-old',
      at: 100,
      fixId: 'a.ts',
      decision: 'approved',
      reason: '이유1',
      scoreDelta: 5,
    });
    const list = appendDecision({
      id: 'r-new',
      at: 200,
      fixId: 'b.ts',
      decision: 'rejected',
      reason: '이유2',
      scoreDelta: -3,
    });
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('r-new'); // 최신 (at=200) 이 앞
    expect(list[1].id).toBe('r-old');
  });

  it('새로고침 시뮬레이션 (clear in-mem state, load) 후 결정이 보존된다', () => {
    appendDecision({
      id: 'r-1',
      at: 100,
      fixId: 'a.ts',
      decision: 'approved',
      reason: '이유',
      scoreDelta: 5,
    });
    // localStorage 만 남기고 다른 in-mem 상태 무관 — 직접 load
    const reloaded = loadJournal();
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0].decision).toBe('approved');
    expect(reloaded[0].scoreDelta).toBe(5);
  });
});
