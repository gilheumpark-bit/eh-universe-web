// ============================================================
// PART 1 — Module overview (M1.4 §2 Firestore Mirror — Secondary Tier)
// ============================================================
//
// 저널 엔진 전용 Firestore 미러. 기존 firestore-project-sync.ts와는 완전 분리.
//
// 책임:
//   - 5분 주기로 현재 snapshot 해시를 비교 → 변경 시에만 Firestore 업로드
//   - 다운로드(receiver)는 이 모듈이 아닌 외부 호출자 책임 (충돌 감지는 위임)
//   - Firestore quota 90% 도달 시 자동 pause + 7일 후 자동 재시도
//
// 사용자 consent (필수):
//   - FEATURE_FIRESTORE_MIRROR feature flag (기본 false)
//   - 사용자가 Settings에서 명시 동의 토글 → flag on
//   - flag off면 이 모듈은 완전히 noop, 네트워크 호출 0건
//
// 분리 원칙:
//   - 기존 firestore-project-sync.ts는 useProjectManager 경로 — 건드리지 않음
//   - 이 미러는 저널 엔진 snapshot/delta 경로 전용 — collection 분리
//   - Primary(IDB Journal) 실패해도 이 미러는 동작 시도 (반대도 동일)
//
// [C] 모든 Firebase 호출 try/catch 격리, dynamic import (SSR 안전)
// [G] 해시 비교로 무용한 업로드 차단 — quota 절약
// [K] firestore-project-sync.ts에 의존 금지 (다른 collection)

import { logger } from '@/lib/logger';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  getRemainingQuota,
  incrementFirebaseRead,
  incrementFirebaseWrite,
} from '@/lib/firebase-quota-tracker';

// ============================================================
// PART 2 — Types
// ============================================================

export interface MirrorSnapshot {
  /** 사용자 uid (필수) */
  uid: string;
  /** 프로젝트 id */
  projectId: string;
  /** snapshot 본문 SHA-256 (16진수) */
  contentHash: string;
  /** snapshot 직렬화 본체 (Uint8Array → base64 또는 그대로 Firestore Bytes) */
  payload: Uint8Array;
  /** snapshot 시점 HLC physical ms */
  capturedAt: number;
  /** journalVersion (저널 스키마) */
  journalVersion: number;
}

export interface MirrorPushResult {
  /** 실제 Firestore 쓰기가 발생했는지 */
  written: boolean;
  /** 변경 없음(해시 동일) → skip */
  skipped: boolean;
  /** quota / consent / config 등 사유로 차단됐는지 */
  blocked: boolean;
  reason?: string;
}

export interface MirrorPullResult {
  /** 원격에 데이터 있음 */
  found: boolean;
  snapshot?: {
    contentHash: string;
    capturedAt: number;
    payload: Uint8Array;
    journalVersion: number;
  };
  blocked: boolean;
  reason?: string;
}

export interface FirestoreMirrorOptions {
  /** 자동 push 주기 (ms). 기본 5분. */
  intervalMs?: number;
  /** quota 임계 (0~1). 기본 0.9. */
  quotaThreshold?: number;
}

export type MirrorSnapshotProvider = () => Promise<MirrorSnapshot | null>;

// ============================================================
// PART 3 — Constants
// ============================================================

/** Firestore collection 이름 — 기존 'studio-sessions'와 분리 */
const COLLECTION_BASE = 'journal-mirror';
/** 자동 push 기본 주기 (5분) */
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
/** 기본 quota 임계 */
const DEFAULT_QUOTA_THRESHOLD = 0.9;
/** quota 초과 시 pause 기간 (7일) */
const QUOTA_PAUSE_MS = 7 * 24 * 60 * 60 * 1000;

// ============================================================
// PART 4 — Consent + config gate
// ============================================================

/**
 * Firestore Mirror가 동작 가능한지 검사.
 * - feature flag FEATURE_FIRESTORE_MIRROR (사용자 consent)
 * - feature flag CLOUD_SYNC도 동시에 ON이어야 (기존 인프라 신뢰성)
 * - SSR 환경에서는 항상 false
 */
export function isMirrorAllowed(): { allowed: boolean; reason?: string } {
  if (typeof window === 'undefined') {
    return { allowed: false, reason: 'ssr' };
  }
  if (!isFeatureEnabled('FEATURE_FIRESTORE_MIRROR')) {
    return { allowed: false, reason: 'consent-required' };
  }
  if (!isFeatureEnabled('CLOUD_SYNC')) {
    return { allowed: false, reason: 'cloud-sync-disabled' };
  }
  return { allowed: true };
}

