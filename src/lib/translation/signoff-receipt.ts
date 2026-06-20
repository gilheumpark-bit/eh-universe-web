// ============================================================
// signoff-receipt — Translation Studio sign-off 영수증 빌더 + localStorage 영속
// ============================================================
//
// SignoffPanel 에서 Faithful/Market 승인 시 자동 생성하는 work-receipt.
// - DID:     실행된 stage 목록 (예: [DID] Stage 1, 4)
// - SKIPPED: 생략한 항목 (Faithful 미승인 · Market 미승인 · 미작업 stage)
// - METRICS: 자수 + grade + 마지막 시각
//
// React/DOM 의존 0 — 순수 TS. work-receipt.buildReceipt 와 결합되어
// 표준 [검사 적용] 문자열로 표시 가능. localStorage SSR / private mode 안전.
// ============================================================

import type { ChapterEntry } from '@/types/translator';
import type {
  WorkReceipt,
  ReceiptDid,
  ReceiptSkipped,
} from '@/lib/creative/work-receipt';

// ============================================================
// PART 1 — 타입 정의 (저널 엔트리 · sign-off track)
// ============================================================

export type SignoffTrack = 'faithful' | 'market';

/** 챕터 단위 sign-off 영수증 1건. */
export interface SignoffReceiptEntry {
  /** UUID/random (호출자 주입). */
  id: string;
  /** epoch ms (외부 주입 — 순수성 보존). */
  at: number;
  /** 챕터 이름 (사람이 읽는 라벨). */
  chapterName: string;
  /** 챕터 인덱스 (0-base). */
  chapterIndex: number;
  /** 어느 track 승인이었는지. */
  track: SignoffTrack;
  /** 표준 영수증 구조. */
  receipt: WorkReceipt;
}

/** localStorage 영속 키. v1 스키마. */
export const SIGNOFF_RECEIPT_KEY = 'noa_translation_signoff_receipt_v1';

/** 보관 상한 — 최근 N 건만 유지. */
export const MAX_SIGNOFF_RECEIPTS = 200;

// ============================================================
// PART 2 — 내부 유틸 (가드 · 정규화 · clamp)
// ============================================================

/** localStorage 가용성 (SSR / private mode 양쪽 방어). */
function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

/** 0~5 정수 범위 clamp. 비정상 → 0. */
function clampStage(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 5) return 5;
  return Math.floor(value);
}

/** 글자수 안전 계산. content 가 string 이 아니면 0. */
function safeChars(content: unknown): number {
  if (typeof content !== 'string') return 0;
  return content.length;
}

/** WorkReceipt 안전 정규화 (저널 로드 시). */
function normalizeReceipt(input: unknown): WorkReceipt {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { did: [], skipped: [] };
  }
  const src = input as Record<string, unknown>;
  const did = Array.isArray(src.did)
    ? src.did.filter(
        (d): d is ReceiptDid =>
          !!d &&
          typeof d === 'object' &&
          typeof (d as { action?: unknown }).action === 'string' &&
          typeof (d as { evidence?: unknown }).evidence === 'string',
      )
    : [];
  const skipped = Array.isArray(src.skipped)
    ? src.skipped.filter(
        (s): s is ReceiptSkipped =>
          !!s &&
          typeof s === 'object' &&
          typeof (s as { action?: unknown }).action === 'string' &&
          typeof (s as { reason?: unknown }).reason === 'string',
      )
    : [];
  const out: WorkReceipt = { did, skipped };
  if (src.metrics && typeof src.metrics === 'object') {
    out.metrics = src.metrics as WorkReceipt['metrics'];
  }
  return out;
}

/** 엔트리 정규화. 잘못된 필드 → null. */
function normalizeEntry(input: unknown): SignoffReceiptEntry | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const src = input as Record<string, unknown>;
  if (typeof src.id !== 'string' || src.id.length === 0) return null;
  if (typeof src.at !== 'number' || !Number.isFinite(src.at)) return null;
  if (typeof src.chapterName !== 'string') return null;
  if (typeof src.chapterIndex !== 'number' || !Number.isFinite(src.chapterIndex)) return null;
  if (src.track !== 'faithful' && src.track !== 'market') return null;
  return {
    id: src.id,
    at: src.at,
    chapterName: src.chapterName,
    chapterIndex: src.chapterIndex,
    track: src.track,
    receipt: normalizeReceipt(src.receipt),
  };
}

