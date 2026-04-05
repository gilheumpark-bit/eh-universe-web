import { type _Lang } from "@/lib/LangContext";

export type Bi = { ko: string; en: string };

export interface TowerTemplate {
  code: string;
  bucket: string;
  title: Bi;
  text: Bi;
}

export interface ObjectiveStep {
  stepId: string;
  title: Bi;
  body: Bi;
}

export interface ClueCard {
  clueId: string;
  title: Bi;
  body: Bi;
  unlockHint: Bi;
}

export interface TheoryFragment {
  fragmentId: string;
  title: Bi;
  body: Bi;
  unlockHint: Bi;
  keywords: string[];
}

export interface PromptSeed {
  promptId: string;
  title: Bi;
  body: Bi;
}

export interface VectorScores {
  insight: number;
  consistency: number;
  delusion: number;
  risk: number;
}

export interface GameState {
  turnCount: number;
  hardMode: boolean;
  pendingReentry: boolean;
  recordAnnounced: boolean;
  progress: number;
  clarity: number;
  distortion: number;
  recentTemplateCodes: string[];
  history: HistoryEntry[];
  lastBucket: string;
  lastSignature: string;
  clueIds: string[];
  fragmentIds: string[];
  objectiveIndex: number;
  completedObjectives: boolean[];
  gameStatus: string;
  endingText: string;
  verdictAttemptCount: number;
  lastVerdictFeedback: string;
}

export interface HistoryEntry {
  role: string;
  text: string;
  bucket: string;
  code: string;
  title: string;
}

export interface ReplyPayload {
  bucket: string;
  bucketTitle: string;
  code: string;
  text: string;
  event: string;
  floorHint: string;
  recordStatus: string;
  dominantVector: string;
  vectorCopy: string;
  vectorScores: VectorScores;
  hardMode: boolean;
  playerText: string;
  newClues: { id: string; title: string; body: string }[];
}

export interface CasePayload {
  title: string;
  summary: string;
  clarity: number;
  distortion: number;
  progress: number;
  towerCondition: string;
  towerConditionLabel: string;
  gameStatus: string;
  endingText: string;
  clueCount: number;
  fragmentCount: number;
  currentObjective: {
    id: string;
    title: string;
    body: string;
    complete: boolean;
    active: boolean;
  };
  objectives: {
    id: string;
    title: string;
    body: string;
    complete: boolean;
    active: boolean;
  }[];
  clues: {
    id: string;
    title: string;
    body: string;
    unlockHint: string;
    unlocked: boolean;
  }[];
  fragments: {
    id: string;
    title: string;
    body: string;
    unlockHint: string;
    unlocked: boolean;
  }[];
  promptSeeds: { id: string; title: string; body: string }[];
  canSubmitVerdict: boolean;
  verdictAttemptCount: number;
  lastVerdictFeedback: string;
  finalVerdict: string;
}

export interface GamePayload {
  mode: string;
  reply: ReplyPayload;
  case: CasePayload;
  state: GameState;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=interfaces