// ============================================================
// PART 5 — Firestore I/O (dynamic import 격리)
// ============================================================

interface FirestoreCollections {
  /** doc ref builder */
  buildRef: (db: unknown, uid: string, projectId: string) => unknown;
  setDoc: (ref: unknown, data: unknown, opts?: unknown) => Promise<void>;
  getDoc: (ref: unknown) => Promise<{ exists: () => boolean; data: () => unknown }>;
}

let cachedFirestore: FirestoreCollections | null = null;

async function loadFirestore(): Promise<FirestoreCollections | null> {
  if (cachedFirestore) return cachedFirestore;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import('firebase/firestore' as any);
    const { doc, setDoc, getDoc } = mod;
    cachedFirestore = {
      buildRef: (db, uid, projectId) => doc(db, COLLECTION_BASE, uid, 'projects', projectId),
      setDoc,
      getDoc,
    };
    return cachedFirestore;
  } catch (err) {
    logger.warn('save-engine:firestore-mirror', 'firebase/firestore import failed', err);
    return null;
  }
}

/** 주입 가능한 firestore 모듈 (테스트용) */
export function __setFirestoreForTests(mock: FirestoreCollections | null): void {
  cachedFirestore = mock;
}

// ============================================================
// PART 6 — Quota guard
// ============================================================

interface QuotaCheckResult {
  ok: boolean;
  reason?: string;
  pauseUntil?: number;
}

function checkQuota(threshold: number, kind: 'reads' | 'writes'): QuotaCheckResult {
  if (typeof window === 'undefined') return { ok: true };
  try {
    const r = getRemainingQuota();
    const percent = kind === 'reads' ? r.readsPercent / 100 : r.writesPercent / 100;
    if (percent >= threshold) {
      return {
        ok: false,
        reason: `quota-${kind}-exceeded`,
        pauseUntil: Date.now() + QUOTA_PAUSE_MS,
      };
    }
    return { ok: true };
  } catch (err) {
    logger.debug('save-engine:firestore-mirror', 'quota check failed', err);
    return { ok: true };
  }
}

// ============================================================
// PART 7 — pushSnapshot (Sender)
// ============================================================

/**
 * 현재 snapshot을 Firestore에 push.
 * 해시가 마지막 push와 동일하면 skip (quota 절약).
 *
 * 실패는 throw하지 않음 — 결과 객체로 반환 (Orchestrator가 격리).
 */