/** 배열 입력 정규화 — 손상 항목 폐기. */
function normalizeList(input: unknown): SignoffReceiptEntry[] {
  if (!Array.isArray(input)) return [];
  const out: SignoffReceiptEntry[] = [];
  for (const item of input) {
    const norm = normalizeEntry(item);
    if (norm) out.push(norm);
  }
  return out;
}

// ============================================================
// PART 3 — 영수증 빌더 (ChapterEntry → WorkReceipt)
// ============================================================

/**
 * Translation Studio sign-off 영수증 빌더.
 *
 * - DID 섹션: 실행된 stage 1..N 단일 라인 ("Stage 1+...+N 완료")
 * - SKIPPED 섹션:
 *    - 승인 안 한 track (예: Market 미작업 시)
 *    - 미실행 stage (stageProgress < 5 일 때)
 *    - 결과 미존재 (resultFaithful 또는 resultMarket 누락)
 * - METRICS 섹션: 자수 (content + 해당 track 결과 길이)
 *
 * @param chapter 대상 챕터
 * @param track 어느 track 의 승인을 영수증화할지
 * @param now epoch ms (호출자 주입 — 순수성)
 */
export function buildSignoffReceipt(
  chapter: ChapterEntry | null | undefined,
  track: SignoffTrack,
): WorkReceipt {
  // null/undefined 안전
  if (!chapter || typeof chapter !== 'object') {
    return {
      did: [],
      skipped: [{ action: '챕터 정보 누락', reason: '(미상)' }],
      metrics: { chars: 0 },
    };
  }

  // track 별 진행도/결과
  const faithfulStage = clampStage(chapter.stageProgressFaithful ?? chapter.stageProgress);
  const marketStage = clampStage(chapter.stageProgressMarket ?? chapter.stageProgress);
  const targetStage = track === 'faithful' ? faithfulStage : marketStage;
  const trackResult =
    track === 'faithful'
      ? chapter.resultFaithful ?? chapter.result
      : chapter.resultMarket ?? chapter.result;

  // DID — 실행된 stage 목록
  const did: ReceiptDid[] = [];
  if (targetStage > 0) {
    const stageList = Array.from({ length: targetStage }, (_, i) => `Stage ${i + 1}`).join('+');
    did.push({
      action: `${track === 'faithful' ? 'Faithful' : 'Market'} 승인`,
      evidence: `${stageList} 완료`,
    });
  }
  if (typeof trackResult === 'string' && trackResult.length > 0) {
    did.push({
      action: `${track === 'faithful' ? 'Faithful' : 'Market'} 결과 보존`,
      evidence: `${trackResult.length}자`,
    });
  }

  // SKIPPED — 미실행 항목
  const skipped: ReceiptSkipped[] = [];
  if (targetStage < 5) {
    const missing = 5 - targetStage;
    skipped.push({
      action: `Stage ${targetStage + 1}~5 (${missing}개)`,
      reason: targetStage === 0 ? '미실행' : '중간 단계 종료',
    });
  }
  // 반대 track 미작업/미승인 표시 (참고용)
  if (track === 'faithful' && !chapter.marketApproved) {
    skipped.push({
      action: 'Market track',
      reason: chapter.resultMarket ? '미승인' : '미생성 (문법차)',
    });
  } else if (track === 'market' && !chapter.faithfulApproved) {
    skipped.push({
      action: 'Faithful track',
      reason: chapter.resultFaithful ? '미승인' : '미생성',
    });
  }

  // METRICS — 자수 (원문 + 번역본 합산)
  const srcChars = safeChars(chapter.content);
  const tgtChars = safeChars(trackResult);
  const totalChars = srcChars + tgtChars;

  return {
    did,
    skipped,
    metrics: {
      chars: totalChars,
      // keyInfo 에 실행된 stage 개수 기록 (참조용)
      keyInfo: targetStage,
    },
  };
}

// ============================================================
// PART 4 — 영속 I/O (load · save)
// ============================================================

