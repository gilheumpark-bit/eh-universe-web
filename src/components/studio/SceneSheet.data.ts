import type { GrammarRegion } from "@/lib/grammar-packs";
import type { AppLanguage, EpisodeSceneSheet } from "@/lib/studio-types";
import type { GenreMode } from "@/lib/genre-labels";

export type Lang = "ko" | "en";

export interface GogumaEntry { id: string; type: "goguma" | "cider"; intensity: "small" | "medium" | "large"; desc: string; episode: number; }
export interface ForeshadowEntry { id: string; planted: string; payoff: string; episode: number; resolved: boolean; }
export interface PacingEntry { id: string; section: string; percent: number; desc: string; }
export interface TensionPoint { id: string; position: number; level: number; label: string; }
export interface CanonEntry { id: string; character: string; rule: string; }
export interface TransitionEntry { id: string; fromScene: string; toScene: string; method: string; }
export interface HookEntry { id: string; position: "opening" | "middle" | "ending"; hookType: string; desc: string; }
export interface EmotionPoint { id: string; position: number; emotion: string; intensity: number; }
export interface DialogueRule { id: string; character: string; tone: string; notes: string; }
export interface DopamineEntry { id: string; scale: "micro" | "medium" | "macro"; device: string; desc: string; resolved: boolean; }
export interface CliffEntry { id: string; cliffType: string; desc: string; episode: number; }

export type PlotType = "three-act" | "hero-journey" | "kishotenketsu" | "fichtean";
export interface PlotSegment { id: string; label: string; color: string; width: number; desc: string; }

export interface FullDirectionData {
  goguma: GogumaEntry[];
  hooks: HookEntry[];
  emotions: EmotionPoint[];
  dialogueRules: DialogueRule[];
  dopamines: DopamineEntry[];
  cliffs: CliffEntry[];
  foreshadows: ForeshadowEntry[];
  pacings: PacingEntry[];
  tensionPoints: TensionPoint[];
  canons: CanonEntry[];
  transitions: TransitionEntry[];
  writerNotes: string;
  plotStructure: string;
}

export interface TierContext {
  charProfiles?: { name: string; desire?: string; conflict?: string; changeArc?: string; values?: string }[];
  corePremise?: string;
  powerStructure?: string;
  currentConflict?: string;
}

export interface SceneSheetProps {
  lang?: Lang;
  language?: AppLanguage;
  synopsis?: string;
  characterNames?: string[];
  tierContext?: TierContext;
  onDirectionUpdate?: (data: FullDirectionData) => void;
  onSimRefUpdate?: (ref: Record<string, unknown>) => void;
  initialDirection?: Partial<FullDirectionData>;
  onSaveEpisodeSheet?: (sheet: EpisodeSceneSheet) => void;
  initialTab?: string;
  episodeSceneSheets?: EpisodeSceneSheet[];
  currentEpisode?: number;
  onDeleteEpisodeSheet?: (episode: number) => void;
  onLoadEpisodeSheet?: (episode: number) => void;
  grammarRegion?: GrammarRegion;
  onGrammarRegionChange?: (region: GrammarRegion) => void;
  genreMode?: GenreMode;
  onGenreModeChange?: (mode: GenreMode) => void;
}

export const HOOK_TYPES = [
  { id: "question", ko: "의문형", en: "Question" },
  { id: "shock", ko: "충격형", en: "Shock" },
  { id: "reversal", ko: "반전형", en: "Reversal" },
  { id: "crisis", ko: "위기형", en: "Crisis" },
  { id: "emotion", ko: "감정형", en: "Emotion" },
];

export const CLIFF_TYPES = [
  { id: "crisis-cut", ko: "위기 중단", en: "Crisis Cut" },
  { id: "info-before", ko: "정보 직전", en: "Info Cliffhanger" },
  { id: "reversal-drop", ko: "반전 투하", en: "Reversal Drop" },
  { id: "forced-choice", ko: "선택 강제", en: "Forced Choice" },
  { id: "return", ko: "귀환", en: "Return" },
];

