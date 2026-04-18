"use client";

// ============================================================
// WritingTabInline — 집필 탭 레이아웃 (본문 7 : AI 채팅 3)
// Phase 2 shell: 모드별 서브컴포넌트로 분할됨 — 공유 상태만 유지.
// ============================================================

import React, { useRef, useEffect, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { Sparkles, Columns2, Undo2, Redo2, PenLine, Layers, Wand2, Settings2, ChevronDown, X } from 'lucide-react';
import type { AppLanguage, StoryConfig, ChatSession, Message, AppTab } from '@/lib/studio-types';
import type { EngineReport } from '@/engine/types';
import type { DirectorReport } from '@/engine/director';
import type { HFCPState } from '@/engine/hfcp';
import type { AdvancedWritingSettings } from '@/components/studio/AdvancedWritingPanel';
import { createT, L4 } from '@/lib/i18n';
import { useWritingChat } from '@/hooks/useWritingChat';
import type { ProactiveSuggestion, PipelineStageResult } from '@/lib/studio-types';
import { useTextAreaContextMenu } from '@/lib/hooks/useTextAreaContextMenu';
import { useSVIRecorder } from '@/hooks/useSVIRecorder';
import type { NovelEditorSelection, NovelEditorHandle } from '@/components/studio/NovelEditor';
import { useInlineCompletion } from '@/hooks/useInlineCompletion';
import { WritingContextPanel } from '@/components/studio/WritingContextPanel';
import { useQualityAnalysis } from '@/hooks/useQualityAnalysis';
import { useContinuityCheck } from '@/hooks/useContinuityCheck';
import { useUndoStack } from '@/hooks/useUndoStack';

import { AIModeSection } from './writing/AIModeSection';
import { EditModeSection } from './writing/EditModeSection';
import { CanvasModeSection } from './writing/CanvasModeSection';
import { RefineModeSection } from './writing/RefineModeSection';
import { AdvancedModeSection } from './writing/AdvancedModeSection';
import { InputDockSection } from './writing/InputDockSection';
import { MobileOverlaySection } from './writing/MobileOverlaySection';

const DynSkeleton = () => <div className="h-8 rounded-lg bg-bg-secondary/50 animate-pulse" />;
const ContinuityGraph = dynamic(() => import('@/components/studio/ContinuityGraph'), { ssr: false, loading: DynSkeleton });

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
// PART 1 — WritingTabInline 메인 컴포넌트 (Props 구조분해)
// ============================================================
export default function WritingTabInline(props: Props) {
  const {
    language, currentSession, currentSessionId,
    writingMode, setWritingMode,
    editDraft, setEditDraft, editDraftRef,
    canvasContent, setCanvasContent,
    canvasPass, setCanvasPass,
    promptDirective,
    isGenerating, lastReport, generationTime, tokenUsage,
    handleSend, handleRegenerate,
    messagesEndRef, searchQuery, filteredMessages,
    showAiLock,
    hasApiKey, setShowApiKeyModal,
    writingColumnShell,
    input, setInput,
    suggestions, setSuggestions, pipelineResult,
    setConfig, setActiveTab,
    directorReport, hfcpState, hostedProviders,
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

  // ============================================================
  // PART 2 — 로컬 상태 / 이벤트 훅 (드롭다운·드래그앤드롭·품질·연속성)
  // ============================================================

  // 고급 모드 드롭다운 — 호버 대신 클릭 토글 (터치 디바이스 지원)
  const [advancedMenuOpen, setAdvancedMenuOpen] = useState(false);
  const advancedMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!advancedMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      // e.target은 EventTarget | null — Node로 좁혀야 contains() 호출 가능
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (advancedMenuRef.current && !advancedMenuRef.current.contains(target)) {
        setAdvancedMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [advancedMenuOpen]);

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
      // readAsText()는 항상 string | null 반환. 타입 가드로 좁힘.
      const result = reader.result;
      if (typeof result !== 'string' || !result) return;
      setEditDraft(editDraft ? editDraft + '\n\n---\n\n' + result : result);
    };
    reader.readAsText(file, 'UTF-8');
  }, [setEditDraft, editDraft]);
  const [splitView, setSplitView] = useState<'chat' | 'reference' | null>(null);
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
    // Tiptap storage는 extension별 Record이므로 최소 계약만 좁혀서 사용
    // (inline-completion.ts 확장의 storage.inlineCompletion.suggestion 필드)
    const storage = editor.storage as { inlineCompletion?: { suggestion: string | null } };
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

  // ============================================================
  // PART 3 — Shell JSX (모드 전환 툴바 + 조건부 섹션 렌더)
  // ============================================================

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
                <span className="text-[9px] font-normal text-text-tertiary">{L4(language, { ko: '노아가 다음 장면을 씁니다', en: 'NOA writes the next scene', ja: 'ノアが次のシーンを書きます', zh: '诺亚将撰写下一个场景' })}</span>
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
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-bold border transition-colors min-h-[44px] ${
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
                  <div className="relative" ref={advancedMenuRef}>
                    <button
                      type="button"
                      onClick={() => setAdvancedMenuOpen(v => !v)}
                      aria-haspopup="menu"
                      aria-expanded={advancedMenuOpen}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[13px] font-bold border min-h-[44px] transition-colors ${advancedMenuOpen ? 'text-text-primary border-border bg-bg-secondary' : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'}`}
                      title={L4(language, { ko: '고급 모드 (3단계·다듬기·고급)', en: 'Advanced modes (3-Step, Refine, Advanced)', ja: '上級モード（3ステップ・リファイン・アドバンス）', zh: '高级模式（3 步骤·润色·进阶）' })}
                    >
                      <Settings2 className="w-4 h-4" />
                      {L4(language, { ko: '고급', en: 'More', ja: 'More', zh: 'More' })}
                      <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${advancedMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {advancedMenuOpen && (
                      <div role="menu" className="absolute top-full left-0 mt-1 py-1 bg-bg-primary border border-border rounded-xl shadow-2xl min-w-[200px]" style={{ zIndex: 'var(--z-dropdown, 50)' }}>
                        <button type="button" onClick={() => { setWritingMode('canvas'); setAdvancedMenuOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-3 text-[13px] font-bold text-text-secondary hover:bg-bg-secondary hover:text-accent-green transition-colors min-h-[44px]"
                          title={L4(language, { ko: '뼈대 -> 초안 -> 다듬기 3단계 완성', en: 'Skeleton, draft, polish in 3 steps', ja: '骨組み→下書き→仕上げの3ステップで完成', zh: '骨架→草稿→润色 3 步完成' })}>
                          <Layers className="w-4 h-4 shrink-0" />
                          <span className="flex flex-col items-start leading-tight">
                            <span>{L4(language, { ko: '3단계', en: '3-Step', ja: '3-Step', zh: '3-Step' })}</span>
                            <span className="text-[13px] font-normal text-text-tertiary">{L4(language, { ko: '구상→초안→완성 3스텝', en: 'Idea→Draft→Polish', ja: '構想→下書き→完成の3ステップ', zh: '构思→草稿→完成 3 步' })}</span>
                          </span>
                        </button>
                        <button type="button" onClick={() => { setWritingMode('refine'); setAdvancedMenuOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-3 text-[13px] font-bold text-text-secondary hover:bg-bg-secondary hover:text-accent-blue transition-colors min-h-[44px]"
                          title={L4(language, { ko: '약한 문단 자동 개선', en: 'Auto-improve weak paragraphs', ja: '弱い段落を自動改善', zh: '自动改善薄弱段落' })}>
                          <Wand2 className="w-4 h-4 shrink-0" />
                          <span className="flex flex-col items-start leading-tight">
                            <span>{L4(language, { ko: '다듬기', en: 'Refine', ja: 'Refine', zh: 'Refine' })}</span>
                            <span className="text-[13px] font-normal text-text-tertiary">{L4(language, { ko: '기존 원고를 30% 다듬기', en: 'Polish existing draft 30%', ja: '既存原稿を30%仕上げ', zh: '将现有稿件润色 30%' })}</span>
                          </span>
                        </button>
                        <button type="button" onClick={() => { setWritingMode('advanced'); setAdvancedMenuOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-3 text-[13px] font-bold text-text-secondary hover:bg-bg-secondary hover:text-accent-red transition-colors min-h-[44px]"
                          title={L4(language, { ko: 'temperature/top-p 직접 제어', en: 'Direct control of temperature/top-p', ja: 'Direct control of temperature/top-p', zh: 'Direct control of temperature/top-p' })}>
                          <Settings2 className="w-4 h-4 shrink-0" />
                          <span className="flex flex-col items-start leading-tight">
                            <span>{L4(language, { ko: '고급', en: 'Advanced', ja: 'Advanced', zh: 'Advanced' })}</span>
                            <span className="text-[13px] font-normal text-text-tertiary">{L4(language, { ko: '세부 설정 직접 조절', en: 'Fine-tune settings', ja: '詳細設定を直接調整', zh: '直接调整详细设置' })}</span>
                          </span>
                        </button>
                      </div>
                    )}
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
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-[transform,opacity,background-color,border-color,color] ml-auto ${
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
                ko: '글을 멈추면 노아가 다음 문장을 제안합니다. Tab으로 수락, Esc로 무시',
                en: 'When you pause writing, NOA suggests the next sentence. Tab to accept, Esc to dismiss',
                ja: '入力を止めるとノアが次の文を提案します。Tabで採用、Escで無視',
                zh: '停止输入时诺亚会建议下一句。Tab接受，Esc忽略',
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
          aria-label={L4(language, { ko: '노아 생성 결과', en: 'NOA generation output', ja: 'ノア生成結果', zh: '诺亚生成结果' })}
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
              <div className="px-4 pb-4 space-y-3 text-[13px] border-t border-border pt-3">
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
              <AIModeSection
                language={language}
                currentSession={currentSession}
                lastReport={lastReport}
                isGenerating={isGenerating}
                slowWarning={slowWarning}
                generationTime={generationTime}
                tokenUsage={tokenUsage}
                searchQuery={searchQuery}
                filteredMessages={filteredMessages}
                handleRegenerate={handleRegenerate}
                hostedProviders={hostedProviders}
                setActiveTab={setActiveTab}
                setWritingMode={setWritingMode}
                editDraft={editDraft}
                setEditDraft={setEditDraft}
              />
            )}

            {writingMode === 'edit' && (
              <EditModeSection
                language={language}
                currentSession={currentSession}
                editDraft={editDraft}
                setEditDraft={setEditDraft}
                editDraftRef={editDraftRef}
                novelEditorRef={novelEditorRef}
                novelSelection={novelSelection}
                setNovelSelection={setNovelSelection}
                quality={quality}
                continuityWarnings={continuityWarnings}
                undoStack={undoStack}
                draftVersions={draftVersions}
                draftVersionIdx={draftVersionIdx}
                setDraftVersionIdx={setDraftVersionIdx}
                isDragOver={isDragOver}
                setIsDragOver={setIsDragOver}
                handleFileDrop={handleFileDrop}
                splitView={splitView}
                setSplitView={setSplitView}
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
                setConfig={setConfig}
              />
            )}

            {writingMode === 'canvas' && (
              <CanvasModeSection
                language={language}
                canvasContent={canvasContent}
                setCanvasContent={setCanvasContent}
                canvasPass={canvasPass}
                setCanvasPass={setCanvasPass}
                isGenerating={isGenerating}
                handleSend={handleSend}
                editDraft={editDraft}
                setEditDraft={setEditDraft}
                setWritingMode={setWritingMode}
                undoStack={undoStack}
              />
            )}

            {writingMode === 'refine' && (
              <RefineModeSection
                language={language}
                editDraft={editDraft}
                setEditDraft={setEditDraft}
                promptDirective={promptDirective}
                quality={quality}
              />
            )}

            {writingMode === 'advanced' && (
              <AdvancedModeSection
                language={language}
                editDraft={editDraft}
                setEditDraft={setEditDraft}
                editDraftRef={editDraftRef}
              />
            )}
          </div>
          <div ref={messagesEndRef} className="h-32" />
        </div>

        {/* 소설 전용 하단 입력창 (Sticky) — AI 모드일 때 표시 */}
        {writingMode === 'ai' && currentSessionId && (
          <InputDockSection
            language={language}
            input={input}
            setInput={setInput}
            handleSend={handleSend}
            isGenerating={isGenerating}
            showAiLock={showAiLock}
            handleSVIKeyDown={handleSVIKeyDown}
          />
        )}
      </div>

      <MobileOverlaySection
        language={language}
        splitView={splitView}
        setSplitView={setSplitView}
        currentSession={currentSession}
        setConfig={setConfig}
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
        textMenu={textMenu}
      />
    </div>
  );
}
