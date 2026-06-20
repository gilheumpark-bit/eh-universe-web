// ============================================================
// PART 1 — Module overview (M1.3 §4 Conflict Detection)
// ============================================================
//
// HLC concurrent 감지 전용 모듈. "2+ 탭이 동시 편집 → last-write-wins" 시나리오를
// 로그·경고 수준에서 고지한다. 실제 3-way merge UI는 Phase 1.6b 담당.
//
// 감지 시점:
//   1) Leader가 tab-sync의 save-committed 수신 시 — 같은 parentHash에서 분기한 경쟁
//      엔트리가 다른 탭에서 만들어졌는지 검사.
//   2) Follower → Leader 승격 시 — 기존 Leader 마지막 쓰기와 자신의 pending 간
//      HLC concurrent 여부 검사.
//
// 출력:
//   - ConflictLog[] 에 push
//   - 'noa:alert' CustomEvent 경고 토스트 트리거 ("다른 탭에서 동시 편집 감지")
//
// 금지:
//   - 자동 merge 알고리즘 — 보존 원칙 위반
//   - 3-way merge UI — Phase 1.6b 담당
//
// [C] HLC deep copy / 콜백 예외 격리
// [G] Log는 메모리 Bounded ring buffer (기본 200) — 무한 증가 방지
// [K] 외부 의존 최소 — isConcurrent만 가져옴

import { logger } from '@/lib/logger';
import type { HLC } from './types';
import { compareHLC, isConcurrent as hlcConcurrent } from './hlc';

// ============================================================
// PART 2 — Types
// ============================================================

export type ConflictReason =
  | 'hlc-concurrent-save'     // 같은 parentHash 기반 동시 엔트리 발견
  | 'promotion-race'          // Follower 승격 직후 pending/incoming concurrent
  | 'parent-divergence';      // 서로 다른 parentHash 기반 쓰기 (브랜치 분기)

export interface ConflictLogEntry {
  id: string;                 // ULID-like auto
  detectedAt: number;         // Date.now()
  reason: ConflictReason;
  localClock: HLC;
  remoteClock: HLC;
  /** 어느 탭에서 감지됐는지 */
  detectorTabId: string;
  /** 어느 리모트 탭에서 온 이벤트인지 */
  remoteTabId: string;
  /** 관련 projectId */
  projectId: string | null;
  /** 엔트리 id (있으면) */
  localEntryId?: string;
  remoteEntryId?: string;
  /** 부모 해시 — 분기 여부 판단용 */
  localParentHash?: string;
  remoteParentHash?: string;
}

export interface DetectSaveCommittedInput {
  detectorTabId: string;
  /** 내가 마지막으로 쓴 엔트리 (없으면 local concurrent 판단 불가) */
  localLastClock: HLC | null;
  localLastEntryId?: string;
  localLastParentHash?: string;
  /** 원격에서 수신한 save-committed payload */
  remoteClock: HLC;
  remoteTabId: string;
  remoteEntryId: string;
  remoteParentHash: string;
  projectId: string | null;
}

export interface DetectPromotionInput {
  detectorTabId: string;
  /** 승격 순간 자신의 pending (아직 flush 안 된) HLC */
  pendingClock: HLC | null;
  /** 기존 Leader가 마지막으로 남긴 엔트리 */
  lastLeaderClock: HLC | null;
  lastLeaderTabId: string | null;
  lastLeaderEntryId?: string;
  projectId: string | null;
}

// ============================================================
// PART 3 — Ring buffer + event emitter
// ============================================================

const DEFAULT_CAPACITY = 200;

type Listener = (entry: ConflictLogEntry) => void;

export class ConflictDetector {
  private buffer: ConflictLogEntry[] = [];
  private capacity: number;
  private listeners = new Set<Listener>();
  private seq = 0;

  constructor(capacity: number = DEFAULT_CAPACITY) {
    // [C] 경계값 방어 — 0 이하 값은 기본값으로.
    this.capacity = capacity > 0 ? capacity : DEFAULT_CAPACITY;
  }

  /**
   * Leader가 원격 save-committed를 받을 때 호출.
   * local의 마지막 쓰기와 remote 엔트리 사이 concurrent 여부를 검사.
   * concurrent이거나 parent 분기면 log push + 이벤트.
   */
  detectOnSaveCommitted(input: DetectSaveCommittedInput): ConflictLogEntry | null {
    // [C] null guard — 로컬 이력이 없으면 판단 skip.
    if (!input.localLastClock) return null;

    // 같은 탭이면 분석 skip (echo 아님을 가정하지만 방어적).
    if (input.remoteTabId === input.detectorTabId) return null;

    const concurrent = hlcConcurrent(input.localLastClock, input.remoteClock);
    const divergedParent =
      input.localLastParentHash != null &&
      input.remoteParentHash !== input.localLastParentHash;

    let reason: ConflictReason | null = null;
    if (concurrent) reason = 'hlc-concurrent-save';
    else if (divergedParent) reason = 'parent-divergence';
    if (!reason) return null;

    const entry: ConflictLogEntry = {
      id: this.genId(),
      detectedAt: Date.now(),
      reason,
      localClock: { ...input.localLastClock },
      remoteClock: { ...input.remoteClock },
      detectorTabId: input.detectorTabId,
      remoteTabId: input.remoteTabId,
      projectId: input.projectId,
      localEntryId: input.localLastEntryId,
      remoteEntryId: input.remoteEntryId,
      localParentHash: input.localLastParentHash,
      remoteParentHash: input.remoteParentHash,
    };
    this.push(entry);
    return entry;
  }

