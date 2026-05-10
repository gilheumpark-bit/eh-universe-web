"use client";
// ============================================================
// PART 1 — Module Header
// ============================================================
//
// useSessionSnapshot — 세션 스냅샷 자동 복구 + "마지막 작업 카드".
//
// 인체공학 분석 §"세션 간 복구" 본질:
//   하루 10.5시간 분산 작업 시 4시간 연속 후 휴식 → 복귀 시 1~3분 컨텍스트 복구 비용.
//   본 hook 은 이를 5초 이내로 단축.
//
// 복구 항목:
//   - caret 위치 (line / column 추정)
//   - scroll 위치
//   - 활성 탭 / 활성 에피소드 / 활성 캐릭터
//   - 활성 드로어 탭
//   - 평행우주 브랜치
//   - 마지막 NCG/NCT 결과
//
// 트리거:
//   - 5분 무활동 감지 → snapshot 저장
//   - mount 시 마지막 snapshot 자동 복구
//   - "마지막 작업 카드" 30초 floating overlay
//
// [C] localStorage 만 (서버 의존 X) — private mode 안전 fallback
// [G] 5초 throttle — 빈번 저장 회피
// [K] 단일 hook — UI 토스트는 별도 컴포넌트
// ============================================================

import { useEffect, useState, useCallback, useRef } from 'react';

// ============================================================
// PART 2 — Types
// ============================================================

export interface SessionSnapshot {
  /** Unix ms */
  savedAt: number;
  /** 활성 라우트 — '/studio' / '/translation-studio' / etc */
  pathname?: string;
  /** caret 위치 estimate (line, column) */
  caret?: { line: number; column: number };
  /** scroll 위치 */
  scrollY?: number;
  /** 활성 탭 / 에피소드 / 캐릭터 ID */
  activeTab?: string;
  activeEpisodeId?: string;
  activeCharacterId?: string;
  /** 활성 드로어 탭 (Novel IDE Launcher) */
  activeDrawerTab?: string;
  /** 평행우주 활성 브랜치 */
  activeBranch?: string;
  /** 마지막 작업 카드 message */
  lastTask?: string;
  /** 사용자 명시 미래 메모 (Ctrl+Shift+M) */
  futureNote?: string;
}

export interface UseSessionSnapshotResult {
  snapshot: SessionSnapshot | null;
  /** 직전 snapshot (복귀 카드용). null = 첫 진입 또는 없음. */
  lastSnapshot: SessionSnapshot | null;
  saveSnapshot: (patch: Partial<SessionSnapshot>) => void;
  setFutureNote: (note: string) => void;
  /** 복귀 카드 dismiss. */
  dismissCard: () => void;
  /** 복귀 카드 표시 여부 (mount 시 30초 자동 표시). */
  cardVisible: boolean;
}

// ============================================================
// PART 3 — Constants
// ============================================================

const STORAGE_KEY = 'noa_studio_session_snapshot';
const IDLE_THRESHOLD_MS = 5 * 60 * 1000;        // 5분 무활동 시 snapshot
const CARD_DISPLAY_MS = 30 * 1000;               // 30초 floating
const SAVE_THROTTLE_MS = 5 * 1000;               // 저장 5초 throttle

// ============================================================
// PART 4 — Hook
// ============================================================

export function useSessionSnapshot(pathname?: string): UseSessionSnapshotResult {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [lastSnapshot, setLastSnapshot] = useState<SessionSnapshot | null>(null);
  const [cardVisible, setCardVisible] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // mount 시 last snapshot 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SessionSnapshot;
      if (typeof parsed.savedAt !== 'number') return;

      // 30분 이상 지났으면 "복귀 카드" 표시
      const elapsed = Date.now() - parsed.savedAt;
      const isReturnSession = elapsed > 5 * 60 * 1000; // 5분 이상 idle
      // [legitimate read-on-mount] localStorage parse 후 state sync.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastSnapshot(parsed);
       
      setSnapshot(parsed);

      if (isReturnSession && (parsed.pathname === pathname || !parsed.pathname)) {
        setCardVisible(true);
        const t = setTimeout(() => setCardVisible(false), CARD_DISPLAY_MS);
        return () => clearTimeout(t);
      }
    } catch {
      /* private mode / parse fail */
    }
    return undefined;
  }, [pathname]);

  // throttled save
  const saveSnapshot = useCallback(
    (patch: Partial<SessionSnapshot>) => {
      if (typeof window === 'undefined') return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        try {
          const current: SessionSnapshot = {
            savedAt: Date.now(),
            pathname,
            ...(snapshot ?? {}),
            ...patch,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
          setSnapshot(current);
        } catch {
          /* quota */
        }
      }, SAVE_THROTTLE_MS);
    },
    [snapshot, pathname],
  );

  const setFutureNote = useCallback(
    (note: string) => {
      saveSnapshot({ futureNote: note });
    },
    [saveSnapshot],
  );

  const dismissCard = useCallback(() => {
    setCardVisible(false);
  }, []);

  // idle 감지 — 5분 무활동 시 자동 snapshot (caret/scroll 자동 patch)
  // [7 — 2026-05-09] caret/scroll 자동 추출 — 작가가 textarea 안 어디 있었는지 복구.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastActivity = Date.now();
    const idleHandler = () => {
      lastActivity = Date.now();
    };
    window.addEventListener('mousemove', idleHandler, { passive: true });
    window.addEventListener('keydown', idleHandler);
    window.addEventListener('scroll', idleHandler, { passive: true });

    const idleCheck = setInterval(() => {
      const idle = Date.now() - lastActivity;
      if (idle > IDLE_THRESHOLD_MS) {
        // [7] caret + scroll 자동 추출
        const patch: Partial<SessionSnapshot> = {};
        try {
          // 활성 textarea / contentEditable 의 caret 위치
          const activeEl = document.activeElement;
          if (activeEl instanceof HTMLTextAreaElement || activeEl instanceof HTMLInputElement) {
            const text = activeEl.value;
            const pos = activeEl.selectionStart ?? 0;
            // line/column 추정
            const before = text.slice(0, pos);
            const lines = before.split('\n');
            patch.caret = { line: lines.length, column: lines[lines.length - 1]?.length ?? 0 };
          }
          // window scroll
          patch.scrollY = window.scrollY;
        } catch { /* skip */ }
        saveSnapshot(patch);
      }
    }, 60 * 1000);

    return () => {
      window.removeEventListener('mousemove', idleHandler);
      window.removeEventListener('keydown', idleHandler);
      window.removeEventListener('scroll', idleHandler);
      clearInterval(idleCheck);
    };
  }, [saveSnapshot]);

  return {
    snapshot,
    lastSnapshot,
    saveSnapshot,
    setFutureNote,
    dismissCard,
    cardVisible,
  };
}
