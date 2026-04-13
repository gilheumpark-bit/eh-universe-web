"use client";

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, X } from 'lucide-react';
import type { ContinuityWarning } from '@/hooks/useContinuityCheck';
import { L4 } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/studio-types';

// ============================================================
// PART 1 — 타입
// ============================================================

interface ContinuityWarningsProps {
  warnings: ContinuityWarning[];
  language: string;
}

// ============================================================
// PART 2 — 메인 컴포넌트
// ============================================================

/** Wrap character/location names in the message with clickable spans that trigger Ctrl+K search */
function linkifyWarningText(text: string, onClick: (term: string) => void): React.ReactNode {
  // Match quoted names or capitalized Korean names (2-5 chars surrounded by quotes or brackets)
  const parts = text.split(/(["'「『][^"'」』]+["'」』]|\[[^\]]+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^["'「『\[](.+)["'」』\]]$/);
    if (match) {
      return (
        <button key={i} type="button" onClick={() => onClick(match[1])}
          className="underline underline-offset-2 decoration-dotted cursor-pointer hover:text-text-primary transition-colors">
          {part}
        </button>
      );
    }
    return part;
  });
}

const ContinuityWarnings: React.FC<ContinuityWarningsProps> = ({ warnings, language }) => {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(true);
  const isKO = language === 'KO';

  const active = warnings.filter(w => !dismissed.has(w.messageKO));
  if (active.length === 0) return (
    <div className="flex items-center gap-2 px-4 py-2.5 border border-accent-green/20 rounded-xl bg-accent-green/5">
      <CheckCircle2 className="w-3.5 h-3.5 text-accent-green shrink-0" />
      <span className="text-[10px] text-accent-green">
        {L4(language as AppLanguage, { ko: '연속성 문제가 발견되지 않았습니다', en: 'No continuity issues found' })}
      </span>
    </div>
  );

  const errorCount = active.filter(w => w.severity === 'error').length;
  const warnCount = active.filter(w => w.severity === 'warning').length;

  return (
    <div className="border border-accent-amber/30 rounded-xl bg-accent-amber/5 overflow-hidden">
      {/* 헤더 */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-accent-amber/10 transition-colors"
      >
        <AlertTriangle className="w-4 h-4 text-accent-amber shrink-0" />
        <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-accent-amber">
          {isKO ? '연속성 검사' : 'Continuity Check'}
        </span>

        <div className="flex items-center gap-1.5 ml-auto">
          {errorCount > 0 && (
            <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-accent-red/10 text-accent-red">
              {errorCount} {isKO ? '오류' : 'err'}
            </span>
          )}
          {warnCount > 0 && (
            <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-accent-amber/10 text-accent-amber">
              {warnCount} {isKO ? '경고' : 'warn'}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-text-tertiary transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </div>
      </button>

      {/* 경고 목록 */}
      {!collapsed && (
        <div className="border-t border-accent-amber/20 px-3 py-2 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
          {active.map((w, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 px-3 py-2 rounded-lg text-[11px] ${
                w.severity === 'error'
                  ? 'bg-accent-red/5 border border-accent-red/20 text-accent-red'
                  : w.severity === 'warning'
                  ? 'bg-accent-amber/5 border border-accent-amber/15 text-accent-amber'
                  : 'bg-bg-secondary text-text-secondary'
              }`}
            >
              <span className="shrink-0 mt-0.5">
                {w.severity === 'error' ? '●' : w.severity === 'warning' ? '▲' : 'ℹ'}
              </span>
              <span className="flex-1 leading-relaxed">
                {linkifyWarningText(isKO ? w.messageKO : w.messageEN, (term) => {
                  window.dispatchEvent(new CustomEvent('studio:global-search', { detail: { query: term } }));
                })}
              </span>
              <button
                onClick={() => setDismissed(prev => new Set([...prev, w.messageKO]))}
                className="shrink-0 p-0.5 rounded hover:bg-bg-tertiary transition-colors"
                title={isKO ? '숨기기' : 'Dismiss'}
              >
                <X className="w-3 h-3 text-text-tertiary" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContinuityWarnings;
