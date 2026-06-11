import { useEffect } from 'react';
import { AppTab } from '@/lib/studio-types';

interface UseStudioKeyboardOptions {
  onTabChange: (tab: AppTab) => void;
  onToggleSearch: () => void;
  onExportTXT: () => void;
  onPrint: () => void;
  onNewSession: () => void;
  onToggleFocus: () => void;
  onToggleShortcuts: () => void;
  /** Ctrl+S — save / trigger manual save */
  onSave?: () => void;
  /** Ctrl+Shift+N — new episode */
  onNewEpisode?: () => void;
  /** Ctrl+/ — toggle assistant panel */
  onToggleAssistant?: () => void;
  /** Escape — close modals */
  onEscape?: () => void;
  /** Ctrl+Z — undo config change */
  onUndo?: () => void;
  /** Ctrl+Shift+Z — redo config change */
  onRedo?: () => void;
  /** Ctrl+K — open global search palette */
  onGlobalSearch?: () => void;
  /** Ctrl+= / Ctrl+- — adjust editor font size */
  onFontSizeUp?: () => void;
  onFontSizeDown?: () => void;
  /** Ctrl+\ — toggle split view (reference/chat right-pane) */
  onToggleSplitView?: () => void;
  /** [Doc 4 dir 01 + Doc 5 — 2026-05-12] Ctrl+Shift+F — Zen 모드 토글.
      sidebar / inspector / topbar / toolbar 페이드아웃 + 본문 폭 강제 + 4 모서리 잔향. */
  onToggleZen?: () => void;
  /** [Doc 5 — 2026-05-12] Ctrl+B — sidebar 토글 (Zen 모드에서 잠시 부름). */
  onToggleSidebar?: () => void;
  /** [Doc 5 — 2026-05-12] Ctrl+J — inspector 토글. */
  onToggleInspector?: () => void;
  /** When true, suppress all shortcuts (e.g. modal is open) */
  disabled?: boolean;
}

/**
 * Register global keyboard shortcuts for Studio.
 * - F1~F8: tab switch (legacy, retained for compatibility)
 * - Ctrl+1~8: tab switch (writer-friendly — keeps hands on home row, avoids Fn+Fx on laptops)
 * - Ctrl combos, Escape — preserved
 * Respects disabled flag for modal states.
 *
 * 작가 친화 매핑 추가 — 4시간 연속 작업에서 펑션키 손목 외전 부담 제거.
 * 노트북 사용자는 보통 Fn+Fx 양손 동작이 필요하지만 Ctrl+숫자는 한 손으로 가능.
 */
