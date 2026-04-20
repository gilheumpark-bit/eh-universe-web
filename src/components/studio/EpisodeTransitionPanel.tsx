'use client';

// ============================================================
// PART 1 — Imports & Types
// ============================================================
//
// EpisodeTransitionPanel — 이전 화 연결 제안 패널.
// 작가 확인 후에만 적용 — 자동 주입 절대 금지(M3 원칙 #4).
//
// UI:
//   - 헤더 배지 "이전 화 연결 제안 N건"
//   - 리스트: 제안별 reason / 미리보기 / [적용] [무시]
//   - 일괄 무시 버튼
//
// [C] 빈 제안 시 렌더 안 함, suggestion 없는 onApply 방어
// [G] map 키 안정적, 클래스명 메모이즈 불필요
// [K] 패널은 표시만 — 제안 빌드는 hook 책임

import React, { useState } from 'react';
import { ArrowRight, X, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { L4 } from '@/lib/i18n';
import type { AppLanguage, SceneDirectionData } from '@/lib/studio-types';
import type { TransitionSuggestion } from '@/hooks/useEpisodeTransition';

interface EpisodeTransitionPanelProps {
  language: AppLanguage;
  suggestions: TransitionSuggestion[];
  onApply: (suggestion: TransitionSuggestion) => void;
  onDismiss: (suggestionId: string) => void;
  onDismissAll?: () => void;
}

// ============================================================
// PART 2 — Component
// ============================================================

export function EpisodeTransitionPanel({
  language,
  suggestions,
  onApply,
  onDismiss,
  onDismissAll,
}: EpisodeTransitionPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (suggestions.length === 0) return null;

  // ============================================================
  // PART 3 — Render
  // ============================================================

  return (
    <section
      aria-label={L4(language, {
        ko: '이전 화 연결 제안',
        en: 'Episode transition suggestions',
        ja: '前話連結提案',
        zh: '前集衔接建议',
      })}
      className="rounded-xl border border-accent-blue/30 bg-accent-blue/5 mb-4"
    >
      {/* 헤더 */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        className="flex items-center gap-2 w-full p-3 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded-xl"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-accent-blue shrink-0" aria-hidden="true" />
        ) : (
          <ChevronRight className="w-4 h-4 text-accent-blue shrink-0" aria-hidden="true" />
        )}
        <span className="text-xs font-bold text-accent-blue flex-1 text-left flex items-center gap-2">
          <span aria-hidden="true">🔗</span>
          {L4(language, {
            ko: `이전 화 연결 제안 ${suggestions.length}건`,
            en: `Previous episode transition: ${suggestions.length}`,
            ja: `前話連結提案 ${suggestions.length}件`,
            zh: `前集衔接建议 ${suggestions.length} 条`,
          })}
        </span>
        {onDismissAll && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onDismissAll(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                e.preventDefault();
                onDismissAll();
              }
            }}
            aria-label={L4(language, {
              ko: '모두 무시',
              en: 'Dismiss all',
              ja: 'すべて無視',
              zh: '全部忽略',
            })}
            className="text-[10px] font-mono text-text-tertiary hover:text-text-primary px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue cursor-pointer"
          >
            {L4(language, { ko: '모두 무시', en: 'Dismiss all', ja: 'すべて無視', zh: '全部忽略' })}
          </span>
        )}
      </button>

      {/* 리스트 */}
      {expanded && (
        <ul className="px-3 pb-3 space-y-2">
          {suggestions.map(s => (
            <li
              key={s.id}
              className="flex items-start gap-2 p-2 rounded-lg bg-bg-primary border border-border"
            >
              <div className="flex items-center gap-1 text-[9px] font-mono text-accent-blue shrink-0 mt-1">
                <span>EP{s.fromEpisode}</span>
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
                <span>EP{s.toEpisode}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary font-medium">
                  {L4(language, s.reasonText)}
                </p>
                <p className="text-[10px] text-text-tertiary mt-0.5 truncate">
                  {describeFieldChange(s, language)}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onApply(s)}
                  aria-label={L4(language, {
                    ko: `${L4(language, s.reasonText)} 적용`,
                    en: `Apply ${L4(language, s.reasonText)}`,
                    ja: `${L4(language, s.reasonText)}を適用`,
                    zh: `应用 ${L4(language, s.reasonText)}`,
                  })}
                  className="inline-flex items-center gap-1 px-2 py-1 min-h-[32px] rounded-lg bg-accent-purple text-white text-[10px] font-bold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                >
                  <Check className="w-3 h-3" aria-hidden="true" />
                  {L4(language, { ko: '적용', en: 'Apply', ja: '適用', zh: '应用' })}
                </button>
                <button
                  type="button"
                  onClick={() => onDismiss(s.id)}
                  aria-label={L4(language, {
                    ko: `${L4(language, s.reasonText)} 무시`,
                    en: `Dismiss ${L4(language, s.reasonText)}`,
                    ja: `${L4(language, s.reasonText)}を無視`,
                    zh: `忽略 ${L4(language, s.reasonText)}`,
                  })}
                  className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-text-tertiary hover:text-accent-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ============================================================
// PART 4 — Helpers
// ============================================================

function describeFieldChange(s: TransitionSuggestion, language: AppLanguage): string {
  const fieldLabel: Record<string, { ko: string; en: string; ja: string; zh: string }> = {
    hooks: { ko: '훅', en: 'Hook', ja: 'フック', zh: '钩子' },
    foreshadows: { ko: '복선', en: 'Foreshadow', ja: '伏線', zh: '伏笔' },
    tensionCurve: { ko: '긴장 곡선', en: 'Tension curve', ja: 'テンション曲線', zh: '紧张曲线' },
  };
  const label = fieldLabel[s.field as string]
    ? L4(language, fieldLabel[s.field as string])
    : (s.field as string);

  const previewText = previewValue(s.suggestedValue);
  return `${label} · ${previewText}`;
}

function previewValue(v: unknown): string {
  if (Array.isArray(v)) {
    const last = v[v.length - 1];
    if (last && typeof last === 'object') {
      const desc = (last as { desc?: string; planted?: string; label?: string }).desc
        ?? (last as { planted?: string }).planted
        ?? (last as { label?: string }).label
        ?? '';
      return String(desc).slice(0, 40);
    }
  }
  if (typeof v === 'object' && v !== null) {
    const desc = (v as { desc?: string }).desc ?? '';
    return String(desc).slice(0, 40);
  }
  return String(v).slice(0, 40);
}

// helper for SceneSheet integration: merge suggestion result into existing direction
export function applyTransitionToDirection(
  current: SceneDirectionData,
  suggestionResult: Partial<SceneDirectionData> | null
): SceneDirectionData {
  if (!suggestionResult) return current;
  return { ...current, ...suggestionResult };
}

export default EpisodeTransitionPanel;

// IDENTITY_SEAL: EpisodeTransitionPanel | role=transition panel UI | inputs=props | outputs=JSX
