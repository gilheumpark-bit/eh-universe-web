// ============================================================
// conflict-detector.ts — 위계 변경 충돌 감지.
//
// 사상: 사용자 알림 (정보 only). 차단 X.
//
// 예: 작가가 처음 "EH = 회사" 했다가 turn 후 "ARCS = 회사" 라 하면 충돌.
//
// CustomEvent 'noa:meta-context-conflict' 발행 — UI 가 alert 표시 (선택).
// ============================================================

import type { MetaSnapshot, MetaConflict } from './types';

export interface ConflictNotification {
  conflicts: MetaConflict[];
  /** 작가 정보용 4언어 메시지 */
  message: { ko: string; en: string };
}

export function detectAndNotify(
  snapshot: MetaSnapshot,
  language: 'KO' | 'EN' | 'JP' | 'CN' = 'KO',
): ConflictNotification | null {
  if (snapshot.conflicts.length === 0) return null;

  const recent = snapshot.conflicts.slice(-3);
  const lines = recent.map((c) => `  ${c.key}: ${c.oldValue} → ${c.newValue}`);

  const message = {
    ko: `[Meta-Context 충돌 감지]\n${lines.join('\n')}\n(정보 — 차단 X. 의도 변경이면 무시)`,
    en: `[Meta-Context conflicts]\n${lines.join('\n')}\n(info only — ignore if intentional)`,
  };

  // 알림 dispatch (정보 only)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('noa:meta-context-conflict', {
        detail: { conflicts: recent, language },
      }),
    );
  }

  return { conflicts: recent, message };
}
