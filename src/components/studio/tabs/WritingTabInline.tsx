"use client";

// ============================================================
// WritingTabInline — 집필 탭 레이아웃 (본문 7 : AI 채팅 3)
// ============================================================

import React, { useRef, useEffect, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { Sparkles, Send, Columns2, BookOpen, Undo2, Redo2, PenLine, Layers, Wand2, Settings2, ChevronDown, X } from 'lucide-react';
import type { AppLanguage, StoryConfig, ChatSession, Message, AppTab } from '@/lib/studio-types';
import type { EngineReport } from '@/engine/types';
import type { DirectorReport } from '@/engine/director';
import type { HFCPState } from '@/engine/hfcp';
import type { AdvancedWritingSettings } from '@/components/studio/AdvancedWritingPanel';
import { createT, L4 } from '@/lib/i18n';
import { RightChatPanel } from '@/components/studio/tabs/RightChatPanel';
import { useWritingChat } from '@/hooks/useWritingChat';
import type { ProactiveSuggestion, PipelineStageResult } from '@/lib/studio-types';
import { ContextMenu } from '@/components/code-studio/ContextMenu';
import { useTextAreaContextMenu } from '@/lib/hooks/useTextAreaContextMenu';
import { useSVIRecorder } from '@/hooks/useSVIRecorder';
import { InlineActionPopup } from '@/components/studio/InlineActionPopup';
import { NovelEditor } from '@/components/studio/NovelEditor';
import type { NovelEditorSelection, NovelEditorHandle } from '@/components/studio/NovelEditor';
import { useInlineCompletion } from '@/hooks/useInlineCompletion';
import { WritingContextPanel } from '@/components/studio/WritingContextPanel';
import { CanvasStepIndicator } from '@/components/studio/tabs/CanvasStepIndicator';
import { GenerationControls } from '@/components/studio/tabs/GenerationControls';

import { DirectionReferencePanel } from '@/components/studio/DirectionReferencePanel';
import { useQualityAnalysis } from '@/hooks/useQualityAnalysis';
import { useContinuityCheck } from '@/hooks/useContinuityCheck';
import { useUndoStack } from '@/hooks/useUndoStack';

const DynSkeleton = () => <div className="h-8 rounded-lg bg-bg-secondary/50 animate-pulse" />;
const ContinuityGraph = dynamic(() => import('@/components/studio/ContinuityGraph'), { ssr: false, loading: DynSkeleton });
const EngineStatusBar = dynamic(() => import('@/components/studio/EngineStatusBar'), { ssr: false, loading: DynSkeleton });
const ChatMessage = dynamic(() => import('@/components/studio/ChatMessage'), { ssr: false, loading: DynSkeleton });
const WritingToolbar = dynamic(() => import('@/components/studio/WritingToolbar').then(m => ({ default: m.WritingToolbar })), { ssr: false, loading: DynSkeleton });
const QualityGutter = dynamic(() => import('@/components/studio/QualityGutter'), { ssr: false });
const ContinuityWarnings = dynamic(() => import('@/components/studio/ContinuityWarnings'), { ssr: false });
const VersionDiff = dynamic(() => import('@/components/studio/VersionDiff'), { ssr: false });

interface Props {
  language: AppLanguage;
  currentSession: ChatSession;
  currentSessionId: string | null;
  updateCurrentSession: (data: Partial<ChatSession>) => void;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  writingMode: 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced'; // canvas/refine/advanced: 상태 인프라 준비됨 (useStudioAI에서 canvasPass 사용)
  setWritingMode: (mode: 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced') => void;
  editDraft: string;
  setEditDraft: (val: string) => void;
  editDraftRef: React.RefObject<HTMLTextAreaElement | null>;
  canvasContent: string;
  setCanvasContent: (val: string) => void;
  canvasPass: number;
  setCanvasPass: (val: number | ((p: number) => number)) => void;
  promptDirective: string;
  setPromptDirective: (val: string) => void;
  isGenerating: boolean;
  lastReport: EngineReport | null;
  /** Elapsed generation time in seconds (null until generation completes) */
  generationTime?: number | null;
  /** Approximate token usage from last generation */
  tokenUsage?: { used: number; budget: number } | null;
  handleSend: (customPrompt?: string, inputValue?: string, clearInput?: () => void) => void;
  handleCancel: () => void;
  handleRegenerate: (msgId: string) => void;
  handleVersionSwitch: (msgId: string, idx: number) => void;
  handleTypoFix: (msgId: string, idx: number, orig: string, sug: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  searchQuery: string;
  filteredMessages: Message[];
  hasApiKey: boolean;
  setShowApiKeyModal: (show: boolean) => void;
  setActiveTab: (tab: AppTab) => void;
  advancedSettings: AdvancedWritingSettings;
  setAdvancedSettings: (s: AdvancedWritingSettings) => void;
  advancedOutputMode?: string;
  setAdvancedOutputMode?: (m: string) => void;
  showDashboard: boolean;
  rightPanelOpen: boolean;
  setRightPanelOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  directorReport: DirectorReport | null;
  hfcpState: HFCPState;
  handleNextEpisode: () => void;
  showAiLock: boolean;
  hostedProviders: Partial<Record<string, boolean>>;
  saveFlash: boolean;
  triggerSave: () => void;
  writingColumnShell: string;
  writingInputDockOffset?: string;
  input: string;
  setInput: (v: string) => void;
  // External control props for sidebar integration
  suggestions: ProactiveSuggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<ProactiveSuggestion[]>>;
  pipelineResult: { stages: PipelineStageResult[]; finalStatus: 'completed' | 'failed' | 'partial' | 'running' } | null;
}

// ============================================================
// 분할 뷰 우측 통합 패널 (연출 + 채팅 탭)
// ============================================================
function SplitPanelTabs({
  splitView, setSplitView, language, config, setConfig,
  currentSession, chatMessages, chatLoading, handleChatSend, abortChat, clearChat,
  directorReport, hfcpState, suggestions, setSuggestions, pipelineResult,
  setActiveTab, hostedProviders,
}: {
  splitView: 'chat' | 'reference' | null;
  setSplitView: (v: 'chat' | 'reference' | null) => void;
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  currentSession: ChatSession;
  chatMessages: Message[];
  chatLoading: boolean;
  handleChatSend: (msg: string) => void;
  abortChat: () => void;
  clearChat: () => void;
  directorReport: DirectorReport | null;
  hfcpState: HFCPState;
  suggestions: ProactiveSuggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<ProactiveSuggestion[]>>;
  pipelineResult: Props['pipelineResult'];
  setActiveTab: (tab: AppTab) => void;
  hostedProviders: Partial<Record<string, boolean>>;
}) {
  const _isKO = language === 'KO';
  const [activePanel, setActivePanel] = useState<'direction' | 'chat'>(splitView === 'chat' ? 'chat' : 'direction');

  return (
    <>
      {/* 탭 헤더 */}
      <div className="flex border-b border-border/50 shrink-0 bg-bg-primary">
        <button
          onClick={() => setActivePanel('direction')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-colors ${
            activePanel === 'direction'
              ? 'text-accent-amber border-b-2 border-accent-amber bg-accent-amber/5'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          {L4(language, { ko: '연출', en: 'Direction', ja: 'Direction', zh: 'Direction' })}
        </button>
        <button
          onClick={() => setActivePanel('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-colors ${
            activePanel === 'chat'
              ? 'text-accent-purple border-b-2 border-accent-purple bg-accent-purple/5'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <Columns2 className="w-3.5 h-3.5" />
          {L4(language, { ko: '채팅', en: 'Chat', ja: 'Chat', zh: 'Chat' })}
        </button>
      </div>
      {/* 패널 콘텐츠 */}
      <div className="flex-1 overflow-hidden">
        {activePanel === 'direction' && (
          <DirectionReferencePanel
            config={config}
            language={language}
            setConfig={setConfig}
            onClose={() => setSplitView(null)}
            hideClose
          />
        )}
        {activePanel === 'chat' && (
          <RightChatPanel
            language={language}
            currentSession={currentSession}
            messages={chatMessages}
            loading={chatLoading}
            onSend={handleChatSend}
            onAbort={abortChat}
            onClear={clearChat}
            directorReport={directorReport}
            hfcpState={hfcpState}
            suggestions={suggestions}
            setSuggestions={setSuggestions}
            pipelineResult={pipelineResult}
            setConfig={setConfig}
            setActiveTab={setActiveTab}
            hostedProviders={hostedProviders}
          />
        )}
      </div>
    </>
  );
}

export default function WritingTabInline(props: Props) {
  const {
    language, currentSession, currentSessionId,
    writingMode, setWritingMode,
    editDraft, setEditDraft, editDraftRef,
    canvasContent, setCanvasContent,
    canvasPass, setCanvasPass,
    promptDirective, setPromptDirective: _setPromptDirective,
    isGenerating, lastReport, generationTime, tokenUsage,
    handleSend, handleRegenerate,
    messagesEndRef, searchQuery, filteredMessages,
    showAiLock,
    hasApiKey, setShowApiKeyModal,
    writingColumnShell,
    input, setInput,
    suggestions, setSuggestions, pipelineResult,
    setConfig, setActiveTab,
  } = props;

  const {
    chatMessages, sendChat, chatLoading, abortChat, clearChat
  } = useWritingChat({
    genre: currentSession.config.genre,
    synopsis: currentSession.config.synopsis,
    characters: currentSession.config.characters?.map(c => c.name).join(', '),
    currentChapter: currentSession.messages.slice(-2).map(m => m.content).join('\n').slice(0, 2000),
  });

  const t = createT(language);

  // #4 파일 드래그앤드롭
  const [isDragOver, setIsDragOver] = useState(false);
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.match(/\.(txt|md|json)$/i)) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      if (text) setEditDraft(editDraft ? editDraft + '\n\n---\n\n' + text : text);
    };
    reader.readAsText(file, 'UTF-8');
  }, [setEditDraft, editDraft]);
  const [splitView, setSplitView] = useState<'chat' | 'reference' | null>(null);
  const isKO = language === 'KO';
  const textMenu = useTextAreaContextMenu(language);
  const { handleSVIKeyDown } = useSVIRecorder();

  // P1: 실시간 품질 분석
  const quality = useQualityAnalysis(editDraft);
  // P1: 연속성 경고
  const continuityWarnings = useContinuityCheck(editDraft, currentSession?.config ?? null);
  // Tiptap selection state for InlineActionPopup integration
  const [novelSelection, setNovelSelection] = useState<NovelEditorSelection | null>(null);
  // P7: Inline completion (Tab autocomplete)
  const novelEditorRef = useRef<NovelEditorHandle>(null);
  const [inlineCompletionEnabled, setInlineCompletionEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('noa_inline_completion_enabled');
    return stored !== 'false'; // default true
  });
  const [completionHintShown, setCompletionHintShown] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('noa_tab_hint_shown') === '1';
  });
  const [showCompletionHint, setShowCompletionHint] = useState(false);

  // Show one-time hint when user first enters edit mode
  useEffect(() => {
    if (writingMode === 'edit' && !completionHintShown && inlineCompletionEnabled) {
      const timer = setTimeout(() => setShowCompletionHint(true), 800);
      return () => clearTimeout(timer);
    }
    if (writingMode !== 'edit') setShowCompletionHint(false);
  }, [writingMode, completionHintShown, inlineCompletionEnabled]);

  // P0-2: Slow generation warning listener
  const [slowWarning, setSlowWarning] = useState<'slow' | 'very-slow' | null>(null);
  useEffect(() => {
    const onSlow = () => setSlowWarning('slow');
    const onVerySlow = () => setSlowWarning('very-slow');
    window.addEventListener('noa:generation-slow', onSlow);
    window.addEventListener('noa:generation-very-slow', onVerySlow);
    return () => {
      window.removeEventListener('noa:generation-slow', onSlow);
      window.removeEventListener('noa:generation-very-slow', onVerySlow);
    };
  }, []);
  // Clear warning when generation ends
  useEffect(() => {
    if (!isGenerating) setSlowWarning(null);
  }, [isGenerating]);

  const dismissCompletionHint = useCallback(() => {
    setShowCompletionHint(false);
    setCompletionHintShown(true);
    localStorage.setItem('noa_tab_hint_shown', '1');
  }, []);

  const toggleInlineCompletion = useCallback(() => {
    setInlineCompletionEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('noa_inline_completion_enabled', String(next));
      return next;
    });
  }, []);

  const inlineCompletion = useInlineCompletion({
    enabled: inlineCompletionEnabled && writingMode === 'edit' && !novelSelection && !isGenerating,
    debounceMs: 1500,
    maxTokens: 100,
    genre: currentSession?.config?.genre,
    characters: currentSession?.config?.characters?.slice(0, 10),
  });
  // P2: Undo 스택
  const undoStack = useUndoStack(editDraft);

  // P2: 버전 히스토리 — 300자 이상 변경 시 자동 스냅샷 (draftVersions + undoStack 동시)
  const [draftVersions, setDraftVersions] = useState<string[]>([]);
  const [draftVersionIdx, setDraftVersionIdx] = useState(0);
  const lastSnapshotRef = useRef(editDraft);
  useEffect(() => {
    if (writingMode !== 'edit' || !editDraft) return;
    // undoStack 자체의 checkAutoSnapshot도 함께 호출 (useUndoStack의 자동 스냅샷 연결)
    undoStack.checkAutoSnapshot(editDraft);
    const diff = Math.abs(editDraft.length - lastSnapshotRef.current.length);
    if (diff >= 300 && editDraft.length > 50) {
      lastSnapshotRef.current = editDraft;
      setDraftVersions(prev => {
        const next = [...prev, editDraft];
        if (next.length > 20) next.shift();
        return next;
      });
      setDraftVersionIdx(prev => prev + 1);
    }
  }, [editDraft, writingMode, undoStack]);

  // Note: Ctrl+Shift+R (inline rewrite) is now handled by NovelKeymap extension in Tiptap.
  // Ctrl+Z/Y (undo/redo) is handled by Tiptap StarterKit History.
  // InlineRewrite undo is available via the UI buttons (undoStack.undo/redo).

  // P7: Sync inline completion suggestion → editor ghost text decoration
  useEffect(() => {
    const editor = novelEditorRef.current?.getEditor();
    if (!editor) return;
    const storage = editor.storage as unknown as Record<string, Record<string, unknown>>;
    if (storage.inlineCompletion) {
      storage.inlineCompletion.suggestion = inlineCompletion.suggestion;
      // Force ProseMirror to re-evaluate decorations
      editor.view.dispatch(editor.view.state.tr);
    }
  }, [inlineCompletion.suggestion]);

  // P7: Trigger completion when editDraft changes (debounced inside hook)
  const prevDraftRef = useRef(editDraft);
  useEffect(() => {
    if (writingMode !== 'edit') return;
    if (editDraft === prevDraftRef.current) return;
    prevDraftRef.current = editDraft;
    // Dismiss old suggestion on text change, then trigger new one
    inlineCompletion.dismiss();
    if (editDraft.length >= 20) {
      inlineCompletion.triggerCompletion(editDraft);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDraft, writingMode]);

  // Fix #10: Streaming auto-scroll with manual scroll detection
  const streamContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const handleStreamScroll = useCallback(() => {
    const el = streamContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    userScrolledUpRef.current = !atBottom;
  }, []);

  const lastMsgContent = currentSession.messages[currentSession.messages.length - 1]?.content;
  useEffect(() => {
    if (!isGenerating) {
      userScrolledUpRef.current = false;
      return;
    }
    if (userScrolledUpRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isGenerating, lastMsgContent, messagesEndRef]);

  const handleChatSend = useCallback((txt: string) => {
    sendChat(txt, language);
  }, [sendChat, language]);

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-bg-primary">
      {/* 참조 패널 — edit 모드에서만 */}
      {writingMode === 'edit' && (
        <WritingContextPanel config={currentSession.config} language={language} />
      )}
      {/* 7: 소설 본문 영역 */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full border-b lg:border-b-0 lg:border-r border-border/40">
        {/* Split 레이아웃에서도 집필 모드 전환 — 메인 스크롤 영역에서도 상단에 고정 (sticky) */}
        <div data-zen-hide-bar className="sticky top-0 z-30 shrink-0 px-3 py-2.5 border-b border-border/60 bg-bg-primary/95 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.12)]">
          <div className="flex flex-wrap gap-2 justify-center max-w-4xl mx-auto items-center">
            {/* 기본 2개: 항상 노출 */}
            <button
              type="button"
              onClick={() => {
                setWritingMode('edit');
                if (!editDraft && currentSession.messages.length > 0) {
                  const allText = currentSession.messages
                    .filter((m) => m.role === 'assistant' && m.content)
                    .map((m) => m.content.replace(/```json\n[\s\S]*?\n```/g, '').trim())
                    .join('\n\n---\n\n');
                  setEditDraft(allText);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                writingMode === 'edit'
                  ? 'bg-accent-amber/20 border-accent-amber/50 text-accent-amber'
                  : 'border-border text-text-secondary hover:border-accent-amber/40'
              }`}
              title={L4(language, { ko: '직접 타이핑으로 소설을 씁니다. 실시간 품질 분석, 인라인 리라이트 지원.', en: 'Write your novel by typing directly. Real-time quality analysis, inline rewrite.', ja: '直接タイピングで小説を書きます。リアルタイム品質分析、インラインリライトに対応。', zh: '通过直接键入撰写小说。支持实时质量分析与内联重写。' })}
            >
              <PenLine className="w-3.5 h-3.5" />
              <span className="flex flex-col items-start leading-tight">
                <span>{L4(language, { ko: '집필', en: 'Write', ja: '執筆', zh: '写作' })}</span>
                <span className="text-[9px] font-normal text-text-tertiary">{L4(language, { ko: '직접 타이핑', en: 'Type directly', ja: 'Type directly', zh: 'Type directly' })}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!hasApiKey) { setShowApiKeyModal(true); return; }
                setWritingMode('ai');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                writingMode === 'ai'
                  ? 'bg-accent-purple/20 border-accent-purple/50 text-accent-purple'
                  : 'border-border text-text-secondary hover:border-accent-purple/40'
              }`}
              title={L4(language, { ko: '장면/사건을 입력하면 NOA가 소설 본문을 생성합니다. Enter로 전송.', en: 'Describe a scene and NOA writes the novel text. Press Enter to send.', ja: 'シーン/事件を入力するとNOAが小説本文を生成します。Enterで送信。', zh: '输入场景/事件后 NOA 将生成小说正文。按 Enter 发送。' })}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="flex flex-col items-start leading-tight">
                <span>{L4(language, { ko: 'NOA 생성', en: 'Generate', ja: 'NOA 生成', zh: 'NOA 生成' })}</span>
                <span className="text-[9px] font-normal text-text-tertiary">{L4(language, { ko: 'AI가 다음 장면을 씁니다', en: 'AI writes the next scene', ja: 'AIが次のシーンを書きます', zh: 'AI 将撰写下一个场景' })}</span>
              </span>
            </button>

            {/* 더보기: API 키 있을 때만 노출 — 고급 모드는 드롭다운으로 숨김 */}
            {hasApiKey && (
              <>
                <div className="w-px h-5 bg-border/50 mx-1" />
                {/* 고급 모드가 활성 상태면 해당 버튼을 직접 표시 */}
                {(writingMode === 'canvas' || writingMode === 'refine' || writingMode === 'advanced') ? (
                  <button
                    type="button"
                    onClick={() => setWritingMode('edit')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                      writingMode === 'canvas' ? 'bg-accent-green/20 border-accent-green/50 text-accent-green' :
                      writingMode === 'refine' ? 'bg-accent-blue/20 border-accent-blue/50 text-accent-blue' :
                      'bg-accent-red/20 border-accent-red/50 text-accent-red'
                    }`}
                    title={L4(language, { ko: '기본 모드로 돌아가기', en: 'Back to basic mode', ja: '基本モードに戻る', zh: '返回基础模式' })}
                  >
                    {writingMode === 'canvas' && <><Layers className="w-3.5 h-3.5" />{L4(language, { ko: '3단계', en: '3-Step', ja: '3-Step', zh: '3-Step' })}</>}
                    {writingMode === 'refine' && <><Wand2 className="w-3.5 h-3.5" />{L4(language, { ko: '다듬기', en: 'Refine', ja: 'Refine', zh: 'Refine' })}</>}
                    {writingMode === 'advanced' && <><Settings2 className="w-3.5 h-3.5" />{L4(language, { ko: '고급', en: 'Advanced', ja: 'Advanced', zh: 'Advanced' })}</>}
                    <X className="w-3 h-3 ml-0.5 opacity-60" />
                  </button>
                ) : (
                  <div className="relative group/adv">
                    <button
                      type="button"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-transparent text-text-tertiary hover:text-text-secondary hover:border-border transition-colors"
                      title={L4(language, { ko: '고급 모드 (3단계·다듬기·고급)', en: 'Advanced modes (3-Step, Refine, Advanced)', ja: '上級モード（3ステップ・リファイン・アドバンス）', zh: '高级模式（3 步骤·润色·进阶）' })}
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      {L4(language, { ko: '고급', en: 'More', ja: 'More', zh: 'More' })}
                      <ChevronDown className="w-3 h-3 opacity-60" />
                    </button>
                    <div className="absolute top-full left-0 mt-1 py-1 bg-bg-primary border border-border rounded-xl shadow-2xl opacity-0 invisible group-hover/adv:opacity-100 group-hover/adv:visible transition-all z-50 min-w-[180px]">
                      <button type="button" onClick={() => setWritingMode('canvas')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-text-secondary hover:bg-bg-secondary hover:text-accent-green transition-colors"
                        title={L4(language, { ko: '뼈대 -> 초안 -> 다듬기 3단계 완성', en: 'Skeleton, draft, polish in 3 steps', ja: '骨組み→下書き→仕上げの3ステップで完成', zh: '骨架→草稿→润色 3 步完成' })}>
                        <Layers className="w-3.5 h-3.5" />
                        <span className="flex flex-col items-start leading-tight">
                          <span>{L4(language, { ko: '3단계', en: '3-Step', ja: '3-Step', zh: '3-Step' })}</span>
                          <span className="text-[9px] font-normal text-text-tertiary">{L4(language, { ko: '구상→초안→완성 3스텝', en: 'Idea→Draft→Polish', ja: '構想→下書き→完成の3ステップ', zh: '构思→草稿→完成 3 步' })}</span>
                        </span>
                      </button>
                      <button type="button" onClick={() => setWritingMode('refine')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-text-secondary hover:bg-bg-secondary hover:text-accent-blue transition-colors"
                        title={L4(language, { ko: '약한 문단 자동 개선', en: 'Auto-improve weak paragraphs', ja: '弱い段落を自動改善', zh: '自动改善薄弱段落' })}>
                        <Wand2 className="w-3.5 h-3.5" />
                        <span className="flex flex-col items-start leading-tight">
                          <span>{L4(language, { ko: '다듬기', en: 'Refine', ja: 'Refine', zh: 'Refine' })}</span>
                          <span className="text-[9px] font-normal text-text-tertiary">{L4(language, { ko: '기존 원고를 30% 다듬기', en: 'Polish existing draft 30%', ja: '既存原稿を30%仕上げ', zh: '将现有稿件润色 30%' })}</span>
                        </span>
                      </button>
                      <button type="button" onClick={() => setWritingMode('advanced')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-text-secondary hover:bg-bg-secondary hover:text-accent-red transition-colors"
                        title={L4(language, { ko: 'temperature/top-p 직접 제어', en: 'Direct control of temperature/top-p', ja: 'Direct control of temperature/top-p', zh: 'Direct control of temperature/top-p' })}>
                        <Settings2 className="w-3.5 h-3.5" />
                        <span className="flex flex-col items-start leading-tight">
                          <span>{L4(language, { ko: '고급', en: 'Advanced', ja: 'Advanced', zh: 'Advanced' })}</span>
                          <span className="text-[9px] font-normal text-text-tertiary">{L4(language, { ko: '세부 설정 직접 조절', en: 'Fine-tune settings', ja: '詳細設定を直接調整', zh: '直接调整详细设置' })}</span>
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            {/* Undo/Redo — 편집 모드에서만 표시 */}
            {writingMode === 'edit' && (
              <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-border/40">
                <button
                  type="button"
                  onClick={() => undoStack.undo()}
                  disabled={!undoStack.canUndo}
                  className={`p-1.5 rounded-lg transition-colors ${undoStack.canUndo ? 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary' : 'text-text-quaternary opacity-40 cursor-not-allowed'}`}
                  title={L4(language, { ko: '실행취소 (Ctrl+Z)', en: 'Undo (Ctrl+Z)', ja: '元に戻す (Ctrl+Z)', zh: '撤销 (Ctrl+Z)' })}
                  aria-label="Undo"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => undoStack.redo()}
                  disabled={!undoStack.canRedo}
                  className={`p-1.5 rounded-lg transition-colors ${undoStack.canRedo ? 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary' : 'text-text-quaternary opacity-40 cursor-not-allowed'}`}
                  title={L4(language, { ko: '다시실행 (Ctrl+Shift+Z)', en: 'Redo (Ctrl+Shift+Z)', ja: 'Redo (Ctrl+Shift+Z)', zh: 'Redo (Ctrl+Shift+Z)' })}
                  aria-label="Redo"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {/* 인라인 자동완성 토글 — 편집 모드에서만 */}
            {writingMode === 'edit' && (
              <button
                type="button"
                onClick={toggleInlineCompletion}
                className={`p-1.5 rounded-lg transition-colors ${
                  inlineCompletionEnabled
                    ? 'text-accent-amber hover:text-accent-amber/80 hover:bg-accent-amber/10'
                    : 'text-text-quaternary hover:text-text-secondary hover:bg-bg-secondary'
                }`}
                title={L4(language, {
                  ko: `인라인 자동완성 (Tab) — ${inlineCompletionEnabled ? '켜짐' : '꺼짐'}`,
                  en: `Inline autocomplete (Tab) — ${inlineCompletionEnabled ? 'On' : 'Off'}`,
                })}
                aria-label={L4(language, { ko: '인라인 자동완성 토글', en: 'Toggle inline autocomplete', ja: 'Toggle inline autocomplete', zh: 'Toggle inline autocomplete' })}
              >
                <Wand2 className="w-3.5 h-3.5" />
              </button>
            )}
            {/* 시네마 모드 바로가기 */}
            {currentSession.messages.some(m => m.role === 'assistant' && m.content) && (
              <button
                type="button"
                onClick={() => setActiveTab('manuscript')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-bold text-text-secondary hover:border-accent-purple/40 hover:text-accent-purple transition-colors"
                title={L4(language, {
                  ko: '시네마 모드 — 원고 탭에서 비주얼 노벨/라디오 재생',
                  en: 'Cinema mode — Play as visual novel/radio in Manuscript tab',
                  ja: 'シネマモード — 原稿タブでビジュアルノベル/ラジオ再生',
                  zh: '电影模式 — 在稿件标签中播放视觉小说/广播',
                })}
              >
                <span className="text-sm">🎬</span>
                {L4(language, { ko: '시네마', en: 'Cinema', ja: 'シネマ', zh: '影院' })}
              </button>
            )}
            {/* 분할 뷰 토글 — 단일 버튼 */}
            <button
              type="button"
              onClick={() => setSplitView(splitView ? null : 'reference')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ml-auto ${
                splitView
                  ? 'bg-accent-amber/20 border-accent-amber/50 text-accent-amber shadow-sm'
                  : 'border-border bg-bg-secondary/50 text-text-secondary hover:bg-bg-secondary hover:border-accent-amber/30'
              }`}
            >
              <Columns2 className="w-4 h-4" />
              {L4(language, { ko: '분할 뷰', en: 'Split', ja: 'Split', zh: 'Split' })}
            </button>
          </div>
        </div>
        {/* One-time Tab autocomplete hint — inside editor area */}
        {showCompletionHint && writingMode === 'edit' && (
          <div className="mx-4 mt-2 flex items-center gap-2 py-2 px-3 bg-accent-amber/5 border-l-2 border-accent-amber rounded text-xs text-text-tertiary animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="shrink-0">&#128161;</span>
            <span className="flex-1 text-xs leading-relaxed">
              {L4(language, {
                ko: '글을 멈추면 AI가 다음 문장을 제안합니다. Tab으로 수락, Esc로 무시',
                en: 'When you pause writing, AI suggests the next sentence. Tab to accept, Esc to dismiss',
                ja: '入力を止めるとAIが次の文を提案します。Tabで採用、Escで無視',
                zh: '停止输入时AI会建议下一句。Tab接受，Esc忽略',
              })}
            </span>
            <button
              onClick={dismissCompletionHint}
              className="text-text-tertiary/60 hover:text-text-primary transition-colors text-sm leading-none shrink-0"
              aria-label="Dismiss hint"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div
          ref={streamContainerRef}
          onScroll={handleStreamScroll}
          aria-live="polite"
          aria-label={L4(language, { ko: 'AI 생성 결과', en: 'AI generation output', ja: 'AI 生成 結果', zh: 'AI 生成 结果' })}
          className={`${writingColumnShell} flex-1 overflow-y-auto ${currentSession.messages.length === 0 && writingMode === 'ai' ? 'flex flex-col justify-center items-center px-4' : 'py-6 md:py-8 space-y-6 px-4 md:px-8 custom-scrollbar'}`}
        >
          {/* Continuity Tracker Graph */}
          {(currentSession.messages.length > 0 || writingMode !== 'ai') && (
            <ContinuityGraph language={language} config={currentSession.config} />
          )}

          {/* Applied Settings Summary */}
          {(currentSession.messages.length > 0 || writingMode !== 'ai') && (
            <details className="w-full group border border-border rounded-xl bg-bg-secondary/50 overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg-secondary transition-colors">
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-text-tertiary">
                  {t('applied.appliedSettings')}
                </span>
                <span className="text-[11px] text-text-tertiary group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-4 pb-4 space-y-3 text-[10px] border-t border-border pt-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-text-tertiary font-bold uppercase w-16">{t('applied.genre')}</span>
                  <span className="text-accent-purple font-bold">{currentSession.config.genre}</span>
                  <span className="text-text-tertiary">EP.{currentSession.config.episode}/{currentSession.config.totalEpisodes}</span>
                </div>
              </div>
            </details>
          )}

          {/* Main Rendering Area */}
          <div className="space-y-6">
            {writingMode === 'ai' && (
              <>
                <EngineStatusBar language={language} config={currentSession.config} report={lastReport} isGenerating={isGenerating} />
                <GenerationControls
                  isGenerating={isGenerating}
                  slowWarning={slowWarning}
                  generationTime={generationTime}
                  tokenUsage={tokenUsage}
                  language={language}
                />
                {/* Cinema Mode entry — after generation completes */}
                {!isGenerating && currentSession.messages.length > 0 && currentSession.messages.some(m => m.role === 'assistant' && m.content) && (
                  <div className="mx-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('manuscript')}
                      className="flex-1 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-accent-purple/5 to-accent-blue/5 border border-transparent rounded-xl hover:shadow-[0_0_15px_rgba(139,92,246,0.1)] transition-all group"
                      style={{ backgroundClip: 'padding-box', boxShadow: 'inset 0 0 0 1px rgba(139,92,246,0.25)' }}
                    >
                      <span className="text-lg">🎬</span>
                      <div className="flex-1 text-left">
                        <div className="text-[11px] font-bold text-text-secondary group-hover:text-text-primary transition-colors">
                          {L4(language, {
                            ko: '시네마 모드',
                            en: 'Cinema Mode',
                            ja: 'シネマモード',
                            zh: '电影模式',
                          })}
                        </div>
                        <div className="text-[9px] text-text-quaternary">
                          {L4(language, { ko: '비주얼 노벨 플레이어', en: 'Visual novel player', ja: 'ビジュアルノベル', zh: '视觉小说播放器' })}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-accent-purple opacity-60 group-hover:opacity-100 transition-opacity">▶</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('manuscript')}
                      className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-accent-amber/5 to-accent-green/5 border border-accent-amber/20 rounded-xl hover:border-accent-amber/40 transition-all group"
                    >
                      <span className="text-lg">📻</span>
                      <div className="text-left">
                        <div className="text-[11px] font-bold text-text-secondary group-hover:text-text-primary transition-colors">
                          {L4(language, { ko: '라디오 모드', en: 'Radio Mode', ja: 'ラジオモード', zh: '广播模式' })}
                        </div>
                        <div className="text-[9px] text-text-quaternary">
                          {L4(language, { ko: '오디오 드라마 스타일', en: 'Audio drama style', ja: 'オーディオドラマ', zh: '广播剧风格' })}
                        </div>
                      </div>
                    </button>
                  </div>
                )}
                {currentSession.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center space-y-6 py-12 md:py-20 px-2">
                    <Sparkles className="w-16 h-16 text-accent-purple/20 animate-pulse" />
                    <div className="space-y-3 max-w-md">
                      <p className="text-text-primary text-xl font-black">{t('engine.startPrompt')}</p>
                      <p className="text-text-tertiary text-xs font-mono">{t('writingMode.describeFirstScene')}</p>
                      <p className="text-text-tertiary text-[11px] leading-relaxed pt-1">{t('writingMode.emptyStateManualHint')}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setWritingMode('edit');
                          if (!editDraft && currentSession.messages.length > 0) {
                            const allText = currentSession.messages
                              .filter((m) => m.role === 'assistant' && m.content)
                              .map((m) => m.content.replace(/```json\n[\s\S]*?\n```/g, '').trim())
                              .join('\n\n---\n\n');
                            setEditDraft(allText);
                          }
                        }}
                        className="mt-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-accent-amber/40 bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20 transition-colors"
                      >
                        {t('writingMode.startManualEdit')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 pb-10">
                    {(searchQuery ? filteredMessages : currentSession.messages).map(msg => (
                      <div key={msg.id} className="animate-in fade-in duration-500">
                        <ChatMessage 
                          message={msg} 
                          language={language} 
                          onRegenerate={msg.role === 'assistant' ? handleRegenerate : undefined}
                          hostedProviders={props.hostedProviders}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {writingMode === 'edit' && (
              <div className="flex-1 flex flex-col lg:flex-row gap-0 min-h-0">
                {/* 좌측: 본문 편집 영역 */}
                <div className="flex-1 min-w-0 overflow-y-auto space-y-3 custom-scrollbar">
                {/* 모드 설명 배너 — 첫 진입 가이드 */}
                {editDraft.length === 0 && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-amber/5 border border-accent-amber/20 text-[11px] text-accent-amber">
                    <PenLine className="w-4 h-4 shrink-0" />
                    <span>{isKO ? '직접 타이핑으로 집필합니다. 텍스트 선택 후 Ctrl+Shift+R로 NOA 리라이트를 사용할 수 있습니다.' : 'Write by typing. Select text and press Ctrl+Shift+R for NOA inline rewrite.'}</span>
                  </div>
                )}
                <WritingToolbar textareaRef={editDraftRef} value={editDraft} onChange={setEditDraft} language={language} targetMin={currentSession.config.guardrails?.min} targetMax={currentSession.config.guardrails?.max} />

                {/* P1: 연속성 경고 */}
                {continuityWarnings.length > 0 && (
                  <ContinuityWarnings warnings={continuityWarnings} language={language} />
                )}

                {/* P1: 품질 분석 게이지 */}
                {editDraft.length > 50 && (
                  <div role="status" aria-label={isKO ? '품질 분석 요약' : 'Quality analysis summary'}>
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
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono text-text-tertiary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 transition-colors"
                      title={isKO ? '되돌리기 (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
                    >
                      <Undo2 className="w-3 h-3" />
                      {isKO ? '되돌리기' : 'Undo'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { const next = undoStack.redo(); if (next !== null) setEditDraft(next); }}
                      disabled={!undoStack.canRedo}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono text-text-tertiary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 transition-colors"
                      title={isKO ? '다시 실행 (Ctrl+Y)' : 'Redo (Ctrl+Y)'}
                    >
                      <Redo2 className="w-3 h-3" />
                      {isKO ? '다시' : 'Redo'}
                    </button>
                    {undoStack.lastLabel && (
                      <span className="text-[9px] font-mono text-text-tertiary ml-1">
                        {undoStack.lastLabel}
                      </span>
                    )}
                    <span className="text-[9px] font-mono text-text-quaternary ml-auto">
                      Ctrl+Shift+R: {isKO ? '인라인 리라이트' : 'Inline Rewrite'}
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
                      <span className="text-accent-amber font-bold text-sm">{isKO ? '파일을 놓아서 원고 가져오기' : 'Drop file to import manuscript'}</span>
                    </div>
                  )}
                  <NovelEditor
                    ref={novelEditorRef}
                    data-zen-editor
                    content={editDraft}
                    onChange={setEditDraft}
                    onSelectionChange={setNovelSelection}
                    placeholder={isKO ? '여기에 이야기를 써 내려가세요... (TXT/MD 파일을 끌어다 놓을 수도 있어요)' : 'Start writing here... (or drag & drop a TXT/MD file)'}
                    className="w-full bg-[var(--color-surface-soft)] border border-border/50 rounded-2xl md:text-lg tracking-wide focus-within:border-accent-amber/40 focus-within:shadow-[0_0_32px_rgba(202,161,92,0.14)] transition-all"
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
                  onReplace={(oldText, newText) => {
                    undoStack.push(editDraft, isKO ? '리라이트' : 'Rewrite');
                    setEditDraft(editDraft.replace(oldText, newText));
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
                      directorReport={props.directorReport}
                      hfcpState={props.hfcpState}
                      suggestions={suggestions}
                      setSuggestions={setSuggestions}
                      pipelineResult={pipelineResult}
                      setActiveTab={setActiveTab}
                      hostedProviders={props.hostedProviders}
                    />
                  </div>
                )}
              </div>
            )}

            {writingMode === 'canvas' && (
              <div className="flex-1 space-y-4">
                <div className="bg-accent-green/5 border border-accent-green/20 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-accent-green mb-2">{isKO ? '3단계 캔버스 모드' : 'Three-Step Canvas'}</h3>
                  <p className="text-xs text-text-secondary mb-2">
                    {canvasPass === 0
                      ? (isKO ? '1단계: 장면의 뼈대(등장인물, 핵심 사건, 분위기)를 적으세요.' : 'Step 1: Write the scene skeleton (characters, events, mood).')
                      : canvasPass === 1
                      ? (isKO ? '2단계: AI가 구조를 초안으로 확장했습니다. 수정 후 다듬기로 넘어가세요.' : 'Step 2: AI expanded your structure into a draft. Edit and proceed to polish.')
                      : canvasPass === 2
                      ? (isKO ? '3단계: AI가 초안을 다듬었습니다. 최종 확인 후 본문에 반영하세요.' : 'Step 3: AI polished your draft. Review and apply to manuscript.')
                      : (isKO ? '완료! 아래 버튼으로 본문에 반영하세요.' : 'Done! Apply to manuscript below.')}
                  </p>
                  {/* 단계 인디케이터 */}
                  <CanvasStepIndicator canvasPass={canvasPass} language={language} />
                  {/* 액션 버튼 */}
                  <div className="flex gap-2">
                    {canvasPass > 0 && (
                      <button
                        onClick={() => setCanvasPass(p => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
                        className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-bg-secondary transition-colors text-text-secondary"
                      >
                        {isKO ? '← 이전 단계' : '← Previous'}
                      </button>
                    )}
                    {canvasPass < 2 && canvasContent.trim().length > 10 && (
                      <button
                        onClick={() => {
                          // 다음 단계로 전환 → AI 호출은 useStudioAI의 canvasPass 감지로 자동
                          setCanvasPass(p => (typeof p === 'number' ? p : 0) + 1);
                          // 현재 캔버스를 프롬프트로 전송
                          if (handleSend) handleSend(canvasPass === 0
                            ? (isKO ? `[캔버스 구조 → 초안 확장]\n\n${canvasContent}` : `[Canvas Structure → Draft Expansion]\n\n${canvasContent}`)
                            : (isKO ? `[캔버스 초안 → 다듬기]\n\n${canvasContent}` : `[Canvas Draft → Polish]\n\n${canvasContent}`)
                          );
                        }}
                        disabled={isGenerating}
                        className={`px-4 py-1.5 text-xs font-bold border border-accent-green/30 rounded-lg transition-colors ${isGenerating ? 'bg-bg-tertiary text-text-tertiary opacity-50 cursor-not-allowed' : 'bg-accent-green/20 hover:bg-accent-green/30 text-accent-green'}`}
                      >
                        {isGenerating
                          ? (isKO ? 'AI 생성 중...' : 'AI generating...')
                          : canvasPass === 0 ? (isKO ? '초안으로 확장 →' : 'Expand to Draft →') : (isKO ? '다듬기 시작 →' : 'Start Polish →')}
                      </button>
                    )}
                    {canvasPass >= 2 && canvasContent.trim() && (
                      <button
                        onClick={() => {
                          undoStack.push(editDraft, isKO ? '캔버스 반영' : 'Canvas Apply');
                          setEditDraft(canvasContent);
                          setWritingMode('edit');
                          setCanvasPass(0);
                        }}
                        className="px-4 py-1.5 text-xs font-bold bg-accent-green hover:bg-accent-green/90 text-white rounded-lg transition-colors"
                      >
                        {isKO ? '본문에 반영' : 'Apply to Manuscript'}
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={canvasContent}
                  onChange={e => setCanvasContent(e.target.value)}
                  className="w-full min-h-[40vh] bg-bg-primary border border-border rounded-xl p-6 text-base font-serif leading-relaxed focus:border-accent-green outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-all resize-none"
                  placeholder={canvasPass === 0
                    ? (isKO ? '장면의 뼈대를 작성하세요... (등장인물, 핵심 사건, 분위기)' : 'Write scene skeleton... (characters, events, mood)')
                    : (isKO ? 'AI가 작성 중...' : 'AI is writing...')}
                />
              </div>
            )}

            {writingMode === 'refine' && (
              <div className="flex-1 space-y-4">
                <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-accent-blue mb-2 flex items-center gap-2"><Wand2 className="w-4 h-4" /> {isKO ? '다듬기' : 'Refine'}</h3>
                  <p className="text-xs text-text-secondary mb-1">{isKO ? 'NOA가 현재 원고를 분석하고 약한 문단(점수 50 미만)을 자동으로 개선합니다.' : 'NOA analyzes your manuscript and automatically improves weak paragraphs (score <50).'}</p>
                  <p className="text-[11px] text-text-tertiary mb-3">{isKO ? '💡 아래에 원고를 붙여넣으면 문단별 품질 점수가 표시됩니다. 점수가 낮은 문단을 선택하여 자동 개선할 수 있습니다.' : '💡 Paste your manuscript below to see paragraph quality scores. Select low-scoring paragraphs for automatic improvement.'}</p>
                  {promptDirective && <p className="text-xs text-accent-blue font-mono bg-accent-blue/5 rounded px-3 py-2">{isKO ? '지시:' : 'Directive:'} {promptDirective}</p>}

                  {/* 약한 문단 감지 결과 */}
                  {quality.paragraphs.length > 0 && (
                    <div className="mt-3 flex items-center gap-3 text-xs">
                      <span className="font-mono text-text-tertiary">
                        {isKO ? '평균 점수:' : 'Avg Score:'} <span className={quality.averageScore >= 60 ? 'text-accent-green font-bold' : 'text-accent-amber font-bold'}>{quality.averageScore}</span>
                      </span>
                      {quality.weakCount > 0 && (
                        <span className="font-mono text-accent-red">
                          {quality.weakCount} {isKO ? '개 약한 문단 감지됨' : 'weak paragraphs detected'}
                        </span>
                      )}
                      {quality.weakCount === 0 && (
                        <span className="font-mono text-accent-green">
                          {isKO ? '모든 문단 양호' : 'All paragraphs healthy'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 약한 문단 목록 */}
                  {quality.weakCount > 0 && (
                    <div className="mt-3 space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                      {quality.paragraphs.filter(p => p.score < 50).map((p, i) => (
                        <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-accent-red/5 border border-accent-red/15 text-[11px]">
                          <span className="font-mono font-bold text-accent-red shrink-0">{p.score}</span>
                          <span className="text-text-secondary truncate">{p.text.slice(0, 80)}...</span>
                          <div className="flex gap-1 shrink-0">
                            {p.issues.slice(0, 2).map((iss, j) => (
                              <span key={j} className="text-[9px] px-1 py-0.5 rounded bg-accent-amber/10 text-accent-amber font-mono">
                                {isKO ? iss.messageKO.slice(0, 15) : iss.messageEN.slice(0, 15)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <textarea
                  value={editDraft}
                  onChange={e => setEditDraft(e.target.value)}
                  className="w-full min-h-[40vh] bg-bg-primary border border-border rounded-xl p-6 text-base font-serif leading-relaxed focus:border-accent-blue outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-all resize-none"
                  placeholder={isKO ? '다듬을 원고를 붙여넣으세요...' : 'Paste your manuscript to refine...'}
                />
              </div>
            )}

            {writingMode === 'advanced' && (
              <div className="flex-1 space-y-4">
                <div className="bg-accent-red/5 border border-accent-red/20 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-accent-red mb-2 flex items-center gap-2"><Settings2 className="w-4 h-4" /> {isKO ? '엔진 설정' : 'Engine Settings'}</h3>
                  <p className="text-xs text-text-secondary mb-1">{isKO ? '엔진 파라미터, 장르 프리셋, HFCP 설정을 직접 제어합니다.' : 'Direct control over engine parameters, genre presets, and HFCP settings.'}</p>
                  <p className="text-[11px] text-text-tertiary">{isKO ? '💡 경험 있는 사용자용: temperature, top-p, 장르 프리셋, 프롬프트 지시문을 직접 조정할 수 있습니다.' : '💡 For experienced users: Adjust temperature, top-p, genre presets, and prompt directives.'}</p>
                </div>
                <textarea
                  ref={editDraftRef}
                  value={editDraft}
                  onChange={e => setEditDraft(e.target.value)}
                  className="w-full min-h-[40vh] bg-bg-primary border border-border rounded-xl p-6 text-base font-serif leading-relaxed focus:border-accent-red outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-all resize-none"
                  placeholder={isKO ? '고급 모드에서 직접 작성하세요...' : 'Write directly in advanced mode...'}
                />
              </div>
            )}
          </div>
          <div ref={messagesEndRef} className="h-32" />
        </div>

        {/* 소설 전용 하단 입력창 (Sticky) — AI 모드일 때 표시 */}
        {writingMode === 'ai' && currentSessionId && (
          <div className="p-4 md:p-6 bg-linear-to-t from-bg-primary via-bg-primary/95 to-transparent sticky bottom-0 z-20">
            {/* API lock banner removed — settings accessible via splash screen */}
            {/* Prompt example chips */}
            {!input.trim() && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  { ko: '다음 장면을 이어 써줘', en: 'Continue the next scene', ja: '次のシーンを続けて', zh: '续写下一个场景' },
                  { ko: '주인공이 적과 대면하는 장면', en: 'Hero confronts the enemy', ja: '主人公が敵と対峙する場面', zh: '主角与敌人对峙的场景' },
                  { ko: '감정적인 대화 장면으로', en: 'An emotional dialogue scene', ja: '感情的な対話シーンで', zh: '一段感人的对话场景' },
                ].map((chip, i) => (
                  <button key={i} type="button" onClick={() => setInput(L4(language, chip))}
                    className="px-3 py-1.5 rounded-xl border border-border/60 bg-bg-tertiary/30 text-[10px] text-text-tertiary hover:text-text-secondary hover:border-accent-purple/30 hover:bg-accent-purple/5 transition-all">
                    {L4(language, chip)}
                  </button>
                ))}
              </div>
            )}
            <div className="relative group bg-bg-secondary border border-border rounded-2xl shadow-2xl focus-within:border-accent-purple/30 transition-all p-2 pl-4 flex items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { handleSVIKeyDown(e); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!showAiLock) handleSend(); } }}
                placeholder={t('writing.inputPlaceholder')}
                className="flex-1 bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-3 text-sm text-text-primary placeholder-text-secondary resize-none max-h-32 leading-relaxed"
                rows={1}
                disabled={isGenerating || showAiLock}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isGenerating || showAiLock}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${input.trim() && !isGenerating && !showAiLock ? 'bg-accent-purple text-bg-primary shadow-lg hover:scale-[1.02] active:scale-95' : 'bg-bg-tertiary text-text-tertiary opacity-50'}`}
              >
                {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-2 text-[10px] text-text-tertiary text-center font-mono uppercase tracking-[0.2em] opacity-40">
              {isKO ? 'Narrative Origin Writer — 소설 생성 엔진' : 'Narrative Origin Writer — Story Engine'}
            </p>
          </div>
        )}
      </div>

      {/* 모바일 전용: 분할 뷰 오버레이 */}
      {splitView && (
        <div className="fixed inset-0 z-40 bg-bg-primary/95 backdrop-blur-sm lg:hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-sm font-bold text-text-primary">{isKO ? '연출/채팅' : 'Direction/Chat'}</span>
            <button onClick={() => setSplitView(null)} className="p-2 rounded-lg hover:bg-bg-secondary text-text-secondary">
              <X className="w-4 h-4" />
            </button>
          </div>
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
            directorReport={props.directorReport}
            hfcpState={props.hfcpState}
            suggestions={suggestions}
            setSuggestions={setSuggestions}
            pipelineResult={pipelineResult}
            setActiveTab={setActiveTab}
            hostedProviders={props.hostedProviders}
          />
        </div>
      )}
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
