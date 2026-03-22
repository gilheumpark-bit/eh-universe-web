'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, GitCompare, Copy, Check } from 'lucide-react';
import { AppLanguage } from '@/lib/studio-types';

interface VersionDiffProps {
  versions: string[];
  currentIndex: number;
  language: AppLanguage;
  onSwitch: (index: number) => void;
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
  const result: DiffLine[] = [];

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
// PART 2 — Component
// ============================================================

const VersionDiff: React.FC<VersionDiffProps> = ({ versions, currentIndex, language, onSwitch }) => {
  const [showDiff, setShowDiff] = useState(false);
  const [copied, setCopied] = useState(false);
  const isKO = language === 'KO';
  const total = versions.length;

  if (total <= 1) return null;

  const canPrev = currentIndex > 0;
  const canNext = currentIndex < total - 1;

  const handleCopy = () => {
    navigator.clipboard.writeText(versions[currentIndex]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mt-2">
      {/* Version switcher bar */}
      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest">
        <button
          onClick={() => canPrev && onSwitch(currentIndex - 1)}
          disabled={!canPrev}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
        <span className="text-zinc-500 tabular-nums">
          v{currentIndex + 1}/{total}
        </span>
        <button
          onClick={() => canNext && onSwitch(currentIndex + 1)}
          disabled={!canNext}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors"
        >
          <ChevronRight className="w-3 h-3" />
        </button>

        {total >= 2 && (
          <button
            onClick={() => setShowDiff(!showDiff)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md border transition-colors ${
              showDiff
                ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                : 'border-zinc-800 text-zinc-600 hover:text-zinc-400'
            }`}
          >
            <GitCompare className="w-2.5 h-2.5" />
            {isKO ? '비교' : 'Diff'}
          </button>
        )}

        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>

      {/* Diff view */}
      {showDiff && currentIndex > 0 && (
        <div className="mt-2 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] font-mono leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
          <div className="text-[8px] text-zinc-600 uppercase tracking-widest mb-2">
            v{currentIndex} → v{currentIndex + 1}
          </div>
          {computeDiff(versions[currentIndex - 1], versions[currentIndex]).map((line, i) => (
            <div
              key={i}
              className={`whitespace-pre-wrap ${
                line.type === 'add'
                  ? 'text-green-400/80 bg-green-900/10'
                  : line.type === 'remove'
                  ? 'text-red-400/60 bg-red-900/10 line-through'
                  : 'text-zinc-500'
              }`}
            >
              <span className="inline-block w-4 text-zinc-700 select-none">
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

export default VersionDiff;
