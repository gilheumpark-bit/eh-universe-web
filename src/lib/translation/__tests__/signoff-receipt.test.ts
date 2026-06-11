// ============================================================
// signoff-receipt — SignoffPanel work-receipt 빌더 + localStorage 영속 검증
// ============================================================

import {
  buildSignoffReceipt,
  appendSignoffReceipt,
  loadSignoffReceipts,
  saveSignoffReceipts,
  recordSignoffReceipt,
  SIGNOFF_RECEIPT_KEY,
  MAX_SIGNOFF_RECEIPTS,
  type SignoffReceiptEntry,
} from '../signoff-receipt';
import type { ChapterEntry } from '@/types/translator';

const mkChapter = (over: Partial<ChapterEntry> = {}): ChapterEntry => ({
  name: '1화',
  content: '원문 텍스트 내용 100자가 있다고 가정한다 더 길게 만든다 더 길게 만든다',
  result: '번역 결과',
  isDone: false,
  stageProgress: 5,
  ...over,
});

describe('buildSignoffReceipt', () => {
  it('null/undefined chapter → 안전 fallback', () => {
    const r = buildSignoffReceipt(null, 'faithful');
    expect(r.did).toEqual([]);
    expect(r.skipped.length).toBeGreaterThan(0);
    expect(r.metrics?.chars).toBe(0);
  });

  it('Stage 5 + faithful 결과 존재 → DID 2건 (승인 + 보존)', () => {
    const ch = mkChapter({
      resultFaithful: 'F 결과',
      resultMarket: 'M 결과',
      stageProgressFaithful: 5,
      stageProgressMarket: 5,
      faithfulApproved: true,
      marketApproved: true,
    });
    const r = buildSignoffReceipt(ch, 'faithful');
    expect(r.did.length).toBe(2);
    expect(r.did[0].evidence).toContain('Stage 1+Stage 2+Stage 3+Stage 4+Stage 5');
    expect(r.metrics?.chars).toBeGreaterThan(0);
    expect(r.metrics?.keyInfo).toBe(5);
  });

  it('Stage 3 중간 종료 → SKIPPED 에 미실행 stage 기록', () => {
    const ch = mkChapter({
      resultFaithful: 'F',
      stageProgressFaithful: 3,
      stageProgressMarket: 0,
    });
    const r = buildSignoffReceipt(ch, 'faithful');
    // SKIPPED 에 Stage 4~5 (2개) 포함
    const stageSkip = r.skipped.find((s) => s.action.includes('Stage 4~5'));
    expect(stageSkip).toBeDefined();
    expect(stageSkip?.reason).toBe('중간 단계 종료');
  });

  it('Market 미생성 시 Faithful 영수증에 Market track skipped 명시', () => {
    const ch = mkChapter({ resultFaithful: 'F', stageProgressFaithful: 5 });
    const r = buildSignoffReceipt(ch, 'faithful');
    const mSkip = r.skipped.find((s) => s.action === 'Market track');
    expect(mSkip).toBeDefined();
    expect(mSkip?.reason).toBe('미생성 (문법차)');
  });

  it('stageProgressMarket=0 일 때 Market 영수증은 미실행 표시', () => {
    const ch = mkChapter({
      resultFaithful: 'F',
      stageProgressFaithful: 5,
      stageProgressMarket: 0,
    });
    const r = buildSignoffReceipt(ch, 'market');
    const stageSkip = r.skipped.find((s) => s.action.includes('Stage 1~5'));
    expect(stageSkip).toBeDefined();
    expect(stageSkip?.reason).toBe('미실행');
  });

  it('chars 메트릭 = source + target 합산', () => {
    const ch = mkChapter({
      content: 'abc',
      resultFaithful: 'defg',
      stageProgressFaithful: 5,
    });
    const r = buildSignoffReceipt(ch, 'faithful');
    expect(r.metrics?.chars).toBe(7); // 3 + 4
  });
});

