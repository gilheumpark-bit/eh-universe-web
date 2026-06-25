import { PlatformType, EpisodeState, PublishPlatform } from '../engine/types';
// [X4 — 품질 하네스] type-only import — 런타임 의존 0 (컴파일 시 소거)
import type { QualityHarness } from './creative/quality-harness';
import type { SavedSlot, VisualPromptCard } from './studio-types.runtime';
import type {
  AcceptedImportCandidateRecord,
  ExternalCraftReferenceRecord,
  ImportFileReportRecord,
  MainScenarioStructure,
  ProjectReleasePurpose,
  ProjectRightsLedgerEntry,
  ProjectRightsStatus,
  ProjectTargetLanguage,
  ProjectTargetMarket,
  WorldFieldEvidenceRecord,
} from './studio-project-types';

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
export type EpisodeLifecycleState = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'SIGNED_OFF' | 'SHIPPED';
export type ShipmentStatus = 'draft' | 'ready' | 'shipped';

// [2026-05-09] 'scene-sheet' 추가 — 에피소드 씬시트 전용 진입점.
// 이전: SceneSheet 가 DirectionTab + WritingTabInline 안에 분산 mount.
// 수정: 별 탭 추가 (하위 호환 유지 — 기존 mount 위치 변경 X).
export type AppTab = 'world' | 'writing' | 'history' | 'settings' | 'characters' | 'direction' | 'style' | 'manuscript' | 'docs' | 'visual' | 'scene-sheet';

// 세계관 스튜디오 서브탭
export type WorldSubTab = 'design' | 'simulator' | 'analysis' | 'timeline' | 'map';

// [2026-05-09] CharacterTab 서브탭 type — DRY (StudioContext / CharacterTab / StudioTabRouter 3곳 중복 제거).
export type CharacterSubTab = 'characters' | 'items';

export interface PclGuardrails {
  min: number;
  max: number;
}

export type CharacterDevelopmentTier = 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
export type NarrativeInfoState = 'unknown' | 'rumor' | 'partial' | 'known' | 'secret' | 'false';
export type AssetPotentialLevel = 'none' | 'low' | 'medium' | 'high' | 'premium';

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
  relationPattern?: string;    // 관계 패턴
  symbol?: string;             // 상징 요소
  secret?: string;             // 비밀 요소
  externalPerception?: string; // 타인이 보는 인상
  // Social Register Pack
  socialProfile?: SocialProfile;
  // Professional asset/workflow fields (Loreguard project pipeline)
  developmentTier?: CharacterDevelopmentTier; // T0 seed -> T5 release/IP-ready
  informationState?: NarrativeInfoState;      // reader/world knowledge state
  publicKnowledge?: string;                   // what the public/world believes
  privateTruth?: string;                      // hidden factual layer
  relationAddress?: string;                   // address term / nickname rule
  honorificRule?: string;                     // formal/informal speech rule
  assetPotential?: AssetPotentialLevel;       // webtoon/drama/goods expansion potential
  assetMemo?: string;                         // rights/IP packaging memo
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

// ============================================================
// M4 — Responsibility Boundary Tags (NOA Core 3-Axis Patent)
// ============================================================
//
// 책임 분계 태그(Origin Tag) 시스템.
// 씬시트의 14+ 필드 각각에 "누가 이 값을 썼는가"를 기록한다.
// - USER: 작가 직접 입력 (최상위 권위)
// - TEMPLATE: GENRE_PRESETS 등 시스템 기본값
// - ENGINE_SUGGEST: 엔진/노아 제안 — 작가가 수락한 상태
// - ENGINE_DRAFT: 엔진 초안 — 작가가 아직 확정하지 않은 상태
//
// 역호환 원칙: 래핑 안 된 V1 값은 unwrap()/migrateToV2()에서 USER 자동 태그.
// V2 → V1 역방향 마이그레이션은 unwrap만 수행 (메타 폐기, 데이터 보존).
// ============================================================

/** 4종 책임 분계 태그 */
export type EntryOrigin = 'USER' | 'TEMPLATE' | 'ENGINE_SUGGEST' | 'ENGINE_DRAFT';

/** 변경 이력 1건 */
export interface OriginEditEvent {
  origin: EntryOrigin;
  at: number;
}

/** TaggedField 메타데이터 — 출처/시간/이력/참조 */
export interface OriginMetadata {
  origin: EntryOrigin;
  createdAt: number;
  /** 편집 이력 — 가장 최근이 마지막. 메모리 절약 위해 최대 20개. */
  editedBy?: OriginEditEvent[];
  /** 프리셋/제안 ID 등 출처 ID (감사 추적용) */
  sourceReferenceId?: string;
}

/** 임의 값 T를 메타와 함께 래핑한 형태 */
export interface TaggedValue<T> {
  value: T;
  meta: OriginMetadata;
}

/** TaggedField — 래핑되었을 수도, 아닐 수도 있는 필드 (역호환) */
export type TaggedField<T> = T | TaggedValue<T>;

export interface SceneProductionDirection {
  miseEnScene?: string;
  camera?: string;
  lighting?: string;
  sound?: string;
  action?: string;
  proseRhythm?: string;
  updatedAt?: number;
}