export const DOPAMINE_DEVICES = [
  { id: "growth", ko: "성장 (레벨업/승리)", en: "Growth (level-up/victory)" },
  { id: "relation", ko: "관계 (고백/화해)", en: "Relation (confession/reconcile)" },
  { id: "info", ko: "정보 (비밀 공개/반전)", en: "Info (secret reveal/twist)" },
  { id: "escape", ko: "위기탈출 (역전)", en: "Crisis escape (reversal)" },
  { id: "revenge", ko: "복수/정산", en: "Revenge/settlement" },
];

export const EMOTIONS = ["분노", "슬픔", "기쁨", "공포", "희망", "절망", "결의", "불안", "통쾌", "안도"];

export const TONE_OPTIONS = [
  { id: "dry", ko: "건조한 단문", en: "Dry, short" },
  { id: "warm", ko: "따뜻한 경어", en: "Warm, formal" },
  { id: "tsundere", ko: "츤데레 반말", en: "Tsundere informal" },
  { id: "cynical", ko: "냉소적", en: "Cynical" },
  { id: "formal", ko: "격식 경어", en: "Formal speech" },
  { id: "casual", ko: "편한 반말", en: "Casual informal" },
  { id: "military", ko: "군사적 간결체", en: "Military concise" },
  { id: "classical", ko: "고어체/문어체", en: "Classical/literary" },
];

export const PLOT_PRESETS: Record<PlotType, { ko: string; en: string; segments: Omit<PlotSegment, "id">[] }> = {
  "three-act": {
    ko: "3막 구조", en: "Three-Act",
    segments: [
      { label: "도입", color: "#3b82f6", width: 25, desc: "도입/설정" },
      { label: "대립", color: "#f59e0b", width: 50, desc: "대립/갈등" },
      { label: "해결", color: "#10b981", width: 25, desc: "해결/결말" },
    ],
  },
  "hero-journey": {
    ko: "영웅의 여정", en: "Hero's Journey",
    segments: [
      { label: "일상", color: "#6b7280", width: 10, desc: "일상 세계" },
      { label: "부름", color: "#3b82f6", width: 10, desc: "모험의 부름" },
      { label: "문턱", color: "#8b5cf6", width: 10, desc: "문턱 넘기" },
      { label: "시련", color: "#f59e0b", width: 25, desc: "시련/동맹/적" },
      { label: "죽음", color: "#ef4444", width: 15, desc: "시련/죽음" },
      { label: "보상", color: "#10b981", width: 10, desc: "보상" },
      { label: "귀환", color: "#06b6d4", width: 20, desc: "귀환/변화" },
    ],
  },
  "kishotenketsu": {
    ko: "기승전결", en: "Ki-Sho-Ten-Ketsu",
    segments: [
      { label: "기", color: "#3b82f6", width: 25, desc: "도입" },
      { label: "승", color: "#f59e0b", width: 25, desc: "전개" },
      { label: "전", color: "#ef4444", width: 25, desc: "전환/반전" },
      { label: "결", color: "#10b981", width: 25, desc: "결말" },
    ],
  },
  "fichtean": {
    ko: "위기 곡선", en: "Fichtean Curve",
    segments: [
      { label: "위기1", color: "#f59e0b", width: 15, desc: "첫 번째 위기" },
      { label: "상승1", color: "#ef4444", width: 15, desc: "상승" },
      { label: "위기2", color: "#f59e0b", width: 15, desc: "두 번째 위기" },
      { label: "상승2", color: "#ef4444", width: 15, desc: "상승 가속" },
      { label: "절정", color: "#dc2626", width: 20, desc: "절정" },
      { label: "하강", color: "#10b981", width: 20, desc: "하강/해결" },
    ],
  },
};