export function useStudioKeyboard(opts: UseStudioKeyboardOptions) {
  useEffect(() => {
    // F1~F8 (legacy)
    const tabByFKey: Record<string, AppTab> = {
      F1: 'world', F2: 'characters', F3: 'rulebook', F4: 'writing',
      F5: 'style', F6: 'manuscript', F7: 'history', F8: 'settings',
    };
    // Ctrl+1~8 (writer-friendly, same target tabs)
    const tabByDigitKey: Record<string, AppTab> = {
      '1': 'world', '2': 'characters', '3': 'rulebook', '4': 'writing',
      '5': 'style', '6': 'manuscript', '7': 'history', '8': 'settings',
    };
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // Escape always works (even when disabled) to close modals
      if (e.key === 'Escape' && opts.onEscape) {
        e.preventDefault();
        opts.onEscape();
        return;
      }

      // Skip shortcuts when modal/dialog is active
      if (opts.disabled) return;
      const active = document.activeElement;
      const isInInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT');
      if (isInInput) {
        // Dialog 안의 input — 단축키 전부 차단
        const isInDialog = active.closest('[role="dialog"], [data-modal]');
        if (isInDialog) return;
        // 일반 input에서는 F-key 탭 전환 차단 (F5=새로고침 등 브라우저 기본 동작 보존)
        if (e.key.startsWith('F') && !ctrl && !shift) return;
      }

      // 단축키 사용자 설정 — localStorage ff_shortcuts_disabled=1이면 전체 비활성화
      let shortcutsDisabled = false;
      try {
        shortcutsDisabled = typeof window !== 'undefined' && localStorage.getItem('noa_shortcuts_disabled') === '1';
      } catch { /* quota */ }
      if (shortcutsDisabled) {
        // Save(Ctrl+S), Escape는 항상 작동. 나머지 단축키는 무시.
        if (ctrl && !shift && e.key === 's') { e.preventDefault(); opts.onSave?.(); return; }
        return;
      }

      // Ctrl+S — save
      if (ctrl && !shift && e.key === 's') { e.preventDefault(); opts.onSave?.(); return; }
      // Ctrl+Shift+N — new episode
      if (ctrl && shift && (e.key === 'N' || e.key === 'n')) { e.preventDefault(); opts.onNewEpisode?.(); return; }
      // Ctrl+Shift+Z — redo (must check before Ctrl+Z)
      if (ctrl && shift && (e.key === 'Z' || e.key === 'z')) {
        // Only intercept outside text inputs to avoid breaking native undo/redo
        if (!isInInput) { e.preventDefault(); opts.onRedo?.(); }
        return;
      }
      // Ctrl+Z — undo
      if (ctrl && !shift && e.key === 'z') {
        if (!isInInput) { e.preventDefault(); opts.onUndo?.(); }
        return;
      }
      // Ctrl+K — global search palette
      if (ctrl && e.key === 'k') { e.preventDefault(); opts.onGlobalSearch?.(); return; }
      // Ctrl+= / Ctrl+- — editor font size
      if (ctrl && (e.key === '=' || e.key === '+')) { e.preventDefault(); opts.onFontSizeUp?.(); return; }
      if (ctrl && e.key === '-') { e.preventDefault(); opts.onFontSizeDown?.(); return; }

      if (ctrl && e.key === 'f') { e.preventDefault(); opts.onToggleSearch(); }
      if (ctrl && e.key === 'e') { e.preventDefault(); opts.onExportTXT(); }
      if (ctrl && e.key === 'p') { e.preventDefault(); opts.onPrint(); }
      // Ctrl+N (without shift) — new session
      if (ctrl && !shift && e.key === 'n') { e.preventDefault(); opts.onNewSession(); }
      if (e.key === 'F11') { e.preventDefault(); opts.onToggleFocus(); }
      // [priority 6 — 2026-06-08] F1 표준 + F12 legacy alias 유지.
      // F12 는 브라우저 DevTools 와 충돌하지만 기존 사용자 머슬메모리 보호 차원에서 유지.
      if (e.key === 'F1' || e.key === 'F12') { e.preventDefault(); opts.onToggleShortcuts(); }
      if (ctrl && e.key === '/') {
        e.preventDefault();
        // Ctrl+/ toggles assistant if handler provided, otherwise shortcuts modal
        if (opts.onToggleAssistant) {
          opts.onToggleAssistant();
        } else {
          opts.onToggleShortcuts();
        }
      }
      // Ctrl+\ — toggle split view (reference/chat right-pane)
      if (ctrl && !shift && (e.key === '\\' || e.code === 'Backslash')) {
        e.preventDefault();
        opts.onToggleSplitView?.();
        return;
      }
      // [Doc 4 dir 01 + Doc 5 — 2026-05-12] Ctrl+Shift+F — Zen 모드 토글.
      // 인지 부하 41점 bad 해결. sidebar/inspector/topbar/toolbar fade + 본문 폭 강제.
      if (ctrl && shift && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        opts.onToggleZen?.();
        return;
      }
      // [Doc 5 — 2026-05-12] Ctrl+B — sidebar 토글 (Zen 모드에서 잠시 부름).
      // Ctrl+Shift+B는 다른 단축키와 충돌 가능성 검토. Shift 없이 ctrl+b만.
      if (ctrl && !shift && e.key === 'b' && !isInInput) {
        e.preventDefault();
        opts.onToggleSidebar?.();
        return;
      }
      // [Doc 5 — 2026-05-12] Ctrl+J — inspector 토글.
      if (ctrl && !shift && e.key === 'j' && !isInInput) {
        e.preventDefault();
        opts.onToggleInspector?.();
        return;
      }
      // [풀점검 priority 4 — 2026-06-08] Ctrl+1~8 는 StudioShell 의 useKeyBinding 으로 이관됨.
      // 동일 키 중복 dispatch 회피 — 본 블록은 의도적으로 비활성.
      // (tabByDigitKey 상수는 ACTION_CATALOG shortcut hint 와의 매핑 참조용으로 유지)
      void tabByDigitKey;
      // F1~F8 — legacy, retained
      const targetTab = tabByFKey[e.key];
      if (targetTab) { e.preventDefault(); opts.onTabChange(targetTab); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [opts]);
}
