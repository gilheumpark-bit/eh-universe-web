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
  /** When true, suppress all shortcuts (e.g. modal is open) */
  disabled?: boolean;
}

/** Register global keyboard shortcuts for Studio (F1-F8 tabs, Ctrl combos, Escape). Respects disabled flag for modal states. */
export function useStudioKeyboard(opts: UseStudioKeyboardOptions) {
  useEffect(() => {
    const tabByFKey: Record<string, AppTab> = {
      F1: 'world', F2: 'characters', F3: 'rulebook', F4: 'writing',
      F5: 'style', F6: 'manuscript', F7: 'history', F8: 'settings',
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
      if (e.key === 'F12') { e.preventDefault(); opts.onToggleShortcuts(); }
      if (ctrl && e.key === '/') {
        e.preventDefault();
        // Ctrl+/ toggles assistant if handler provided, otherwise shortcuts modal
        if (opts.onToggleAssistant) {
          opts.onToggleAssistant();
        } else {
          opts.onToggleShortcuts();
        }
      }
      const targetTab = tabByFKey[e.key];
      if (targetTab) { e.preventDefault(); opts.onTabChange(targetTab); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [opts]);
}
