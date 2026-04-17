import React, { useState } from 'react';
import { Folder, Search, Plus, Trash2, ChevronRight, CheckCircle, Circle, Link2 } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';

export function ExplorerPanel() {
  const {
    chapters,
    activeChapterIndex,
    openChapter,
    handleChapterRemove,
    setChapters,
    urlInput,
    setUrlInput,
    importUrl,
    loading,
  } = useTranslator();
  const [searchQuery, setSearchQuery] = useState('');

  const createNewChapter = () => {
    const newChapter = {
      name: `Part ${chapters.length + 1}`,
      content: '',
      result: '',
      isDone: false,
      stageProgress: 0,
      storyNote: '',
    };
    const nextChapters = [...chapters, newChapter];
    setChapters(nextChapters);
    openChapter(nextChapters.length - 1, nextChapters);
  };

  const filteredChapters = chapters.map((ch, idx) => ({ ...ch, originalIndex: idx }))
    .filter(ch => (ch.name || `Chapter ${ch.originalIndex + 1}`).toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-full flex-col font-sans">
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input 
            type="text" 
            placeholder="Search chapters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-md py-1.5 pl-9 pr-3 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-indigo/50 focus:ring-1 focus:ring-accent-indigo/50 transition-[transform,opacity,background-color,border-color,color] pointer-events-auto"
          />
        </div>
        <div className="mt-3 flex flex-col gap-2 border-t border-white/5 pt-3">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">URL import</span>
          <div className="flex gap-2">
            <input
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 py-1.5 pl-2 pr-2 text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-amber/50 pointer-events-auto"
            />
            <button
              type="button"
              disabled={loading || !urlInput.trim()}
              onClick={() => void importUrl()}
              className="shrink-0 rounded-md border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-1.5 text-accent-amber transition-colors hover:bg-accent-amber/20 disabled:cursor-not-allowed disabled:opacity-40 pointer-events-auto"
              title="Fetch page text into chapter"
            >
              <Link2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 pointer-events-auto">
        <div className="px-2 py-1.5 flex items-center gap-2 group cursor-pointer transition-colors">
          <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors" />
          <Folder className="w-4 h-4 text-accent-amber opacity-80" />
          <span className="text-[13px] font-medium text-text-secondary group-hover:text-text-primary">Chapters</span>
        </div>
        
        <div className="pl-6 flex flex-col gap-0.5 mt-1">
          {chapters.length === 0 ? (
            <div className="px-3 py-4 text-[12px] text-text-tertiary italic text-center bg-white/2 rounded-md border border-white/3">
              No chapters loaded.<br/>Click &quot;New Chapter&quot; to begin.
            </div>
          ) : (
            filteredChapters.map((ch) => (
              <div
                key={ch.originalIndex}
                onClick={() => openChapter(ch.originalIndex)}
                className={`group flex items-center justify-between w-full px-3 py-1.5 rounded-md text-left transition-[transform,opacity,background-color,border-color,color] cursor-pointer ${
                  activeChapterIndex === ch.originalIndex 
                  ? 'bg-accent-indigo/20 text-accent-indigo shadow-[inset_2px_0_0_0_#6366f1]' 
                  : 'text-text-tertiary hover:bg-white/5 hover:text-text-secondary'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {ch.isDone ? (
                    <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${activeChapterIndex === ch.originalIndex ? 'text-accent-indigo' : 'text-accent-green opacity-80'}`} />
                  ) : (
                    <Circle className={`w-3.5 h-3.5 shrink-0 ${activeChapterIndex === ch.originalIndex ? 'text-accent-indigo' : 'opacity-60'}`} />
                  )}
                  <span className="text-[13px] truncate">{ch.name || `Chapter ${ch.originalIndex + 1}`}</span>
                </div>
                
                <button
                  onClick={(e) => handleChapterRemove(e, ch.originalIndex)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 transition-[opacity,background-color,border-color,color] shrink-0"
                  title="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="p-3 shrink-0 border-t border-white/5 pointer-events-auto">
        <button 
          onClick={createNewChapter}
          className="w-full flex items-center justify-center gap-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-[12px] font-medium transition-colors text-text-secondary">
          <Plus className="w-3.5 h-3.5" />
          <span>New Chapter</span>
        </button>
      </div>
    </div>
  );
}
