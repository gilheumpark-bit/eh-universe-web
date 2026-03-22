'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { AppLanguage } from '@/lib/studio-types';
import { detectTypos, type TypoMatch } from '@/lib/typo-detector';

interface TypoPanelProps {
  text: string;
  language: AppLanguage;
  onApplyFix?: (index: number, original: string, suggestion: string) => void;
}

const TYPE_LABEL: Record<TypoMatch['type'], { ko: string; en: string }> = {
  'double-char': { ko: '글자 중복', en: 'Double char' },
  'jamo-slip': { ko: '자모 분리', en: 'Loose jamo' },
  'spacing': { ko: '띄어쓰기', en: 'Spacing' },
  'batchim-swap': { ko: '받침 오타', en: 'Batchim typo' },
};

const TypoPanel: React.FC<TypoPanelProps> = ({ text, language, onApplyFix }) => {
  const [expanded, setExpanded] = useState(false);
  const isKO = language === 'KO';

  const typos = useMemo(() => detectTypos(text), [text]);

  if (typos.length === 0) return null;

  return (
    <div className="mt-3 border border-amber-500/20 bg-amber-900/5 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-[9px] font-black uppercase tracking-widest text-amber-400/80 hover:bg-amber-900/10 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" />
          {isKO ? '오타 감지' : 'Typos detected'}: {typos.length}
        </span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Typo list */}
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
          {typos.map((typo, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-500 text-[8px] font-mono">
                {isKO ? TYPE_LABEL[typo.type].ko : TYPE_LABEL[typo.type].en}
              </span>
              <span className="text-red-400/70 line-through font-mono">{typo.original}</span>
              <span className="text-zinc-600">→</span>
              <span className="text-green-400/80 font-mono">{typo.suggestion}</span>
              {onApplyFix && typo.type !== 'jamo-slip' && (
                <button
                  onClick={() => onApplyFix(typo.index, typo.original, typo.suggestion)}
                  className="ml-auto p-0.5 rounded hover:bg-green-900/20 text-green-500/50 hover:text-green-400 transition-colors"
                  title={isKO ? '수정 적용' : 'Apply fix'}
                >
                  <Check className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TypoPanel;
