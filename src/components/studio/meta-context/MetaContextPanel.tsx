"use client";
// ============================================================
// MetaContextPanel — 위계·범위·카테고리 누적 + 충돌 list.
// ============================================================

import React, { useEffect, useState } from 'react';
import { GitBranch, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { getSnapshot, clearMetaContext } from '@/lib/meta-context/store';
import type { MetaSnapshot, MetaConflict } from '@/lib/meta-context/types';

const KIND_LABEL_KO: Record<string, string> = {
  company: '회사',
  product: '제품',
  tech: '내부 기술',
  category: '카테고리',
  numeric: '수치',
  date: '날짜',
  hierarchy: '위계',
  rejection: '폐기',
};

export interface MetaContextPanelProps {
  language?: 'KO' | 'EN' | 'JP' | 'CN';
}

export const MetaContextPanel: React.FC<MetaContextPanelProps> = ({ language = 'KO' }) => {
  const [snapshot, setSnapshot] = useState<MetaSnapshot | null>(null);
  const isKO = language === 'KO';

  const refresh = () => setSnapshot(getSnapshot());

  useEffect(() => {
    // [legitimate fetch-on-mount] meta-context snapshot 초기 read + event listener.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    if (typeof window === 'undefined') return;
    const onUpdate = () => refresh();
    window.addEventListener('noa:meta-context-conflict', onUpdate);
    return () => window.removeEventListener('noa:meta-context-conflict', onUpdate);
  }, []);

  const totalDefs = snapshot ? Object.keys(snapshot.current).length : 0;
  const conflicts = snapshot?.conflicts ?? [];

  return (
    <section className="bg-bg-secondary border border-border rounded-xl overflow-hidden flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-tertiary/30">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-accent-purple" />
          <h3 className="text-sm font-bold text-text-primary">
            {isKO ? 'Meta-Context 누적 (L4)' : 'Meta-Context (L4)'}
          </h3>
          <span className="text-[10px] text-text-tertiary font-mono">{totalDefs}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={refresh}
            className="p-2 rounded-md bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25"
            aria-label={isKO ? '새로고침' : 'Refresh'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(isKO ? '모든 누적 정의 삭제?' : 'Clear all definitions?')) {
                clearMetaContext();
                refresh();
              }
            }}
            className="p-2 rounded-md text-text-tertiary hover:text-accent-red hover:bg-accent-red/10"
            aria-label={isKO ? '초기화' : 'Clear'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto max-h-[60vh]">
        {!snapshot || totalDefs === 0 ? (
          <div className="p-6 text-center text-xs text-text-tertiary">
            {isKO
              ? '누적 정의 없음. 채팅에서 "X 는 회사" / "X = Y" 형식 입력 시 자동 추출.'
              : 'No definitions yet. Auto-extracted from chat patterns "X is company" / "X = Y".'}
          </div>
        ) : (
          <>
            {conflicts.length > 0 && <ConflictsBlock conflicts={conflicts} isKO={isKO} />}
            <DefinitionsBlock current={snapshot.current} isKO={isKO} />
          </>
        )}
      </div>

      <footer className="px-4 py-2 border-t border-border text-[10px] text-text-tertiary text-center">
        {isKO ? '정보 only — 차단 X' : 'info only — no blocking'}
      </footer>
    </section>
  );
};

function ConflictsBlock({ conflicts, isKO }: { conflicts: MetaConflict[]; isKO: boolean }) {
  return (
    <div className="px-4 py-3 border-b border-border bg-accent-amber/5">
      <div className="text-[10px] uppercase tracking-wider text-accent-amber mb-2 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        {isKO ? '충돌 감지' : 'Conflicts'}
      </div>
      <ul className="space-y-1">
        {conflicts.slice(-5).map((c, i) => (
          <li key={i} className="text-xs">
            <code className="text-accent-purple font-mono">{c.key}</code>:{' '}
            <span className="text-text-tertiary line-through">{c.oldValue}</span>{' → '}
            <span className="text-accent-amber">{c.newValue}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DefinitionsBlock({
  current,
  isKO,
}: {
  current: MetaSnapshot['current'];
  isKO: boolean;
}) {
  // kind 별 그룹
  const grouped: Record<string, Array<{ key: string; value: string; scope?: string }>> = {};
  for (const [k, def] of Object.entries(current)) {
    const label = KIND_LABEL_KO[def.kind] ?? def.kind;
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push({ key: def.key, value: def.value, scope: def.scope });
  }

  return (
    <div className="p-2 space-y-3">
      {Object.entries(grouped).map(([label, items]) => (
        <div key={label}>
          <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1 px-2">
            {label}
          </div>
          <ul className="space-y-0.5">
            {items.map((it, i) => (
              <li key={i} className="px-2 py-1 rounded hover:bg-bg-tertiary/30 text-xs">
                <code className="text-accent-purple font-mono">{it.key}</code>
                <span className="text-text-tertiary"> = </span>
                <span className="text-text-secondary">{it.value}</span>
                {it.scope && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-tertiary">
                    {it.scope}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default MetaContextPanel;