// Scene Direction (작품 연출) data — V1 (기존). 역호환 위해 유지.
// 주의: 이것은 **작품 전체 연출 공식**(고구마/사이다·훅·감정 곡선·클리프행어·복선 등).
//       에피소드 단위 시나리오는 `EpisodeSceneSheet` (line 420~). 두 개념 구분 필요.
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
  productionDirection?: SceneProductionDirection;
  writerNotes?: string;
  /** 이번 화 등장인물 — 선택된 캐릭터만 프롬프트에 풀 DNA 주입 */
  activeCharacters?: string[];
  /** 이번 화 활성 아이템 ID 목록 — 선택된 아이템만 프롬프트 주입(M3 — 감사 구멍 #1 해결) */
  activeItems?: string[];
  /** 이번 화 활성 스킬 ID 목록 — 선택된 스킬만 프롬프트 주입(M3 — 동일 패턴) */
  activeSkills?: string[];
}

// Scene Sheet V2 — TaggedField 옵션 적용. _originVersion=2가 식별자.
// V1과 동일한 키를 가지되, 값은 TaggedValue로 래핑될 수 있다.
// pipeline/UI는 unwrap()을 거쳐 V1 형태로 사용한다.
export interface SceneDirectionDataV2 {
  goguma?: TaggedField<{ type: "goguma" | "cider"; intensity: string; desc: string; episode?: number }>[];
  hooks?: TaggedField<{ position: string; hookType: string; desc: string }>[];
  emotionTargets?: TaggedField<{ emotion: string; intensity: number; position?: number }>[];
  dialogueTones?: TaggedField<{ character: string; tone: string; notes: string }>[];
  dopamineDevices?: TaggedField<{ scale: string; device: string; desc: string; resolved?: boolean }>[];
  cliffhanger?: TaggedField<{ cliffType: string; desc: string; episode?: number }>;
  plotStructure?: TaggedField<string>;
  foreshadows?: TaggedField<{ planted: string; payoff: string; episode: number; resolved: boolean }>[];
  pacings?: TaggedField<{ section: string; percent: number; desc: string }>[];
  tensionCurve?: TaggedField<{ position: number; level: number; label: string }>[];
  canonRules?: TaggedField<{ character: string; rule: string }>[];
  sceneTransitions?: TaggedField<{ fromScene: string; toScene: string; method: string }>[];
  productionDirection?: TaggedField<SceneProductionDirection>;
  writerNotes?: TaggedField<string>;
  activeCharacters?: TaggedField<string>[];
  activeItems?: TaggedField<string>[];
  activeSkills?: TaggedField<string>[];
  /** V2 식별자 — 항상 2 */
  _originVersion?: 2;
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

// [Z2b — 2026-06-11] 세계관 연표 항목 (loreguard TabWorld 타임라인 서브뷰).
// 구 셸 grep 결과: 연도 기반 연표 config 키 부재 (구 셸 WorldTimeline.tsx 는
// worldSimData.civs/transitions "시대" 기반·연도·사건·인물 구조 없음) → additive 신설.
// 미지정 시 기존 데이터 영향 0 (옵션 키 — 역호환).
export interface WorldTimelineEntry {
  id: string;
  /** 연도/시점 표기 — 자유 서식 ("1024", "BC 300", "현 시점 3년 전"). 정렬은 선두 숫자 추출. */
  year: string;
  /** 사건 내용 */
  event: string;
  /** 관련 인물 이름 목록 — config.characters 와 이름 문자열로 느슨 연결 (id 강결합 X) */
  people?: string[];
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
  // Professional asset/workflow fields
  status?: ItemLifecycleStatus;
  ipPotential?: AssetPotentialLevel;
  rightsMemo?: string;
}

export type ItemLifecycleStatus = 'planned' | 'active' | 'lost' | 'sealed' | 'destroyed' | 'transferred';

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
  /** [X1-xyflow 2026-06-11] 관계도 노드 위치 (character.id → 캔버스 좌표).
   *  TabCharacter "관계도" 뷰에서 드래그 시 디바운스 저장 (additive — 미지정 시 원형 자동 배치). */
  charGraphLayout?: Record<string, { x: number; y: number }>;
  /** [Z2b — 2026-06-11] 세계관 연표 (loreguard TabWorld 타임라인 서브뷰) — additive 신설.
   *  구 셸 호환 grep 완료: 연도 기반 키 부재 → 신규 키. 구 셸 시대 기반 타임라인
   *  (worldSimData.civs/transitions)과 별개·공존. */
  worldTimeline?: WorldTimelineEntry[];
  platform: PlatformType;
  publishPlatform?: PublishPlatform;
  projectTargetLanguage?: ProjectTargetLanguage;
  targetMarket?: ProjectTargetMarket;
  releasePurpose?: ProjectReleasePurpose;
  rightsStatus?: ProjectRightsStatus;
  targetEpisodeLength?: string;
  releaseCadence?: string;
  /** 프로젝트 생성 단계의 권리/IP 메모. 기존 setting 문자열에도 요약 저장되지만 재진입 폼 복원을 위해 별도 보존한다. */
  rightsNote?: string;
  /** 출고·저작권 등록 준비용 작가 표시명. 필명 사용 시 공개 표기 기준으로 쓴다. */
  authorDisplayName?: string;
  /** 출고·저작권 등록 준비용 작가 실명. 필명 확인문 생성에만 사용한다. */
  authorLegalName?: string;
  /** 출고 탭 권리 원장. 미지정 항목은 현재 프로젝트 데이터에서 자동 조립한다. */
  rightsLedger?: ProjectRightsLedgerEntry[];
  /** 외부 작품은 원문/고유명사가 아니라 연출 기법 브릿지만 저장한다. */
  externalCraftReferences?: ExternalCraftReferenceRecord[];
  acceptedImportCandidates?: AcceptedImportCandidateRecord[];
  importFileReports?: ImportFileReportRecord[];
  worldFieldEvidence?: Record<string, WorldFieldEvidenceRecord>;
  mainScenarioStructure?: MainScenarioStructure;
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
  /** Consumed by EpisodeScenePanel UI + injected into engine prompt by engine/pipeline.ts */
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
  useSubGenrePrompt?: boolean; // 서브장르 태그를 엔진 프롬프트에 삽입할지 여부
  // M5 — Genre Translation Layer (novel/webtoon/drama/game)
  // undefined 또는 누락 시 UI는 'novel'로 폴백. 작가가 명시적으로 전환해야 저장된다.
  // 전환은 UI-only — 숨김 필드 값은 저장소에 그대로 유지된다.
  genreMode?: 'novel' | 'webtoon' | 'drama' | 'game';
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
  /** [X4] 프로젝트 맞춤 품질 하네스 — 출고 검수에 적용 (additive·재방문 시 load·setConfig 영속) */
  qualityHarness?: QualityHarness;
}

  /** 작가 수정 내역 (노아 초안 → 작가 수정) */
