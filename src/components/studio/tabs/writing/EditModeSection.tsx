"use client";

// ============================================================
// EditModeSection — NovelEditor + 품질/연속성/Undo/버전 diff (구 PART 4)
// ============================================================

import React from 'react';
import dynamic from 'next/dynamic';
import { PenLine, Undo2, Redo2, Map as MapIcon } from 'lucide-react';
import type { AppLanguage, StoryConfig, ChatSession, Message, AppTab, ProactiveSuggestion, PipelineStageResult } from '@/lib/studio-types';
import type { DirectorReport } from '@/engine/director';
import type { HFCPState } from '@/engine/hfcp';
import { L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { InlineActionPopup } from '@/components/studio/InlineActionPopup';
import { safeReplaceRange } from '@/lib/rewrite-range';
import { NovelEditor } from '@/components/studio/NovelEditor';
import type { NovelEditorSelection, NovelEditorHandle } from '@/components/studio/NovelEditor';
import type { UndoStack } from '@/hooks/useUndoStack';
import type { ParagraphScore } from '@/hooks/useQualityAnalysis';
import type { ContinuityWarning } from '@/hooks/useContinuityCheck';
import { useEditorScroll } from '@/hooks/useEditorScroll';
import { SplitPanelTabs } from './SplitPanelTabs';

const DynSkeleton = () => <div className="h-8 rounded-lg bg-bg-secondary/50 animate-pulse" />;
const WritingToolbar = dynamic(() => import('@/components/studio/WritingToolbar').then(m => ({ default: m.WritingToolbar })), { ssr: false, loading: DynSkeleton });
const QualityGutter = dynamic(() => import('@/components/studio/QualityGutter'), { ssr: false });
const ContinuityWarnings = dynamic(() => import('@/components/studio/ContinuityWarnings'), { ssr: false });
const VersionDiff = dynamic(() => import('@/components/studio/VersionDiff'), { ssr: false });
const EditorMinimap = dynamic(() => import('@/components/studio/EditorMinimap').then(m => ({ default: m.EditorMinimap })), { ssr: false });

// ============================================================
// 씬 경계 주석 유틸 — ProseMirror 단락을 씬별로 균등 배분한다
// ============================================================
/** 단락 그룹에 data-scene-index 를 부여 — 씬 개수에 맞춰 균등 분할. */
function annotateSceneMarkers(wrapper: HTMLElement | null, sceneCount: number): void {
  if (!wrapper) return;
  try {
    const proseMirror = wrapper.querySelector<HTMLElement>('.ProseMirror');
    if (!proseMirror) return;
    const paragraphs = proseMirror.querySelectorAll<HTMLElement>('p');
    // 기존 표시 제거 후 재할당
    paragraphs.forEach((p) => p.removeAttribute('data-scene-index'));
    if (sceneCount <= 0 || paragraphs.length === 0) return;
    // N 단락을 sceneCount 개 구간으로 분할 — 각 구간의 첫 단락에 인덱스 부여
    const step = paragraphs.length / sceneCount;
    for (let i = 0; i < sceneCount; i++) {
      const idx = Math.floor(i * step);
      if (idx < paragraphs.length) {
        paragraphs[idx].setAttribute('data-scene-index', String(i));
      }
    }
  } catch (err) {
    logger.warn('EditModeSection', 'annotateSceneMarkers failed', err);
  }
}

/** localStorage 키 — 미니맵 표시 토글 영속. */
const MINIMAP_STORAGE_KEY = 'noa_minimap_enabled';

/** localStorage 에서 미니맵 활성 상태를 읽는다 (SSR 안전). */
function readMinimapEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(MINIMAP_STORAGE_KEY);
    if (raw === null) return true; // 기본 ON
    return raw === '1' || raw === 'true';
  } catch {
    return true;
  }
}

export interface QualityState {
  paragraphs: ParagraphScore[];
  averageScore: number;
  weakCount: number;
}

interface EditModeSectionProps {
  language: AppLanguage;
  currentSession: ChatSession;
  editDraft: string;
  setEditDraft: (val: string) => void;
  editDraftRef: React.RefObject<HTMLTextAreaElement | null>;
  novelEditorRef: React.RefObject<NovelEditorHandle | null>;
  novelSelection: NovelEditorSelection | null;
  setNovelSelection: (s: NovelEditorSelection | null) => void;
  quality: QualityState;
  continuityWarnings: ContinuityWarning[];
  undoStack: UndoStack;
  draftVersions: string[];
  draftVersionIdx: number;
  setDraftVersionIdx: (idx: number) => void;
  isDragOver: boolean;
  setIsDragOver: (v: boolean) => void;
  handleFileDrop: (e: React.DragEvent) => void;
  splitView: 'chat' | 'reference' | null;
  setSplitView: (v: 'chat' | 'reference' | null) => void;
  chatMessages: Message[];
  chatLoading: boolean;
  handleChatSend: (msg: string) => void;
  abortChat: () => void;
  clearChat: () => void;
  directorReport: DirectorReport | null;
  hfcpState: HFCPState;
  suggestions: ProactiveSuggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<ProactiveSuggestion[]>>;
  pipelineResult: { stages: PipelineStageResult[]; finalStatus: 'completed' | 'failed' | 'partial' | 'running' } | null;
  setActiveTab: (tab: AppTab) => void;
  hostedProviders: Partial<Record<string, boolean>>;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
}

