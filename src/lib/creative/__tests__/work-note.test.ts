// ============================================================
// work-note 테스트 — 정상 · 빈입력 · 잘못된 phase · 경계 · null 커버
// + rank 17 — attachJournal / summarizeJournalWeek / renderJournalWeekText
// ============================================================

import {
  buildDashboard,
  summarizeNotes,
  attachJournal,
  summarizeJournalWeek,
  renderJournalWeekText,
  JOURNAL_STORAGE_KEY,
  type WorkNote,
} from '../work-note';

const note = (
  id: string,
  phase: WorkNote['phase'],
  at: number,
  text = '메모',
): WorkNote => ({ id, phase, note: text, at });

describe('buildDashboard', () => {
  // --- 정상 케이스 ---------------------------------------------------------
  it('단계별 집계와 lastPhase(at 최대)를 산출한다', () => {
    const notes: WorkNote[] = [
      note('a', 'plan', 100),
      note('b', 'plan', 200),
      note('c', 'draft', 300),
      note('d', 'revise', 250),
    ];
    const d = buildDashboard(notes);
    expect(d.totalNotes).toBe(4);
    expect(d.byPhase.plan).toBe(2);
    expect(d.byPhase.draft).toBe(1);
    expect(d.byPhase.revise).toBe(1);
    expect(d.byPhase.publish).toBe(0);
    expect(d.lastPhase).toBe('draft'); // at 300이 최대
  });

  it('lastPhase는 입력 순서가 아닌 at 최대값을 따른다', () => {
    const notes: WorkNote[] = [
      note('a', 'publish', 999),
      note('b', 'plan', 1),
    ];
    expect(buildDashboard(notes).lastPhase).toBe('publish');
  });

  // --- 빈 입력 -------------------------------------------------------------
  it('빈 배열은 totalNotes 0 · lastPhase null · 전 단계 0으로 채운다', () => {
    const d = buildDashboard([]);
    expect(d.totalNotes).toBe(0);
    expect(d.lastPhase).toBeNull();
    expect(d.byPhase).toEqual({ plan: 0, draft: 0, revise: 0, publish: 0 });
  });

  // --- 잘못된 phase / null 방어 -------------------------------------------
  it('잘못된 phase·null 항목을 제외하고 집계한다', () => {
    const notes = [
      note('a', 'draft', 100),
      { id: 'x', phase: 'unknown', note: 'bad', at: 200 },
      null,
      undefined,
      note('b', 'draft', 300),
    ] as unknown as WorkNote[];
    const d = buildDashboard(notes);
    expect(d.totalNotes).toBe(2);
    expect(d.byPhase.draft).toBe(2);
    expect(d.lastPhase).toBe('draft');
  });

  it('비배열 입력(null/undefined)도 빈 대시보드로 안전 처리한다', () => {
    const d1 = buildDashboard(null as unknown as WorkNote[]);
    const d2 = buildDashboard(undefined as unknown as WorkNote[]);
    expect(d1.totalNotes).toBe(0);
    expect(d1.lastPhase).toBeNull();
    expect(d2.totalNotes).toBe(0);
  });

  it('at이 NaN/비유한수면 0으로 정규화하여 정렬을 깨지 않는다', () => {
    const notes = [
      note('a', 'plan', Number.NaN),
      note('b', 'draft', 50),
    ] as WorkNote[];
    const d = buildDashboard(notes);
    expect(d.totalNotes).toBe(2);
    expect(d.lastPhase).toBe('draft'); // 50 > 0(정규화)
  });
});

describe('summarizeNotes', () => {
  it('단계별 건수를 라벨과 함께 요약한다', () => {
    const notes: WorkNote[] = [
      note('a', 'plan', 1),
      note('b', 'plan', 2),
      note('c', 'draft', 3),
    ];
    expect(summarizeNotes(notes)).toBe('기획 2건 · 초고 1건 · 퇴고 0건 · 발행 0건');
  });

  it('빈 입력은 "작업노트 없음"을 반환한다', () => {
    expect(summarizeNotes([])).toBe('작업노트 없음');
    expect(summarizeNotes(null as unknown as WorkNote[])).toBe('작업노트 없음');
  });

  it('모든 단계가 채워진 경우도 순서대로 요약한다', () => {
    const notes: WorkNote[] = [
      note('a', 'plan', 1),
      note('b', 'draft', 2),
      note('c', 'revise', 3),
      note('d', 'publish', 4),
    ];
    expect(summarizeNotes(notes)).toBe('기획 1건 · 초고 1건 · 퇴고 1건 · 발행 1건');
  });
});

