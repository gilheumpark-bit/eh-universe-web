'use client';

import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, GitCompare, Copy, Check, RotateCcw } from 'lucide-react';
import { AppLanguage } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';

interface VersionDiffProps {
  versions: string[];
  currentIndex: number;
  language: AppLanguage;
  onSwitch: (index: number) => void;
  onRestore?: (index: number) => void;
}

// ============================================================
// PART 1 — Simple line-level diff
// ============================================================

interface DiffLine {
  type: 'same' | 'add' | 'remove';
  text: string;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  // LCS-based diff (O(n*m) but versions are short)
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  let i = m, j = n;
  const stack: DiffLine[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      stack.push({ type: 'same', text: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'add', text: newLines[j - 1] });
      j--;
    } else {
      stack.push({ type: 'remove', text: oldLines[i - 1] });
      i--;
    }
  }
  stack.reverse();
  return stack;
}

// ============================================================
// PART 2 — Word Count Helpers
// ============================================================

function countWords(text: string): number {
  if (!text) return 0;
  // Korean/CJK: count characters; English/Latin: count whitespace-delimited tokens
  const cjk = text.match(/[\u3000-\u9fff\uac00-\ud7af]/g);
  const latin = text.replace(/[\u3000-\u9fff\uac00-\ud7af]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return (cjk?.length ?? 0) + latin.length;
}

function getChangeMagnitudeColor(pct: number): string {
  if (pct < 10) return 'text-green-400';
  if (pct < 30) return 'text-amber-400';
  return 'text-accent-red';
}

function getChangeSummary(pct: number, delta: number, lang: AppLanguage): string {
  if (pct < 5) return L4(lang, { ko: '거의 같습니다', en: 'Nearly identical', ja: 'Nearly identical', zh: 'Nearly identical' });
  if (pct < 20) {
    const n = Math.max(1, Math.abs(delta));
    return L4(lang, { ko: `${n}단어가 수정되었습니다`, en: `${n} words changed`, ja: `${n}語が編集されました`, zh: `已编辑${n}个词` });
  }
  if (pct < 50) return L4(lang, { ko: '상당 부분이 바뀌었습니다', en: 'Significant changes', ja: 'Significant changes', zh: 'Significant changes' });
  return L4(lang, { ko: '대폭 변경되었습니다', en: 'Major rewrite', ja: 'Major rewrite', zh: 'Major rewrite' });
}

// ============================================================
// PART 3 — Component
// ============================================================

const VersionDiffImpl: React.FC<VersionDiffProps> = ({ versions, currentIndex, language, onSwitch, onRestore }) => {
  const [showDiff, setShowDiff] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<number | null>(null);
  const t = createT(language);
  const total = versions.length;

  const handleRestore = useCallback((idx: number) => {
    if (confirmRestore === idx) {
      onRestore?.(idx);
      setConfirmRestore(null);
    } else {
      setConfirmRestore(idx);
      setTimeout(() => setConfirmRestore(null), 3000);
    }
  }, [confirmRestore, onRestore]);

  if (total <= 1) return null;

  const canPrev = currentIndex > 0;
  const canNext = currentIndex < total - 1;

  const handleCopy = () => {
    navigator.clipboard.writeText(versions[currentIndex]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Word count delta for current vs previous
  const currentWords = countWords(versions[currentIndex]);
  const prevWords = currentIndex > 0 ? countWords(versions[currentIndex - 1]) : currentWords;
  const wordDelta = currentWords - prevWords;
  const changePct = prevWords > 0 ? Math.abs(wordDelta / prevWords) * 100 : 0;
  const magnitudeColor = getChangeMagnitudeColor(changePct);

  return (
    <div className="mt-2">
      {/* Version switcher bar */}
      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest">
        <button
          onClick={() => canPrev && onSwitch(currentIndex - 1)}
          disabled={!canPrev}
          aria-label="이전 버전"
          className="p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-secondary disabled:opacity-40 transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
        <span className="text-text-tertiary tabular-nums">
          v{currentIndex + 1}/{total}
        </span>
        <button
          onClick={() => canNext && onSwitch(currentIndex + 1)}
          disabled={!canNext}
          aria-label="다음 버전"
          className="p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-secondary disabled:opacity-40 transition-colors"
        >
          <ChevronRight className="w-3 h-3" />
        </button>

        {total >= 2 && (
          <button
            onClick={() => setShowDiff(!showDiff)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md border transition-colors ${
              showDiff
                ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
                : 'border-border text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <GitCompare className="w-2.5 h-2.5" />
            {t('versionDiff.diff')}
          </button>
        )}

        <button
          onClick={handleCopy}
          aria-label="버전 복사"
          className="p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-secondary transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        </button>

        {/* Word count change indicator */}
        {currentIndex > 0 && (
          <span className={`font-mono text-[9px] tabular-nums ${magnitudeColor}`}>
            {wordDelta >= 0 ? '+' : ''}{wordDelta} {language === 'KO' ? '단어' : 'words'}
            <span className="text-text-tertiary ml-1">({Math.round(changePct)}%)</span>
            <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-bg-secondary text-text-tertiary text-[8px] font-normal">
              {getChangeSummary(changePct, wordDelta, language)}
            </span>
          </span>
        )}

        {/* Restore button */}
        {onRestore && currentIndex < total - 1 && (
          <button
            onClick={() => handleRestore(currentIndex)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md border transition-colors ${
              confirmRestore === currentIndex
                ? 'bg-accent-red/15 border-accent-red/30 text-accent-red'
                : 'border-border text-text-tertiary hover:text-text-secondary'
            }`}
            title={language === 'KO' ? '이 버전으로 복원' : 'Restore this version'}
          >
            <RotateCcw className="w-2.5 h-2.5" />
            {confirmRestore === currentIndex
              ? (language === 'KO' ? '확인' : 'Confirm')
              : (language === 'KO' ? '복원' : 'Restore')
            }
          </button>
        )}
      </div>

      {/* Diff view */}
      {showDiff && currentIndex > 0 && (
        <div className="mt-2 p-3 bg-bg-primary border border-border rounded-lg text-[11px] font-mono leading-relaxed max-h-48 sm:max-h-60 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] text-text-tertiary uppercase tracking-widest mb-2">
            v{currentIndex} → v{currentIndex + 1}
          </div>
          {computeDiff(versions[currentIndex - 1], versions[currentIndex]).map((line, i) => (
            <div
              key={i}
              className={`whitespace-pre-wrap ${
                line.type === 'add'
                  ? 'text-green-400/80 bg-green-900/10'
                  : line.type === 'remove'
                  ? 'text-accent-red/60 bg-accent-red/10 line-through'
                  : 'text-text-tertiary'
              }`}
            >
              <span className="inline-block w-4 text-text-tertiary select-none">
                {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
              </span>
              {line.text || '\u00A0'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// PART 4 — Memo 비교 (M2.2)
// ============================================================
// [G] draftVersions 배열 참조가 PUSH 때만 교체됨. 같은 참조면 스킵.
//     currentIndex/onSwitch/onRestore 는 부모에서 안정적.
function versionDiffPropsEqual(
  prev: Readonly<VersionDiffProps>,
  next: Readonly<VersionDiffProps>,
): boolean {
  return (
    prev.versions === next.versions &&
    prev.currentIndex === next.currentIndex &&
    prev.language === next.language &&
    prev.onSwitch === next.onSwitch &&
    prev.onRestore === next.onRestore
  );
}

const VersionDiff = React.memo(VersionDiffImpl, versionDiffPropsEqual);
VersionDiff.displayName = 'VersionDiff';

export default VersionDiff;