export interface WriterCorrection {
  original: string;    // 노아 초안 원문 (최대 200자)
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
  lifecycleState?: EpisodeLifecycleState;
  lifecycleUpdatedAt?: number;
  lifecycleReason?: string;
  /** 노아 보조 요약 (2~3줄, 150자 이내) — Tier A context */
  summary?: string;
  /** 노아 보조 상세 요약 (5~8줄, 500자 이내) — Tier B (N-2) context */
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
  // [W2-translate 2026-06-11] 세그먼트 경계 영속 (멱등 복원용 — additive·optional).
  // translatedContent 는 확정 세그먼트 txt 를 "\n\n" 으로 결합한 값이다. 복원 시 비멱등
  // 재분해(splitIntoSegments)로 multi-sentence 세그먼트가 더 많은 조각으로 쪼개지는 왕복
  // 오염을 차단하기 위해, 결합에 사용한 세그먼트 id + 길이를 그대로 보존한다. 존재하면
  // 복원기가 길이 기준으로 정확히 1:1 슬라이스 → 왕복 멱등. 부재(레거시)면 기존 best-effort
  // 재분해 fallback. 사인오프/내용 동등성에는 영향 없음 (순수 복원 보조 메타).
  segmentBoundaries?: { id: string; len: number }[];
  // [C-translate-panels 2026-06-10] 작가 sign-off (author-signoff.ts boolean 흐름) — 회차×언어 단위 영속.
  // TabTranslate.persistTranslations 가 entry 를 새로 쓰면 (재번역·세그먼트 추가 확정) 이 필드는
  // 의도적으로 초기화된다 — 내용 변경 = 재승인 필요. (30조건 검증기는 후속 — #14)
  /** Faithful track (저작권 archive) 작가 승인 */
  faithfulApproved?: boolean;
  /** Market track (출판본) 작가 승인 */
  marketApproved?: boolean;
  /** 마지막 승인 시각 (Unix ms) */
  approvedAt?: number;
}

// Episode scene sheet entry (per-scene row in the table)
export interface EpisodeSceneEntry {
  sceneId: string;       // "1-1", "1-2", "2-1"
  sceneName: string;
  characters: string;
  tone: string;          // "감동", "긴장", "개그", "액션" etc.
  summary: string;
  purpose?: string;
  conflict?: string;
  publicInfo?: string;
  hiddenInfo?: string;
  emotionCurve?: string;
  rewardBeat?: string;
  hookPoint?: string;
  keyDialogue: string;
  emotionPoint: string;
  nextScene: string;
}

// Episode scene sheet (per-episode scene table)
export interface EpisodeSceneSheet {
  /**
   * 안정 고유 id (crypto.randomUUID). React key·reconciliation 전용.
   * episode 는 사용자 편집/재정렬로 충돌·변동 가능하므로 별도 stable id 를 둔다.
   * Optional + 하위호환: 구 데이터(id 없음)는 소비측에서 fallback 키로 보강한다.
   */
  id?: string;
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

export { PlatformType, EpisodeState, PublishPlatform } from '../engine/types';
export type { EngineReport } from '../engine/types';
export type * from './studio-project-types';
export * from './studio-types.runtime';
