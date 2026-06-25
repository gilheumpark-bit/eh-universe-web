import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useTranslator } from '../core/TranslatorContext';
import { useTranslatorLayout } from '../core/TranslatorLayoutContext';
import { ArrowLeftRight, Settings2, Focus, AlignLeft, Zap, MessageSquare, Shield, BookOpen, HardDrive, Play, Loader2, GitCompare, Sparkles, CheckSquare, Stamp, Globe2 } from 'lucide-react';
import { ContextMenu } from '@/components/ui/ContextMenu';
import { useTextAreaContextMenu } from '@/lib/hooks/useTextAreaContextMenu';
import { useSVIRecorder } from '@/hooks/useSVIRecorder';
import { highlightGlossaryTerms } from '../panels/GlossaryPanel';
import { TRANSLATOR_LAYOUT_LIMITS, clampEditorSplitRatio } from '../core/TranslatorLayoutContext';

type SideView = 'A' | 'B' | 'diff';

/** 단순 라인 기준 diff — A와 B의 각 라인을 비교, same/added/removed 태그 */
function computeLineDiff(a: string, b: string): { tag: 'same' | 'a' | 'b' | 'change'; text: string }[] {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const max = Math.max(aLines.length, bLines.length);
  const out: { tag: 'same' | 'a' | 'b' | 'change'; text: string }[] = [];
  for (let i = 0; i < max; i++) {
    const al = aLines[i] ?? '';
    const bl = bLines[i] ?? '';
    if (al === bl) out.push({ tag: 'same', text: al });
    else if (!al) out.push({ tag: 'b', text: bl });
    else if (!bl) out.push({ tag: 'a', text: al });
    else out.push({ tag: 'change', text: `A: ${al}\nB: ${bl}` });
  }
  return out;
}

