// ============================================================
// work-receipt-journal — Code Studio 감사 영수증 저널 (rank 12)
// AuditInvoice / ReviewCenter 의 fix 결정 (승인 · 거절) 을 localStorage 에
// 영속화한다. 새로고침 시 결정 이력 소실 방지.
// React/DOM 의존 0 — 순수 TS. work-receipt.buildReceipt 와 결합되어
// 표준 영수증 문자열로 표시 가능.
// 절대금지 8파일 import 0. localStorage SSR / private mode 안전.
// ============================================================

import type { WorkReceipt } from './work-receipt';

// ============================================================
// PART 1 — 타입 정의 (Entry · Decision)
// ============================================================

/** 단일 결정 유형. approved → fix 적용 / rejected → fix 폐기. */
export type ReceiptDecision = 'approved' | 'rejected';

/**
 * Code Studio 감사 영수증 저널 1건.
 * - id: UUID/random (호출자 주입)
 * - at: epoch ms (외부 주입 — 순수성 보존)
 * - fixId: ReviewCenter file/finding identifier (예: 파일명 또는 stagedFix key)
 * - decision: 사용자 선택 (approved | rejected)
 * - reason: 선택 사유 (없으면 '(미상)' 폴백)
 * - scoreDelta: 점수 변화 (예: 72→80 = +8). 미상이면 null
 * - receipt: 표준 WorkReceipt (buildReceipt 로 포맷 가능)
 */
export interface ReceiptJournalEntry {
  id: string;
  at: number;
  fixId: string;
  decision: ReceiptDecision;
  reason: string;
  scoreDelta: number | null;
  receipt: WorkReceipt;
}

/** localStorage 영속 키. v1 스키마. */
export const JOURNAL_KEY = 'noa_code_studio_receipt_journal_v1';

/** 보관 상한. 최근 N 건만 유지 (오래된 항목 자동 폐기). */
export const MAX_ENTRIES = 100;

/** 허용 decision 집합. */
const VALID_DECISIONS: ReadonlySet<ReceiptDecision> = new Set<ReceiptDecision>([
  'approved',
  'rejected',
]);

// ============================================================
// PART 2 — 내부 유틸 (가드 · 정규화)
// ============================================================

/** decision 유효성 검사. */
function isValidDecision(d: unknown): d is ReceiptDecision {
  return typeof d === 'string' && VALID_DECISIONS.has(d as ReceiptDecision);
}

/** localStorage 가용성 (SSR / private mode 양쪽 방어). */
function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

/** WorkReceipt 안전 정규화 — 손상된 항목은 빈 receipt 로 대체. */
function normalizeReceipt(input: unknown): WorkReceipt {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { did: [], skipped: [] };
  }
  const src = input as Record<string, unknown>;
  const did = Array.isArray(src.did)
    ? src.did.filter(
        (d): d is { action: string; evidence: string } =>
          !!d &&
          typeof d === 'object' &&
          typeof (d as { action?: unknown }).action === 'string' &&
          typeof (d as { evidence?: unknown }).evidence === 'string',
      )
    : [];
  const skipped = Array.isArray(src.skipped)
    ? src.skipped.filter(
        (s): s is { action: string; reason: string } =>
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

/** 단일 엔트리 정규화. 잘못된 필드 → null (호출자가 폐기). */
function normalizeEntry(input: unknown): ReceiptJournalEntry | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const src = input as Record<string, unknown>;
  if (typeof src.id !== 'string' || src.id.length === 0) return null;
  if (typeof src.at !== 'number' || !Number.isFinite(src.at)) return null;
  if (typeof src.fixId !== 'string' || src.fixId.length === 0) return null;
  if (!isValidDecision(src.decision)) return null;
  const reason = typeof src.reason === 'string' ? src.reason : '(미상)';
  const scoreDelta =
    typeof src.scoreDelta === 'number' && Number.isFinite(src.scoreDelta)
      ? src.scoreDelta
      : null;
  return {
    id: src.id,
    at: src.at,
    fixId: src.fixId,
    decision: src.decision,
    reason,
    scoreDelta,
    receipt: normalizeReceipt(src.receipt),
  };
}