// ============================================================
// rank 17 — attachJournal / summarizeJournalWeek / renderJournalWeekText
// ============================================================

describe('attachJournal + summarizeJournalWeek', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const NOW = 1_700_000_000_000;
  const DAY = 24 * 60 * 60 * 1000;

  it('workId 별 init/draft/refine 카운트를 누적한다', () => {
    expect(attachJournal('w1', 'init', NOW - DAY)).toBe(true);
    expect(attachJournal('w1', 'draft', NOW - DAY * 2)).toBe(true);
    expect(attachJournal('w1', 'draft', NOW - DAY * 3)).toBe(true);
    expect(attachJournal('w1', 'refine', NOW - DAY * 4)).toBe(true);

    const s = summarizeJournalWeek('w1', NOW);
    expect(s.init).toBe(1);
    expect(s.draft).toBe(2);
    expect(s.refine).toBe(1);
    expect(s.total).toBe(4);
  });

  it('지난 7일 외 항목은 제외한다', () => {
    attachJournal('w1', 'draft', NOW - DAY * 3);
    attachJournal('w1', 'draft', NOW - DAY * 10); // 7일 초과
    const s = summarizeJournalWeek('w1', NOW);
    expect(s.draft).toBe(1);
    expect(s.total).toBe(1);
  });

  it('서로 다른 workId 간 격리된다', () => {
    attachJournal('w1', 'draft', NOW - DAY);
    attachJournal('w2', 'refine', NOW - DAY);

    const s1 = summarizeJournalWeek('w1', NOW);
    const s2 = summarizeJournalWeek('w2', NOW);
    expect(s1.draft).toBe(1);
    expect(s1.refine).toBe(0);
    expect(s2.draft).toBe(0);
    expect(s2.refine).toBe(1);
  });

  it('workId 빈문자 / null 입력은 no-op 반환 false', () => {
    expect(attachJournal('', 'draft', NOW)).toBe(false);
    expect(attachJournal(null as unknown as string, 'draft', NOW)).toBe(false);
    expect(summarizeJournalWeek('', NOW).total).toBe(0);
  });

  it('잘못된 kind / 비유한 at 은 no-op false', () => {
    expect(attachJournal('w1', 'unknown' as unknown as 'init', NOW)).toBe(false);
    expect(attachJournal('w1', 'draft', Number.NaN)).toBe(false);
  });

  it('storage 손상시 안전 fallback', () => {
    window.localStorage.setItem(JOURNAL_STORAGE_KEY, '{broken');
    // read 실패 → 빈 store 로 fallback. attach 는 새 store 에 write.
    expect(attachJournal('w1', 'draft', NOW)).toBe(true);
    const s = summarizeJournalWeek('w1', NOW);
    expect(s.draft).toBe(1);
  });
});

describe('renderJournalWeekText', () => {
  it('한글 요약 — "이번 주: 초고 3건 · 퇴고 1건"', () => {
    expect(renderJournalWeekText({ init: 0, draft: 3, refine: 1, total: 4 }, 'ko'))
      .toBe('이번 주: 초고 3건 · 퇴고 1건');
  });

  it('init 포함 한글 요약', () => {
    expect(renderJournalWeekText({ init: 2, draft: 1, refine: 0, total: 3 }, 'ko'))
      .toBe('이번 주: 구상 2건 · 초고 1건');
  });

  it('영어 요약', () => {
    expect(renderJournalWeekText({ init: 0, draft: 3, refine: 1, total: 4 }, 'en'))
      .toBe('This week: draft 3 · revise 1');
  });

  it('일본어 요약', () => {
    expect(renderJournalWeekText({ init: 0, draft: 3, refine: 1, total: 4 }, 'ja'))
      .toBe('今週: 初稿 3件 · 推敲 1件');
  });

  it('중국어 요약', () => {
    expect(renderJournalWeekText({ init: 0, draft: 3, refine: 1, total: 4 }, 'zh'))
      .toBe('本周: 初稿 3件 · 修订 1件');
  });

  it('합계 0 / null summary 는 빈 string', () => {
    expect(renderJournalWeekText({ init: 0, draft: 0, refine: 0, total: 0 }, 'ko')).toBe('');
    expect(renderJournalWeekText(null as unknown as ReturnType<typeof summarizeJournalWeek>, 'ko')).toBe('');
  });

  it('비표준 lang 은 ko 로 fallback', () => {
    expect(renderJournalWeekText({ init: 0, draft: 1, refine: 0, total: 1 }, 'fr' as 'ko'))
      .toBe('이번 주: 초고 1건');
  });
});