export function EditModeSection({
  language, currentSession, editDraft, setEditDraft, editDraftRef: _editDraftRef,
  novelEditorRef, novelSelection, setNovelSelection,
  quality, continuityWarnings, undoStack,
  draftVersions, draftVersionIdx, setDraftVersionIdx,
  isDragOver, setIsDragOver, handleFileDrop,
  splitView, setSplitView, chatMessages, chatLoading, handleChatSend, abortChat, clearChat,
  directorReport, hfcpState, suggestions, setSuggestions, pipelineResult,
  setActiveTab, hostedProviders, setConfig,
}: EditModeSectionProps) {
  // ---- 에디터 스크롤 추적 (Minimap sync) ----
  const editorScrollRef = React.useRef<HTMLDivElement | null>(null);
  const [editorScrollState, seekEditorScroll] = useEditorScroll(editorScrollRef);

  // ---- Minimap 표시 상태 (localStorage 영속) ----
  const [minimapEnabled, setMinimapEnabled] = React.useState<boolean>(() => readMinimapEnabled());
  const toggleMinimap = React.useCallback(() => {
    setMinimapEnabled((prev) => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(MINIMAP_STORAGE_KEY, next ? '1' : '0');
        }
      } catch (err) {
        logger.warn('EditModeSection', 'minimap toggle persist failed', err);
      }
      return next;
    });
  }, []);

  // ---- F9 단축키 — 미니맵 토글 (VSCode 유사) ----
  // 입력 포커스 중이어도 허용 — F9는 브라우저 기본 동작 없음
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F9' && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        toggleMinimap();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleMinimap]);

  // ---- 씬 경계 주석 — 에피소드 씬시트 기준 ----
  const currentEpisode = currentSession.config.episode ?? 1;
  const sceneCount = React.useMemo(() => {
    const sheets = currentSession.config.episodeSceneSheets ?? [];
    const sheet = sheets.find((s) => s.episode === currentEpisode);
    return sheet?.scenes?.length ?? 0;
  }, [currentSession.config.episodeSceneSheets, currentEpisode]);

  // 텍스트/씬 개수 변경 시 data-scene-index 재부여 (debounced via rAF)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let raf: number | null = null;
    if (typeof requestAnimationFrame === 'function') {
      raf = requestAnimationFrame(() => {
        annotateSceneMarkers(editorScrollRef.current, sceneCount);
        raf = null;
      });
    } else {
      annotateSceneMarkers(editorScrollRef.current, sceneCount);
    }
    return () => {
      if (raf != null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(raf);
      }
    };
  }, [editDraft, sceneCount]);

  const minimapLabel = L4(language, {
    ko: '미니맵 (F9)',
    en: 'Minimap (F9)',
    ja: 'ミニマップ (F9)',
    zh: '缩略图 (F9)',
  });
  const minimapAriaExpanded = minimapEnabled ? 'true' : 'false';

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-0 min-h-0">
      {/* 좌측: 본문 편집 영역 */}
      <div ref={editorScrollRef} className="flex-1 min-w-0 overflow-y-auto space-y-3 custom-scrollbar">
        {/* 모드 설명 배너 — 첫 진입 가이드 */}
        {editDraft.length === 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-amber/5 border border-accent-amber/20 text-[13px] text-accent-amber">
            <PenLine className="w-4 h-4 shrink-0" />
            <span>{L4(language, { ko: '직접 타이핑으로 집필합니다. 텍스트 선택 후 Ctrl+Shift+R로 NOA 리라이트를 사용할 수 있습니다.', en: 'Write by typing. Select text and press Ctrl+Shift+R for NOA inline rewrite.', ja: '直接タイピングで執筆します。テキスト選択後 Ctrl+Shift+R で NOA リライトを実行できます。', zh: '通过直接键入进行写作。选择文本后按 Ctrl+Shift+R 可使用 NOA 内联重写。' })}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <WritingToolbar textareaRef={_editDraftRef} value={editDraft} onChange={setEditDraft} language={language} targetMin={currentSession.config.guardrails?.min} targetMax={currentSession.config.guardrails?.max} />
          </div>
          {/* Minimap 토글 — 데스크톱 전용, 아이콘만 (F9 단축키) */}
          <button
            type="button"
            onClick={toggleMinimap}
            aria-pressed={minimapEnabled}
            aria-expanded={minimapAriaExpanded}
            aria-label={minimapLabel}
            title={minimapLabel}
            data-testid="minimap-toggle"
            className={`hidden md:inline-flex items-center justify-center w-8 h-8 rounded-lg border shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue transition-colors ${
              minimapEnabled
                ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
                : 'bg-bg-secondary border-border text-text-tertiary hover:text-text-primary'
            }`}
          >
            <MapIcon className="w-4 h-4" />
          </button>
        </div>

        {/* P1: 연속성 경고 */}
        {continuityWarnings.length > 0 && (
          <ContinuityWarnings warnings={continuityWarnings} language={language} />
        )}

        {/* P1: 품질 분석 게이지 */}
        {editDraft.length > 50 && (
          <div role="status" aria-label={L4(language, { ko: '품질 분석 요약', en: 'Quality analysis summary', ja: '品質分析サマリー', zh: '质量分析摘要' })}>
            <QualityGutter
              paragraphs={quality.paragraphs}
              averageScore={quality.averageScore}
              weakCount={quality.weakCount}
              language={language}
              onSelectWeak={(index) => {
                // 해당 문단으로 스크롤 — Tiptap ProseMirror 내부 p 요소 활용
                const wrapper = document.querySelector('.novel-editor-wrapper .ProseMirror');
                if (!wrapper) return;
                const paragraphs = wrapper.querySelectorAll('p');
                const targetP = paragraphs[index];
                if (targetP) {
                  targetP.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
            />
          </div>
        )}

        {/* P2: Undo/Redo 바 */}
        {undoStack.undoCount > 1 && (
          <div className="flex items-center gap-1.5 px-2">
            <button
              type="button"
              onClick={() => { const prev = undoStack.undo(); if (prev !== null) setEditDraft(prev); }}
              disabled={!undoStack.canUndo}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[13px] font-mono text-text-tertiary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 transition-colors min-h-[44px] min-w-[44px]"
              title={L4(language, { ko: '되돌리기 (Ctrl+Z)', en: 'Undo (Ctrl+Z)', ja: '元に戻す (Ctrl+Z)', zh: '撤销 (Ctrl+Z)' })}
            >
              <Undo2 className="w-3 h-3" />
              {L4(language, { ko: '되돌리기', en: 'Undo', ja: '元に戻す', zh: '撤销' })}
            </button>
            <button
              type="button"
              onClick={() => { const next = undoStack.redo(); if (next !== null) setEditDraft(next); }}
              disabled={!undoStack.canRedo}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[13px] font-mono text-text-tertiary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 transition-colors min-h-[44px] min-w-[44px]"
              title={L4(language, { ko: '다시 실행 (Ctrl+Y)', en: 'Redo (Ctrl+Y)', ja: 'やり直し (Ctrl+Y)', zh: '重做 (Ctrl+Y)' })}
            >
              <Redo2 className="w-3 h-3" />
              {L4(language, { ko: '다시', en: 'Redo', ja: 'やり直し', zh: '重做' })}
            </button>
            {undoStack.lastLabel && (
              <span className="text-[9px] font-mono text-text-tertiary ml-1">
                {undoStack.lastLabel}
              </span>
            )}
            <span className="text-[9px] font-mono text-text-quaternary ml-auto">
              Ctrl+Shift+R: {L4(language, { ko: '인라인 리라이트', en: 'Inline Rewrite', ja: 'インラインリライト', zh: '内联重写' })}
            </span>
          </div>
        )}

        {/* P2: 버전 히스토리 diff */}
        {draftVersions.length >= 2 && (
          <VersionDiff
            versions={draftVersions}
            currentIndex={Math.min(draftVersionIdx, draftVersions.length - 1)}
            language={language}
            onSwitch={(idx) => {
              setDraftVersionIdx(idx);
              setEditDraft(draftVersions[idx]);
            }}
          />
        )}

        <div
          className="relative"
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleFileDrop}
        >
          {isDragOver && (
            <div className="absolute inset-0 bg-accent-amber/10 border-2 border-dashed border-accent-amber rounded-2xl z-10 flex items-center justify-center pointer-events-none">
              <span className="text-accent-amber font-bold text-sm">{L4(language, { ko: '파일을 놓아서 원고 가져오기', en: 'Drop file to import manuscript', ja: 'ファイルをドロップして原稿を取り込み', zh: '拖放文件以导入稿件' })}</span>
            </div>
          )}
          <NovelEditor
            ref={novelEditorRef}
            data-zen-editor
            content={editDraft}
            onChange={setEditDraft}
            onSelectionChange={setNovelSelection}
            placeholder={L4(language, { ko: '여기에 이야기를 써 내려가세요... (TXT/MD 파일을 끌어다 놓을 수도 있어요)', en: 'Start writing here... (or drag & drop a TXT/MD file)', ja: 'ここから物語を書き始めてください...（TXT/MDファイルをドラッグ&ドロップできます）', zh: '在此开始书写你的故事...（也可以拖放 TXT/MD 文件）' })}
            className="w-full bg-[var(--color-surface-soft)] border border-border/50 rounded-2xl md:text-lg tracking-wide focus-within:border-accent-amber/40 focus-within:shadow-[0_0_32px_rgba(202,161,92,0.14)] transition-[box-shadow]"
          />
        </div>
        <InlineActionPopup
          editorSelection={novelSelection}
          fullText={editDraft}
          language={language}
          storyConfig={{
            genre: currentSession.config.genre || undefined,
            tone: currentSession.config.narrativeIntensity || undefined,
            characters: currentSession.config.characters?.slice(0, 5).map(c => ({
              name: c.name, role: c.role, speechStyle: c.speechStyle,
            })),
          }}
          onReplace={(oldText, newText, range) => {
            // [C] P0 fix: 범위 기반 치환. `.replace()` 는 첫 매치만 교체하므로
            // 같은 문장이 여러 번 나오면 잘못된 위치를 수정할 수 있다.
            // safeReplaceRange 는 selection from/to 를 우선 사용하고,
            // 해당 slice 가 oldText 와 불일치하면 첫 매치로 폴백, 아예 없으면 no-op.
            const { content: nextContent, strategy } = safeReplaceRange(
              editDraft,
              oldText,
              newText,
              range?.from ?? null,
              range?.to ?? null,
            );
            if (strategy === 'no-op') {
              logger.warn('EditModeSection', 'inline replace skipped — oldText not found', {
                oldPreview: oldText.slice(0, 40),
              });
              return;
            }
            undoStack.push(editDraft, L4(language, { ko: '리라이트', en: 'Rewrite', ja: 'リライト', zh: '重写' }));
            setEditDraft(nextContent);
            // 작가 수정 내역 기록 (피드백 루프)
            const ep = currentSession.config.episode ?? 1;
            setConfig(prev => {
              const msList = [...(prev.manuscripts || [])];
              const ms = msList.find(m => m.episode === ep);
              if (ms) {
                const entry = { original: oldText.slice(0, 200), revised: newText.slice(0, 200), action: 'rewrite' as const, timestamp: Date.now() };
                ms.corrections = [...(ms.corrections || []).slice(-19), entry];
              }
              return { ...prev, manuscripts: msList };
            });
          }}
        />
      </div>
      {/* Minimap — 데스크톱(>=md) 전용, 토글 ON 일 때만 */}
      {minimapEnabled && (
        <div
          className="hidden md:flex shrink-0 pl-1 pr-2 py-2"
          data-testid="minimap-sidebar"
          aria-hidden={false}
        >
          <EditorMinimap
            // eslint-disable-next-line react-hooks/refs
            editor={novelEditorRef.current?.getEditor?.() ?? null}
            text={editDraft}
            paragraphScores={quality.paragraphs?.map((p) => p.score)}
            scrollProgress={editorScrollState.scrollProgress}
            viewportRatio={editorScrollState.viewportRatio}
            onSeek={seekEditorScroll}
            language={language}
            width={80}
            maxHeight="calc(100vh - 160px)"
          />
        </div>
      )}
      {/* 우측: 연출/채팅 분할 패널 (데스크톱에서만) */}
      {splitView && (
        <div className="hidden lg:flex flex-col w-[380px] shrink-0 border-l border-border/40 bg-bg-primary h-full overflow-hidden">
          <SplitPanelTabs
            splitView={splitView}
            setSplitView={setSplitView}
            language={language}
            config={currentSession.config}
            setConfig={setConfig}
            currentSession={currentSession}
            chatMessages={chatMessages}
            chatLoading={chatLoading}
            handleChatSend={handleChatSend}
            abortChat={abortChat}
            clearChat={clearChat}
            directorReport={directorReport}
            hfcpState={hfcpState}
            suggestions={suggestions}
            setSuggestions={setSuggestions}
            pipelineResult={pipelineResult}
            setActiveTab={setActiveTab}
            hostedProviders={hostedProviders}
          />
        </div>
      )}
    </div>
  );
}