/** localStorage 에서 영수증 저널 로드. 실패 시 빈 배열. */
export function loadSignoffReceipts(): SignoffReceiptEntry[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(SIGNOFF_RECEIPT_KEY);
    if (!raw) return [];
    return normalizeList(JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * [P6 풀점검 루프 3] saveSignoffReceipts 결과 타입.
 * caller 가 quota/private mode 실패를 감지할 수 있게 한다.
 */
export type SignoffSaveResult =
  | { ok: true }
  | { ok: false; reason: 'no-storage' | 'quota' | 'private' | 'unknown' };

/**
 * 저널 저장. MAX_SIGNOFF_RECEIPTS 초과 시 오래된 것부터 폐기.
 * quota / private mode 시 caller 가 인지할 수 있게 결과 반환.
 *
 * [P6 풀점검 루프 3] 변경: void → SignoffSaveResult.
 * 기존 호출처 호환 (반환값 무시 가능).
 */
export function saveSignoffReceipts(
  list: SignoffReceiptEntry[] | null | undefined,
): SignoffSaveResult {
  if (!hasStorage()) return { ok: false, reason: 'no-storage' };
  try {
    const safe = normalizeList(list);
    const sorted = [...safe].sort((a, b) => b.at - a.at);
    const trimmed = sorted.slice(0, MAX_SIGNOFF_RECEIPTS);
    window.localStorage.setItem(SIGNOFF_RECEIPT_KEY, JSON.stringify(trimmed));
    return { ok: true };
  } catch (err) {
    const name = (err as { name?: string } | null)?.name ?? '';
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      return { ok: false, reason: 'quota' };
    }
    if (name === 'SecurityError') {
      return { ok: false, reason: 'private' };
    }
    return { ok: false, reason: 'unknown' };
  }
}

// ============================================================
// PART 5 — 순수 함수 (append · 통합 도우미)
// ============================================================

/** 결정 1건 추가 (불변). */
export function appendSignoffReceipt(
  list: SignoffReceiptEntry[] | null | undefined,
  entry: SignoffReceiptEntry | null | undefined,
): SignoffReceiptEntry[] {
  const base = normalizeList(list);
  const norm = normalizeEntry(entry);
  if (!norm) return base;
  const next = [...base, norm];
  next.sort((a, b) => b.at - a.at);
  return next.slice(0, MAX_SIGNOFF_RECEIPTS);
}

/**
 * [P6 풀점검 루프 3] id 멱등 append.
 * 빠른 Faithful/Market 클릭으로 같은 id 가 중복으로 들어오는 경우 1건만 유지.
 */
function appendSignoffIdempotent(
  list: SignoffReceiptEntry[],
  entry: SignoffReceiptEntry,
): SignoffReceiptEntry[] {
  if (list.some((e) => e.id === entry.id)) return list;
  const next = [...list, entry];
  next.sort((a, b) => b.at - a.at);
  return next.slice(0, MAX_SIGNOFF_RECEIPTS);
}

/**
 * sign-off 영수증 영속화 통합 도우미.
 * 1) buildSignoffReceipt 로 receipt 생성 2) load 3) append 4) save
 * 비순수 (localStorage I/O) — 클라이언트 only.
 *
 * [P6 풀점검 루프 3] load-modify-write 레이스 방어:
 * - 최대 3 회 재시도 (각 시도 load → append → save).
 * - id 멱등 (appendSignoffIdempotent) — 동일 호출 중복 시 1건만 영속.
 * - quota/private 실패는 in-memory 만 반환 (caller 가 결과로 인지 가능).
 */
export function recordSignoffReceipt(args: {
  id: string;
  at: number;
  chapter: ChapterEntry;
  chapterIndex: number;
  track: SignoffTrack;
}): SignoffReceiptEntry[] {
  const entry: SignoffReceiptEntry = {
    id: args.id,
    at: args.at,
    chapterName: args.chapter?.name ?? '(미상)',
    chapterIndex: args.chapterIndex,
    track: args.track,
    receipt: buildSignoffReceipt(args.chapter, args.track),
  };

  const MAX_RETRIES = 3;
  let lastNext: SignoffReceiptEntry[] = appendSignoffIdempotent(loadSignoffReceipts(), entry);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const current = loadSignoffReceipts();
    lastNext = appendSignoffIdempotent(current, entry);
    const result = saveSignoffReceipts(lastNext);
    if (result.ok) return lastNext;

    if (result.reason === 'quota' || result.reason === 'private' || result.reason === 'no-storage') {
      break;
    }
  }
  return lastNext;
}
