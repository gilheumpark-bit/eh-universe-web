import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useTranslator } from '../core/TranslatorContext';
import { useTranslatorLayout } from '../core/TranslatorLayoutContext';
import { ArrowLeftRight, Settings2, Focus, AlignLeft, Zap, MessageSquare, Shield, BookOpen } from 'lucide-react';

export function BilateralEditor() {
  const { source, setSource, result, setResult, from, to, setFrom, setTo, isZenMode, setIsZenMode, isCatMode, langKo, autoSaveLabel } = useTranslator();
  const layout = useTranslatorLayout();
  
  const [syncedScrolling, setSyncedScrolling] = useState(true);
  
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLTextAreaElement>(null);
  
  const isDraggingSplit = useRef(false);

  // Sync scroll logic
  useEffect(() => {
    if (!syncedScrolling) return;
    
    const src = sourceRef.current;
    const res = resultRef.current;
    if (!src || !res) return;

    let isSyncingLeft = false;
    let isSyncingRight = false;

    const syncScroll = (source: HTMLTextAreaElement, target: HTMLTextAreaElement, setSyncFlag: (v: boolean) => void, clearSyncFlag: () => void) => {
      if (clearSyncFlag === (() => isSyncingRight = false) && isSyncingLeft) return;
      if (clearSyncFlag === (() => isSyncingLeft = false) && isSyncingRight) return;

      setSyncFlag(true);
      const percentage = source.scrollTop / (source.scrollHeight - source.clientHeight);
      target.scrollTop = percentage * (target.scrollHeight - target.clientHeight);

      setTimeout(() => clearSyncFlag(), 50);
    };

    const handleSrcScroll = () => {
      syncScroll(src, res, () => isSyncingLeft = true, () => isSyncingLeft = false);
    };

    const handleResScroll = () => {
      syncScroll(res, src, () => isSyncingRight = true, () => isSyncingRight = false);
    };

    src.addEventListener('scroll', handleSrcScroll);
    res.addEventListener('scroll', handleResScroll);

    return () => {
      src.removeEventListener('scroll', handleSrcScroll);
      res.removeEventListener('scroll', handleResScroll);
    };
  }, [syncedScrolling]);

  // Center Split Resizer (for Bilateral ratio)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplit.current) return;
      // We assume BilateralEditor occupies roughly from leftSidebarWidth to (window.innerWidth - rightSidebarWidth)
      const containerLeft = layout.leftSidebarWidth;
      const containerWidth = window.innerWidth - layout.leftSidebarWidth - layout.rightSidebarWidth;
      const mouseRelative = e.clientX - containerLeft;
      
      let newRatio = mouseRelative / containerWidth;
      if (newRatio < 0.2) newRatio = 0.2;
      if (newRatio > 0.8) newRatio = 0.8;
      layout.setEditorSplitRatio(newRatio);
    };

    const handleMouseUp = () => {
      if (isDraggingSplit.current) {
        isDraggingSplit.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [layout]);

  const onSplitDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSplit.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const bgImage = isCatMode 
    ? 'url(/images/cat-bg.webp)'
    : 'url(/images/abstract-bg.webp)';

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-[#11100e]">
      {/* Background Decor (Glassmorphism) */}
      <div className="absolute inset-0 z-0 opacity-15 pointer-events-none" style={{ backgroundImage: bgImage, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(30px) saturate(150%)' }} />
      <div className="absolute inset-0 z-0 bg-linear-to-b from-[#0A0A0C]/40 via-transparent to-[#0A0A0C]/80 pointer-events-none" />

      {/* Editor Header */}
      <div className="h-14 w-full border-b border-white/3 flex items-center px-5 justify-between shrink-0 z-10 bg-[#11100e]/60 backdrop-blur-xl shadow-sm">
        <div className="flex items-center gap-4 min-w-0">
          <span
            className="hidden sm:block max-w-[140px] md:max-w-[200px] truncate text-[10px] font-mono text-text-tertiary/90"
            title={autoSaveLabel}
          >
            {autoSaveLabel}
          </span>
          <div className="flex items-center bg-white/2 rounded-xl p-1 border border-white/5 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] shrink-0">
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-transparent text-sm font-medium text-text-secondary px-3 py-1.5 outline-none cursor-pointer hover:bg-white/5 rounded-lg transition-colors appearance-none"
            >
              <option value="ja" className="bg-[#1A1A1D]">日本語 (Japanese)</option>
              <option value="en" className="bg-[#1A1A1D]">English</option>
              <option value="zh" className="bg-[#1A1A1D]">中文 (Chinese)</option>
              <option value="ko" className="bg-[#1A1A1D]">한국어 (Korean)</option>
            </select>
            <button 
              className="px-2.5 py-1.5 text-text-tertiary hover:text-accent-amber hover:bg-accent-amber/10 rounded-lg transition-all" 
              onClick={() => { const t = from; setFrom(to); setTo(t); }}
              title="서로 바꾸기 (Swap Languages)"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-transparent text-sm font-medium text-text-secondary px-3 py-1.5 outline-none cursor-pointer hover:bg-white/5 rounded-lg transition-colors appearance-none"
            >
              <option value="ko" className="bg-[#1A1A1D]">한국어 (Korean)</option>
              <option value="ja" className="bg-[#1A1A1D]">日本語 (Japanese)</option>
              <option value="en" className="bg-[#1A1A1D]">English</option>
              <option value="zh" className="bg-[#1A1A1D]">中文 (Chinese)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'actions' as const, icon: Zap, title: 'Translate / Pipeline' },
              { id: 'chat' as const, icon: MessageSquare, title: 'AI Copilot' },
              { id: 'audit' as const, icon: Shield, title: 'Quality audit' },
              { id: 'reference' as const, icon: BookOpen, title: 'References' },
            ] as const
          ).map(({ id, icon: Icon, title }) => (
            <button
              key={id}
              type="button"
              title={title}
              onClick={() =>
                layout.setActiveRightPanel(layout.activeRightPanel === id ? null : id)
              }
              className={`rounded-xl border p-2 transition-all duration-300 ${
                layout.activeRightPanel === id
                  ? 'border-accent-purple/40 bg-accent-purple/10 text-accent-purple shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  : 'border-transparent text-text-tertiary hover:border-white/10 hover:bg-white/5 hover:text-text-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            title="Sync Scroll"
            onClick={() => setSyncedScrolling(!syncedScrolling)}
            className={`p-2 rounded-xl transition-all duration-300 ${syncedScrolling ? 'bg-accent-indigo/10 text-accent-indigo border border-accent-indigo/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'text-text-tertiary border border-transparent hover:text-text-primary hover:bg-white/5 hover:border-white/10'}`}
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            title="Zen Mode"
            onClick={() => setIsZenMode(!isZenMode)}
            className={`p-2 rounded-xl transition-all duration-300 ${isZenMode ? 'bg-accent-green/10 text-accent-green border border-accent-green/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'text-text-tertiary border border-transparent hover:text-text-primary hover:bg-white/5 hover:border-white/10'}`}
          >
            <Focus className="w-4 h-4" />
          </button>
          <button
            type="button"
            title={langKo ? '설정·로그인·저장/백업' : 'Settings, sign-in, save & backup'}
            onClick={() => layout.setActiveLeftPanel('settings')}
            className="p-2 rounded-xl border border-transparent text-text-tertiary hover:text-text-primary hover:bg-white/5 hover:border-white/10 transition-all duration-300"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Body (Bilateral Split) */}
      <div className="flex-1 flex overflow-hidden z-10 w-full relative">
        {/* Source Textarea */}
        <div className="relative flex flex-col h-full bg-white/1 hover:bg-white/2 transition-colors duration-500" style={{ width: `${layout.editorSplitRatio * 100}%` }}>
          <div className="absolute top-4 right-5 text-[11px] font-mono text-text-tertiary/70 uppercase tracking-[0.2em] select-none pointer-events-none drop-shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white/20 inline-block shadow-[0_0_5px_rgba(255,255,255,0.3)]"></span>
            Source ({from})
          </div>
          <textarea
            ref={sourceRef}
            placeholder="여기에 원문을 입력하세요..."
            className="flex-1 w-full resize-none bg-transparent outline-none p-8 pt-12 text-[15px] leading-[1.8] text-text-secondary font-sans transition-colors placeholder:text-white/10 placeholder:font-light"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
          />
        </div>

        {/* Center Resize Handle */}
        <div
          onMouseDown={onSplitDragStart}
          className="w-1.5 bg-black/20 backdrop-blur-md border-x border-white/2 cursor-col-resize flex flex-col justify-center items-center hover:bg-accent-amber/20 transition-all duration-300 shrink-0 z-20 group relative"
        >
          {/* Handle Core */}
          <div className="w-[2px] h-12 bg-white/10 group-hover:bg-accent-amber/80 rounded-full transition-colors duration-300 shadow-[0_0_10px_rgba(251,191,36,0)] group-hover:shadow-[0_0_10px_rgba(251,191,36,0.5)] flex flex-col gap-1 items-center justify-center py-2">
			<div className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-white/80 transition-colors"></div>
			<div className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-white/80 transition-colors"></div>
			<div className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-white/80 transition-colors"></div>
		  </div>
        </div>

        {/* Result Textarea */}
        <div className="relative flex flex-col h-full bg-[#050505]/40 hover:bg-[#050505]/60 transition-colors duration-500 shadow-[inset_1px_0_10px_rgba(0,0,0,0.5)]" style={{ width: `${(1 - layout.editorSplitRatio) * 100}%` }}>
          <div className="absolute top-4 right-5 text-[11px] font-mono text-accent-amber/80 uppercase tracking-[0.2em] select-none pointer-events-none drop-shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-amber/80 inline-block shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
            Translation ({to})
          </div>
          <textarea
            ref={resultRef}
            placeholder="번역 결과가 여기에 표시됩니다..."
            className="flex-1 w-full resize-none bg-transparent outline-none p-8 pt-12 text-[15px] leading-[1.8] text-text-primary font-sans transition-colors placeholder:text-white/10 placeholder:font-light"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
