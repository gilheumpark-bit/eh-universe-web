// ============================================================
// toast-store — 토스트 알림 store (순수 TS)
// 외부 의존 0 · DOM/React 직접 호출 0 · now/timestamp 호출자 주입.
// 절대금지 8파일 import 0 · 신규 모듈 상호 import 0.
// ============================================================

// ============================================================
// PART 1 — 타입·상수·기본값 정의
// ============================================================

export type ToastKind = 'info' | 'success' | 'warn' | 'error';

export interface Toast {
  /** ULID-like 정렬 가능 식별자 */
  id: string;
  kind: ToastKind;
  message: string;
  /** epoch ms — 호출자가 주입한 now */
  createdAt: number;
  /** ms — 자동 만료 시간 (createdAt + ttl 시각에 만료) */
  ttl: number;
}

export interface CreateToastInput {
  kind?: ToastKind;
  message: string;
  ttl?: number;
  /** epoch ms — 미주입 시 Date.now() */
  now?: number;
}

/** 기본 노출 시간 (ms) */
export const DEFAULT_TOAST_TTL = 3500;
/** 최소 노출 시간 (ms) — 0/음수 방지 */
export const MIN_TOAST_TTL = 500;
/** 최대 노출 시간 (ms) — 무한 알림 방지 */
export const MAX_TOAST_TTL = 60_000;
/** 메시지 최대 길이 — 초과분은 절단 */
export const MAX_TOAST_MESSAGE = 500;

const VALID_KINDS: ReadonlySet<ToastKind> = new Set<ToastKind>([
  'info',
  'success',
  'warn',
  'error',
]);

// ============================================================
// PART 2 — 내부 유틸 (ID 생성·메시지 정규화·범위 클램프)
// ============================================================

/** ttl 안전 범위로 보정 — NaN/음수/과대값 방어. */
function clampTtl(ttl: number | undefined): number {
  const n = typeof ttl === 'number' && Number.isFinite(ttl) ? ttl : DEFAULT_TOAST_TTL;
  if (n < MIN_TOAST_TTL) return MIN_TOAST_TTL;
  if (n > MAX_TOAST_TTL) return MAX_TOAST_TTL;
  return Math.floor(n);
}

/** kind 검증 — 알 수 없는 종류는 'info' 폴백. */
function normalizeKind(kind: ToastKind | undefined): ToastKind {
  return kind && VALID_KINDS.has(kind) ? kind : 'info';
}

/** 메시지 정규화 — 공백 절단·길이 제한. 빈 문자열이면 빈 문자열 반환. */
function normalizeMessage(message: string | null | undefined): string {
  if (typeof message !== 'string') return '';
  const trimmed = message.trim();
  if (trimmed.length === 0) return '';
  if (trimmed.length > MAX_TOAST_MESSAGE) {
    return trimmed.slice(0, MAX_TOAST_MESSAGE);
  }
  return trimmed;
}

/** epoch ms now 정규화 — 비정상 입력은 0 폴백 (호출자 결정 우선). */
function normalizeNow(now: number | undefined): number {
  if (typeof now === 'number' && Number.isFinite(now) && now >= 0) {
    return Math.floor(now);
  }
  return 0;
}

/** base36 36진 패딩 헬퍼. */
function toBase36(n: number, len: number): string {
  const s = Math.max(0, Math.floor(n)).toString(36);
  if (s.length >= len) return s.slice(-len);
  return s.padStart(len, '0');
}

/**
 * 이전 id 기반 다음 id 생성 — ULID-like 정렬 가능 단조 증가.
 * 형식: <timeBase36(10)>-<seq(4)>
 * prev 이 같은 시간 prefix 일 경우 seq 를 +1, 다르면 0001 부터 재시작.
 * prev 가 null/형식 불일치면 timestamp + 0001.
 */
export function nextToastId(prev: string | null | undefined, now?: number): string {
  const t = normalizeNow(now ?? Date.now());
  const tPart = toBase36(t, 10);

  if (typeof prev === 'string' && /^[0-9a-z]{10}-[0-9a-z]{4}$/.test(prev)) {
    const [prevT, prevSeq] = prev.split('-');
    if (prevT === tPart) {
      const next = parseInt(prevSeq, 36) + 1;
      return `${tPart}-${toBase36(next, 4)}`;
    }
  }
  return `${tPart}-${toBase36(1, 4)}`;
}

// ============================================================
// PART 3 — 공개 API (createToast · pruneExpired)
// ============================================================

/**
 * 토스트 1건 생성.
 * - 빈 메시지(공백만) → null 반환. throw 하지 않음.
 * - kind 미지정·이상값 → 'info'.
 * - ttl 미지정 → DEFAULT_TOAST_TTL(3500ms). 범위는 [MIN, MAX] 로 클램프.
 * - now 미지정 → Date.now(). 호출자가 주입하면 그대로 사용.
 */
export function createToast(input: CreateToastInput | null | undefined): Toast | null {
  if (!input || typeof input !== 'object') return null;

  const message = normalizeMessage(input.message);
  if (message.length === 0) return null;

  const now =
    typeof input.now === 'number' && Number.isFinite(input.now) && input.now >= 0
      ? Math.floor(input.now)
      : Date.now();

  const ttl = clampTtl(input.ttl);
  const kind = normalizeKind(input.kind);
  const id = nextToastId(null, now);

  return {
    id,
    kind,
    message,
    createdAt: now,
    ttl,
  };
}

/**
 * 만료된 토스트 제거.
 * - 만료 기준: createdAt + ttl <= now
 * - list 가 배열이 아니면 빈 배열 반환 (안전 가드).
 * - now 가 비정상이면 list 원형 유지 (만료 판단 불가).
 */
export function pruneExpired(
  list: ReadonlyArray<Toast> | null | undefined,
  now: number,
): Toast[] {
  if (!Array.isArray(list)) return [];
  if (list.length === 0) return [];
  if (typeof now !== 'number' || !Number.isFinite(now)) {
    return list.slice();
  }

  const out: Toast[] = [];
  for (const t of list) {
    if (!t || typeof t !== 'object') continue;
    if (
      typeof t.createdAt !== 'number' ||
      typeof t.ttl !== 'number' ||
      !Number.isFinite(t.createdAt) ||
      !Number.isFinite(t.ttl)
    ) {
      // 손상된 항목은 보존 (호출자가 정리 결정)
      out.push(t);
      continue;
    }
    if (t.createdAt + t.ttl > now) {
      out.push(t);
    }
  }
  return out;
}
