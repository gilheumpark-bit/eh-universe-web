import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useTranslator } from '../core/TranslatorContext';
import { useTranslatorLayout } from '../core/TranslatorLayoutContext';
import { ArrowLeftRight, Settings2, Focus, AlignLeft, Zap, MessageSquare, Shield, BookOpen, HardDrive } from 'lucide-react';
import { ContextMenu } from '@/components/code-studio/ContextMenu';
import { useTextAreaContextMenu } from '@/lib/hooks/useTextAreaContextMenu';

export function BilateralEditor() {
  const { source, setSource, result, setResult, from, to, setFrom, setTo, isZenMode, setIsZenMode, isCatMode, langKo, autoSaveLabel } = useTranslator();
  const layout = useTranslatorLayout();
  
  const [syncedScrolling, setSyncedScrolling] = useState(true);
  
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLTextAreaElement>(null);
  const textMenu = useTextAreaContextMenu(langKo ? 'KO' : 'EN');
  
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
      <div className="absolute inset-0 z-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: bgImage, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(30px) saturate(150%)' }} />
      <div className="absolute inset-0 z-0 bg-linear-to-b from-bg-primary/60 via-bg-primary/30 to-bg-primary/90 pointer-events-none" />

      {/* Editor Header */}
      <div className="w-full border-b border-border shrink-0 z-10 bg-bg-primary/60 backdrop-blur-xl shadow-sm">
        <div className="flex items-center px-2 sm:px-5 h-12 sm:h-14 justify-between gap-1">
          {/* Left: save + language selectors */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 min-w-0 flex-1">
            <span
              className="hidden lg:block max-w-[120px] truncate text-[10px] font-mono text-text-tertiary/90"
              title={autoSaveLabel}
            >
              {autoSaveLabel}
            </span>
            <button
              type="button"
              title={langKo ? '저장·백업 패널 열기 (JSON·일괄보내기)' : 'Open save & backup panel'}
              onClick={() => layout.setActiveLeftPanel('backup')}
              className={`shrink-0 flex items-center justify-center rounded-lg border p-1.5 sm:px-2.5 sm:py-1.5 text-[10px] font-semibold transition-all ${
                layout.activeLeftPanel === 'backup'
                  ? 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber'
                  : 'border-border bg-bg-secondary/50 text-text-tertiary hover:border-accent-amber/25 hover:text-accent-amber'
              }`}
            >
              <HardDrive className="h-3.5 w-3.5" />
              <span className="hidden md:inline ml-1">{langKo ? '저장' : 'Save'}</span>
            </button>
            <div className="flex items-center bg-bg-secondary/30 rounded-lg p-0.5 sm:p-1 border border-border shrink-0 min-w-0">
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-transparent text-[11px] sm:text-sm font-medium text-text-secondary px-1.5 sm:px-3 py-1 sm:py-1.5 outline-none cursor-pointer rounded-md transition-colors appearance-none min-w-0"
              >
                <option value="ja" className="bg-bg-secondary">JA</option>
                <option value="en" className="bg-bg-secondary">EN</option>
                <option value="zh" className="bg-bg-secondary">ZH</option>
                <option value="ko" className="bg-bg-secondary">KO</option>
              </select>
              <button
                className="px-1 sm:px-2.5 py-1 text-text-tertiary hover:text-accent-amber rounded-md transition-all shrink-0"
                onClick={() => { const t = from; setFrom(to); setTo(t); }}
                title="서로 바꾸기 (Swap Languages)"
              >
                <ArrowLeftRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-transparent text-[11px] sm:text-sm font-medium text-text-secondary px-1.5 sm:px-3 py-1 sm:py-1.5 outline-none cursor-pointer rounded-md transition-colors appearance-none min-w-0"
              >
                <option value="ko" className="bg-bg-secondary">KO</option>
                <option value="ja" className="bg-bg-secondary">JA</option>
                <option value="en" className="bg-bg-secondary">EN</option>
                <option value="zh" className="bg-bg-secondary">ZH</option>
              </select>
            </div>
          </div>

          {/* Right: panel toggle icons */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
            {(
              [
                { id: 'actions' as const, icon: Zap, title: 'Translate / Pipeline' },
                { id: 'chat' as const, icon: MessageSquare, title: 'Copilot' },
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
                className={`rounded-lg border p-1.5 sm:p-2 transition-all duration-300 ${
                  layout.activeRightPanel === id
                    ? 'border-accent-purple/40 bg-accent-purple/10 text-accent-purple'
                    : 'border-transparent text-text-tertiary hover:border-border hover:bg-bg-secondary/50 hover:text-text-primary'
                }`}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              title="Sync Scroll"
              onClick={() => setSyncedScrolling(!syncedScrolling)}
              className={`p-1.5 sm:p-2 rounded-lg transition-all ${syncedScrolling ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-tertiary hover:text-text-primary'}`}
            >
              <AlignLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              title="Zen Mode"
              onClick={() => setIsZenMode(!isZenMode)}
              className={`p-1.5 sm:p-2 rounded-lg transition-all ${isZenMode ? 'bg-accent-green/10 text-accent-green' : 'text-text-tertiary hover:text-text-primary'}`}
            >
              <Focus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              title={langKo ? '설정·로그인·저장/백업' : 'Settings, sign-in, save & backup'}
              onClick={() => layout.setActiveLeftPanel('settings')}
              className="p-1.5 sm:p-2 rounded-lg text-text-tertiary hover:text-text-primary transition-all"
            >
              <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
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
            className="flex-1 w-full resize-none bg-transparent outline-none p-8 pt-12 text-[15px] leading-[1.8] text-text-secondary font-sans transition-colors placeholder:text-text-tertiary/50 placeholder:font-light"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onContextMenu={textMenu.openMenu}
            spellCheck={false}
          />
        </div>

        {/* Center Resize Handle */}
        <div
          onMouseDown={onSplitDragStart}
          className="w-1.5 bg-border/40 backdrop-blur-md border-x border-border/30 cursor-col-resize flex flex-col justify-center items-center hover:bg-accent-amber/20 transition-all duration-300 shrink-0 z-20 group relative"
        >
          {/* Handle Core */}
          <div className="w-[2px] h-12 bg-white/10 group-hover:bg-accent-amber/80 rounded-full transition-colors duration-300 shadow-[0_0_10px_rgba(251,191,36,0)] group-hover:shadow-[0_0_10px_rgba(251,191,36,0.5)] flex flex-col gap-1 items-center justify-center py-2">
			<div className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-white/80 transition-colors"></div>
			<div className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-white/80 transition-colors"></div>
			<div className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-white/80 transition-colors"></div>
		  </div>
        </div>

        {/* Result Textarea */}
        <div className="relative flex flex-col h-full bg-bg-secondary/40 hover:bg-bg-secondary/60 transition-colors duration-500 shadow-[inset_1px_0_6px_rgba(0,0,0,0.08)]" style={{ width: `${(1 - layout.editorSplitRatio) * 100}%` }}>
          <div className="absolute top-4 right-5 text-[11px] font-mono text-accent-amber/80 uppercase tracking-[0.2em] select-none pointer-events-none drop-shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-amber/80 inline-block shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
            Translation ({to})
          </div>
          <textarea
            ref={resultRef}
            placeholder="번역 결과가 여기에 표시됩니다..."
            className="flex-1 w-full resize-none bg-transparent outline-none p-8 pt-12 text-[15px] leading-[1.8] text-text-primary font-sans transition-colors placeholder:text-text-tertiary/50 placeholder:font-light"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            onContextMenu={textMenu.openMenu}
            spellCheck={false}
          />
        </div>
      </div>
      {textMenu.menuState && (
        <ContextMenu
          x={textMenu.menuState.x}
          y={textMenu.menuState.y}
          items={textMenu.items}
          onSelect={textMenu.handleSelect}
          onClose={textMenu.closeMenu}
        />
      )}
    </div>
  );
}
