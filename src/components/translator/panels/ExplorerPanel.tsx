import React, { useState, useMemo } from 'react';
import { Folder, Search, Plus, Trash2, ChevronRight, CheckCircle, Circle, Link2, Scissors, BarChart3 } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';
import { splitTextIntoChunks } from '@/lib/project-normalize';
import type { ChapterEntry } from '@/types/translator';
import { useLang } from '@/lib/LangContext';
import { L4 } from '@/lib/i18n';

function isChapterComplete(chapter: Partial<ChapterEntry>): boolean {
  return Boolean(chapter.isDone || (chapter.result || chapter.resultMarket || chapter.resultFaithful || '').trim().length > 0);
}

export function ExplorerPanel() {
  const { lang } = useLang();
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
    langKo,
  } = useTranslator();
  const [searchQuery, setSearchQuery] = useState('');
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitSource, setSplitSource] = useState('');
  const [splitSize, setSplitSize] = useState(4000);
  const [statsOpen, setStatsOpen] = useState(true);
  const label = (values: { ko: string; en: string; ja: string; zh: string }) => L4(lang, values);
  const chapterName = (index: number) => label({
    ko: `회차 ${index}`,
    en: `Chapter ${index}`,
    ja: `第${index}話`,
    zh: `第${index}章`,
  });

  // ── 번역 진행률 통계 ──
  const stats = useMemo(() => {
    const total = chapters.length;
    const done = chapters.filter(isChapterComplete).length;
    const started = chapters.filter(c => !isChapterComplete(c) && (c.result || c.resultMarket || c.resultFaithful || '').trim().length > 0).length;
    const todo = Math.max(0, total - done - started);
    const totalChars = chapters.reduce((s, c) => s + (c.content?.length ?? 0), 0);
    const doneChars = chapters.filter(isChapterComplete).reduce((s, c) => s + (c.content?.length ?? 0), 0);
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
      name: chapterName(baseIndex + i + 1),
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
      name: chapterName(chapters.length + 1),
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
    .filter(ch => (ch.name || chapterName(ch.originalIndex + 1)).toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-full flex-col font-sans">
      <div className="p-4 shrink-0 border-b border-border bg-bg-secondary/80 space-y-3">
        {/* 번역 진행률 통계 */}
        {chapters.length > 0 && (
          <div className="rounded-lg bg-bg-primary border border-border p-2.5 space-y-1.5">
            <button
              type="button"
              onClick={() => setStatsOpen(o => !o)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3 h-3 text-accent-indigo" />
                <span className="text-[10px] font-semibold tracking-wide text-text-secondary">진행률</span>
              </div>
              <span className={`text-[11px] font-mono font-bold ${stats.donePct >= 80 ? 'text-accent-green' : stats.donePct >= 40 ? 'text-accent-amber' : 'text-text-secondary'}`}>
                {stats.donePct}%
              </span>
            </button>
            {statsOpen && (
              <>
                <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden flex">
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
                    <span className="text-accent-green">완료</span>
                    <span className="text-accent-green font-bold">{stats.done}</span>
                  </div>
                  <div className="flex justify-between bg-accent-amber/5 rounded px-1.5 py-0.5">
                    <span className="text-accent-amber">진행</span>
                    <span className="text-accent-amber font-bold">{stats.started}</span>
                  </div>
                  <div className="flex justify-between bg-bg-secondary rounded px-1.5 py-0.5">
                    <span className="text-text-secondary">대기</span>
                    <span className="text-text-secondary font-bold">{stats.todo}</span>
                  </div>
                </div>
                <div className="flex justify-between text-[9px] text-text-secondary font-mono pt-0.5">
                  <span>원문 {stats.totalChars.toLocaleString()}자</span>
                  <span>완료 {stats.doneChars.toLocaleString()}자 ({stats.charPct}%)</span>
                </div>
              </>
            )}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input 
            type="text" 
            placeholder={label({ ko: "회차 검색…", en: "Search chapters…", ja: "話数を検索…", zh: "搜索章节…" })}
            aria-label={label({ ko: "회차 검색", en: "Search chapters", ja: "話数を検索", zh: "搜索章节" })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[44px] bg-bg-primary border border-border rounded-md py-2 pl-9 pr-3 text-[13px] text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-indigo/50 transition-[transform,opacity,background-color,border-color,color] pointer-events-auto"
          />
        </div>
        <div className="mt-3 flex flex-col gap-2 border-t border-white/5 pt-3">
          <span className="text-[10px] font-semibold tracking-wide text-text-secondary">
            {label({ ko: "웹 문서 불러오기", en: "Import web page", ja: "Web文書を読み込む", zh: "导入网页文本" })}
          </span>
          <div className="flex gap-2">
            <input
              type="url"
              inputMode="url"
              placeholder="https://…"
              aria-label={label({ ko: "불러올 웹 주소", en: "Web page URL", ja: "読み込むURL", zh: "要导入的网址" })}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="min-w-0 flex-1 min-h-[44px] rounded-md border border-border bg-bg-primary py-2 pl-2 pr-2 text-[12px] text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-amber/50 pointer-events-auto"
            />
            <button
              type="button"
              disabled={loading || !urlInput.trim()}
              onClick={() => void importUrl()}
              className="shrink-0 min-h-[44px] min-w-[44px] rounded-md border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-2 text-accent-amber transition-colors hover:bg-accent-amber/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 disabled:cursor-not-allowed disabled:bg-bg-secondary disabled:text-text-tertiary pointer-events-auto"
              title={label({ ko: "웹 문서 텍스트를 회차로 불러오기", en: "Import page text as a chapter", ja: "Web文書を話数として読み込む", zh: "将网页文本导入为章节" })}
              aria-label={label({ ko: "웹 문서 텍스트를 회차로 불러오기", en: "Import page text as a chapter", ja: "Web文書を話数として読み込む", zh: "将网页文本导入为章节" })}
            >
              <Link2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 pointer-events-auto">
        <div className="px-2 py-1.5 flex items-center gap-2 group cursor-pointer transition-colors">
          <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-text-primary transition-colors" />
          <Folder className="w-4 h-4 text-accent-amber opacity-80" />
          <span className="text-[13px] font-medium text-text-secondary group-hover:text-text-primary">
            {label({ ko: '회차', en: 'Chapters', ja: '話数', zh: '章节' })}
          </span>
        </div>

        <div className="pl-6 flex flex-col gap-0.5 mt-1">
          {chapters.length === 0 ? (
            <div className="px-3 py-4 text-[12px] text-text-secondary text-center bg-bg-secondary rounded-md border border-border">
              {label({
                ko: '회차가 없습니다. "새 회차"로 시작하세요.',
                en: 'No chapters yet. Start with "New chapter".',
                ja: '話数がありません。「新しい話」から始めてください。',
                zh: '还没有章节。请从“新建章节”开始。',
              })}
            </div>
          ) : (
            filteredChapters.map((ch) => (
              <button
                type="button"
                key={ch.originalIndex}
                onClick={() => openChapter(ch.originalIndex)}
                className={`group flex min-h-[44px] items-center justify-between w-full px-3 py-2 rounded-md text-left transition-[transform,opacity,background-color,border-color,color] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
                  activeChapterIndex === ch.originalIndex 
                  ? 'bg-accent-indigo/20 text-accent-indigo shadow-[inset_2px_0_0_0_#6366f1]' 
                  : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {ch.isDone ? (
                    <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${activeChapterIndex === ch.originalIndex ? 'text-accent-indigo' : 'text-accent-green opacity-80'}`} />
                  ) : (
                    <Circle className={`w-3.5 h-3.5 shrink-0 ${activeChapterIndex === ch.originalIndex ? 'text-accent-indigo' : 'opacity-60'}`} />
                  )}
                  <span className="text-[13px] truncate">{ch.name || chapterName(ch.originalIndex + 1)}</span>
                </div>
                
                <button
                  onClick={(e) => handleChapterRemove(e, ch.originalIndex)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent-red/20 text-accent-red transition-[opacity,background-color,border-color,color] shrink-0"
                  title={label({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </button>
            ))
          )}
        </div>
      </div>
      
      <div className="p-3 shrink-0 border-t border-white/5 pointer-events-auto space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={createNewChapter}
            className="flex min-h-[44px] items-center justify-center gap-1.5 py-2 bg-bg-primary hover:bg-bg-secondary border border-border rounded-md text-[11px] font-medium transition-colors text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
            aria-label={label({ ko: '새 회차', en: 'New chapter', ja: '新しい話', zh: '新建章节' })}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{label({ ko: '새 회차', en: 'New chapter', ja: '新しい話', zh: '新建章节' })}</span>
          </button>
          <button
            onClick={() => setSplitOpen(o => !o)}
            className={`flex min-h-[44px] items-center justify-center gap-1.5 py-2 border rounded-md text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
              splitOpen
                ? 'bg-accent-amber/15 border-accent-amber/40 text-accent-amber'
                : 'bg-bg-primary hover:bg-bg-secondary border-border text-text-secondary'
            }`}
            title={label({ ko: '긴 원문을 여러 회차로 자동 분할', en: 'Split long source text into chapters', ja: '長い原文を複数話に分割', zh: '将长篇原文拆分为多个章节' })}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>{label({ ko: '회차 분할', en: 'Split', ja: '分割', zh: '拆分' })}</span>
          </button>
        </div>

        {splitOpen && (
          <div className="rounded-md border border-accent-amber/25 bg-accent-amber/[0.04] p-2.5 space-y-2">
            <p className="text-[10px] text-text-secondary leading-snug">
              {langKo
                ? '긴 원문을 붙여넣으면 지정한 크기로 나누어 여러 회차로 추가합니다. 조각 사이 약 5%를 겹쳐 문맥을 보존합니다.'
                : label({
                  ko: '',
                  en: 'Paste long source text and split it into chapters with about 5% overlap.',
                  ja: '長い原文を貼り付けると、約5%の重なりを残して複数話に分割します。',
                  zh: '粘贴长篇原文后，会保留约 5% 重叠并拆分为多个章节。',
                })}
            </p>
            <textarea
              value={splitSource}
              onChange={(e) => setSplitSource(e.target.value)}
              placeholder={label({ ko: "여기에 긴 원문을 붙여넣으세요…", en: "Paste long source text here…", ja: "ここに長い原文を貼り付けてください…", zh: "在此粘贴长篇原文…" })}
              className="w-full min-h-[88px] bg-bg-primary border border-border rounded-md px-2 py-2 text-[11px] text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-amber/50 resize-y"
            />
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-text-secondary whitespace-nowrap">
                {label({ ko: "분할 크기", en: "Split size", ja: "分割サイズ", zh: "拆分长度" })}
              </label>
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
            <div className="text-[10px] text-text-secondary">
              {label({ ko: '예상 회차 수', en: 'Estimated chapters', ja: '予想話数', zh: '预计章节数' })}: {splitSource.trim().length > 0 ? Math.max(1, Math.ceil(splitSource.trim().length / splitSize)) : 0}{label({ ko: '개', en: '', ja: '件', zh: '个' })}
            </div>
            <button
              onClick={handleAutoSplit}
              disabled={splitSource.trim().length === 0}
              className="w-full min-h-[44px] py-2 bg-accent-amber/20 hover:bg-accent-amber/30 border border-accent-amber/40 rounded-md text-[11px] font-bold text-accent-amber transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 disabled:bg-bg-secondary disabled:text-text-tertiary disabled:cursor-not-allowed"
            >
              {label({ ko: '분할해서 회차로 추가', en: 'Split into chapters', ja: '分割して話数に追加', zh: '拆分并添加为章节' })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