describe('appendSignoffReceipt (불변)', () => {
  const baseEntry: SignoffReceiptEntry = {
    id: 'a',
    at: 1000,
    chapterName: '1화',
    chapterIndex: 0,
    track: 'faithful',
    receipt: { did: [], skipped: [] },
  };

  it('null entry → 기존 그대로', () => {
    const list = [baseEntry];
    const next = appendSignoffReceipt(list, null);
    expect(next).toEqual(list);
  });

  it('정상 추가 + 최신순 정렬', () => {
    const a = { ...baseEntry, id: 'a', at: 100 };
    const b = { ...baseEntry, id: 'b', at: 200 };
    const next = appendSignoffReceipt([a], b);
    expect(next.map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('MAX_SIGNOFF_RECEIPTS 초과 → 가장 오래된 폐기', () => {
    const list: SignoffReceiptEntry[] = [];
    for (let i = 0; i < MAX_SIGNOFF_RECEIPTS; i++) {
      list.push({ ...baseEntry, id: `e${i}`, at: i });
    }
    const fresh = { ...baseEntry, id: 'fresh', at: MAX_SIGNOFF_RECEIPTS + 100 };
    const next = appendSignoffReceipt(list, fresh);
    expect(next.length).toBe(MAX_SIGNOFF_RECEIPTS);
    expect(next[0].id).toBe('fresh');
    // 가장 오래된(e0)은 폐기되어야 함
    expect(next.find((e) => e.id === 'e0')).toBeUndefined();
  });

  it('손상된 손상 항목 (id 없음) → 폐기', () => {
    const bad = { at: 100 } as unknown as SignoffReceiptEntry;
    const next = appendSignoffReceipt([], bad);
    expect(next).toEqual([]);
  });
});

describe('save/load — localStorage', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('save 후 load → 동일 데이터', () => {
    const entry: SignoffReceiptEntry = {
      id: 'x',
      at: 12345,
      chapterName: 'C',
      chapterIndex: 1,
      track: 'market',
      receipt: { did: [{ action: 'A', evidence: 'E' }], skipped: [] },
    };
    saveSignoffReceipts([entry]);
    const loaded = loadSignoffReceipts();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe('x');
    expect(loaded[0].track).toBe('market');
  });

  it('잘못된 JSON 저장된 상태 → 빈 배열 반환 (throw 없음)', () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SIGNOFF_RECEIPT_KEY, '{not json');
    }
    expect(loadSignoffReceipts()).toEqual([]);
  });

  it('null/undefined save → 빈 배열로 저장 (throw 없음)', () => {
    saveSignoffReceipts(null);
    saveSignoffReceipts(undefined);
    expect(loadSignoffReceipts()).toEqual([]);
  });
});

describe('recordSignoffReceipt (통합 도우미)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('1회 호출 → 영수증 1건 저장', () => {
    const ch = mkChapter({
      resultFaithful: 'F',
      stageProgressFaithful: 5,
      faithfulApproved: true,
    });
    const next = recordSignoffReceipt({
      id: 'r1',
      at: 1000,
      chapter: ch,
      chapterIndex: 0,
      track: 'faithful',
    });
    expect(next.length).toBe(1);
    expect(next[0].track).toBe('faithful');
    expect(next[0].receipt.did.length).toBeGreaterThan(0);
    // 영속화 확인
    expect(loadSignoffReceipts().length).toBe(1);
  });

  it('2회 호출 (faithful + market) → 영수증 2건 누적', () => {
    const ch = mkChapter({
      resultFaithful: 'F',
      resultMarket: 'M',
      stageProgressFaithful: 5,
      stageProgressMarket: 5,
    });
    recordSignoffReceipt({ id: 'r1', at: 1000, chapter: ch, chapterIndex: 0, track: 'faithful' });
    recordSignoffReceipt({ id: 'r2', at: 2000, chapter: ch, chapterIndex: 0, track: 'market' });
    const all = loadSignoffReceipts();
    expect(all.length).toBe(2);
    expect(all.map((e) => e.track).sort()).toEqual(['faithful', 'market']);
  });
});
