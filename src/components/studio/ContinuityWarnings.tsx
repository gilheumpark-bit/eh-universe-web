"use client";

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, X } from 'lucide-react';
import type { ContinuityWarning } from '@/hooks/useContinuityCheck';

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

const ContinuityWarnings: React.FC<ContinuityWarningsProps> = ({ warnings, language }) => {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(true);
  const isKO = language === 'KO';

  const active = warnings.filter(w => !dismissed.has(w.messageKO));
  if (active.length === 0) return null;

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
                {isKO ? w.messageKO : w.messageEN}
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
