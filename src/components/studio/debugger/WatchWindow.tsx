"use client";
// ============================================================
// WatchWindow — 떡밥/캐릭터/임의 표현 추적.
// ============================================================

import React, { useState } from 'react';
import { Plus, X, Eye } from 'lucide-react';
import type { WatchEntry, StoryFrame } from '@/lib/story-debugger/types';

export interface WatchWindowProps {
  watches: WatchEntry[];
  frame: StoryFrame | null;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
  onAdd?: (entry: Omit<WatchEntry, 'id'>) => void;
  onRemove?: (id: string) => void;
}

export const WatchWindow: React.FC<WatchWindowProps> = ({
  watches,
  frame,
  language = 'KO',
  onAdd,
  onRemove,
}) => {
  const isKO = language === 'KO';
  const [kind, setKind] = useState<WatchEntry['kind']>('character');
  const [target, setTarget] = useState('');

  const handleAdd = () => {
    if (!target.trim()) return;
    onAdd?.({ kind, target: target.trim() });
    setTarget('');
  };

  return (
    <div className="p-2">
      {/* Add form */}
      <div className="flex items-center gap-1 mb-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as WatchEntry['kind'])}
          className="text-[10px] bg-bg-tertiary/50 border border-border rounded px-1.5 py-1 text-text-secondary outline-none"
        >
          <option value="character">{isKO ? '캐릭터' : 'Char'}</option>
          <option value="foreshadow">{isKO ? '떡밥' : 'Foreshadow'}</option>
          <option value="expression">{isKO ? '표현' : 'Expr'}</option>
        </select>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={isKO ? '추적 대상' : 'Target'}
          className="flex-1 text-xs bg-bg-tertiary/50 border border-border rounded px-2 py-1 text-text-primary placeholder-text-tertiary outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="p-1 bg-accent-purple/15 text-accent-purple rounded hover:bg-accent-purple/25"
          aria-label={isKO ? '추가' : 'Add'}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Watch list */}
      {watches.length === 0 ? (
        <p className="text-xs text-text-tertiary text-center py-3">
          {isKO ? '추적할 변수 추가' : 'Add a watch'}
        </p>
      ) : (
        <ul className="space-y-1">
          {watches.map((w) => {
            const value = frame?.watchValues[w.id];
            return (
              <li key={w.id}>
                <div className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-bg-tertiary/30">
                  <Eye className="w-3 h-3 text-text-tertiary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase font-mono text-text-tertiary">{w.kind}</span>
                      <span className="text-xs font-bold text-text-primary truncate">{w.target}</span>
                    </div>
                    <div className="text-[10px] text-text-secondary mt-0.5 truncate">
                      {value === undefined ? '—' : value === null ? (isKO ? '미발견' : 'not found') : value}
                    </div>
                  </div>
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(w.id)}
                      className="p-0.5 text-text-tertiary hover:text-accent-red"
                      aria-label="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
