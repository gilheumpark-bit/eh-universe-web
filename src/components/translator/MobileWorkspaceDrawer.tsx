'use client';

import type { TranslatorBackgroundMode } from '@/lib/translator-constants';

type Tab = 'chapters' | 'context';

type Props = {
  open: boolean;
  onClose: () => void;
  tab: Tab;
  onTab: (t: Tab) => void;
  backgroundMode: TranslatorBackgroundMode;
  childrenChapters: React.ReactNode;
  childrenContext: React.ReactNode;
};

export function MobileWorkspaceDrawer({
  open,
  onClose,
  tab,
  onTab,
  backgroundMode,
  childrenChapters,
  childrenContext,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="워크스페이스 패널">
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-label="닫기" onClick={onClose} />
      <div
        className={`theme-${backgroundMode} absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-hidden rounded-t-3xl border border-white/10 bg-sidebar shadow-2xl flex flex-col`}
      >
        <div className="flex shrink-0 border-b border-white/10 p-2">
          <button
            type="button"
            onClick={() => onTab('chapters')}
            className={`flex-1 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest ${
              tab === 'chapters' ? 'bg-linear-to-r from-amber-800 to-stone-900 text-stone-100 shadow-md shadow-amber-950/20' : 'theme-pill opacity-80'
            }`}
          >
            챕터
          </button>
          <button
            type="button"
            onClick={() => onTab('context')}
            className={`flex-1 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest ${
              tab === 'context' ? 'bg-linear-to-r from-amber-800 to-stone-900 text-stone-100 shadow-md shadow-amber-950/20' : 'theme-pill opacity-80'
            }`}
          >
            맥락 · 로그
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{tab === 'chapters' ? childrenChapters : childrenContext}</div>
      </div>
    </div>
  );
}

export type { Tab };
