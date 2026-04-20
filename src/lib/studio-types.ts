import { EngineReport, PlatformType, EpisodeState, PublishPlatform } from '../engine/types';

export enum Genre {
  SF = "SF",
  FANTASY = "FANTASY",
  ROMANCE = "ROMANCE",
  THRILLER = "THRILLER",
  HORROR = "HORROR",
  SYSTEM_HUNTER = "SYSTEM_HUNTER",
  FANTASY_ROMANCE = "FANTASY_ROMANCE",
  ALT_HISTORY = "ALT_HISTORY",
  MODERN_FANTASY = "MODERN_FANTASY",
  WUXIA = "WUXIA",
  LIGHT_NOVEL = "LIGHT_NOVEL",
}

export type GenerationMode = 'cloud' | 'local';
export type ViewMode = 'mobile' | 'desktop';
export type AppLanguage = 'KO' | 'EN' | 'JP' | 'CN';
export type WritingMode = 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced';

export type AppTab = 'world' | 'writing' | 'history' | 'settings' | 'characters' | 'rulebook' | 'style' | 'manuscript' | 'docs' | 'visual';

// 세계관 스튜디오 서브탭
export type WorldSubTab = 'design' | 'simulator' | 'analysis' | 'timeline' | 'map';

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
  // Social Register Pack
  socialProfile?: SocialProfile;
}

export interface SocialProfile {
  relationDistance: 'stranger' | 'formal' | 'colleague' | 'friend' | 'intimate' | 'hostile';
  ageRegister: 'teen' | 'young_adult' | 'adult' | 'middle' | 'elder';
  professionRegister?: string;
  explicitness: 'none' | 'implied' | 'low' | 'medium' | 'high';
  profanityLevel: 'none' | 'mild' | 'strong';
}

export type CharRelationType = "lover" | "rival" | "friend" | "enemy" | "family" | "mentor" | "subordinate";

export interface CharRelation {
  from: string;
  to: string;
  type: CharRelationType;
  desc?: string;
  dynamicSpeechStyle?: string;
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
  /** 이번 화 등장인물 — 선택된 캐릭터만 프롬프트에 풀 DNA 주입 */
  activeCharacters?: string[];
  /** 이번 화 활성 아이템 ID 목록 — 선택된 아이템만 프롬프트 주입(M3 — 감사 구멍 #1 해결) */
  activeItems?: string[];
  /** 이번 화 활성 스킬 ID 목록 — 선택된 스킬만 프롬프트 주입(M3 — 동일 패턴) */
  activeSkills?: string[];
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
  territories?: { id: string; name: string; civName: string; x: number; y: number; color?: string }[];
  territoryLinks?: { from: string; to: string; type: 'trade' | 'conflict' | 'border' | 'alliance' }[];
  phonemes?: { id: string; symbol: string; roman: string; type: "consonant" | "vowel"; sigClass: "sustained" | "modulated" | "percussive" | "cyclic" | "silent"; freq: number; wave: "sine" | "sawtooth" | "square" | "triangle"; }[];
  words?: { id: string; meaning: string; phonemes: string[]; roman: string; civId?: string }[];
  hexMap?: Record<string, string>;
  _latestUpdates?: string[];
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
  /** 번역 작가 프로필 — 번역 스튜디오 학습 루프에서 업데이트 */
  translatorProfile?: {
    skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'pro';
    axisAverages?: Record<string, number>;
    preferredStyles?: string[];
    lastUpdated?: number;
  };
  chapterAnalyses?: ChapterAnalysis[];
  grammarRegion?: 'KR' | 'US' | 'JP' | 'CN';
  shadowState?: import('@/engine/shadow').ShadowState;
  /** Consumed by EpisodeScenePanel UI + injected into AI prompt by engine/pipeline.ts */
  episodeSceneSheets?: EpisodeSceneSheet[];
  visualPromptCards?: VisualPromptCard[];
  // NOA-PRISM v1.1 — Writing Quality Control
  prismScale?: number;      // 0-150, default 120 (expansion density)
  prismPreserve?: number;   // 0-150, default 100 (preservation level)
  // NOA-PRISM MODE — Content Rating System
  prismMode?: 'OFF' | 'FREE' | 'ALL' | 'T15' | 'M18' | 'CUSTOM';
  prismCustom?: {
    sexual: number;    // 0-5
    violence: number;  // 0-5
    profanity: number; // 0-5
  };
  // Sub-genre tags (서브 장르 태그)
  subGenres?: string[];
  useSubGenrePrompt?: boolean; // 서브장르 태그를 AI 프롬프트에 삽입할지 여부
  // EH Engine — Narrative Intensity (서사 강도)
  narrativeIntensity?: 'iron' | 'standard' | 'soft';
  // Translation Engine — 번역 설정 (mirrors TranslationConfig from @/engine/translation, minus contextBridge)
  translationConfig?: {
    mode: 'fidelity' | 'experience';
    targetLang: 'EN' | 'JP' | 'CN' | 'KO';
    band: number;                     // 0.480 ~ 0.520
    scoreThreshold: number;           // 기본 0.70
    maxRecreate: number;              // 기본 2
    contractionLevel: 'none' | 'low' | 'normal' | 'high';
    glossary: { source: string; target: string; context?: string; locked: boolean }[];
  };
  translatedManuscripts?: TranslatedManuscriptEntry[];
}

/** 작가 수정 내역 (AI 초안 → 작가 수정) */
export interface WriterCorrection {
  original: string;    // AI가 쓴 원문 (최대 200자)
  revised: string;     // 작가가 고친 문장 (최대 200자)
  action: 'rewrite' | 'expand' | 'compress' | 'tone' | 'manual';
  timestamp: number;
}

// Episode manuscript entry
export interface EpisodeManuscript {
  episode: number;
  title: string;
  content: string;
  charCount: number;
  lastUpdate: number;
  /** AI 자동 생성 요약 (2~3줄, 150자 이내) — Tier A context */
  summary?: string;
  /** AI 자동 생성 상세 요약 (5~8줄, 500자 이내) — Tier B (N-2) context */
  detailedSummary?: string;
  /** 작가 수정 내역 — 인라인 리라이트 기록 (최대 20개/에피소드) */
  corrections?: WriterCorrection[];
  /** GitHub file path (e.g. 'volumes/vol-01/ep-001.md') */
  filePath?: string;
  /** GitHub file sha for conflict detection */
  sha?: string;
  /** Volume number */
  volume?: number;
}

// Translated manuscript entry (번역 원고)
export interface TranslatedManuscriptEntry {
  episode: number;
  sourceLang: AppLanguage;          // 원문 언어
  targetLang: 'EN' | 'JP' | 'CN' | 'KO';
  mode: 'fidelity' | 'experience';
  translatedTitle: string;
  translatedContent: string;
  charCount: number;
  avgScore: number;                 // 번역 품질 점수 (0~1)
  band: number;                     // 사용된 band 값 (0.480~0.520)
  glossarySnapshot?: { source: string; target: string; locked: boolean }[];
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
  arc?: string;
  characters?: string;
  scenes?: EpisodeSceneEntry[];
  /** SceneDirectionData snapshot saved per-episode */
  directionSnapshot?: SceneDirectionData;
  /** Which genre preset was used (e.g. 'romance', 'thriller') */
  presetUsed?: string;
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

export { PlatformType, EpisodeState, PublishPlatform } from '../engine/types';
export type { EngineReport } from '../engine/types';

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
