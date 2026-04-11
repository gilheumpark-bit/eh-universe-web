import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useTranslator } from '../core/TranslatorContext';
import { useTranslatorLayout } from '../core/TranslatorLayoutContext';
import { ArrowLeftRight, Settings2, Focus, AlignLeft, Zap, MessageSquare, Shield, BookOpen, HardDrive, Play, Loader2 } from 'lucide-react';
import { ContextMenu } from '@/components/code-studio/ContextMenu';
import { useTextAreaContextMenu } from '@/lib/hooks/useTextAreaContextMenu';
import { useSVIRecorder } from '@/hooks/useSVIRecorder';

export function BilateralEditor() {
  const { source, setSource, result, setResult, from, to, setFrom, setTo, isZenMode, setIsZenMode, isCatMode, langKo, autoSaveLabel, translate, loading } = useTranslator();
  const layout = useTranslatorLayout();
  
  const [syncedScrolling, setSyncedScrolling] = useState(true);
  const { handleSVIKeyDown } = useSVIRecorder();
  
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

    let isSyncing = false;

    const syncFrom = (from: HTMLTextAreaElement, to: HTMLTextAreaElement) => {
      if (isSyncing) return;
      isSyncing = true;
      const maxScroll = from.scrollHeight - from.clientHeight;
      const pct = maxScroll > 0 ? from.scrollTop / maxScroll : 0;
      to.scrollTop = pct * (to.scrollHeight - to.clientHeight);
      requestAnimationFrame(() => { isSyncing = false; });
    };

    const handleSrcScroll = () => syncFrom(src, res);
    const handleResScroll = () => syncFrom(res, src);

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
    : 'none';

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-bg-primary">
      {/* Background Decor (Glassmorphism) */}
      <div className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: bgImage, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(30px) saturate(150%)' }} />
      <div className="absolute inset-0 z-0 bg-linear-to-b from-bg-primary/80 via-bg-primary/70 to-bg-primary/95 pointer-events-none" />

      {/* Editor Header */}
      <div className="w-full border-b border-border shrink-0 z-10 bg-bg-primary/90 backdrop-blur-xl shadow-sm">
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
              onClick={() => { if (isZenMode) setIsZenMode(false); layout.setActiveLeftPanel('backup'); }}
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
                <option value="ja" className="bg-bg-secondary text-text-primary">JP</option>
                <option value="en" className="bg-bg-secondary text-text-primary">EN</option>
                <option value="zh" className="bg-bg-secondary text-text-primary">CN</option>
                <option value="ko" className="bg-bg-secondary text-text-primary">KO</option>
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
                <option value="ko" className="bg-bg-secondary text-text-primary">KO</option>
                <option value="ja" className="bg-bg-secondary text-text-primary">JP</option>
                <option value="en" className="bg-bg-secondary text-text-primary">EN</option>
                <option value="zh" className="bg-bg-secondary text-text-primary">CN</option>
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
                onClick={() => {
                  if (isZenMode) setIsZenMode(false);
                  layout.setActiveRightPanel(layout.activeRightPanel === id ? null : id);
                }}
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
              onClick={() => { if (isZenMode) setIsZenMode(false); layout.setActiveLeftPanel('settings'); }}
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
        <div className="relative flex flex-col h-full bg-bg-primary hover:bg-bg-secondary/30 transition-colors duration-500" style={{ width: `${layout.editorSplitRatio * 100}%` }}>
          <div className="absolute top-4 right-5 text-[11px] font-mono text-text-secondary uppercase tracking-[0.2em] select-none pointer-events-none drop-shadow-sm flex items-center gap-3">
            <span className="text-[9px] normal-case tracking-normal text-text-tertiary">{source.length.toLocaleString()}{langKo ? '자' : ' chars'}</span>
            <span className="w-2 h-2 rounded-full bg-text-secondary/60 inline-block shadow-[0_0_5px_rgba(128,128,128,0.3)]"></span>
            Source ({from})
          </div>
          <textarea
            ref={sourceRef}
            placeholder="여기에 원문을 입력하세요..."
            className="flex-1 w-full resize-none bg-transparent outline-none p-8 pt-12 text-[15px] leading-[1.8] text-text-primary font-sans transition-colors placeholder:text-text-secondary placeholder:font-light"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onKeyDown={handleSVIKeyDown}
            onContextMenu={textMenu.openMenu}
            spellCheck={false}
          />
        </div>

        {/* Center Resize Handle + Translate Button */}
        <div
          className="relative flex flex-col justify-center items-center shrink-0 z-20"
        >
          {/* Translate Button — 분할선 위 중앙 */}
          <button
            type="button"
            onClick={() => { if (source.trim() && !loading) translate(); }}
            disabled={!source.trim() || loading}
            className={`absolute -left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${
              source.trim() && !loading
                ? 'bg-accent-amber text-white hover:scale-110 hover:shadow-xl cursor-pointer'
                : 'bg-bg-tertiary text-text-tertiary opacity-40 cursor-not-allowed'
            }`}
            title={langKo ? '번역 실행' : 'Translate'}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          {/* Drag Handle */}
          <div
            onMouseDown={onSplitDragStart}
            className="w-1.5 h-full bg-border/40 backdrop-blur-md border-x border-border/30 cursor-col-resize flex flex-col justify-center items-center hover:bg-accent-amber/20 transition-all duration-300 group"
          >
            <div className="w-[2px] h-12 bg-border/50 group-hover:bg-accent-amber/80 rounded-full transition-colors duration-300 shadow-[0_0_10px_rgba(251,191,36,0)] group-hover:shadow-[0_0_10px_rgba(251,191,36,0.5)] flex flex-col gap-1 items-center justify-center py-2">
              <div className="w-1 h-1 rounded-full bg-text-tertiary/40 group-hover:bg-accent-amber transition-colors"></div>
              <div className="w-1 h-1 rounded-full bg-text-tertiary/40 group-hover:bg-accent-amber transition-colors"></div>
              <div className="w-1 h-1 rounded-full bg-text-tertiary/40 group-hover:bg-accent-amber transition-colors"></div>
            </div>
          </div>
        </div>

        {/* Result Textarea */}
        <div className="relative flex flex-col h-full bg-bg-secondary hover:bg-bg-secondary/80 transition-colors duration-500 shadow-[inset_1px_0_6px_rgba(0,0,0,0.08)]" style={{ width: `${(1 - layout.editorSplitRatio) * 100}%` }}>
          <div className="absolute top-4 right-5 text-[11px] font-mono text-accent-amber uppercase tracking-[0.2em] select-none pointer-events-none drop-shadow-sm flex items-center gap-3">
            <span className="text-[9px] normal-case tracking-normal text-text-tertiary">{result.length.toLocaleString()}{langKo ? '자' : ' chars'}{source.length > 0 ? ` (${Math.round((result.length / source.length) * 100)}%)` : ''}</span>
            <span className="w-2 h-2 rounded-full bg-accent-amber inline-block shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
            Translation ({to})
          </div>
          <textarea
            ref={resultRef}
            placeholder="번역 결과가 여기에 표시됩니다..."
            className="flex-1 w-full resize-none bg-transparent outline-none p-8 pt-12 text-[15px] leading-[1.8] text-text-primary font-sans transition-colors placeholder:text-text-secondary placeholder:font-light"
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
