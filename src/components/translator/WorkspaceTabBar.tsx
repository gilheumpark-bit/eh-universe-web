'use client';

import type { WorkspaceTab } from '@/lib/translator-constants';
import { WORKSPACE_TABS } from '@/lib/translator-constants';

type Props = {
  active: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
  langKo: boolean;
};

export function WorkspaceTabBar({ active, onChange, langKo }: Props) {
  return (
    <nav
      className="shrink-0 border-b border-slate-900/10 bg-white/40 px-3 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/40"
      aria-label={langKo ? '작업 영역' : 'Workspace'}
    >
      <div className="mx-auto flex max-w-[1800px] flex-nowrap overflow-x-auto scrollbar-hide gap-2 sm:gap-3 px-1 snap-x pb-1">
        {WORKSPACE_TABS.map((t) => {
          const isOn = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`snap-start shrink-0 rounded-2xl px-5 py-3 text-[11px] md:text-xs font-bold uppercase tracking-[0.08em] transition-all duration-300 ${
                isOn
                  ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-500/50'
                  : 'theme-pill text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
              }`}
              aria-current={isOn ? 'page' : undefined}
            >
              {langKo ? t.ko : t.en}
            </button>
          );
        })}
      </div>
      <p className="mx-auto mt-3 max-w-[1800px] px-2 text-[10px] leading-relaxed text-slate-500/80 dark:text-slate-400/80">
        {langKo
          ? '전문 번역(EH Translator) 전용 탭입니다. 소설 스튜디오(NO) 안의 원고 번역과는 별도입니다.'
          : 'EH Translator workspace tabs — separate from NOA Studio manuscript translation.'}
      </p>
    </nav>
  );
}
