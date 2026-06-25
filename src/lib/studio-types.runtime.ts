import type { EngineReport, PlatformType } from '../engine/types';
import type { Genre, StoryConfig } from './studio-types';

// ============================================================
// NOI — Narrative Origin Imaging (비주얼 설계 엔진)
// ============================================================

export type VisualShotType = 'key_scene' | 'character_focus' | 'background_focus' | 'cover' | 'thumbnail' | 'object_focus';
export type VisualTargetUse = 'illustration' | 'cover' | 'thumbnail' | 'character_sheet' | 'concept_art';
export type CameraShot = 'close_up' | 'medium' | 'full_body' | 'wide' | 'over_shoulder' | 'top_down' | 'low_angle' | 'eye_level';

export interface VisualLevelPack {
  subjectFocus: number;       // 0-3
  backgroundDensity: number;  // 0-3
  sceneTension: number;       // 0-3
  emotionIntensity: number;   // 0-3
  compositionDrama: number;   // 0-3
  styleStrength: number;      // 0-3
  symbolismWeight: number;    // 0-3
}

export interface VisualPromptCard {
  id: string;
  episode: number;
  analysisId?: string;
  title: string;
  shotType: VisualShotType;
  targetUse: VisualTargetUse;
  cameraShot?: CameraShot;
  selectedCharacters: string[];
  selectedObjects: string[];
  levels: VisualLevelPack;
  subjectPrompt: string;
  backgroundPrompt: string;
  scenePrompt: string;
  compositionPrompt: string;
  lightingPrompt: string;
  stylePrompt: string;
  negativePrompt: string;
  moodTags: string[];
  consistencyTags: string[];
  sourceSummary?: string;
  sourceTurningPoint?: string;
  sourceLocation?: string;
  createdAt: number;
  updatedAt: number;
  generatedImages?: GeneratedVisualAsset[];
  seed?: number;
  referenceImageUrl?: string;
}

export interface GeneratedVisualAsset {
  id: string;
  promptCardId: string;
  provider: string;
  model: string;
  imageUrl: string;
  promptSnapshot: string;
  createdAt: number;
  // Scene gallery extensions
  assignedEpisode?: number;
  favorite?: boolean;
  revisedPrompt?: string;
}

export interface VisualPreset {
  id: string;
  name: string;
  levels: VisualLevelPack;
  defaultShotType?: VisualShotType;
  defaultTargetUse?: VisualTargetUse;
  tags?: string[];
}

export interface SavedSlot {
  id: string;
  name: string;
  tab: string;
  timestamp: number;
  data: Partial<StoryConfig>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  versions?: string[];
  currentVersionIndex?: number;
  meta?: {
    grade?: string;
    eosScore?: number;
    metrics?: {
      tension: number;
      pacing: number;
      immersion: number;
    };
    critique?: string;
    engineReport?: EngineReport;
    hfcpMode?: string;
    hfcpVerdict?: string;
    hfcpScore?: number;
    qualityGatePassed?: boolean;
    qualityGateAttempt?: number;
    qualityGateReasons?: string[];
    qualityGateRetryHint?: string;
    qualityGateHistory?: unknown[];
    externalCraftLeakHits?: string[];
    writingContextCompliance?: unknown;
    ipFiltered?: number;
    qualityTag?: '🟢' | '🟡' | '🔴';
    qualityLabel?: string;
    qualityFindings?: Array<{ kind: string; severity: number; message: string; lineNo?: number; excerpt?: string }>;
  };
  timestamp: number;
}

export interface EngineStatus {
  activeLayer: string;
  currentEngine: string;
  processing: boolean;
  progress: number;
  eosScore: number;
  tensionTarget: number;
  actPosition: string;
  byteSize: number;
  platform: PlatformType;
}

// Chat session (moved from page.tsx for shared access)
export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  config: StoryConfig;
  lastUpdate: number;
}

// Volume grouping for episode tree
export interface Volume {
  id: number;
  title: string;
  description?: string;
}

// Project (multi-project folder structure)
export interface Project {
  id: string;
  name: string;
  description: string;
  genre: Genre;
  createdAt: number;
  lastUpdate: number;
  sessions: ChatSession[];
  volumes?: Volume[];
  currentBranch?: string;
}

// ============================================================
// 3.8 자율 시스템 타입
// ============================================================

// ① Quality Gate Loop
export interface QualityThresholds {
  minGrade: string;
  minDirectorScore: number;
  minEOS: number;
  minTensionAlignment: number;
  maxAITonePercent: number;
  blockOnRedTag: boolean;
}

export interface QualityGateConfig {
  enabled: boolean;
  maxRetries: number;
  thresholds: QualityThresholds;
  autoMode: 'full_auto' | 'confirm' | 'off';
}

export interface QualityGateResult {
  passed: boolean;
  attempt: number;
  failReasons: string[];
  grade: string;
  directorScore: number;
  eosScore: number;
  qualityTag: string;
  /** M4 — 작가 주도 비율 (0-100). 씬시트 origin 통계 기반. */
  authorLeadRatio?: number;
  /** M4 — authorLead 가중치 보너스/페널티 (감독 점수 가산값) */
  authorLeadAdjustment?: number;
}

// ② Proactive Suggestions
export type SuggestionCategory =
  | 'character_drift' | 'world_inconsistency' | 'tension_mismatch'
  | 'thread_overdue' | 'pacing_anomaly' | 'emotion_flat'
  | 'ai_tone_creep' | 'hallucination_risk' | 'foreshadow_urgent';

export type SuggestionPriority = 'critical' | 'warning' | 'info';

export interface ProactiveSuggestion {
  id: string;
  category: SuggestionCategory;
  priority: SuggestionPriority;
  message: string;
  actionHint: string;
  episode: number;
  dismissed: boolean;
  dismissCount: number;
}

export interface SuggestionConfig {
  enabled: boolean;
  maxPerGeneration: number;
  cooldownTurns: number;
  suppressAfterDismiss: number;
  categories: Partial<Record<SuggestionCategory, boolean>>;
}

// ③ Auto-Pipeline
export type PipelineStage = 'world_check' | 'character_sync' | 'direction_setup' | 'generation';
export type StageStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface PipelineStageResult {
  stage: PipelineStage;
  status: StageStatus;
  duration: number;
  score?: number;
  warnings: string[];
}

export interface AutoPipelineConfig {
  enabled: boolean;
  stages: Record<PipelineStage, {
    enabled: boolean;
    passThreshold: number;
    failAction: 'block' | 'warn' | 'skip';
  }>;
  qualityGateEnabled: boolean;
}

// ④ Writer Profile
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export interface WriterProfile {
  id: string;
  createdAt: number;
  updatedAt: number;
  episodeCount: number;
  avgSentenceLength: number;
  dialogueRatio: number;
  emotionDensity: number;
  avgEpisodeLength: number;
  pacingPreference: number;
  avgGrade: number;
  avgDirectorScore: number;
  avgEOS: number;
  commonIssues: Record<string, number>;
  avgAITone: number;
  regenerateRate: number;
  overrideRate: number;
  skillLevel: SkillLevel;
  levelConfidence: number;
  /** 0-1, how often user accepts Tab inline completions */
  completionAcceptRate: number;
}
