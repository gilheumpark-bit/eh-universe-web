// ============================================================
// PART 1 — Module Header
// ============================================================
//
// author-signoff.ts — 작가 sign-off (Faithful archive + Market publish 분리 승인).
//
// 시장 분석 4차 §8 §10 §11 핵심 요구:
//   "작가 승인 → 출판 패키지"
//   "Faithful track (저작권 archive) + Market track (출판) 분리"
//
// ChapterEntry 의 faithfulApproved + marketApproved + approvedAt 필드 위에서
// 작동. UI 는 작가가 두 결과를 검토하고 각각 승인.
//
// [C] 결정론적 — LLM 호출 0
// [K] 데이터 변환 헬퍼만, UI 는 별도
// ============================================================

import type { ChapterEntry } from '@/types/translator';

// ============================================================
// PART 2 — Types
// ============================================================

export type SignoffStatus = 'unapproved' | 'partial' | 'fully-approved';

export interface SignoffSummary {
  total: number;
  faithfulApproved: number;
  marketApproved: number;
  fullyApproved: number;
  unapproved: number;
  status: SignoffStatus;
  /** 마지막 승인 시각 (가장 최근 chapter.approvedAt). */
  lastApprovedAt: number | null;
}

// ============================================================
// PART 3 — 헬퍼
// ============================================================

/** 한 챕터 sign-off 상태. */
export function chapterSignoffStatus(ch: ChapterEntry): SignoffStatus {
  const f = !!ch.faithfulApproved;
  const m = !!ch.marketApproved;
  if (f && m) return 'fully-approved';
  if (f || m) return 'partial';
  return 'unapproved';
}

/** 챕터 list 통계. */
export function summarizeSignoff(chapters: ChapterEntry[]): SignoffSummary {
  const total = chapters.length;
  let faithfulApproved = 0;
  let marketApproved = 0;
  let fullyApproved = 0;
  let lastApprovedAt: number | null = null;
  for (const ch of chapters) {
    if (ch.faithfulApproved) faithfulApproved++;
    if (ch.marketApproved) marketApproved++;
    if (ch.faithfulApproved && ch.marketApproved) fullyApproved++;
    if (typeof ch.approvedAt === 'number') {
      if (lastApprovedAt === null || ch.approvedAt > lastApprovedAt) {
        lastApprovedAt = ch.approvedAt;
      }
    }
  }
  const unapproved = total - Math.max(faithfulApproved, marketApproved);
  let status: SignoffStatus;
  if (fullyApproved === total && total > 0) status = 'fully-approved';
  else if (faithfulApproved + marketApproved > 0) status = 'partial';
  else status = 'unapproved';
  return {
    total,
    faithfulApproved,
    marketApproved,
    fullyApproved,
    unapproved,
    status,
    lastApprovedAt,
  };
}

/** 챕터 sign-off 토글 — track 별. */
export function toggleSignoff(
  ch: ChapterEntry,
  track: 'faithful' | 'market',
  approved: boolean,
): ChapterEntry {
  const now = Date.now();
  if (track === 'faithful') {
    return {
      ...ch,
      faithfulApproved: approved,
      approvedAt: approved ? now : ch.approvedAt,
    };
  }
  return {
    ...ch,
    marketApproved: approved,
    approvedAt: approved ? now : ch.approvedAt,
  };
}

/** 출판 가능 여부 — 시장 분석 4차 §8 "작가 승인 → 출판 패키지". */
export function isReadyForPublish(
  chapters: ChapterEntry[],
  track: 'faithful' | 'market',
): boolean {
  if (chapters.length === 0) return false;
  return chapters.every((ch) =>
    track === 'faithful' ? ch.faithfulApproved : ch.marketApproved,
  );
}
