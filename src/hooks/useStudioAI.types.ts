import type { PipelineExecution } from "@/engine/auto-pipeline";
import type { ChatSession, AppLanguage, ProactiveSuggestion, WritingMode } from "@/lib/studio-types";
import type { Dispatch, SetStateAction } from "react";

/** 품질 게이트 시도별 기록 */
export interface QualityGateAttemptRecord {
  attempt: number;
  grade: string;
  directorScore: number;
  qualityTag: string;
  failReasons: string[];
  passed: boolean;
}

export interface UseStudioAIParams {
  currentSession: ChatSession | null;
  currentSessionId: string | null;
  currentProjectId: string | null;
  setSessions: Dispatch<SetStateAction<ChatSession[]>> | ((updater: (prev: ChatSession[]) => ChatSession[]) => void);
  updateCurrentSession: (patch: Partial<ChatSession>) => void;
  hfcpState: import("@/engine/hfcp").HFCPState;
  promptDirective: string;
  language: AppLanguage;
  canvasPass: number;
  setCanvasContent: (val: string) => void;
  setWritingMode: (mode: WritingMode) => void;
  setShowApiKeyModal: (val: boolean) => void;
  setUxError: (err: { error: unknown; retry?: () => void } | null) => void;
  advancedOutputMode?: string;
  advancedSettings?: import("@/components/studio/AdvancedWritingPanel").AdvancedWritingSettings;
  // 3.8 자율 시스템 콜백
  onSuggestionsUpdate?: (suggestions: ProactiveSuggestion[]) => void;
  onQualityGateRetry?: (attempt: number, maxRetries: number, history: QualityGateAttemptRecord[]) => void;
  onPipelineUpdate?: (result: PipelineExecution) => void;
}
