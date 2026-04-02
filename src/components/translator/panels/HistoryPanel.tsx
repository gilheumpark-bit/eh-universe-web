import React from 'react';
import { Clock, RotateCcw } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';

export function HistoryPanel() {
  const { chapters, activeChapterIndex } = useTranslator();
  const currentChapter = activeChapterIndex !== null ? chapters[activeChapterIndex] : null;

  // Placeholder history data
  const historyItems = [
    { id: 1, time: '10 mins ago', action: 'Translated lines 45-50', type: 'translate' },
    { id: 2, time: '30 mins ago', action: 'Applied style normalization', type: 'style' },
    { id: 3, time: '1 hour ago', action: 'Updated terms dictionary', type: 'glossary' },
    { id: 4, time: '2 hours ago', action: 'Imported raw document', type: 'import' },
  ];

  return (
    <div className="flex h-full flex-col font-sans">
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-secondary">
            <Clock className="w-4 h-4 text-accent-purple" />
            <span className="text-[13px] font-medium">Session History</span>
          </div>
          <span className="text-[11px] text-text-tertiary px-2 py-0.5 rounded bg-white/5">
            {currentChapter?.name || 'Globus'}
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pointer-events-auto">
        <div className="relative">
          <div className="absolute left-[7px] top-[14px] bottom-0 w-px bg-white/10 z-0"></div>
          
          <div className="space-y-4 relative z-10">
            {historyItems.map((item, idx) => (
              <div key={item.id} className="flex gap-3 group">
                <div className={`w-3.5 h-3.5 rounded-full mt-1 flex items-center justify-center shrink-0 
                  ${idx === 0 ? 'bg-accent-purple shadow-[0_0_8px_rgba(168,85,247,0.4)]' : 'bg-black border border-white/20'}`}
                >
                  {idx === 0 && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <span className={`text-[13px] ${idx === 0 ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {item.action}
                  </span>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-text-tertiary">{item.time}</span>
                    <button className="opacity-0 group-hover:opacity-100 text-[11px] text-accent-purple hover:underline transition-opacity flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" />
                      Restore
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