export async function pushSnapshot(
  snapshot: MirrorSnapshot,
  lastPushedHash: string | null,
  options: FirestoreMirrorOptions = {},
): Promise<MirrorPushResult> {
  const allowance = isMirrorAllowed();
  if (!allowance.allowed) {
    return { written: false, skipped: false, blocked: true, reason: allowance.reason };
  }

  // 변경 없으면 skip
  if (lastPushedHash != null && lastPushedHash === snapshot.contentHash) {
    return { written: false, skipped: true, blocked: false, reason: 'no-change' };
  }

  // quota 체크
  const threshold = options.quotaThreshold ?? DEFAULT_QUOTA_THRESHOLD;
  const quota = checkQuota(threshold, 'writes');
  if (!quota.ok) {
    return { written: false, skipped: false, blocked: true, reason: quota.reason };
  }

  // dynamic import
  let firestore: FirestoreCollections | null;
  try {
    firestore = await loadFirestore();
  } catch (err) {
    return {
      written: false,
      skipped: false,
      blocked: true,
      reason: `import-failed: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }
  if (!firestore) {
    return { written: false, skipped: false, blocked: true, reason: 'firestore-unavailable' };
  }

  // db getter — 순환 참조 방지 위해 dynamic
  let db: unknown;
  try {
    const fb = await import('@/lib/firebase');
    db = fb.getDb();
  } catch {
    return { written: false, skipped: false, blocked: true, reason: 'db-unavailable' };
  }
  if (!db) {
    return { written: false, skipped: false, blocked: true, reason: 'db-null' };
  }

  // setDoc (실패 시 throw → caller가 catch)
  try {
    const ref = firestore.buildRef(db, snapshot.uid, snapshot.projectId);
    incrementFirebaseWrite();
    // payload는 Uint8Array → Firestore Bytes (Blob 호환). 클라이언트 SDK가 자동 변환.
    await firestore.setDoc(
      ref,
      {
        contentHash: snapshot.contentHash,
        capturedAt: snapshot.capturedAt,
        journalVersion: snapshot.journalVersion,
        payload: snapshot.payload,
        updatedAt: Date.now(),
      },
      { merge: false },
    );
    return { written: true, skipped: false, blocked: false };
  } catch (err) {
    // throw — orchestrator가 failure로 카운트
    throw err instanceof Error ? err : new Error(String(err));
  }
}

// ============================================================
// PART 8 — pullSnapshot (Receiver)
// ============================================================

/**
 * Firestore에서 최신 snapshot을 가져온다.
 * 충돌 감지는 호출자(예: 부팅 복구 + conflict-detector) 책임.
 */
export async function pullSnapshot(
  uid: string,
  projectId: string,
  options: FirestoreMirrorOptions = {},
): Promise<MirrorPullResult> {
  const allowance = isMirrorAllowed();
  if (!allowance.allowed) {
    return { found: false, blocked: true, reason: allowance.reason };
  }

  const threshold = options.quotaThreshold ?? DEFAULT_QUOTA_THRESHOLD;
  const quota = checkQuota(threshold, 'reads');
  if (!quota.ok) {
    return { found: false, blocked: true, reason: quota.reason };
  }

  const firestore = await loadFirestore();
  if (!firestore) {
    return { found: false, blocked: true, reason: 'firestore-unavailable' };
  }

  let db: unknown;
  try {
    const fb = await import('@/lib/firebase');
    db = fb.getDb();
  } catch {
    return { found: false, blocked: true, reason: 'db-unavailable' };
  }
  if (!db) {
    return { found: false, blocked: true, reason: 'db-null' };
  }

  try {
    const ref = firestore.buildRef(db, uid, projectId);
    incrementFirebaseRead();
    const snap = await firestore.getDoc(ref);
    if (!snap.exists()) {
      return { found: false, blocked: false };
    }
    const data = snap.data() as {
      contentHash?: string;
      capturedAt?: number;
      payload?: Uint8Array;
      journalVersion?: number;
    };
    if (!data?.contentHash || !data?.payload) {
      return { found: false, blocked: false, reason: 'malformed' };
    }
    return {
      found: true,
      blocked: false,
      snapshot: {
        contentHash: data.contentHash,
        capturedAt: data.capturedAt ?? 0,
        payload: data.payload,
        journalVersion: data.journalVersion ?? 1,
      },
    };
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

// ============================================================
// PART 9 — FirestoreMirrorScheduler (Tier handler 빌더)
// ============================================================

/**
 * BackupOrchestrator에 등록할 핸들러를 만든다.
 * Provider가 null 반환하면 skip (snapshot 없음).
 * pushSnapshot 결과의 blocked는 throw하지 않음 — 외부 pause 트리거용.
 */
export function createFirestoreMirrorHandler(
  provider: MirrorSnapshotProvider,
  options: FirestoreMirrorOptions = {},
): {
  handler: () => Promise<void>;
  /** 마지막 push된 contentHash (in-memory) — 테스트/복구 조회용 */
  getLastPushedHash: () => string | null;
  resetLastPushedHash: () => void;
} {
  let lastPushedHash: string | null = null;

  const handler = async (): Promise<void> => {
    const snap = await provider();
    if (!snap) return; // snapshot 없음 — 정상 skip

    const result = await pushSnapshot(snap, lastPushedHash, options);
    if (result.written) {
      lastPushedHash = snap.contentHash;
      logger.debug(
        'save-engine:firestore-mirror',
        `pushed snapshot ${snap.contentHash.slice(0, 8)} for project ${snap.projectId}`,
      );
      return;
    }
    if (result.skipped) {
      logger.debug('save-engine:firestore-mirror', `skipped (no change)`);
      return;
    }
    // blocked — quota/consent 등. throw로 orchestrator pause 유도.
    throw new Error(`firestore-mirror blocked: ${result.reason ?? 'unknown'}`);
  };

  return {
    handler,
    getLastPushedHash: () => lastPushedHash,
    resetLastPushedHash: () => { lastPushedHash = null; },
  };
}

// ============================================================
// PART 10 — Re-exports
// ============================================================

export const FIRESTORE_MIRROR_DEFAULTS = {
  COLLECTION_BASE,
  DEFAULT_INTERVAL_MS,
  DEFAULT_QUOTA_THRESHOLD,
  QUOTA_PAUSE_MS,
} as const;
