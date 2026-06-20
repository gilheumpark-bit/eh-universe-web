// ============================================================
// author-signoff — Faithful archive + Market publish 분리 승인 검증.
// ============================================================

import {
  chapterSignoffStatus,
  summarizeSignoff,
  toggleSignoff,
  isReadyForPublish,
} from '../author-signoff';
import type { ChapterEntry } from '@/types/translator';

const mkChapter = (over: Partial<ChapterEntry> = {}): ChapterEntry => ({
  name: '1화',
  content: '원문',
  result: '결과',
  isDone: false,
  stageProgress: 5,
  ...over,
});

describe('chapterSignoffStatus', () => {
  it('아무 승인 없음 → unapproved', () => {
    expect(chapterSignoffStatus(mkChapter())).toBe('unapproved');
  });

  it('Faithful 만 승인 → partial', () => {
    expect(chapterSignoffStatus(mkChapter({ faithfulApproved: true }))).toBe('partial');
  });

  it('Market 만 승인 → partial', () => {
    expect(chapterSignoffStatus(mkChapter({ marketApproved: true }))).toBe('partial');
  });

  it('둘 다 승인 → fully-approved', () => {
    expect(
      chapterSignoffStatus(mkChapter({ faithfulApproved: true, marketApproved: true })),
    ).toBe('fully-approved');
  });
});

describe('toggleSignoff', () => {
  it('Faithful track 승인 토글', () => {
    const ch = mkChapter();
    const next = toggleSignoff(ch, 'faithful', true);
    expect(next.faithfulApproved).toBe(true);
    expect(next.marketApproved).toBeFalsy();
    expect(typeof next.approvedAt).toBe('number');
  });

  it('Market track 승인 토글', () => {
    const ch = mkChapter();
    const next = toggleSignoff(ch, 'market', true);
    expect(next.marketApproved).toBe(true);
    expect(next.faithfulApproved).toBeFalsy();
  });

  it('false 토글 — approvedAt 보존', () => {
    const ch = mkChapter({ faithfulApproved: true, approvedAt: 12345 });
    const next = toggleSignoff(ch, 'faithful', false);
    expect(next.faithfulApproved).toBe(false);
    expect(next.approvedAt).toBe(12345); // 보존
  });
});

describe('summarizeSignoff', () => {
  it('빈 list → unapproved', () => {
    const s = summarizeSignoff([]);
    expect(s.status).toBe('unapproved');
    expect(s.total).toBe(0);
  });

  it('전부 승인 → fully-approved', () => {
    const chapters = [
      mkChapter({ faithfulApproved: true, marketApproved: true }),
      mkChapter({ faithfulApproved: true, marketApproved: true }),
    ];
    const s = summarizeSignoff(chapters);
    expect(s.status).toBe('fully-approved');
    expect(s.fullyApproved).toBe(2);
  });

  it('일부 승인 → partial', () => {
    const chapters = [
      mkChapter({ faithfulApproved: true }),
      mkChapter(),
    ];
    const s = summarizeSignoff(chapters);
    expect(s.status).toBe('partial');
    expect(s.faithfulApproved).toBe(1);
  });

  it('lastApprovedAt — 가장 최근 시각 추출', () => {
    const chapters = [
      mkChapter({ faithfulApproved: true, approvedAt: 100 }),
      mkChapter({ marketApproved: true, approvedAt: 200 }),
    ];
    const s = summarizeSignoff(chapters);
    expect(s.lastApprovedAt).toBe(200);
  });
});

describe('isReadyForPublish', () => {
  it('빈 list → false', () => {
    expect(isReadyForPublish([], 'faithful')).toBe(false);
  });

  it('Faithful 모두 승인 → true', () => {
    const chapters = [
      mkChapter({ faithfulApproved: true }),
      mkChapter({ faithfulApproved: true }),
    ];
    expect(isReadyForPublish(chapters, 'faithful')).toBe(true);
    expect(isReadyForPublish(chapters, 'market')).toBe(false);
  });

  it('일부만 Faithful 승인 → false', () => {
    const chapters = [
      mkChapter({ faithfulApproved: true }),
      mkChapter(),
    ];
    expect(isReadyForPublish(chapters, 'faithful')).toBe(false);
  });
});