export const GENRE_VISUAL: Record<string, { emoji: string; bg: string; border: string; text: string }> = {
  thriller:  { emoji: "🔪", bg: "bg-accent-red/10",    border: "border-accent-red/40",    text: "text-accent-red" },
  romance:   { emoji: "💕", bg: "bg-pink-500/10",   border: "border-pink-400/40",   text: "text-pink-400" },
  action:    { emoji: "⚔️", bg: "bg-orange-500/10", border: "border-orange-400/40", text: "text-orange-400" },
  mystery:   { emoji: "🔍", bg: "bg-indigo-500/10", border: "border-indigo-400/40", text: "text-indigo-400" },
  fantasy:   { emoji: "🐉", bg: "bg-purple-500/10", border: "border-purple-400/40", text: "text-purple-400" },
  horror:    { emoji: "👻", bg: "bg-gray-500/10",   border: "border-gray-400/40",   text: "text-gray-400" },
  sf:        { emoji: "🚀", bg: "bg-cyan-500/10",   border: "border-cyan-400/40",   text: "text-cyan-400" },
  slice:     { emoji: "☕", bg: "bg-green-500/10",   border: "border-green-400/40",  text: "text-green-400" },
  wuxia:     { emoji: "🗡️", bg: "bg-amber-500/10",  border: "border-amber-400/40",  text: "text-amber-400" },
  dark:      { emoji: "🌑", bg: "bg-zinc-500/10",   border: "border-zinc-400/40",   text: "text-zinc-400" },
};

