"use client";
// ============================================================
// FormatOnSaveSection — Settings UI for Format on Save.
//
// Phase 1: Settings 토글 + 7 룰 개별 활성/비활성 + "Format Now" 명시 버튼.
// Phase 2 백로그: save 시점 자동 wiring (현재는 명시 트리거만).
//
// "Format Now" 동작: 활성 episode 본문 format → 'noa:manuscript-replace' dispatch.
// (NovelEditor 가 listener 구독 — 연결 #4 와 동일 채널 재활용)
// ============================================================

import React from 'react';
import { Wand2, CheckCircle2, Circle } from 'lucide-react';
import { useFormatOnSave } from '@/hooks/useFormatOnSave';
import { getAllFormatRules, formatText } from '@/lib/format-on-save/rules';
import type { EpisodeManuscript } from '@/lib/studio-types';

export interface FormatOnSaveSectionProps {
  language?: 'KO' | 'EN' | 'JP' | 'CN';
  /** 활성 episode 본문 — Format Now 대상 */
  activeManuscript?: EpisodeManuscript | null;
}

export const FormatOnSaveSection: React.FC<FormatOnSaveSectionProps> = ({
  language = 'KO',
  activeManuscript,
}) => {
  const { settings, setEnabled, toggleRule, setQuoteStyle, applyFormat } = useFormatOnSave();
  const isKO = language === 'KO';
  const allRules = getAllFormatRules();
  const enabledSet = new Set(settings.enabledRules);

  const handleFormatNow = () => {
    if (!activeManuscript || !activeManuscript.content) return;
    const before = activeManuscript.content;
    const after = applyFormat(before);
    if (before === after) {
      // [C] 변경 없음 — alert
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('noa:alert', {
            detail: {
              message: isKO ? '변경할 내용 없음' : 'No changes',
              variant: 'info',
              duration: 2500,
            },
          }),
        );
      }
      return;
    }
    // 본문 교체 — NovelEditor listener 가 받음 (연결 #4 채널 재사용)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('noa:manuscript-replace', { detail: { newText: after } }),
      );
      window.dispatchEvent(
        new CustomEvent('noa:alert', {
          detail: {
            message: isKO ? '✓ 자동 정렬 적용됨' : '✓ Format applied',
            variant: 'info',
            duration: 2500,
          },
        }),
      );
    }
  };

  // 미리보기 — 처음 200자 변환 결과
  const preview = activeManuscript?.content
    ? formatText(activeManuscript.content.slice(0, 200), {
        enabledRules: enabledSet,
        quoteStyle: settings.quoteStyle,
        ellipsisStyle: settings.ellipsisStyle,
      })
    : '';

  return (
    <details className="ds-accordion">
      <summary className="cursor-pointer flex items-center gap-2 px-4 py-3">
        <Wand2 className="w-4 h-4 text-accent-purple" />
        <span className="font-bold">{isKO ? '자동 정렬 (Format)' : 'Format on Save'}</span>
        {settings.enabled && (
          <span className="ml-auto text-[10px] text-accent-green font-mono">ON</span>
        )}
      </summary>
      <div className="px-4 py-3 space-y-3">
        <p className="text-xs text-text-secondary">
          {isKO
            ? '저장 시 자동 적용 (Phase 1: 명시 버튼만, Phase 2: save 자동 wiring 예정)'
            : 'Apply format on save (Phase 1: explicit button only, Phase 2: auto-wire planned)'}
        </p>

        {/* Master toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="accent-accent-purple"
          />
          <span className="text-sm">{isKO ? '자동 정렬 활성' : 'Enable formatter'}</span>
        </label>

        {/* Rule toggles */}
        <fieldset className="space-y-1.5 border-t border-border pt-3">
          <legend className="text-[10px] uppercase tracking-wider text-text-tertiary">
            {isKO ? '룰' : 'Rules'}
          </legend>
          {allRules.map((rule) => {
            const enabled = enabledSet.has(rule.id);
            return (
              <button
                key={rule.id}
                type="button"
                onClick={() => toggleRule(rule.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-tertiary/30 text-left"
                disabled={!settings.enabled}
              >
                {enabled ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-text-tertiary" />
                )}
                <span className="text-xs text-text-secondary flex-1">
                  {isKO ? rule.name.ko : rule.name.en}
                </span>
                <code className="text-[9px] font-mono text-text-tertiary">{rule.id}</code>
              </button>
            );
          })}
        </fieldset>

        {/* Quote style */}
        <div className="border-t border-border pt-3">
          <label className="text-[10px] uppercase tracking-wider text-text-tertiary block mb-1">
            {isKO ? '큰따옴표 스타일' : 'Quote Style'}
          </label>
          <select
            value={settings.quoteStyle ?? 'straight'}
            onChange={(e) => setQuoteStyle(e.target.value === 'curly' ? 'curly' : 'straight')}
            className="text-xs bg-bg-tertiary/50 border border-border rounded px-2 py-1.5"
            disabled={!settings.enabled}
          >
            <option value="straight">{isKO ? '직선 "..."' : 'Straight "..."'}</option>
            <option value="curly">{isKO ? '곡선 "..."' : 'Curly "..."'}</option>
          </select>
        </div>

        {/* Format Now button */}
        <button
          type="button"
          onClick={handleFormatNow}
          disabled={!settings.enabled || !activeManuscript}
          className="w-full flex items-center justify-center gap-2 py-2 bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25 disabled:opacity-40 rounded-md text-xs font-bold uppercase tracking-wider transition-colors"
        >
          <Wand2 className="w-3.5 h-3.5" />
          {isKO ? '지금 정렬 (활성 화)' : 'Format Now (active episode)'}
        </button>

        {/* Preview */}
        {preview && activeManuscript && (
          <div className="border-t border-border pt-3">
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">
              {isKO ? '미리보기 (처음 200자)' : 'Preview (first 200 chars)'}
            </div>
            <pre className="text-[10px] text-text-secondary bg-bg-tertiary/30 p-2 rounded whitespace-pre-wrap font-mono max-h-24 overflow-y-auto">
              {preview}
            </pre>
          </div>
        )}
      </div>
    </details>
  );
};

export default FormatOnSaveSection;
