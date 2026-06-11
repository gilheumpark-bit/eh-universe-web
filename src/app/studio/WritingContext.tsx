"use client";

// ============================================================
// PART 1 — Writing Context
// Novel Studio WritingTab 60+ props → 5 props (rank 11)
//
// WritingTabInline 의 props 60+ 를 React Context 로 중앙화한다.
// StudioContext 와 분리한 이유:
//   - StudioContext 는 Shell 전역 (탭/세션/모달/save) 책임이 더 넓다.
//   - WritingContext 는 "집필 탭에서만 의미 있는 값" 만 모은다 — writingMode,
//     editDraft, canvas, prompt, AI handlers, suggestions, hfcp 등.
//   - 분리해두면 WritingTabInline 외부에서 useWriting() 을 부주의하게 쓰는 일이
//     줄어든다. Provider 외부 호출 시 throw.
//
// 점진 마이그레이션:
//   - StudioMainContent 가 WritingProvider 를 마운트하고 value 를 주입.
//   - WritingTabInline 은 기존 props 를 그대로 유지하되 내부적으로
//     useWriting() 을 사용해도 좋다 — 부모 마운트 호환 유지.
//   - 후속 작업으로 StudioTabRouter 에서 WritingTabInline props 를 0~5개로 축소.
// ============================================================

import { createContext, useContext, type ReactNode, type Dispatch, type SetStateAction, type RefObject } from 'react';
import type {
  ChatSession, StoryConfig, AppTab, AppLanguage, Message,
  WritingMode, ProactiveSuggestion, PipelineStageResult,
} from '@/types/studio-shared';
import type { HFCPState as HFCPStateType } from '@/engine/hfcp';
import type { EngineReport } from '@/engine/types';
import type { DirectorReport } from '@/engine/director';
import type { AdvancedWritingSettings } from '@/components/studio/AdvancedWritingPanel';

// ============================================================
// PART 2 — Context Value Type
// ============================================================

export interface WritingContextValue {
  // ── 식별 / 세션 ──
  language: AppLanguage;
  currentSession: ChatSession;
  currentSessionId: string | null;
  updateCurrentSession: (patch: Partial<ChatSession>) => void;
  setConfig: Dispatch<SetStateAction<StoryConfig>>;

  // ── Writing Mode + Draft ──
  writingMode: WritingMode;
  setWritingMode: (mode: WritingMode) => void;
  editDraft: string;
  setEditDraft: (val: string) => void;
  editDraftRef: RefObject<HTMLTextAreaElement | null>;

  // ── Canvas / Prompt ──
  canvasContent: string;
  setCanvasContent: (val: string) => void;
  canvasPass: number;
  setCanvasPass: (val: number | ((p: number) => number)) => void;
  promptDirective: string;

  // ── AI 호출 ──
  isGenerating: boolean;
  lastReport: EngineReport | null;
  generationTime?: number | null;
  tokenUsage?: { used: number; budget: number } | null;
  handleSend: (customPrompt?: string, inputValue?: string, clearInput?: () => void) => void;
  handleCancel: () => void;
  handleRegenerate: (msgId: string) => void;
  handleVersionSwitch: (msgId: string, idx: number) => void;
  handleTypoFix: (msgId: string, idx: number, orig: string, sug: string) => void;
  directorReport: DirectorReport | null;
  hfcpState: HFCPStateType;
  handleNextEpisode: () => void;

  // ── 입력 / 검색 / 필터 ──
  input: string;
  setInput: (v: string) => void;
  searchQuery: string;
  filteredMessages: Message[];
  messagesEndRef: RefObject<HTMLDivElement | null>;

  // ── API 접근 / Lock ──
  hasApiKey: boolean;
  setShowApiKeyModal: (show: boolean) => void;
  showAiLock: boolean;
  hostedProviders: Partial<Record<string, boolean>>;

  // ── 고급 설정 ──
  advancedSettings: AdvancedWritingSettings;
  setAdvancedSettings: (s: AdvancedWritingSettings) => void;
  advancedOutputMode?: string;
  setAdvancedOutputMode?: (m: string) => void;

  // ── 레이아웃 / 패널 ──
  showDashboard: boolean;
  rightPanelOpen: boolean;
  setRightPanelOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  writingColumnShell: string;
  writingInputDockOffset?: string;

  // ── 외부 patch (Suggestions / Pipeline / Save) ──
  setActiveTab: (tab: AppTab) => void;
  saveFlash: boolean;
  triggerSave: () => void;
  suggestions: ProactiveSuggestion[];
  setSuggestions: Dispatch<SetStateAction<ProactiveSuggestion[]>>;
  pipelineResult: { stages: PipelineStageResult[]; finalStatus: 'completed' | 'failed' | 'partial' | 'running' } | null;
}

// ============================================================
// PART 3 — Provider & Hook
// ============================================================

const WritingContext = createContext<WritingContextValue | null>(null);

export function WritingProvider({ value, children }: { value: WritingContextValue; children: ReactNode }) {
  return <WritingContext.Provider value={value}>{children}</WritingContext.Provider>;
}

/**
 * Provider 외부 호출 시 throw — 마운트 누락을 즉시 드러낸다.
 * WritingTabInline / writing 하위 컴포넌트 전용. StudioShell 의 다른 탭에서는
 * 호출하지 말 것 (StudioContext 사용).
 */
export function useWriting(): WritingContextValue {
  const ctx = useContext(WritingContext);
  if (!ctx) {
    throw new Error('useWriting must be used within <WritingProvider> — mount it at StudioMainContent (activeTab === "writing").');
  }
  return ctx;
}

/**
 * Optional 변형 — Provider 가 없을 때 null 을 반환한다.
 * 점진 마이그레이션 단계에서 "WritingProvider 안에 있을 수도, 아닐 수도" 있는
 * 공용 컴포넌트(예: SceneMinimap) 가 안전하게 호출하기 위한 출구.
 */
export function useWritingSafe(): WritingContextValue | null {
  return useContext(WritingContext);
}
