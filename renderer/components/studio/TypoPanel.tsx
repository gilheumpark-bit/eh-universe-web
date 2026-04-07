'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { AppLanguage } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import { detectTypos, type TypoMatch } from '@/lib/typo-detector';

interface TypoPanelProps {
  text: string;
  language: AppLanguage;
  onApplyFix?: (index: number, original: string, suggestion: string) => void;
}

const TYPE_LABEL: Record<TypoMatch['type'], Record<AppLanguage, string>> = {
  'double-char': { KO: '글자 중복', EN: 'Double char', JP: '文字重複', CN: '字符重复' },
  'jamo-slip': { KO: '자모 분리', EN: 'Loose jamo', JP: '字母分離', CN: '字母分离' },
  'spacing': { KO: '띄어쓰기', EN: 'Spacing', JP: 'スペース', CN: '间距' },
  'batchim-swap': { KO: '받침 오타', EN: 'Batchim typo', JP: '終声誤字', CN: '韵尾错误' },
};

const TypoPanel: React.FC<TypoPanelProps> = ({ text, language, onApplyFix }) => {
  const [expanded, setExpanded] = useState(false);
  const t = createT(language);

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
          {t('typoPanel.detected')}: {typos.length}
        </span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Typo list */}
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
          {typos.map((typo, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-tertiary text-[10px] font-mono">
                {TYPE_LABEL[typo.type][language]}
              </span>
              <span className="text-red-400/70 line-through font-mono">{typo.original}</span>
              <span className="text-text-tertiary">→</span>
              <span className="text-green-400/80 font-mono">{typo.suggestion}</span>
              {onApplyFix && typo.type !== 'jamo-slip' && (
                <button
                  onClick={() => onApplyFix(typo.index, typo.original, typo.suggestion)}
                  className="ml-auto p-0.5 rounded hover:bg-green-900/20 text-green-500/50 hover:text-green-400 transition-colors"
                  title={t('typoPanel.applyFix')}
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
