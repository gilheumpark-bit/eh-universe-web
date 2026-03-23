import { EngineReport, PlatformType, EpisodeState, PublishPlatform } from '../engine/types';

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

export type AppTab = 'world' | 'writing' | 'history' | 'settings' | 'characters' | 'rulebook' | 'style' | 'manuscript';

// 세계관 스튜디오 서브탭
export type WorldSubTab = 'design' | 'simulator' | 'analysis';

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
  // 1단계 뼈대 (3-tier framework)
  desire?: string;         // 욕망 / 추진력
  deficiency?: string;     // 결핍 / 부족한 것
  conflict?: string;       // 이야기 속 갈등
  changeArc?: string;      // 변화 방향 (서사 아크)
  values?: string;         // 가치관 / 금지선
  // 2단계 작동
  strength?: string;       // 강점
  weakness?: string;       // 약점
  backstory?: string;      // 현재를 만든 과거
  failureCost?: string;    // 실패 대가
  currentProblem?: string; // 현재 문제
  // 3단계 디테일
  emotionStyle?: string;       // 감정 표현 방식
  relationPattern?: string;    // 인간관계 패턴
  symbol?: string;             // 상징 요소
  secret?: string;             // 비밀 요소
  externalPerception?: string; // 타인이 보는 인상
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
  goguma?: { type: "goguma" | "cider"; intensity: string; desc: string; episode?: number }[];
  hooks?: { position: string; hookType: string; desc: string }[];
  emotionTargets?: { emotion: string; intensity: number; position?: number }[];
  dialogueTones?: { character: string; tone: string; notes: string }[];
  dopamineDevices?: { scale: string; device: string; desc: string; resolved?: boolean }[];
  cliffhanger?: { cliffType: string; desc: string; episode?: number };
  plotStructure?: string;
  foreshadows?: { planted: string; payoff: string; episode: number; resolved: boolean }[];
  pacings?: { section: string; percent: number; desc: string }[];
  tensionCurve?: { position: number; level: number; label: string }[];
  canonRules?: { character: string; rule: string }[];
  sceneTransitions?: { fromScene: string; toScene: string; method: string }[];
  writerNotes?: string;
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

// Item / Skill / Magic System (아이템 스튜디오)
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type ItemCategory = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'quest' | 'misc';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  description: string;
  effect: string;
  obtainedFrom: string;
  owner?: string;
  episode?: number;
  // 1단계 뼈대 (3-tier framework)
  purpose?: string;          // 용도 / 사용 목적
  activationCond?: string;   // 발동 조건
  costWeakness?: string;     // 대가 / 약점 / 카운터
  storyFunction?: string;    // 스토리 기능 (맥거핀, 성장 촉매 등)
  // 2단계 작동
  worldConnection?: string;  // 세계관 연결성
  misuse?: string;           // 오용/폭주 시 결과
  lore?: string;             // 배경 서사 / 전설
  material?: string;         // 재료
  craftMethod?: string;      // 제작 방식
  valueRarity?: string;      // 가치와 희소성
  whoTargets?: string;       // 누가 노리는지
  // 3단계 디테일
  itemAppearance?: string;   // 외형
  symbolism?: string;        // 상징성
  currentLocation?: string;  // 현재 위치
  ownershipCond?: string;    // 소유권 조건
  durability?: string;       // 내구성과 수명
  evolution?: string;        // 성장/진화 여부
  maintenance?: string;      // 유지·수리 방식
}

export interface Skill {
  id: string;
  name: string;
  type: 'active' | 'passive' | 'ultimate';
  owner: string;
  description: string;
  cost: string;
  cooldown: string;
  rank: string;
}

