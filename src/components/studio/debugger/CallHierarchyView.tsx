"use client";
// ============================================================
// CallHierarchyView — 사건 인과 그래프.
// 단순 list + edge 표시 (force-directed 시각화는 Phase 2).
// ============================================================

import React from 'react';
import { GitMerge, ArrowRight } from 'lucide-react';
import type { CallHierarchy } from '@/lib/story-debugger/types';

export interface CallHierarchyViewProps {
  hierarchy: CallHierarchy;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
}

export const CallHierarchyView: React.FC<CallHierarchyViewProps> = ({ hierarchy, language = 'KO' }) => {
  const isKO = language === 'KO';

  if (hierarchy.nodes.length === 0) {
    return (
      <div className="p-4 text-xs text-text-tertiary text-center">
        {isKO ? '데이터 없음' : 'No data'}
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="text-[10px] text-text-tertiary mb-2 flex items-center gap-2">
        <GitMerge className="w-3 h-3" />
        {hierarchy.nodes.length}{isKO ? '개 사건 · ' : ' events · '}
        {hierarchy.edges.filter((e) => e.kind === 'cause').length}{isKO ? '개 인과' : ' causal'}
      </div>
      <ul className="space-y-1">
        {hierarchy.nodes.map((n, i) => {
          const causeIn = hierarchy.edges.filter(
            (e) => e.toId === n.id && e.kind === 'cause',
          );
          return (
            <li key={n.id} className="flex items-start gap-2 px-2 py-1 rounded hover:bg-bg-tertiary/30">
              <span className="text-[10px] font-mono text-accent-purple mt-0.5">EP{n.episodeId}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary line-clamp-2">{n.label}</p>
                {causeIn.length > 0 && i > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <ArrowRight className="w-2.5 h-2.5 text-accent-amber" />
                    <span className="text-[9px] text-accent-amber">
                      {isKO ? '인과 연결' : 'caused by prev'}
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
