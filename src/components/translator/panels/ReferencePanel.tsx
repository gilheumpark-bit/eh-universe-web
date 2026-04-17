import React, { useState } from 'react';
import { FileSearch, Search, BookOpen } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';

export function ReferencePanel() {
  const { chapters, activeChapterIndex } = useTranslator();
  const storyNote = activeChapterIndex !== null ? chapters[activeChapterIndex]?.storyNote : null;
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex h-full flex-col font-sans">
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input 
            type="text" 
            placeholder="Search references..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-md py-1.5 pl-9 pr-3 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-amber/50 focus:ring-1 focus:ring-accent-amber/50 transition-[transform,opacity,background-color,border-color,color] pointer-events-auto"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pointer-events-auto">
        <div className="flex items-center gap-2 text-text-secondary mb-2">
          <BookOpen className="w-4 h-4 text-accent-amber" />
          <span className="text-[13px] font-medium">World Notes</span>
        </div>
        
        <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-[13px] text-text-secondary leading-relaxed min-h-[100px] whitespace-pre-wrap">
          {storyNote || <span className="opacity-50 italic">참고자료를 추가하면 번역 중 참조할 수 있습니다. Add references to use during translation.</span>}
        </div>

        <div className="mt-6 flex items-center gap-2 text-text-secondary mb-2">
          <FileSearch className="w-4 h-4 text-accent-amber" />
          <span className="text-[13px] font-medium">External References</span>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex flex-col gap-1 hover:bg-white/10 cursor-pointer transition-colors">
            <span className="text-[13px] text-text-primary">Wikipedia: Character Archetypes</span>
            <span className="text-[11px] text-text-tertiary truncate">https://en.wikipedia.org/wiki/Character_archetypes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
