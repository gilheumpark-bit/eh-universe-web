// ============================================================
// PART 1 — Types & Constants
// ============================================================
//
// Firebase Firestore 일일 사용량 클라이언트 추적기.
//
// 목적:
//   - Firestore 무료 플랜(읽기 50000/일, 쓰기 20000/일) 초과 방지
//   - 90% 도달 시 사용자 경고 → Blaze 전환 또는 로컬 저장 유도
//
// 한계 (중요):
//   - 클라이언트 추적만 — 정확한 서버 카운터 아님
//   - 다중 기기 사용 시 합산 안 됨 (각 기기별 독립)
//   - localStorage 기반 — 날짜 경계(UTC 00:00)에서 자동 리셋
//
// 용도:
//   - 핫 패스(프로젝트 동기화, 실시간 구독)에서 호출
//   - 전체 래핑 대상 아님 — 근사치 경고용
// ============================================================

import { logger } from '@/lib/logger';

/** Firestore 무료 플랜 기본 한도 */
export const FIREBASE_FREE_TIER_DAILY_READS = 50_000;
export const FIREBASE_FREE_TIER_DAILY_WRITES = 20_000;

const STORAGE_KEY = 'noa_firebase_quota_tracker';
const WARN_THRESHOLD = 0.9; // 90%
const INFO_THRESHOLD = 0.7; // 70%

export interface QuotaTracker {
  /** YYYY-MM-DD (UTC) — 날짜 경계에서 리셋 */
  date: string;
  reads: number;
  writes: number;
  /** 이미 경고 발행한 레벨 (중복 알림 방지) */
  warnedReads?: 'info' | 'warn' | null;
  warnedWrites?: 'info' | 'warn' | null;
}

interface RemainingQuota {
  reads: number;
  writes: number;
  /** 0-100 */
  readsPercent: number;
  writesPercent: number;
}

// ============================================================
// PART 2 — Storage helpers (SSR 안전)
// ============================================================

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyTracker(): QuotaTracker {
  return { date: todayISO(), reads: 0, writes: 0, warnedReads: null, warnedWrites: null };
}

function loadTracker(): QuotaTracker {
  if (typeof window === 'undefined') return emptyTracker();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyTracker();
    const parsed = JSON.parse(raw) as Partial<QuotaTracker>;
    const today = todayISO();
    // 날짜 경계 리셋
    if (!parsed.date || parsed.date !== today) return emptyTracker();
    return {
      date: parsed.date,
      reads: typeof parsed.reads === 'number' && parsed.reads >= 0 ? parsed.reads : 0,
      writes: typeof parsed.writes === 'number' && parsed.writes >= 0 ? parsed.writes : 0,
      warnedReads: parsed.warnedReads ?? null,
      warnedWrites: parsed.warnedWrites ?? null,
    };
  } catch (err) {
    logger.warn('FirebaseQuota', 'load failed, resetting', err);
    return emptyTracker();
  }
}

function saveTracker(t: QuotaTracker): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  } catch (err) {
    // quota exceeded or disabled — silent degrade
    logger.warn('FirebaseQuota', 'save failed', err);
  }
}

// ============================================================
// PART 3 — 임계치 알림 로직
// ============================================================

/**
 * 사용량 증가 후 임계치 진입 시 한 번만 알림.
 * 같은 레벨 재진입은 다음 날(새 date)에만 재발동.
 */
function maybeEmitAlert(
  tracker: QuotaTracker,
  kind: 'reads' | 'writes',
  current: number,
  limit: number,
): QuotaTracker {
  if (typeof window === 'undefined') return tracker;
  const percent = limit > 0 ? current / limit : 0;
  const warnedKey = kind === 'reads' ? 'warnedReads' : 'warnedWrites';
  const previously = tracker[warnedKey] ?? null;

  if (percent >= WARN_THRESHOLD && previously !== 'warn') {
    const kindLabel = kind === 'reads' ? '읽기' : '쓰기';
    const remaining = Math.max(0, limit - current);
    window.dispatchEvent(new CustomEvent('noa:alert', {
      detail: {
        variant: 'warning',
        title: `Firebase 일일 한도 90% 도달`,
        message: `오늘 남은 Firebase ${kindLabel}: ${remaining.toLocaleString()}회. Blaze 플랜 전환 또는 로컬 저장 권장.`,
      },
    }));
    window.dispatchEvent(new CustomEvent('noa:firebase-quota', {
      detail: { kind, level: 'warn', current, limit, percent },
    }));
    return { ...tracker, [warnedKey]: 'warn' } as QuotaTracker;
  }
  if (percent >= INFO_THRESHOLD && previously === null) {
    const kindLabel = kind === 'reads' ? '읽기' : '쓰기';
    window.dispatchEvent(new CustomEvent('noa:firebase-quota', {
      detail: { kind, level: 'info', current, limit, percent },
    }));
    // info는 UI 토스트 안 띄움 (너무 소음) — 이벤트만 발행
    logger.info('FirebaseQuota', `${kindLabel} 70% 도달 (${current}/${limit})`);
    return { ...tracker, [warnedKey]: 'info' } as QuotaTracker;
  }
  return tracker;
}

// ============================================================
// PART 4 — Public API
// ============================================================

/** Firebase read 1회 카운트 증가 */
export function incrementFirebaseRead(n = 1): void {
  if (typeof window === 'undefined') return;
  if (!Number.isFinite(n) || n <= 0) return;
  const t = loadTracker();
  const next: QuotaTracker = { ...t, reads: t.reads + Math.floor(n) };
  const afterAlert = maybeEmitAlert(next, 'reads', next.reads, FIREBASE_FREE_TIER_DAILY_READS);
  saveTracker(afterAlert);
}

/** Firebase write 1회 카운트 증가 */
export function incrementFirebaseWrite(n = 1): void {
  if (typeof window === 'undefined') return;
  if (!Number.isFinite(n) || n <= 0) return;
  const t = loadTracker();
  const next: QuotaTracker = { ...t, writes: t.writes + Math.floor(n) };
  const afterAlert = maybeEmitAlert(next, 'writes', next.writes, FIREBASE_FREE_TIER_DAILY_WRITES);
  saveTracker(afterAlert);
}

/** 현재 사용량 조회 */
export function getFirebaseUsage(): QuotaTracker {
  return loadTracker();
}

/** 남은 할당량 (근사치) */
export function getRemainingQuota(): RemainingQuota {
  const t = loadTracker();
  const reads = Math.max(0, FIREBASE_FREE_TIER_DAILY_READS - t.reads);
  const writes = Math.max(0, FIREBASE_FREE_TIER_DAILY_WRITES - t.writes);
  return {
    reads,
    writes,
    readsPercent: Math.min(100, Math.round((t.reads / FIREBASE_FREE_TIER_DAILY_READS) * 10000) / 100),
    writesPercent: Math.min(100, Math.round((t.writes / FIREBASE_FREE_TIER_DAILY_WRITES) * 10000) / 100),
  };
}

/** 수동 리셋 (테스트/디버깅용) */
export function resetFirebaseQuota(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    logger.warn('FirebaseQuota', 'reset failed', err);
  }
}