export const SCENE_PRESETS: { key: string; ko: string; en: string; gen: (ts: number, isKO: boolean) => { gogumas: GogumaEntry[]; hooks: HookEntry[]; emotions: EmotionPoint[]; dialogue: DialogueRule[]; dopamines: DopamineEntry[]; cliffs: CliffEntry[] } }[] = [
  { key: "thriller", ko: "스릴러/서스펜스", en: "Thriller/Suspense", gen: (ts, k) => ({
    gogumas: [{ id: `g-${ts}-1`, type: "goguma", intensity: "medium", desc: k ? "거짓 단서 투척" : "Red herring planted", episode: 1 }, { id: `g-${ts}-2`, type: "cider", intensity: "large", desc: k ? "반전 폭탄" : "Twist bomb", episode: 1 }],
    hooks: [{ id: `h-${ts}-1`, position: "opening", hookType: "shock", desc: k ? "긴박한 상황 중간 진입" : "Enter mid-crisis" }, { id: `h-${ts}-2`, position: "ending", hookType: "question", desc: k ? "범인 실루엣 노출" : "Culprit silhouette revealed" }],
    emotions: [{ id: `e-${ts}-1`, position: 10, emotion: k ? "불안" : "Anxiety", intensity: 50 }, { id: `e-${ts}-2`, position: 80, emotion: k ? "공포" : "Fear", intensity: 90 }],
    dialogue: [{ id: `d-${ts}-1`, character: k ? "탐정" : "Detective", tone: k ? "건조한 단문" : "Dry, short", notes: "" }],
    dopamines: [{ id: `dp-${ts}-1`, scale: "micro", device: "info", desc: k ? "단서 발견" : "Clue found", resolved: false }],
    cliffs: [{ id: `cl-${ts}-1`, cliffType: "crisis-cut", desc: k ? "\"그 사람은 이미—\" (암전)" : "\"That person already—\" (blackout)", episode: 1 }],
  }) },
  { key: "romance", ko: "로맨스", en: "Romance", gen: (ts, k) => ({
    gogumas: [{ id: `g-${ts}-1`, type: "goguma", intensity: "small", desc: k ? "오해로 인한 감정 틀어짐" : "Misunderstanding causes rift", episode: 1 }, { id: `g-${ts}-2`, type: "cider", intensity: "large", desc: k ? "고백/화해" : "Confession/reconciliation", episode: 1 }],
    hooks: [{ id: `h-${ts}-1`, position: "opening", hookType: "question", desc: k ? "운명적 재회" : "Fateful reunion" }],
    emotions: [{ id: `e-${ts}-1`, position: 20, emotion: k ? "설렘" : "Flutter", intensity: 60 }, { id: `e-${ts}-2`, position: 70, emotion: k ? "절절함" : "Longing", intensity: 85 }],
    dialogue: [{ id: `d-${ts}-1`, character: k ? "여주" : "Heroine", tone: k ? "츤데레 반말" : "Tsundere informal", notes: "" }],
    dopamines: [{ id: `dp-${ts}-1`, scale: "medium", device: "growth", desc: k ? "감정 인지 순간" : "Moment of realization", resolved: false }],
    cliffs: [{ id: `cl-${ts}-1`, cliffType: "info-before", desc: k ? "뒤돌아선 눈물" : "Tears turned away", episode: 1 }],
  }) },
  { key: "action", ko: "액션/전투", en: "Action/Battle", gen: (ts, k) => ({
    gogumas: [{ id: `g-${ts}-1`, type: "goguma", intensity: "large", desc: k ? "아군 배신" : "Ally betrayal", episode: 1 }],
    hooks: [{ id: `h-${ts}-1`, position: "opening", hookType: "shock", desc: k ? "폭발 장면으로 시작" : "Open with explosion" }],
    emotions: [{ id: `e-${ts}-1`, position: 30, emotion: k ? "분노" : "Rage", intensity: 80 }, { id: `e-${ts}-2`, position: 90, emotion: k ? "승리감" : "Victory", intensity: 95 }],
    dialogue: [{ id: `d-${ts}-1`, character: k ? "주인공" : "Protagonist", tone: k ? "짧은 전투 대사" : "Short battle lines", notes: "" }],
    dopamines: [{ id: `dp-${ts}-1`, scale: "macro", device: "growth", desc: k ? "각성/레벨업" : "Awakening/Level up", resolved: false }],
    cliffs: [{ id: `cl-${ts}-1`, cliffType: "crisis-cut", desc: k ? "더 강한 적 등장" : "Stronger foe appears", episode: 1 }],
  }) },
  { key: "mystery", ko: "미스터리/추리", en: "Mystery", gen: (ts, k) => ({
    gogumas: [{ id: `g-${ts}-1`, type: "goguma", intensity: "medium", desc: k ? "핵심 증거 은폐" : "Key evidence hidden", episode: 1 }],
    hooks: [{ id: `h-${ts}-1`, position: "opening", hookType: "question", desc: k ? "시체 발견" : "Body discovered" }],
    emotions: [{ id: `e-${ts}-1`, position: 40, emotion: k ? "의심" : "Suspicion", intensity: 65 }],
    dialogue: [{ id: `d-${ts}-1`, character: k ? "탐정" : "Detective", tone: k ? "논리적 경어" : "Logical formal", notes: "" }],
    dopamines: [{ id: `dp-${ts}-1`, scale: "micro", device: "info", desc: k ? "단서 연결" : "Clue connection", resolved: false }],
    cliffs: [{ id: `cl-${ts}-1`, cliffType: "info-before", desc: k ? "알리바이 붕괴" : "Alibi collapse", episode: 1 }],
  }) },
  { key: "fantasy", ko: "판타지/모험", en: "Fantasy/Adventure", gen: (ts, k) => ({
    gogumas: [{ id: `g-${ts}-1`, type: "goguma", intensity: "small", desc: k ? "예언의 이중 해석" : "Prophecy double meaning", episode: 1 }, { id: `g-${ts}-2`, type: "cider", intensity: "large", desc: k ? "진정한 힘 각성" : "True power awakening", episode: 1 }],
    hooks: [{ id: `h-${ts}-1`, position: "opening", hookType: "question", desc: k ? "고대 유적 발견" : "Ancient ruins found" }],
    emotions: [{ id: `e-${ts}-1`, position: 20, emotion: k ? "경이" : "Wonder", intensity: 70 }, { id: `e-${ts}-2`, position: 80, emotion: k ? "결의" : "Resolve", intensity: 85 }],
    dialogue: [{ id: `d-${ts}-1`, character: k ? "멘토" : "Mentor", tone: k ? "격식 있는 경어" : "Formal speech", notes: "" }],
    dopamines: [{ id: `dp-${ts}-1`, scale: "medium", device: "growth", desc: k ? "새 마법/스킬 습득" : "New spell/skill acquired", resolved: false }],
    cliffs: [{ id: `cl-${ts}-1`, cliffType: "crisis-cut", desc: k ? "봉인 해제" : "Seal broken", episode: 1 }],
  }) },
  { key: "horror", ko: "공포/호러", en: "Horror", gen: (ts, k) => ({
    gogumas: [{ id: `g-${ts}-1`, type: "goguma", intensity: "large", desc: k ? "탈출구가 함정" : "Escape route is a trap", episode: 1 }],
    hooks: [{ id: `h-${ts}-1`, position: "opening", hookType: "shock", desc: k ? "일상 속 미세한 이상" : "Subtle anomaly in daily life" }],
    emotions: [{ id: `e-${ts}-1`, position: 30, emotion: k ? "불안" : "Dread", intensity: 60 }, { id: `e-${ts}-2`, position: 90, emotion: k ? "공포" : "Terror", intensity: 95 }],
    dialogue: [{ id: `d-${ts}-1`, character: k ? "생존자" : "Survivor", tone: k ? "떨리는 단문" : "Trembling short lines", notes: "" }],
    dopamines: [{ id: `dp-${ts}-1`, scale: "micro", device: "info", desc: k ? "진실에 한 발짝" : "One step closer to truth", resolved: false }],
    cliffs: [{ id: `cl-${ts}-1`, cliffType: "crisis-cut", desc: k ? "뒤에 누군가 서 있다" : "Someone standing behind", episode: 1 }],
  }) },
  { key: "sf", ko: "SF/우주", en: "Sci-Fi/Space", gen: (ts, k) => ({
    gogumas: [{ id: `g-${ts}-1`, type: "goguma", intensity: "medium", desc: k ? "노아 판단 오류" : "Noa judgment error", episode: 1 }],
    hooks: [{ id: `h-${ts}-1`, position: "opening", hookType: "question", desc: k ? "미지 신호 수신" : "Unknown signal received" }],
    emotions: [{ id: `e-${ts}-1`, position: 25, emotion: k ? "경외" : "Awe", intensity: 70 }],
    dialogue: [{ id: `d-${ts}-1`, character: k ? "함장" : "Captain", tone: k ? "군사적 간결체" : "Military concise", notes: "" }],
    dopamines: [{ id: `dp-${ts}-1`, scale: "macro", device: "growth", desc: k ? "기술 돌파" : "Tech breakthrough", resolved: false }],
    cliffs: [{ id: `cl-${ts}-1`, cliffType: "info-before", desc: k ? "행성 소멸 감지" : "Planet vanishing detected", episode: 1 }],
  }) },
  { key: "slice", ko: "일상/힐링", en: "Slice of Life", gen: (ts, k) => ({
    gogumas: [{ id: `g-${ts}-1`, type: "goguma", intensity: "small", desc: k ? "사소한 오해" : "Minor misunderstanding", episode: 1 }],
    hooks: [{ id: `h-${ts}-1`, position: "opening", hookType: "question", desc: k ? "새로운 이웃/전학생" : "New neighbor/transfer student" }],
    emotions: [{ id: `e-${ts}-1`, position: 50, emotion: k ? "따뜻함" : "Warmth", intensity: 75 }],
    dialogue: [{ id: `d-${ts}-1`, character: k ? "친구" : "Friend", tone: k ? "편한 반말" : "Casual informal", notes: "" }],
    dopamines: [{ id: `dp-${ts}-1`, scale: "micro", device: "info", desc: k ? "작은 성취감" : "Small accomplishment", resolved: false }],
    cliffs: [{ id: `cl-${ts}-1`, cliffType: "info-before", desc: k ? "예상 못한 편지" : "Unexpected letter", episode: 1 }],
  }) },
  { key: "wuxia", ko: "무협", en: "Wuxia/Martial Arts", gen: (ts, k) => ({
    gogumas: [{ id: `g-${ts}-1`, type: "goguma", intensity: "large", desc: k ? "사부의 비밀" : "Master's secret", episode: 1 }],
    hooks: [{ id: `h-${ts}-1`, position: "opening", hookType: "shock", desc: k ? "무림 맹주 암살" : "Alliance leader assassinated" }],
    emotions: [{ id: `e-${ts}-1`, position: 40, emotion: k ? "비장" : "Solemn resolve", intensity: 80 }],
    dialogue: [{ id: `d-${ts}-1`, character: k ? "주인공" : "Protagonist", tone: k ? "무협 고어체" : "Classical martial tone", notes: "" }],
    dopamines: [{ id: `dp-${ts}-1`, scale: "macro", device: "growth", desc: k ? "비급 체득" : "Secret technique mastered", resolved: false }],
    cliffs: [{ id: `cl-${ts}-1`, cliffType: "crisis-cut", desc: k ? "독에 당함" : "Poisoned", episode: 1 }],
  }) },
  { key: "dark", ko: "다크/디스토피아", en: "Dark/Dystopia", gen: (ts, k) => ({
    gogumas: [{ id: `g-${ts}-1`, type: "goguma", intensity: "large", desc: k ? "체제의 거짓 폭로" : "System's lie exposed", episode: 1 }],
    hooks: [{ id: `h-${ts}-1`, position: "opening", hookType: "reversal", desc: k ? "유토피아의 균열" : "Crack in utopia" }],
    emotions: [{ id: `e-${ts}-1`, position: 60, emotion: k ? "절망" : "Despair", intensity: 85 }, { id: `e-${ts}-2`, position: 95, emotion: k ? "저항" : "Defiance", intensity: 90 }],
    dialogue: [{ id: `d-${ts}-1`, character: k ? "반역자" : "Rebel", tone: k ? "냉소적 단문" : "Cynical short", notes: "" }],
    dopamines: [{ id: `dp-${ts}-1`, scale: "medium", device: "info", desc: k ? "진실 한 조각" : "A piece of truth", resolved: false }],
    cliffs: [{ id: `cl-${ts}-1`, cliffType: "crisis-cut", desc: k ? "체포 직전" : "Moments before arrest", episode: 1 }],
  }) },
];

