import { EngineReport, PlatformType, EpisodeState } from '../engine/types';

export enum Genre {
  SF = "SF",
  FANTASY = "FANTASY",
  ROMANCE = "ROMANCE",
  THRILLER = "THRILLER",
  HORROR = "HORROR",
  SYSTEM_HUNTER = "SYSTEM_HUNTER",
  FANTASY_ROMANCE = "FANTASY_ROMANCE"
}

export type GenerationMode = 'cloud' | 'local';
export type ViewMode = 'mobile' | 'desktop';
export type AppLanguage = 'KO' | 'EN' | 'JP' | 'CN';

export type AppTab = 'world' | 'writing' | 'history' | 'critique' | 'settings' | 'characters' | 'rulebook' | 'style';

export interface PclGuardrails {
  min: number;
  max: number;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  traits: string;
  appearance: string;
  dna: number;
  personality?: string;
  speechStyle?: string;
  speechExample?: string;
}

export type CharRelationType = "lover" | "rival" | "friend" | "enemy" | "family" | "mentor" | "subordinate";

export interface CharRelation {
  from: string;
  to: string;
  type: CharRelationType;
  desc?: string;
}

// Scene Sheet (연출 스튜디오) data
export interface SceneDirectionData {
  goguma?: { type: "goguma" | "cider"; intensity: string; desc: string }[];
  hooks?: { position: string; hookType: string; desc: string }[];
  emotionTargets?: { emotion: string; intensity: number }[];
  dialogueTones?: { character: string; tone: string; notes: string }[];
  dopamineDevices?: { scale: string; device: string; desc: string }[];
  cliffhanger?: { cliffType: string; desc: string };
  plotStructure?: string;
}

// Genre selection entry (multi-genre support)
export interface GenreSelection {
  genre: string;
  level: number;
}

// World Simulator persistent data
export interface WorldSimData {
  civs?: { name: string; era: string; color: string; traits: string[] }[];
  relations?: { fromName: string; toName: string; type: string }[];
  transitions?: { fromEra: string; toEra: string; description: string }[];
  selectedGenre?: string;
  selectedLevel?: number;
  genreSelections?: GenreSelection[];
  ruleLevel?: number;
}

// World Simulator reference flags
export interface SimulatorRef {
  worldConsistency?: boolean;
  civRelations?: boolean;
  timeline?: boolean;
  territoryMap?: boolean;
  languageSystem?: boolean;
  genreLevel?: boolean;
  ruleLevel?: number;
  civNames?: string[];
  civRelationSummary?: string[];
  genreSelections?: GenreSelection[];
}

// Style Studio profile data
export interface StyleProfile {
  selectedDNA: number[];       // DNA_CARDS indices (0=SF, 1=웹소설, 2=문학, 3=멀티장르)
  sliders: Record<string, number>; // s1~s5, values 1~5
  checkedSF: number[];         // completed SF technique indices
  checkedWeb: number[];        // completed web novel technique indices
}

export interface StoryConfig {
  genre: Genre;
  povCharacter: string;
  setting: string;
  primaryEmotion: string;
  episode: number;
  title: string;
  totalEpisodes: number;
  synopsis?: string;
  guardrails: PclGuardrails;
  characters: Character[];
  charRelations?: CharRelation[];
  platform: PlatformType;
  episodeState?: EpisodeState;
  sceneDirection?: SceneDirectionData;
  simulatorRef?: SimulatorRef;
  worldSimData?: WorldSimData;
  styleProfile?: StyleProfile;
  savedSlots?: SavedSlot[];
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

// Project (multi-project folder structure)
export interface Project {
  id: string;
  name: string;
  description: string;
  genre: Genre;
  createdAt: number;
  lastUpdate: number;
  sessions: ChatSession[];
}

export { PlatformType, EpisodeState } from '../engine/types';
export type { EngineReport } from '../engine/types';