export interface MagicSystem {
  id: string;
  name: string;
  source: string;
  rules: string;
  limitations: string;
  ranks: string[];
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
  publishPlatform?: PublishPlatform;
  // 세계관 1단계 뼈대 (3-tier framework)
  corePremise?: string;       // 현실과 다른 핵심 전제
  powerStructure?: string;    // 권력 구조
  currentConflict?: string;   // 현재 갈등
  // 세계관 2단계 작동
  worldHistory?: string;         // 역사
  socialSystem?: string;         // 사회 시스템
  economy?: string;              // 경제와 생활 방식
  magicTechSystem?: string;      // 마법 / 기술 체계
  factionRelations?: string;     // 종족 / 세력 관계
  survivalEnvironment?: string;  // 생존 환경
  // 세계관 3단계 디테일
  culture?: string;              // 문화
  religion?: string;             // 종교와 신화
  education?: string;            // 교육과 지식 전달
  lawOrder?: string;             // 법과 질서
  taboo?: string;                // 금기와 규범
  dailyLife?: string;            // 평범한 사람의 하루
  travelComm?: string;           // 이동/통신 속도
  truthVsBeliefs?: string;       // 사람들이 믿는 진실 vs 실제 진실
  episodeState?: EpisodeState;
  sceneDirection?: SceneDirectionData;
  simulatorRef?: SimulatorRef;
  worldSimData?: WorldSimData;
  styleProfile?: StyleProfile;
  items?: Item[];
  skills?: Skill[];
  magicSystems?: MagicSystem[];
  savedSlots?: SavedSlot[];
  manuscripts?: EpisodeManuscript[];
  chapterAnalyses?: ChapterAnalysis[];
  episodeSceneSheets?: EpisodeSceneSheet[];
}

// Episode manuscript entry
export interface EpisodeManuscript {
  episode: number;
  title: string;
  content: string;
  charCount: number;
  lastUpdate: number;
}

// Episode scene sheet entry (per-scene row in the table)
export interface EpisodeSceneEntry {
  sceneId: string;       // "1-1", "1-2", "2-1"
  sceneName: string;
  characters: string;
  tone: string;          // "감동", "긴장", "개그", "액션" etc.
  summary: string;
  keyDialogue: string;
  emotionPoint: string;
  nextScene: string;
}

// Episode scene sheet (per-episode scene table)
export interface EpisodeSceneSheet {
  episode: number;
  title: string;
  arc: string;
  characters: string;
  scenes: EpisodeSceneEntry[];
  lastUpdate: number;
}

// ============================================================
// Chapter Analysis (챕터 분석) types
// ============================================================

export type EmotionIntensity = 'low' | 'mid' | 'high' | 'extreme';
export type PresenceType = 'direct' | 'indirect' | 'mentioned' | 'absent';

export interface CharacterStateEntry {
  name: string;
  presence: PresenceType;
  sceneRole: string;
  emotion: { primary: string; intensity: EmotionIntensity };
  expression: string;
  gaze: { direction: string; target: string };
  pose: string;
  actionState: string;
  bodyState: string[];
  outfitDelta: string[];
  heldItem: string[];
  relationContext: string;
  aura: string[];
}

export interface BackgroundState {
  location: string;
  spaceType: string;
  time: string;
  weather: string;
  lighting: string;
  mood: string[];
  keyObjects: string[];
  environmentCondition: string[];
}

export interface SceneAnalysisState {
  summary: string;
  phase: string;
  tension: EmotionIntensity;
  conflictType: string[];
  characterGoal: string;
  obstacle: string;
  turningPoint: string;
  symbolicTags: string[];
}

export interface SoundState {
  ambient: string[];
  effects: string[];
  voiceTone: string[];
  audioMood: string[];
  bgmTags: string[];
}

export interface ImagePromptPack {
  characterFocus: string;
  backgroundFocus: string;
  sceneFocus: string;
  styleHints: string[];
}

export interface MusicPromptPack {
  mood: string;
  emotionFlow: string;
  soundKeywords: string[];
  musicStyle: string[];
}

export interface ChapterAnalysis {
  id: string;
  episode: number;
  timestamp: number;
  characterState: CharacterStateEntry[];
  backgroundState: BackgroundState;
  sceneState: SceneAnalysisState;
  soundState: SoundState;
  imagePromptPack: ImagePromptPack;
  musicPromptPack: MusicPromptPack;
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

export { PlatformType, EpisodeState, PublishPlatform } from '../engine/types';
export type { EngineReport } from '../engine/types';
