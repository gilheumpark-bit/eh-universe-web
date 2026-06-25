import type { StoryConfig } from '@/lib/studio-types';
import type { ExternalCraftReference } from './cross-project-bridge';

export type WritingContextPackMode =
  | 'episode-1-bootstrap'
  | 'episode-n-draft'
  | 'episode-regenerate'
  | 'selection-rewrite';

export type WritingContextPackScope =
  | 'global'
  | 'current-episode'
  | 'previous-episode'
  | 'external-craft'
  | 'selection'
  | 'safety';

export type WritingContextSourceStatus =
  | 'adopted'
  | 'excluded-hold'
  | 'excluded-conflict'
  | 'excluded-candidate'
  | 'missing'
  | 'blocked';

export interface WritingContextSourceRef {
  id: string;
  tabId: 'project' | 'world' | 'character' | 'item' | 'scenario' | 'scene' | 'direction' | 'writing' | 'reference';
  fieldKey: string;
  label: string;
  sourceType: 'author-canvas' | 'accepted-import' | 'previous-episode' | 'selection' | 'derived-summary' | 'external-craft-reference';
  status: WritingContextSourceStatus;
  episode?: number;
  updatedAt?: string | number;
  hash?: string;
}

export interface WritingContextBlock {
  id: string;
  label: string;
  scope: WritingContextPackScope;
  priority: number;
  content: string;
  sourceRefs: string[];
}

export interface WritingContextOmission {
  sourceId: string;
  label: string;
  reason: 'token-budget' | 'not-current-episode' | 'hold' | 'conflict' | 'candidate-only' | 'project-mismatch' | 'missing';
  detail: string;
}

export interface WritingContextPack {
  mode: WritingContextPackMode;
  modeLabel: string;
  projectId: string;
  sessionId?: string;
  episode: number;
  baselineVersion: 2;
  sourceRefs: WritingContextSourceRef[];
  blocks: WritingContextBlock[];
  omitted: WritingContextOmission[];
  hardStopReasons: string[];
  tokenBudget: {
    maxChars: number;
    usedChars: number;
    trimmed: boolean;
  };
  hash: string;
  preview: string;
}

export interface PreviousEpisodeContext {
  projectId: string;
  episode: number;
  title?: string;
  summary?: string;
  detailedSummary?: string;
  continuityNotes?: string;
  updatedAt?: number;
}

export interface BuildWritingContextPackInput {
  config: StoryConfig;
  projectId?: string | null;
  sessionId?: string;
  episode?: number;
  mode?: WritingContextPackMode;
  selectedText?: string;
  previousEpisodes?: PreviousEpisodeContext[];
  externalCraftReferences?: readonly ExternalCraftReference[];
  maxChars?: number;
}
