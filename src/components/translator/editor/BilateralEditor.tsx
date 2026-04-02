import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useTranslator } from '../TranslatorContext';
import { useTranslatorLayout } from '../core/TranslatorLayoutContext';
import { ArrowLeftRight, Settings2, Focus, AlignLeft } from 'lucide-react';
export function BilateralEditor() {
  const { source, setSource, result, setResult, from, to, setFrom, setTo, isZenMode, setIsZenMode, isCatMode } = useTranslator();
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
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-bg-primary">
      {/* Background Decor (Glassmorphism) */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: bgImage, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px)' }} />

      {/* Editor Header */}
      <div className="h-12 w-full border-b border-white/5 flex items-center px-4 justify-between shrink-0 z-10 bg-[#0A0A0B]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-[#1A1A1D] rounded-lg p-0.5 border border-white/10 shadow-sm">
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-transparent text-sm text-text-secondary px-2 py-1 outline-none cursor-pointer"
            >
              <option value="ja">日本語 (Japanese)</option>
              <option value="en">English</option>
              <option value="zh">中文 (Chinese)</option>
              <option value="ko">한국어 (Korean)</option>
            </select>
            <button className="px-2 text-text-tertiary hover:text-white" onClick={() => { const t = from; setFrom(to); setTo(t); }}>
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-transparent text-sm text-text-secondary px-2 py-1 outline-none cursor-pointer"
            >
              <option value="ko">한국어 (Korean)</option>
              <option value="ja">日本語 (Japanese)</option>
              <option value="en">English</option>
              <option value="zh">中文 (Chinese)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            title="Sync Scroll"
            onClick={() => setSyncedScrolling(!syncedScrolling)}
            className={`p-1.5 rounded-md transition-colors ${syncedScrolling ? 'bg-accent-indigo/20 text-accent-indigo border border-accent-indigo/30' : 'text-text-tertiary hover:text-white hover:bg-white/10'}`}
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            title="Zen Mode"
            onClick={() => setIsZenMode(!isZenMode)}
            className={`p-1.5 rounded-md transition-colors ${isZenMode ? 'bg-accent-green/20 text-accent-green border border-accent-green/30' : 'text-text-tertiary hover:text-white hover:bg-white/10'}`}
          >
            <Focus className="w-4 h-4" />
          </button>
          <button title="Document Settings" className="p-1.5 rounded-md text-text-tertiary hover:text-white hover:bg-white/10 transition-colors">
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Body (Bilateral Split) */}
      <div className="flex-1 flex overflow-hidden z-10 w-full relative">
        {/* Source Textarea */}
        <div className="relative flex flex-col h-full" style={{ width: `${layout.editorSplitRatio * 100}%` }}>
          <div className="absolute top-2 right-4 text-xs font-mono text-text-tertiary uppercase tracking-wider select-none pointer-events-none pb-2 border-b border-transparent">
            Source ({from})
          </div>
          <textarea
            ref={sourceRef}
            placeholder="여기에 원문을 입력하세요..."
            className="flex-1 w-full resize-none bg-transparent outline-none p-6 pt-10 text-[15px] leading-relaxed text-text-secondary font-sans transition-colors placeholder:text-white/10"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
          />
        </div>

        {/* Center Resize Handle */}
        <div
          onMouseDown={onSplitDragStart}
          className="w-1.5 bg-[#19191B] border-x border-[#0A0A0B] cursor-col-resize flex justify-center items-center hover:bg-accent-green/40 transition-colors shrink-0 z-20 group"
        >
          <div className="w-px h-8 bg-white/20 group-hover:bg-white/80 rounded-full" />
        </div>

        {/* Result Textarea */}
        <div className="relative flex flex-col h-full" style={{ width: `${(1 - layout.editorSplitRatio) * 100}%` }}>
          <div className="absolute top-2 right-4 text-xs font-mono text-[#D4AF37] uppercase tracking-wider select-none pointer-events-none pb-2 border-b border-transparent shadow-[#D4AF37]">
            Translation ({to})
          </div>
          <textarea
            ref={resultRef}
            placeholder="번역 결과가 여기에 표시됩니다..."
            className="flex-1 w-full resize-none bg-[#111113]/50 outline-none p-6 pt-10 text-[15px] leading-relaxed text-text-primary font-sans transition-colors placeholder:text-white/10"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