interface GenreSmartDefault {
  hooks: string[];
  dopamine: string[];
  tension: "low" | "medium" | "high" | "very_high";
  pacing: "slow" | "medium" | "fast";
  cliffhanger: string;
  goguma_intensity: "small" | "medium" | "large";
}

export const GENRE_SMART_DEFAULTS: Record<string, GenreSmartDefault> = {
  thriller:  { hooks: ["crisis", "reversal"],   dopamine: ["escape", "info"],     tension: "very_high", pacing: "fast",   cliffhanger: "crisis-cut",    goguma_intensity: "medium" },
  romance:   { hooks: ["emotion", "question"],  dopamine: ["relation", "growth"], tension: "medium",    pacing: "medium", cliffhanger: "info-before",   goguma_intensity: "small" },
  action:    { hooks: ["shock", "crisis"],      dopamine: ["escape", "growth"],   tension: "very_high", pacing: "fast",   cliffhanger: "crisis-cut",    goguma_intensity: "large" },
  mystery:   { hooks: ["question", "reversal"], dopamine: ["info", "escape"],     tension: "high",      pacing: "medium", cliffhanger: "info-before",   goguma_intensity: "medium" },
  fantasy:   { hooks: ["question", "shock"],    dopamine: ["growth", "info"],     tension: "medium",    pacing: "medium", cliffhanger: "crisis-cut",    goguma_intensity: "small" },
  horror:    { hooks: ["shock", "question"],    dopamine: ["info", "escape"],     tension: "very_high", pacing: "slow",   cliffhanger: "crisis-cut",    goguma_intensity: "large" },
  sf:        { hooks: ["question", "shock"],    dopamine: ["info", "growth"],     tension: "high",      pacing: "medium", cliffhanger: "info-before",   goguma_intensity: "medium" },
  slice:     { hooks: ["question", "emotion"],  dopamine: ["relation", "info"],   tension: "low",       pacing: "slow",   cliffhanger: "info-before",   goguma_intensity: "small" },
  wuxia:     { hooks: ["shock", "reversal"],    dopamine: ["growth", "revenge"],  tension: "high",      pacing: "fast",   cliffhanger: "crisis-cut",    goguma_intensity: "large" },
  dark:      { hooks: ["reversal", "shock"],    dopamine: ["info", "escape"],     tension: "very_high", pacing: "medium", cliffhanger: "crisis-cut",    goguma_intensity: "large" },
};

export const TENSION_LEVEL_MAP: Record<string, number> = { low: 25, medium: 50, high: 75, very_high: 90 };
