"use client";
// ============================================================
// VariablesView — 캐릭터 상태 인스펙터 (4 차원 패널).
// [후속 A-4 — 2026-05-07] inspector.ts interactive UI 통합 — 변수 입력 + inspect.
// ============================================================

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import type { StoryFrame, BreakpointLocation, InspectionResult } from '@/lib/story-debugger/types';
import { inspectAt } from '@/lib/story-debugger/inspector';
import type { Character, EpisodeManuscript } from '@/lib/studio-types';

export interface VariablesViewProps {
  frame: StoryFrame | null;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
  /** [후속 A-4] inspect 함수 호출용 */
  characters?: Character[];
  episodes?: EpisodeManuscript[];
}

function formatInspectValue(v: InspectionResult['value']): string {
  if (v === undefined) return '—';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.join(', ') || '—';
  if (typeof v === 'object') {
    return Object.entries(v).map(([k, val]) => `${k}: ${val}`).join(' / ');
  }
  return String(v);
}

export const VariablesView: React.FC<VariablesViewProps> = ({
  frame,
  language = 'KO',
  characters,
  episodes,
}) => {
  const isKO = language === 'KO';
  // [후속 A-4] inspect input + 결과
  const [inspectQuery, setInspectQuery] = useState('');
  const [inspectResult, setInspectResult] = useState<InspectionResult | null>(null);

  const handleInspect = () => {
    if (!frame || !inspectQuery.trim() || !episodes) return;
    const loc: BreakpointLocation = {
      episodeId: frame.episodeId,
      paragraphIdx: frame.paragraphIdx,
    };
    const result = inspectAt(loc, inspectQuery.trim(), characters, episodes);
    setInspectResult(result);
  };

  if (!frame) {
    return (
      <div className="p-4 text-xs text-text-tertiary text-center">
        {isKO ? '디버거 시작 후 표시' : 'Start debugger to view'}
      </div>
    );
  }

  return (
    <div className="p-2 space-y-3">
      {/* [후속 A-4] Inspect input */}
      <div className="border-b border-border pb-2">
        <div className="text-[9px] uppercase tracking-wider text-text-tertiary mb-1">
          {isKO ? 'Inspect 변수' : 'Inspect variable'}
        </div>
        <div className="flex items-center gap-1 bg-bg-tertiary/40 rounded px-2 py-1">
          <Search className="w-3 h-3 text-text-tertiary" />
          <input
            type="text"
            value={inspectQuery}
            onChange={(e) => setInspectQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInspect()}
            placeholder={isKO ? 'characters / character:김준 / 김준.emotion' : 'characters / character:Name / Name.emotion'}
            className="flex-1 bg-transparent text-[10px] text-text-primary placeholder-text-tertiary outline-none font-mono"
          />
          <button
            type="button"
            onClick={handleInspect}
            className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-accent-purple/15 text-accent-purple rounded"
          >
            {isKO ? '조회' : 'Eval'}
          </button>
        </div>
        {inspectResult && (
          <div className="mt-1.5 text-[10px] bg-bg-primary/40 rounded p-1.5">
            <span className="text-text-tertiary font-mono">
              {inspectResult.variableName} =
            </span>{' '}
            {inspectResult.found ? (
              <span className="text-accent-purple font-mono">
                {formatInspectValue(inspectResult.value)}
              </span>
            ) : (
              <span className="text-accent-red">{isKO ? '미존재' : 'undefined'}</span>
            )}
          </div>
        )}
      </div>

      {/* Foreshadow seen */}
      <div>
        <div className="text-[9px] uppercase tracking-wider text-text-tertiary mb-1">
          {isKO ? '풀린 떡밥' : 'Foreshadow seen'}
        </div>
        {frame.foreshadowSeen.length === 0 ? (
          <p className="text-[10px] text-text-tertiary">—</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {frame.foreshadowSeen.map((id) => (
              <span key={id} className="px-1.5 py-0.5 text-[10px] bg-accent-amber/15 text-accent-amber rounded font-mono">
                {id}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Characters */}
      <div>
        <div className="text-[9px] uppercase tracking-wider text-text-tertiary mb-1">
          {isKO ? '캐릭터 상태' : 'Character states'}
        </div>
        {frame.characters.length === 0 ? (
          <p className="text-[10px] text-text-tertiary">—</p>
        ) : (
          <ul className="space-y-2">
            {frame.characters.map((c) => (
              <li key={c.characterId} className="bg-bg-tertiary/30 rounded p-2">
                <div className="text-xs font-bold text-text-primary mb-1">{c.characterName}</div>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <div>
                    <span className="text-text-tertiary">{isKO ? '감정' : 'emotion'}: </span>
                    <span className="text-accent-purple">{c.emotion ?? '—'}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary">{isKO ? '소지' : 'inv'}: </span>
                    <span className="text-text-secondary">{(c.inventory ?? []).join(', ') || '—'}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary">{isKO ? '지식' : 'know'}: </span>
                    <span className="text-text-secondary">{(c.knowledge ?? []).join(', ') || '—'}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