/** 배열 입력 정규화. 비배열 / 손상 항목 폐기. */
function normalizeList(input: unknown): ReceiptJournalEntry[] {
  if (!Array.isArray(input)) return [];
  const out: ReceiptJournalEntry[] = [];
  for (const item of input) {
    const norm = normalizeEntry(item);
    if (norm) out.push(norm);
  }
  return out;
}

// ============================================================
// PART 3 — 영속 I/O (load · save)
// localStorage broken (JSON parse 실패) · quota (setItem 실패) 모두 흡수.
// ============================================================

/** localStorage 에서 저널 로드. 실패 시 빈 배열. */
export function loadJournal(): ReceiptJournalEntry[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(JOURNAL_KEY);
    if (!raw) return [];
    return normalizeList(JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * [P13 풀점검 루프 3] saveJournal 결과 타입.
 * caller 가 quota/private mode 실패를 감지하고 toast 띄울 수 있게 한다.
 */
export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'no-storage' | 'quota' | 'private' | 'unknown' };

/**
 * 저널 저장. null/undefined → 빈 배열. MAX_ENTRIES 초과 시 오래된 것부터 폐기.
 * quota 초과 / private mode 시 caller 가 인지할 수 있게 SaveResult 반환.
 *
 * [P13 풀점검 루프 3] 변경: void → SaveResult.
 * 기존 호출처는 반환값 무시해도 호환 (TS 비파괴).
 */
export function saveJournal(list: ReceiptJournalEntry[] | null | undefined): SaveResult {
  if (!hasStorage()) return { ok: false, reason: 'no-storage' };
  try {
    const safe = normalizeList(list);
    // at 내림차순 정렬 후 상한 적용 — 최신 N 건만 보존
    const sorted = [...safe].sort((a, b) => b.at - a.at);
    const trimmed = sorted.slice(0, MAX_ENTRIES);
    window.localStorage.setItem(JOURNAL_KEY, JSON.stringify(trimmed));
    return { ok: true };
  } catch (err) {
    // quota 초과 (QuotaExceededError) vs private mode vs unknown 구분
    const name = (err as { name?: string } | null)?.name ?? '';
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      return { ok: false, reason: 'quota' };
    }
    // Safari private mode 에서 setItem 시 SecurityError or QuotaExceededError 발생
    if (name === 'SecurityError') {
      return { ok: false, reason: 'private' };
    }
    return { ok: false, reason: 'unknown' };
  }
}

// ============================================================
// PART 4 — 순수 함수 (append · clear · 영수증 빌더)
// 입력 배열 불변 — 모든 연산이 새 배열 반환.
// ============================================================

/**
 * 결정 1건 추가. 잘못된 entry 는 기존 목록 그대로 (멱등).
 * MAX_ENTRIES 초과 시 가장 오래된 항목부터 폐기.
 */
export function appendEntry(
  list: ReceiptJournalEntry[] | null | undefined,
  entry: ReceiptJournalEntry | null | undefined,
): ReceiptJournalEntry[] {
  const base = normalizeList(list);
  const norm = normalizeEntry(entry);
  if (!norm) return base;
  const next = [...base, norm];
  // 최신순 정렬 후 상한 적용
  next.sort((a, b) => b.at - a.at);
  return next.slice(0, MAX_ENTRIES);
}

/** 전체 클리어. 새 빈 배열 반환 (소비측이 saveJournal 호출). */
export function clearJournal(): ReceiptJournalEntry[] {
  return [];
}

/**
 * fix 결정용 표준 영수증 빌더.
 * decision/reason/scoreDelta 를 WorkReceipt 형태로 변환 — buildReceipt 가
 * 표준 [검사 적용] 문자열로 포맷할 수 있게 한다.
 *
 * - approved → did 1건 ("fix 승인 — {fixId}")
 * - rejected → skipped 1건 ("fix 거절 — {reason}")
 * - scoreDelta 가 유효 숫자면 metrics.keyInfo 에 절댓값 기록 (참조용)
 */
