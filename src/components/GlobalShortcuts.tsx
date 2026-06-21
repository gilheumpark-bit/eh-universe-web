"use client";

/**
 * GlobalShortcuts — 글로벌 단축키 등록 (2026-06-07 / rank 15)
 *
 * RootLayout 최상위에 마운트되어 어디서나 작동하는 전역 단축키만 담당.
 * 영역별 단축키는 각 Shell 의 useKeyboardManager 가 등록한다 (area 가드).
 *
 * 등록 단축키:
 *   - Ctrl+/ (Win) / Cmd+/ (Mac) → 단축키 도움말
 *
 * Removed public surfaces such as Codex no longer get global route shortcuts.
 */

import { useKeyBinding } from "@/lib/keyboard/keyboard-manager";

export default function GlobalShortcuts() {
  // [P20 루프2 — 2026-06-08] Cmd+? / Ctrl+? — 단축키 도움말 모달.
  // 영역별 단축키 발견성 강화. 본 컴포넌트는 이벤트만 발화; 실제 모달은
  // 영역별 Shell 이 listen 하거나 globally mounted KeyboardShortcutsHelpModal 이 처리.
  useKeyBinding({
    id: "global-shortcuts-help",
    keys: "ctrl+/",
    area: "global",
    handler: () => {
      try {
        window.dispatchEvent(new CustomEvent("noa:open-shortcuts-help"));
      } catch {
        // SSR 가드 — keyboard-manager 가 이미 window 가드하지만 이중 안전.
      }
    },
    description: "Keyboard shortcuts help",
  });

  return null;
}
