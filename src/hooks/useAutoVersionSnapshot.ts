"use client";

// ============================================================
// useAutoVersionSnapshot — 300자+ 누적 변경 시 IndexedDB 자동 스냅샷
// ============================================================
// README.ko.md "버전 히스토리 — 300자+ 변경 시 자동 스냅샷, LCS 기반 diff 뷰"
// 약속의 실제 구현 (2026-04-25).
//
// 이전 상태: saveVersionedBackup() 함수만 있고 자동 트리거 0 — 사용자가 모름.
// 이후 상태: 누적 char delta 추적 → 300+ 누적 시 자동 saveVersionedBackup 호출.
//
// 안전 장치:
//   - cooldown 5분 (debounce) — 매 키보드 입력마다 IndexedDB 쓰기 금지
//   - 마지막 스냅샷 char count 기준 누적 비교 — 글 삭제도 스냅샷 트리거 (실수 복구 가능)
//   - SSR-safe — typeof window check
// ============================================================

import { useEffect, useMemo, useRef } from 'react';
import { saveVersionedBackup } from '@/lib/indexeddb-backup';
import type { Project } from '@/lib/studio-types';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Options + 상수
// ============================================================

export interface UseAutoVersionSnapshotOptions {
  /** 모든 프로젝트 — saveVersionedBackup 에 그대로 전달 */
  projects: Project[];
  /** 토글 (Settings → 백업 섹션에서 user-controlled, 기본 ON) */
  enabled?: boolean;
  /** char delta 임계 (기본 300자) */
  charDelta?: number;
  /** cooldown ms — 자동 스냅샷 간 최소 간격 (기본 5분) */
  cooldownMs?: number;
}

const DEFAULT_CHAR_DELTA = 300;
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000; // 5분

// ============================================================
// PART 2 — Total char counter
// ============================================================

function countTotalChars(projects: Project[]): number {
  let total = 0;
  for (const p of projects) {
    for (const s of p.sessions ?? []) {
      // [C] config.manuscripts content 우선 — 작가가 실제 쓴 본문
      const manuscripts = s.config?.manuscripts ?? [];
      for (const m of manuscripts) {
        if (typeof m.content === 'string') total += m.content.length;
      }
      // 메시지 본문 (AI/유저 대화) 도 카운트 — 대화 길이도 변경 신호
      for (const msg of s.messages ?? []) {
        if (typeof msg.content === 'string') total += msg.content.length;
      }
    }
  }
  return total;
}

// ============================================================
// PART 3 — Hook
// ============================================================

/**
 * 누적 char delta 300+ 도달 시 saveVersionedBackup 자동 호출.
 *
 * 작가 워크플로우:
 *  - 글 100자 추가 → 누적 100, no snapshot
 *  - 글 200자 추가 → 누적 300, **snapshot 1** (5분 cooldown 시작)
 *  - 글 50자 추가 → 누적 350, no snapshot (cooldown)
 *  - 5분 후 글 250자 추가 → 누적 600, **snapshot 2**
 *
 * [C] cooldown 으로 IndexedDB 쓰기 폭주 방지 (max 12 snapshots/hour 상한)
 * [G] useMemo countTotalChars — projects 동일 reference 시 재계산 skip
 */
export function useAutoVersionSnapshot(opts: UseAutoVersionSnapshotOptions): {
  /** 마지막 자동 스냅샷 시각 (ms epoch) — UI 표시용 */
  lastSnapshotAt: number | null;
} {
  const enabled = opts.enabled ?? true;
  const charDelta = opts.charDelta ?? DEFAULT_CHAR_DELTA;
  const cooldownMs = opts.cooldownMs ?? DEFAULT_COOLDOWN_MS;

  const lastSnapshotCharsRef = useRef<number | null>(null);
  const lastSnapshotTimeRef = useRef<number | null>(null);

  const totalChars = useMemo(() => countTotalChars(opts.projects), [opts.projects]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    // 첫 마운트: 기준점 설정만, 스냅샷 X
    if (lastSnapshotCharsRef.current === null) {
      lastSnapshotCharsRef.current = totalChars;
      return;
    }
    const delta = Math.abs(totalChars - lastSnapshotCharsRef.current);
    const now = Date.now();
    const sinceLast = lastSnapshotTimeRef.current ? now - lastSnapshotTimeRef.current : Infinity;

    if (delta >= charDelta && sinceLast >= cooldownMs) {
      saveVersionedBackup(opts.projects)
        .then((ok) => {
          if (ok) {
            lastSnapshotCharsRef.current = totalChars;
            lastSnapshotTimeRef.current = now;
            try {
              window.dispatchEvent(
                new CustomEvent('noa:version-snapshot-saved', {
                  detail: { timestamp: now, totalChars, delta },
                }),
              );
            } catch { /* noop */ }
          }
        })
        .catch((err) => {
          logger.warn('useAutoVersionSnapshot', 'saveVersionedBackup threw', err);
        });
    }
  }, [enabled, totalChars, charDelta, cooldownMs, opts.projects]);

  return {
    lastSnapshotAt: lastSnapshotTimeRef.current,
  };
}

// IDENTITY_SEAL: useAutoVersionSnapshot | role=300-char-auto-backup | inputs=projects+enabled | outputs=lastSnapshotAt
