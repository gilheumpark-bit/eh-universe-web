import React, { useState, useMemo } from 'react';
import { Folder, Search, Plus, Trash2, ChevronRight, CheckCircle, Circle, Link2, Scissors, BarChart3 } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';
import { splitTextIntoChunks } from '@/lib/project-normalize';

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
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitSource, setSplitSource] = useState('');
  const [splitSize, setSplitSize] = useState(4000);
  const [statsOpen, setStatsOpen] = useState(true);

  // ── 번역 진행률 통계 ──
  const stats = useMemo(() => {
    const total = chapters.length;
    const done = chapters.filter(c => c.isDone).length;
    const started = chapters.filter(c => !c.isDone && (c.result || '').trim().length > 0).length;
    const todo = Math.max(0, total - done - started);
    const totalChars = chapters.reduce((s, c) => s + (c.content?.length ?? 0), 0);
    const doneChars = chapters.filter(c => c.isDone).reduce((s, c) => s + (c.content?.length ?? 0), 0);
    const donePct = total > 0 ? Math.round((done / total) * 100) : 0;
    const startedPct = total > 0 ? Math.round((started / total) * 100) : 0;
    const charPct = totalChars > 0 ? Math.round((doneChars / totalChars) * 100) : 0;
    return { total, done, started, todo, totalChars, doneChars, donePct, startedPct, charPct };
  }, [chapters]);

  const handleAutoSplit = () => {
    const src = splitSource.trim();
    if (!src) return;
    const chunks = splitTextIntoChunks(src, splitSize, Math.round(splitSize * 0.05));
    if (chunks.length === 0) return;
    const baseIndex = chapters.length;
    const newChapters = chunks.map((c, i) => ({
      name: `Part ${baseIndex + i + 1}`,
      content: c,
      result: '',
      isDone: false,
      stageProgress: 0,
      storyNote: '',
    }));
    const next = [...chapters, ...newChapters];
    setChapters(next);
    openChapter(baseIndex, next);
    // 초기화 + 닫기
    setSplitSource('');
    setSplitOpen(false);
  };

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
      <div className="p-4 shrink-0 border-b border-white/5 space-y-3">
        {/* 번역 진행률 통계 */}
        {chapters.length > 0 && (
          <div className="rounded-md bg-white/[0.02] border border-white/10 p-2.5 space-y-1.5">
            <button
              type="button"
              onClick={() => setStatsOpen(o => !o)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3 h-3 text-accent-indigo" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">진행률</span>
              </div>
              <span className={`text-[11px] font-mono font-bold ${stats.donePct >= 80 ? 'text-accent-green' : stats.donePct >= 40 ? 'text-accent-amber' : 'text-text-secondary'}`}>
                {stats.donePct}%
              </span>
            </button>
            {statsOpen && (
              <>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden flex">
                  <div
                    className="h-full bg-accent-green transition-[width] duration-500"
                    style={{ width: `${stats.donePct}%` }}
                    title={`완료 ${stats.done}회차`}
                  />
                  <div
                    className="h-full bg-accent-amber transition-[width] duration-500"
                    style={{ width: `${stats.startedPct}%` }}
                    title={`진행 중 ${stats.started}회차`}
                  />
                </div>
                <div className="grid grid-cols-3 gap-1 text-[9px] font-mono">
                  <div className="flex justify-between bg-accent-green/5 rounded px-1.5 py-0.5">
                    <span className="text-accent-green/80">완료</span>
                    <span className="text-accent-green font-bold">{stats.done}</span>
                  </div>
                  <div className="flex justify-between bg-accent-amber/5 rounded px-1.5 py-0.5">
                    <span className="text-accent-amber/80">진행</span>
                    <span className="text-accent-amber font-bold">{stats.started}</span>
                  </div>
                  <div className="flex justify-between bg-white/[0.03] rounded px-1.5 py-0.5">
                    <span className="text-text-tertiary">대기</span>
                    <span className="text-text-secondary font-bold">{stats.todo}</span>
                  </div>
                </div>
                <div className="flex justify-between text-[9px] text-text-tertiary font-mono pt-0.5">
                  <span>원문 {stats.totalChars.toLocaleString()}자</span>
                  <span>완료 {stats.doneChars.toLocaleString()}자 ({stats.charPct}%)</span>
                </div>
              </>
            )}
          </div>
        )}

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
      
      <div className="p-3 shrink-0 border-t border-white/5 pointer-events-auto space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={createNewChapter}
            className="flex items-center justify-center gap-1.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-[11px] font-medium transition-colors text-text-secondary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
          <button
            onClick={() => setSplitOpen(o => !o)}
            className={`flex items-center justify-center gap-1.5 py-1.5 border rounded-md text-[11px] font-medium transition-colors ${
              splitOpen
                ? 'bg-accent-amber/15 border-accent-amber/40 text-accent-amber'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-text-secondary'
            }`}
            title="긴 원문을 여러 챕터로 자동 분할"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>자동 분할</span>
          </button>
        </div>

        {splitOpen && (
          <div className="rounded-md border border-accent-amber/25 bg-accent-amber/[0.04] p-2.5 space-y-2">
            <p className="text-[10px] text-text-tertiary leading-snug">
              긴 원문을 붙여넣으면 지정한 크기로 자동 분할해 여러 챕터로 추가합니다. 청크 사이 약 5% 오버랩으로 문맥을 보존합니다.
            </p>
            <textarea
              value={splitSource}
              onChange={(e) => setSplitSource(e.target.value)}
              placeholder="여기에 긴 원문을 붙여넣으세요…"
              className="w-full h-20 bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-[11px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-amber/50 resize-y"
            />
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-text-tertiary whitespace-nowrap">청크 크기</label>
              <input
                type="range"
                min={1000}
                max={8000}
                step={500}
                value={splitSize}
                onChange={(e) => setSplitSize(parseInt(e.target.value, 10) || 4000)}
                className="flex-1 accent-accent-amber"
              />
              <span className="text-[10px] text-text-secondary font-mono w-14 text-right">{splitSize.toLocaleString()}자</span>
            </div>
            <div className="text-[10px] text-text-tertiary">
              예상 챕터 수: {splitSource.trim().length > 0 ? Math.max(1, Math.ceil(splitSource.trim().length / splitSize)) : 0}개
            </div>
            <button
              onClick={handleAutoSplit}
              disabled={splitSource.trim().length === 0}
              className="w-full py-1.5 bg-accent-amber/20 hover:bg-accent-amber/30 border border-accent-amber/40 rounded-md text-[11px] font-bold text-accent-amber transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              분할해서 챕터로 추가
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