  /**
   * Follower → Leader 승격 시 호출.
   * pending이 있고 기존 Leader의 마지막 쓰기와 concurrent하면 log.
   */
  detectOnPromotion(input: DetectPromotionInput): ConflictLogEntry | null {
    if (!input.pendingClock || !input.lastLeaderClock) return null;
    if (input.lastLeaderTabId === input.detectorTabId) return null;

    if (!hlcConcurrent(input.pendingClock, input.lastLeaderClock)) {
      // compareHLC로 순차 관계면 정상.
      const order = compareHLC(input.pendingClock, input.lastLeaderClock);
      if (order !== 0) return null;
    }

    const entry: ConflictLogEntry = {
      id: this.genId(),
      detectedAt: Date.now(),
      reason: 'promotion-race',
      localClock: { ...input.pendingClock },
      remoteClock: { ...input.lastLeaderClock },
      detectorTabId: input.detectorTabId,
      remoteTabId: input.lastLeaderTabId ?? 'unknown',
      projectId: input.projectId,
      localEntryId: undefined,
      remoteEntryId: input.lastLeaderEntryId,
    };
    this.push(entry);
    return entry;
  }

  /** 로그 구독. dispose 반환. */
  onConflict(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  /** 현재 로그 스냅샷 (deep copy). */
  getLog(): ConflictLogEntry[] {
    return this.buffer.map((e) => ({ ...e, localClock: { ...e.localClock }, remoteClock: { ...e.remoteClock } }));
  }

  /** 로그 길이 (capacity 상한 내). */
  size(): number { return this.buffer.length; }

  /** 로그 비우기 (테스트/사용자 "확인" 후). */
  clear(): void { this.buffer = []; }

  // ----- 내부 -----

  private push(entry: ConflictLogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > this.capacity) {
      this.buffer.splice(0, this.buffer.length - this.capacity);
    }
    for (const cb of this.listeners) {
      try { cb(entry); }
      catch (err) { logger.warn('save-engine:conflict', 'listener threw', err); }
    }
    logger.warn(
      'save-engine:conflict',
      `[${entry.reason}] detector=${entry.detectorTabId} remote=${entry.remoteTabId}`,
      {
        local: entry.localClock,
        remote: entry.remoteClock,
        projectId: entry.projectId,
      },
    );
  }

  private genId(): string {
    // 짧은 모노토닉 id — ULID 필요 시 hlc.ulid 사용도 가능하나 detector 내부 전용.
    this.seq += 1;
    return `cflt-${Date.now().toString(36)}-${this.seq.toString(36)}`;
  }
}

// ============================================================
// PART 4 — Default singleton + alert dispatcher
// ============================================================

let defaultDetector: ConflictDetector | null = null;

export function getDefaultConflictDetector(): ConflictDetector {
  if (!defaultDetector) {
    defaultDetector = new ConflictDetector();
  }
  return defaultDetector;
}

export function resetDefaultConflictDetectorForTests(): void {
  defaultDetector = null;
}

/**
 * 'noa:alert' CustomEvent를 dispatch해 글로벌 토스트 시스템에 경고를 띄운다.
 * 이 호출은 선택적 — 상위 layer(useMultiTab 등)에서 log listener로 받아 처리해도 OK.
 */
export function dispatchConflictAlert(entry: ConflictLogEntry, lang: 'ko' | 'en' | 'ja' | 'zh' = 'ko'): void {
  if (typeof globalThis.dispatchEvent !== 'function' || typeof globalThis.CustomEvent !== 'function') return;
  const msg = formatAlertMessage(entry, lang);
  try {
    globalThis.dispatchEvent(
      new CustomEvent('noa:alert', {
        detail: {
          tone: 'warn',
          message: msg,
          conflictId: entry.id,
          reason: entry.reason,
        },
      }),
    );
  } catch (err) {
    logger.debug('save-engine:conflict', 'dispatch failed', err);
  }
}

function formatAlertMessage(entry: ConflictLogEntry, lang: 'ko' | 'en' | 'ja' | 'zh'): string {
  const map = {
    ko: '다른 탭에서 동시 편집 감지 — Phase 1.6b에서 해결 예정',
    en: 'Concurrent edit detected in another tab — resolver coming in Phase 1.6b',
    ja: '他のタブで同時編集を検出 — Phase 1.6bで解決予定',
    zh: '检测到其他标签页的并发编辑 — 将在 Phase 1.6b 解决',
  } as const;
  const prefix = map[lang] ?? map.ko;
  return `${prefix} (reason=${entry.reason})`;
}