export function BilateralEditor() {
  const {
    source, setSource,
    result, setResult,
    from, to, setFrom, setTo,
    isZenMode, setIsZenMode,
    isCatMode, langKo, autoSaveLabel,
    translate, loading, glossary,
    compareResultB, setCompareResultB, runCompareB,
    patchActiveChapter,
  } = useTranslator();
  const layout = useTranslatorLayout();

  const [syncedScrolling, setSyncedScrolling] = useState(true);
  const [sideView, setSideView] = useState<SideView>('A');
  const { handleSVIKeyDown } = useSVIRecorder();

  // ── D3 키보드 단축키 — Alt+A/B/D 탭 전환, Alt+G B안 만들기 ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 포커스가 textarea/input에 있을 때는 상쇄 (사용자 입력 방해 방지)
      const target = e.target as HTMLElement | null;
      const inEditor = target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT');
      if (inEditor) return;
      if (!e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'a') { e.preventDefault(); setSideView('A'); }
      else if (k === 'b') { e.preventDefault(); setSideView('B'); }
      else if (k === 'd') {
        if (result.trim() && compareResultB.trim()) {
          e.preventDefault();
          setSideView('diff');
        }
      }
      else if (k === 'g') {
        if (source.trim() && !loading) {
          e.preventDefault();
          void runCompareB();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [result, compareResultB, source, loading, runCompareB]);

  // Glossary highlight overlay for source text
  const glossaryTerms = useMemo(() => Object.keys(glossary ?? {}), [glossary]);
  const sourceHighlightHtml = useMemo(
    () => glossaryTerms.length > 0 ? highlightGlossaryTerms(source, glossaryTerms) + '\n' : '',
    [source, glossaryTerms],
  );
  const highlightRef = useRef<HTMLDivElement>(null);
  const editorBodyRef = useRef<HTMLDivElement>(null);
  
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLTextAreaElement>(null);
  const textMenu = useTextAreaContextMenu(langKo ? 'KO' : 'EN');
  
  const isDraggingSplit = useRef(false);

  const handleSourceChange = useCallback((next: string) => {
    setSource(next);
    patchActiveChapter({ content: next });
  }, [patchActiveChapter, setSource]);

  const handleResultChange = useCallback((next: string) => {
    setResult(next);
    patchActiveChapter({ result: next });
  }, [patchActiveChapter, setResult]);

  const handleSwapLanguages = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const nextFrom = to;
    const nextTo = from;
    const shouldSwapText = result.trim().length > 0;
    setFrom(nextFrom);
    setTo(nextTo);
    if (shouldSwapText) {
      setSource(result);
      setResult(source);
      setCompareResultB('');
      patchActiveChapter({
        content: result,
        result: source,
        isDone: source.trim().length > 0,
      });
    }
    window.dispatchEvent(new CustomEvent('noa:toast', {
      detail: {
        message: langKo
          ? shouldSwapText
            ? `언어와 본문 위치를 바꿨습니다: ${nextFrom.toUpperCase()} → ${nextTo.toUpperCase()}`
            : `언어 방향: ${nextFrom.toUpperCase()} → ${nextTo.toUpperCase()}`
          : shouldSwapText
            ? `Swapped language pair and text: ${nextFrom.toUpperCase()} → ${nextTo.toUpperCase()}`
            : `Language direction: ${nextFrom.toUpperCase()} → ${nextTo.toUpperCase()}`,
        variant: 'info',
        duration: 1600,
      },
    }));
  }, [from, langKo, patchActiveChapter, result, setCompareResultB, setFrom, setResult, setSource, setTo, source, to]);

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

    const handleSrcScroll = () => {
      syncFrom(src, res);
      // Sync glossary highlight overlay scroll
      if (highlightRef.current) {
        highlightRef.current.scrollTop = src.scrollTop;
      }
    };
    const handleResScroll = () => syncFrom(res, src);

    src.addEventListener('scroll', handleSrcScroll);
    res.addEventListener('scroll', handleResScroll);

    return () => {
      src.removeEventListener('scroll', handleSrcScroll);
      res.removeEventListener('scroll', handleResScroll);
    };
    // [fix] sideView 추가: A/B/diff 전환 시 result textarea가 언마운트/재마운트되므로
    // 이 effect를 재실행해 새 textarea(resultRef.current)에 스크롤 리스너를 다시 붙인다.
    // (sideView 누락 시 스테일/null ref에 리스너가 남아 동기 스크롤이 끊김)
  }, [syncedScrolling, sideView]);

  // Center Split Resizer (for Bilateral ratio)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplit.current) return;
      const rect = editorBodyRef.current?.getBoundingClientRect();
      if (!rect || rect.width < 320) return;
      const mouseRelative = e.clientX - rect.left;
      layout.setEditorSplitRatio(clampEditorSplitRatio(mouseRelative / rect.width));
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
    <div className="translator-editor-shell w-full h-full flex flex-col relative overflow-hidden bg-bg-primary">
      {/* Background Decor (Glassmorphism) */}
      <div className="translator-editor-atmosphere absolute inset-0 z-0 opacity-[0.025] pointer-events-none" style={{ backgroundImage: bgImage, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(18px) saturate(115%)' }} />
      <div className="absolute inset-0 z-0 bg-linear-to-b from-bg-primary/80 via-bg-primary/70 to-bg-primary/95 pointer-events-none" />

      {/* Editor Header */}
      <div className="translator-editor-topbar w-full border-b border-border shrink-0 z-10 bg-bg-primary/90 backdrop-blur-xl shadow-sm">
        <div className="flex h-auto min-h-12 flex-wrap items-center justify-between gap-2 px-2 py-1.5 sm:min-h-14 sm:px-5">
          {/* Left: save + language selectors */}
          <div className="translator-editor-primary-controls flex max-w-full flex-[1_1_280px] flex-wrap items-center gap-1 sm:gap-2 md:gap-4 min-w-0">
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
              className={`shrink-0 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border px-2 py-2 sm:px-2.5 sm:py-1.5 text-[10px] font-semibold transition-[transform,opacity,background-color,border-color,color] ${
                layout.activeLeftPanel === 'backup'
                  ? 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber'
                  : 'border-border bg-bg-secondary/50 text-text-tertiary hover:border-accent-amber/25 hover:text-accent-amber'
              }`}
            >
              <HardDrive className="h-3.5 w-3.5" />
              <span className="hidden md:inline ml-1">{langKo ? '저장' : 'Save'}</span>
            </button>
            <div className="flex flex-none items-center gap-1 bg-bg-secondary/30 rounded-lg p-0.5 sm:p-1 border border-border">
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label={langKo ? '원문 언어' : 'Source language'}
                className="min-h-[44px] w-[64px] shrink-0 appearance-none rounded-md bg-bg-primary px-1.5 py-1 text-[11px] font-semibold text-text-primary outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent-blue/50 sm:w-[72px] sm:px-3 sm:py-1.5 sm:text-sm"
              >
                <option value="ja" className="bg-bg-secondary text-text-primary">JP</option>
                <option value="en" className="bg-bg-secondary text-text-primary">EN</option>
                <option value="zh" className="bg-bg-secondary text-text-primary">CN</option>
                <option value="ko" className="bg-bg-secondary text-text-primary">KO</option>
              </select>
              <button
                type="button"
                aria-label={langKo ? '언어와 본문 위치 바꾸기' : 'Swap language pair and text'}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md px-2 text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-accent-amber shrink-0 focus-visible:ring-2 focus-visible:ring-accent-blue/50"
                onClick={handleSwapLanguages}
                title={langKo ? '언어와 본문 위치 바꾸기' : 'Swap language pair and text'}
              >
                <ArrowLeftRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label={langKo ? '번역 언어' : 'Target language'}
                className="min-h-[44px] w-[64px] shrink-0 appearance-none rounded-md bg-bg-primary px-1.5 py-1 text-[11px] font-semibold text-text-primary outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent-blue/50 sm:w-[72px] sm:px-3 sm:py-1.5 sm:text-sm"
              >
                <option value="ko" className="bg-bg-secondary text-text-primary">KO</option>
                <option value="ja" className="bg-bg-secondary text-text-primary">JP</option>
                <option value="en" className="bg-bg-secondary text-text-primary">EN</option>
                <option value="zh" className="bg-bg-secondary text-text-primary">CN</option>
              </select>
            </div>
          </div>

          {/* Right: panel toggle icons */}
          <div className="translator-editor-secondary-controls flex max-w-full flex-[1_1_320px] items-center justify-end gap-0.5 overflow-x-auto rounded-lg sm:gap-1.5">
            {(
              [
                { id: 'actions' as const, icon: Zap, title: langKo ? '번역 실행' : 'Translate / Pipeline' },
                { id: 'chat' as const, icon: MessageSquare, title: langKo ? '노아 보조' : 'Noa support' },
                { id: 'audit' as const, icon: Shield, title: langKo ? '품질 점검' : 'Quality review' },
                { id: 'localization' as const, icon: Globe2, title: langKo ? '현지 판단' : 'Localization review' },
                { id: 'adoption' as const, icon: CheckSquare, title: langKo ? '단락별 채택' : 'Segment adoption' },
                { id: 'signoff' as const, icon: Stamp, title: langKo ? '작가 승인' : 'Author approval' },
                { id: 'reference' as const, icon: BookOpen, title: langKo ? '참조 컨텍스트' : 'Context notes' },
              ] as const
            ).map(({ id, icon: Icon, title }) => (
              <button
                key={id}
                type="button"
                aria-label={title}
                aria-pressed={layout.activeRightPanel === id}
                title={title}
                onClick={() => {
                  if (isZenMode) setIsZenMode(false);
                  layout.setActiveRightPanel(layout.activeRightPanel === id ? null : id);
                }}
                className={`min-h-[44px] min-w-[44px] rounded-lg border p-1.5 sm:p-2 transition-[transform,opacity,background-color,border-color,color] duration-300 ${
                  layout.activeRightPanel === id
                    ? 'border-accent-purple/40 bg-accent-purple/10 text-accent-purple'
                    : 'border-transparent text-text-tertiary hover:border-border hover:bg-bg-secondary/50 hover:text-text-primary'
                }`}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            ))}
          </div>
          <div className="translator-editor-utility-controls flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              type="button"
              aria-label={langKo ? '좌우 스크롤 맞추기' : 'Sync scroll'}
              aria-pressed={syncedScrolling}
              title={langKo ? '좌우 스크롤 맞추기' : 'Sync scroll'}
              onClick={() => setSyncedScrolling(!syncedScrolling)}
              className={`min-h-[44px] min-w-[44px] p-1.5 sm:p-2 rounded-lg transition-colors ${syncedScrolling ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-tertiary hover:text-text-primary'}`}
            >
              <AlignLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              aria-label={langKo ? '집중 모드' : 'Focus mode'}
              aria-pressed={isZenMode}
              title={langKo ? '집중 모드' : 'Focus mode'}
              onClick={() => setIsZenMode(!isZenMode)}
              className={`min-h-[44px] min-w-[44px] p-1.5 sm:p-2 rounded-lg transition-colors ${isZenMode ? 'bg-accent-green/10 text-accent-green' : 'text-text-tertiary hover:text-text-primary'}`}
            >
              <Focus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              aria-label={langKo ? '설정·로그인·저장/백업' : 'Settings, sign-in, save & backup'}
              title={langKo ? '설정·로그인·저장/백업' : 'Settings, sign-in, save & backup'}
              onClick={() => { if (isZenMode) setIsZenMode(false); layout.setActiveLeftPanel('settings'); }}
              className="min-h-[44px] min-w-[44px] p-1.5 sm:p-2 rounded-lg text-text-tertiary hover:text-text-primary transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Editor Body (Bilateral Split) */}
      <div className="flex-1 flex overflow-hidden z-10 w-full relative" ref={editorBodyRef}>
        {/* Source Textarea — warm tone */}
        <div className="relative flex flex-col h-full bg-[color-mix(in_srgb,var(--color-bg-primary)_94%,#f59e0b_6%)] hover:bg-[color-mix(in_srgb,var(--color-bg-primary)_90%,#f59e0b_10%)] transition-colors duration-500 border-r border-border/20" style={{ width: `${clampEditorSplitRatio(layout.editorSplitRatio) * 100}%` }}>
          <div className="absolute top-4 left-5 right-5 flex items-center justify-between select-none pointer-events-none z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-amber inline-block shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
              <span className="translator-editor-label block max-w-[92px] truncate whitespace-nowrap text-[11px] font-mono uppercase tracking-[0.2em] font-bold">
                {langKo ? `원문 (${from.toUpperCase()})` : `Source (${from})`}
              </span>
            </div>
            <span className="translator-editor-count text-[9px] font-mono font-semibold">{source.length.toLocaleString()}{langKo ? '자' : ' chars'}</span>
          </div>
          {/* Glossary highlight overlay */}
          {glossaryTerms.length > 0 && sourceHighlightHtml && (
            <div
              ref={highlightRef}
              aria-hidden="true"
              className="absolute inset-0 p-8 pt-12 text-[15px] leading-[1.8] font-sans whitespace-pre-wrap break-words overflow-hidden pointer-events-none text-transparent"
              dangerouslySetInnerHTML={{ __html: sourceHighlightHtml }}
            />
          )}
          <textarea
            ref={sourceRef}
            aria-label={langKo ? "원문 입력" : "Source text"}
            placeholder={langKo ? "여기에 원문을 입력하세요...\n\n붙여넣기 또는 직접 입력" : "Enter source text here...\n\nPaste or type directly"}
            className="translator-editor-field flex-1 w-full resize-none outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 p-8 pt-14 text-[15px] leading-[1.8] font-sans transition-colors placeholder:text-[15px] placeholder:leading-[1.8] relative z-[1]"
            value={source}
            onChange={(e) => handleSourceChange(e.target.value)}
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
            aria-label={langKo ? '번역 실행' : 'Translate'}
            onClick={() => { if (source.trim() && !loading) translate(); }}
            disabled={!source.trim() || loading}
            className={`absolute -left-[22px] top-1/2 -translate-y-1/2 z-30 flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center rounded-full shadow-lg transition-[transform,opacity,background-color,border-color,color] ${
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
            className="w-1.5 h-full bg-border/40 backdrop-blur-md border-x border-border/30 cursor-col-resize flex flex-col justify-center items-center hover:bg-accent-amber/20 transition-colors duration-300 group"
            role="separator"
            aria-orientation="vertical"
            aria-valuemin={Math.round(TRANSLATOR_LAYOUT_LIMITS.editorSplitMin * 100)}
            aria-valuemax={Math.round(TRANSLATOR_LAYOUT_LIMITS.editorSplitMax * 100)}
            aria-valuenow={Math.round(clampEditorSplitRatio(layout.editorSplitRatio) * 100)}
            aria-label={langKo ? '원문과 번역문 폭 조절' : 'Resize source and translation panes'}
          >
            <div className="w-[2px] h-12 bg-border/50 group-hover:bg-accent-amber/80 rounded-full transition-colors duration-300 shadow-[0_0_10px_rgba(251,191,36,0)] group-hover:shadow-[0_0_10px_rgba(251,191,36,0.5)] flex flex-col gap-1 items-center justify-center py-2">
              <div className="w-1 h-1 rounded-full bg-text-tertiary/40 group-hover:bg-accent-amber transition-colors"></div>
              <div className="w-1 h-1 rounded-full bg-text-tertiary/40 group-hover:bg-accent-amber transition-colors"></div>
              <div className="w-1 h-1 rounded-full bg-text-tertiary/40 group-hover:bg-accent-amber transition-colors"></div>
            </div>
          </div>
        </div>

        {/* Result Textarea — cool tone. A/B/Diff 토글 지원. */}
        <div className="relative flex flex-col h-full bg-[color-mix(in_srgb,var(--color-bg-secondary)_94%,#3b82f6_6%)] hover:bg-[color-mix(in_srgb,var(--color-bg-secondary)_90%,#3b82f6_10%)] transition-colors duration-500 shadow-[inset_1px_0_6px_rgba(0,0,0,0.06)]" style={{ width: `${(1 - clampEditorSplitRatio(layout.editorSplitRatio)) * 100}%` }}>
          {/* Header: 라벨 + A/B/Diff 토글 + 카운트 */}
          <div className="absolute top-4 left-5 right-5 z-10 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <div className="flex min-w-0 items-center gap-2 select-none pointer-events-none">
              <span className={`w-2.5 h-2.5 rounded-full inline-block ${sideView === 'B' ? 'bg-accent-purple shadow-[0_0_8px_rgba(167,139,250,0.6)]' : sideView === 'diff' ? 'bg-accent-green shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-accent-blue shadow-[0_0_8px_rgba(59,130,246,0.6)]'}`}></span>
              <span className="translator-editor-label block max-w-[92px] truncate whitespace-nowrap text-[11px] font-mono uppercase tracking-[0.2em] font-bold">
                {sideView === 'B'
                  ? langKo
                    ? '비교안'
                    : 'B draft'
                  : sideView === 'diff'
                    ? (langKo ? '차이 비교' : 'Diff')
                    : langKo
                      ? '번역문'
                      : 'Translation'}
              </span>
            </div>
            {/* A/B/Diff 토글 + B안 만들기 버튼 (키보드: Alt+A/B/D, Alt+G = B안 만들기) */}
            <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-end gap-1">
              <div
                role="tablist"
                aria-label={langKo ? '번역 결과 뷰 전환' : 'Translation view selector'}
                className="flex shrink-0 items-center overflow-hidden rounded-md border border-border/50 bg-bg-secondary/70 shadow-sm"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={sideView === 'A'}
                  aria-controls="translation-result-panel"
                  onClick={() => setSideView('A')}
                  className={`min-h-[44px] min-w-[44px] px-2 py-1 text-[10px] font-mono font-bold transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${sideView === 'A' ? 'bg-bg-primary text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                  title={langKo ? '기본 번역 결과 (Alt+A)' : 'Primary translation (Alt+A)'}
                >A</button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sideView === 'B'}
                  aria-controls="translation-result-panel"
                  onClick={() => setSideView('B')}
                  className={`min-h-[44px] min-w-[44px] border-l border-border/50 px-2 py-1 text-[10px] font-mono font-bold transition-colors focus-visible:ring-2 focus-visible:ring-accent-purple/50 ${sideView === 'B' ? 'bg-bg-primary text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                  title={langKo ? '대체 엔진 B안 (Alt+B)' : 'Alt engine B (Alt+B)'}
                >B</button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sideView === 'diff'}
                  aria-controls="translation-result-panel"
                  aria-label={langKo ? '두 안 차이 비교' : 'Compare A vs B'}
                  onClick={() => setSideView('diff')}
                  disabled={!result.trim() || !compareResultB.trim()}
                  className={`min-h-[44px] min-w-[44px] border-l border-border/50 px-2 py-1 text-[10px] font-mono font-bold transition-colors disabled:cursor-not-allowed disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:opacity-100 focus-visible:ring-2 focus-visible:ring-accent-green/50 ${sideView === 'diff' ? 'bg-bg-primary text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                  title={langKo ? '두 안 차이 비교 (Alt+D)' : 'Diff A vs B (Alt+D)'}
                ><GitCompare className="w-3 h-3" aria-hidden="true" /></button>
              </div>
              {/* B 재번역 버튼 (A 또는 B 보기 중일 때 노출) */}
              {sideView !== 'diff' && (
                <button
                  type="button"
                  onClick={() => { if (source.trim() && !loading) void runCompareB(); }}
                  disabled={!source.trim() || loading}
                  aria-label={langKo ? '비교안 다시 만들기 (Alt+G)' : 'Generate alt B (Alt+G)'}
                  className="flex min-h-[44px] items-center gap-1 rounded-md border border-border bg-bg-primary px-2 py-1 text-[10px] font-mono font-bold text-text-primary transition-colors hover:bg-bg-secondary disabled:cursor-not-allowed disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:opacity-100 focus-visible:ring-2 focus-visible:ring-accent-purple/50"
                  title={langKo ? '다른 엔진으로 비교안 다시 만들기 (Alt+G)' : 'Generate B via alt engine (Alt+G)'}
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Sparkles className="w-3 h-3" aria-hidden="true" />}
                  <span>{langKo ? '비교안' : 'B draft'}</span>
                </button>
              )}
              <span className="translator-editor-count pointer-events-none min-w-[2ch] whitespace-nowrap text-[10px] font-mono font-bold">
                {sideView === 'B'
                  ? `${compareResultB.length.toLocaleString()}${langKo ? '자' : ' chars'}`
                  : sideView === 'diff'
                    ? (langKo ? `A·B 비교` : `A/B diff`)
                    : `${result.length.toLocaleString()}${langKo ? '자' : ' chars'}${source.length > 0 ? ` (${Math.round((result.length / source.length) * 100)}%)` : ''}`}
              </span>
            </div>
          </div>

          {/* A view */}
          {sideView === 'A' && (
            <textarea
              id="translation-result-panel"
              aria-label={langKo ? '번역 결과' : 'Primary translation'}
              ref={resultRef}
              placeholder={langKo ? "번역 결과가 여기에 표시됩니다.\n\n왼쪽에 원문을 입력하고 번역 실행을 누르세요." : "Translation results appear here.\n\nEnter source text and run translation."}
              className="translator-editor-field flex-1 w-full resize-none outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 p-8 pt-24 text-[15px] leading-[1.8] font-sans transition-colors placeholder:text-[15px] placeholder:leading-[1.8]"
              value={result}
              onChange={(e) => handleResultChange(e.target.value)}
              onContextMenu={textMenu.openMenu}
              spellCheck={false}
            />
          )}

          {/* B view */}
          {sideView === 'B' && (
            <>
              {compareResultB.trim().length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 pt-24">
                  <Sparkles className="w-10 h-10 text-accent-purple/30" />
                  <p className="text-[13px] text-text-secondary text-center max-w-xs">
                    {langKo ? '아직 비교안이 없습니다.' : 'No B translation yet.'}
                  </p>
                  <p className="text-[11px] text-text-tertiary text-center max-w-xs leading-relaxed">
                    {langKo
                      ? '위의 [비교안] 버튼을 누르면 다른 엔진으로 같은 원문을 다시 번역합니다.'
                      : 'Click [B draft] above to re-translate the same source with another engine.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => { if (source.trim() && !loading) void runCompareB(); }}
                    disabled={!source.trim() || loading}
                    className="mt-2 flex items-center gap-2 rounded-lg border border-accent-purple/40 bg-accent-purple/15 px-4 py-2 text-[12px] font-bold text-accent-purple transition-colors hover:bg-accent-purple/25 disabled:cursor-not-allowed disabled:border-border disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:opacity-100"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {langKo ? '비교안 만들기' : 'Generate B'}
                  </button>
                </div>
              ) : (
                <textarea
                  placeholder={langKo ? '비교안 번역이 여기에 표시됩니다…' : 'B translation appears here…'}
                  className="translator-editor-field flex-1 w-full resize-none outline-none focus-visible:ring-2 focus-visible:ring-accent-purple/50 p-8 pt-24 text-[15px] leading-[1.8] font-sans transition-colors"
                  value={compareResultB}
                  onChange={(e) => setCompareResultB(e.target.value)}
                  onContextMenu={textMenu.openMenu}
                  spellCheck={false}
                />
              )}
            </>
          )}

          {/* Diff view */}
          {sideView === 'diff' && (
            <div className="flex-1 overflow-y-auto p-6 pt-24 text-[13px] leading-[1.7] font-mono">
              {computeLineDiff(result, compareResultB).map((line, i) => (
                <div
                  key={i}
                  className={`whitespace-pre-wrap ${
                    line.tag === 'same'
                      ? 'text-text-tertiary'
                      : line.tag === 'a'
                        ? 'bg-accent-blue/10 text-accent-blue'
                        : line.tag === 'b'
                          ? 'bg-accent-purple/10 text-accent-purple'
                          : 'bg-accent-amber/10 text-accent-amber border-l-2 border-accent-amber pl-2'
                  }`}
                >
                  {line.text || '\u00A0'}
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-border/50 flex gap-4 text-[10px] text-text-tertiary">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-accent-blue/60 rounded"></span>A 전용</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-accent-purple/60 rounded"></span>B 전용</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-accent-amber/60 rounded"></span>다름</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-text-tertiary/30 rounded"></span>같음</span>
              </div>
            </div>
          )}
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
