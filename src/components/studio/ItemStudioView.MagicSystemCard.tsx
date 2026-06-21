import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, Wand2 } from 'lucide-react';
import type { MagicSystem } from '@/lib/studio-types';

export const MagicSystemCard: React.FC<{
  magic: MagicSystem;
  t: (key: string, fallback?: string) => string;
  onDelete: () => void;
  onAddRank: (rank: string) => void;
  onRemoveRank: (idx: number) => void;
}> = ({ magic, t, onDelete, onAddRank, onRemoveRank }) => {
  const [expanded, setExpanded] = useState(true);
  const [rankInput, setRankInput] = useState('');

  return (
    <div className="relative overflow-hidden bg-bg-secondary/60 backdrop-blur-md border border-border/40 p-4 space-y-3 rounded-xl shadow-sm transition-[background-color,border-color,box-shadow,color] hover:bg-bg-secondary hover:shadow-md hover:border-border">
      <div className="flex items-center justify-between">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-accent-blue" />
          <span className="font-bold text-sm">{magic.name}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-text-tertiary" /> : <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />}
        </button>
        <button
          onClick={(event) => {
            event.currentTarget.classList.add('animate-delete-warning');
            setTimeout(onDelete, 300);
          }}
          className="p-1 rounded-lg text-text-tertiary hover:text-accent-red hover:bg-accent-red/20 transition-colors duration-200"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <>
          {magic.source && <p className="text-xs text-text-secondary">🔮 {t('itemStudio.source')}: {magic.source}</p>}
          {magic.rules && <p className="text-xs text-text-secondary">📜 {t('itemStudio.rules')}: {magic.rules}</p>}
          {magic.limitations && <p className="text-xs text-accent-red/80">⛔ {t('itemStudio.limits')}: {magic.limitations}</p>}

          <div className="space-y-2">
            <h5 className="text-[10px] font-bold text-text-tertiary uppercase">{t('itemStudio.rankSystem')}</h5>
            <div className="flex flex-wrap gap-1.5">
              {magic.ranks.map((rank, index) => (
                <span key={index} className="flex items-center gap-1 px-2 py-1 bg-bg-primary rounded-lg text-[10px] font-bold">
                  {index + 1}. {rank}
                  <button onClick={() => onRemoveRank(index)} className="text-text-tertiary hover:text-accent-red ml-1">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={rankInput}
                onChange={(event) => setRankInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && rankInput.trim()) {
                    onAddRank(rankInput.trim());
                    setRankInput('');
                  }
                }}
                placeholder={t('itemStudio.addRankPlaceholder')}
                className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-[13px] min-h-[44px] flex-1"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
