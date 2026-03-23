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
}

export function useStudioKeyboard(opts: UseStudioKeyboardOptions) {
  useEffect(() => {
    const tabByFKey: Record<string, AppTab> = {
      F1: 'world', F2: 'critique', F3: 'characters', F4: 'rulebook',
      F5: 'writing', F6: 'style', F7: 'manuscript', F8: 'history', F9: 'settings',
    };
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'f') { e.preventDefault(); opts.onToggleSearch(); }
      if (ctrl && e.key === 'e') { e.preventDefault(); opts.onExportTXT(); }
      if (ctrl && e.key === 'p') { e.preventDefault(); opts.onPrint(); }
      if (ctrl && e.key === 'n') { e.preventDefault(); opts.onNewSession(); }
      if (e.key === 'F11') { e.preventDefault(); opts.onToggleFocus(); }
      if (e.key === 'F12') { e.preventDefault(); opts.onToggleShortcuts(); }
      if (ctrl && e.key === '/') { e.preventDefault(); opts.onToggleShortcuts(); }
      const targetTab = tabByFKey[e.key];
      if (targetTab) { e.preventDefault(); opts.onTabChange(targetTab); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [opts]);
}
