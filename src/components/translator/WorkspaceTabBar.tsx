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
      <div className="mx-auto flex max-w-[1800px] flex-wrap gap-1.5 sm:gap-2">
        {WORKSPACE_TABS.map((t) => {
          const isOn = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`rounded-2xl px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] transition-all sm:px-5 sm:py-3 sm:text-xs ${
                isOn
                  ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                  : 'theme-pill text-slate-600 hover:brightness-105 dark:text-slate-300'
              }`}
              aria-current={isOn ? 'page' : undefined}
            >
              {langKo ? t.ko : t.en}
            </button>
          );
        })}
      </div>
      <p className="mx-auto mt-2 max-w-[1800px] px-1 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
        {langKo
          ? '전문 번역(EH Translator) 전용 탭입니다. 소설 스튜디오(NO) 안의 원고 번역과는 별도입니다.'
          : 'EH Translator workspace tabs — separate from NOA Studio manuscript translation.'}
      </p>
    </nav>
  );
}