export function buildDecisionReceipt(
  fixId: string,
  decision: ReceiptDecision,
  reason: string,
  scoreDelta: number | null,
): WorkReceipt {
  const safeFixId = typeof fixId === 'string' && fixId.length > 0 ? fixId : '(미상)';
  const safeReason = typeof reason === 'string' && reason.length > 0 ? reason : '(미상)';
  const receipt: WorkReceipt = { did: [], skipped: [] };
  if (decision === 'approved') {
    receipt.did.push({ action: `fix 승인 — ${safeFixId}`, evidence: safeReason });
  } else if (decision === 'rejected') {
    receipt.skipped.push({ action: `fix 거절 — ${safeFixId}`, reason: safeReason });
  }
  if (typeof scoreDelta === 'number' && Number.isFinite(scoreDelta)) {
    receipt.metrics = { keyInfo: Math.abs(Math.round(scoreDelta)) };
  }
  return receipt;
}

// ============================================================
// PART 5 — 통합 도우미 (appendDecision)
// 가장 흔한 호출 패턴: 1) 엔트리 생성 2) load 3) append 4) save
// ============================================================

/**
 * [P5 풀점검 루프 3] 멱등성 보장.
 * 동일 id 가 이미 list 에 있으면 추가하지 않고 기존 list 반환.
 * 빠른 클릭 (approve/reject 2번 동시) 으로 같은 id 중복 들어오는 경우 방어.
 */
function appendEntryIdempotent(
  list: ReceiptJournalEntry[],
  entry: ReceiptJournalEntry,
): ReceiptJournalEntry[] {
  if (list.some((e) => e.id === entry.id)) return list;
  const next = [...list, entry];
  next.sort((a, b) => b.at - a.at);
  return next.slice(0, MAX_ENTRIES);
}

/**
 * 결정 영속화 통합 도우미. 비순수(localStorage I/O) — 호출처는 클라이언트 only.
 *
 * [P5 풀점검 루프 3] load-modify-write 레이스 방어:
 * 1. 최대 3 회 재시도 — 매 시도마다 load → append → save.
 * 2. save 성공이면 즉시 반환. quota/private 실패는 영속화 못 한 채 in-memory 반환.
 * 3. id 멱등 (appendEntryIdempotent) — 동일 호출 중복 시 1건만 영속.
 *
 * 빠른 동시 호출 (T1·T2 50ms 차) 의 경우:
 *  - T1: load(0건) → save(1건) ok
 *  - T2: load(1건, T1 결과 포함) → save(2건) ok
 *  - 동기 마이크로태스크 큐 동작상 위 순서 보장 (localStorage 는 동기 API).
 *
 * 진짜 멀티탭 race 는 storage event + version stamp 로 분리 처리 필요하지만
 * 같은 탭 빠른 클릭 race 는 이 패턴으로 충분.
 *
 * 반환: 저장 직후의 정규화된 저널 배열 (UI 즉시 반영용).
 */
export function appendDecision(args: {
  id: string;
  at: number;
  fixId: string;
  decision: ReceiptDecision;
  reason: string;
  scoreDelta: number | null;
}): ReceiptJournalEntry[] {
  const entry: ReceiptJournalEntry = {
    id: args.id,
    at: args.at,
    fixId: args.fixId,
    decision: args.decision,
    reason: args.reason,
    scoreDelta: args.scoreDelta,
    receipt: buildDecisionReceipt(args.fixId, args.decision, args.reason, args.scoreDelta),
  };

  const MAX_RETRIES = 3;
  let lastNext: ReceiptJournalEntry[] = appendEntryIdempotent(loadJournal(), entry);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const current = loadJournal();
    lastNext = appendEntryIdempotent(current, entry);
    const result = saveJournal(lastNext);
    if (result.ok) return lastNext;

    // quota/private/no-storage 는 재시도해도 동일 결과 → 즉시 중단
    if (result.reason === 'quota' || result.reason === 'private' || result.reason === 'no-storage') {
      break;
    }
    // unknown 은 재시도
  }
  return lastNext;
}
