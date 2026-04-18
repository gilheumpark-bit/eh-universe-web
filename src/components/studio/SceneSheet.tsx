"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { FileText } from "lucide-react";
import { showAlert } from "@/lib/show-alert";
import { GRAMMAR_PACKS, GRAMMAR_REGIONS, type GrammarRegion } from "@/lib/grammar-packs";
import { createT, L4 } from "@/lib/i18n";
import type { AppLanguage, EpisodeSceneSheet } from "@/lib/studio-types";
import { useStudioUI } from "@/contexts/StudioContext";
import { EmptyState } from "@/components/ui/EmptyState";

// ============================================================
// PART 1 — 타입 및 상수 (장르 프리셋, 플롯 프리셋, 스마트 디폴트)
// ============================================================

type Lang = "ko" | "en";

interface GogumaEntry { id: string; type: "goguma" | "cider"; intensity: "small" | "medium" | "large"; desc: string; episode: number; }
interface ForeshadowEntry { id: string; planted: string; payoff: string; episode: number; resolved: boolean; }
interface PacingEntry { id: string; section: string; percent: number; desc: string; }
interface TensionPoint { id: string; position: number; level: number; label: string; }
interface CanonEntry { id: string; character: string; rule: string; }
interface TransitionEntry { id: string; fromScene: string; toScene: string; method: string; }
interface HookEntry { id: string; position: "opening" | "middle" | "ending"; hookType: string; desc: string; }
interface EmotionPoint { id: string; position: number; emotion: string; intensity: number; }
interface DialogueRule { id: string; character: string; tone: string; notes: string; }
interface DopamineEntry { id: string; scale: "micro" | "medium" | "macro"; device: string; desc: string; resolved: boolean; }
interface CliffEntry { id: string; cliffType: string; desc: string; episode: number; }

type PlotType = "three-act" | "hero-journey" | "kishotenketsu" | "fichtean";
interface PlotSegment { id: string; label: string; color: string; width: number; desc: string; }

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

interface TierContext {
  charProfiles?: { name: string; desire?: string; conflict?: string; changeArc?: string; values?: string }[];
  corePremise?: string;
  powerStructure?: string;
  currentConflict?: string;
}

interface SceneSheetProps {
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
  /** 문법팩 국가 코드 (StoryConfig.grammarRegion). 변경 시 onGrammarRegionChange로 알림. */
  grammarRegion?: GrammarRegion;
  onGrammarRegionChange?: (region: GrammarRegion) => void;
}

const HOOK_TYPES = [
  { id: "question", ko: "의문형", en: "Question" },
  { id: "shock", ko: "충격형", en: "Shock" },
  { id: "reversal", ko: "반전형", en: "Reversal" },
  { id: "crisis", ko: "위기형", en: "Crisis" },
  { id: "emotion", ko: "감정형", en: "Emotion" },
];

const CLIFF_TYPES = [
  { id: "crisis-cut", ko: "위기 중단", en: "Crisis Cut" },
  { id: "info-before", ko: "정보 직전", en: "Info Cliffhanger" },
  { id: "reversal-drop", ko: "반전 투하", en: "Reversal Drop" },
  { id: "forced-choice", ko: "선택 강제", en: "Forced Choice" },
  { id: "return", ko: "귀환", en: "Return" },
];

const DOPAMINE_DEVICES = [
  { id: "growth", ko: "성장 (레벨업/승리)", en: "Growth (level-up/victory)" },
  { id: "relation", ko: "관계 (고백/화해)", en: "Relation (confession/reconcile)" },
  { id: "info", ko: "정보 (비밀 공개/반전)", en: "Info (secret reveal/twist)" },
  { id: "escape", ko: "위기탈출 (역전)", en: "Crisis escape (reversal)" },
  { id: "revenge", ko: "복수/정산", en: "Revenge/settlement" },
];

const EMOTIONS = ["분노", "슬픔", "기쁨", "공포", "희망", "절망", "결의", "불안", "통쾌", "안도"];

const TONE_OPTIONS = [
  { id: "dry", ko: "건조한 단문", en: "Dry, short" },
  { id: "warm", ko: "따뜻한 경어", en: "Warm, formal" },
  { id: "tsundere", ko: "츤데레 반말", en: "Tsundere informal" },
  { id: "cynical", ko: "냉소적", en: "Cynical" },
  { id: "formal", ko: "격식 경어", en: "Formal speech" },
  { id: "casual", ko: "편한 반말", en: "Casual informal" },
  { id: "military", ko: "군사적 간결체", en: "Military concise" },
  { id: "classical", ko: "고어체/문어체", en: "Classical/literary" },
];

const PLOT_PRESETS: Record<PlotType, { ko: string; en: string; segments: Omit<PlotSegment, "id">[] }> = {
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

/** Genre visual style: emoji + Tailwind color classes per genre */
const GENRE_VISUAL: Record<string, { emoji: string; bg: string; border: string; text: string }> = {
  thriller:  { emoji: "🔪", bg: "bg-red-500/10",    border: "border-red-400/40",    text: "text-red-400" },
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

const SCENE_PRESETS: { key: string; ko: string; en: string; gen: (ts: number, isKO: boolean) => { gogumas: GogumaEntry[]; hooks: HookEntry[]; emotions: EmotionPoint[]; dialogue: DialogueRule[]; dopamines: DopamineEntry[]; cliffs: CliffEntry[] } }[] = [
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
    gogumas: [{ id: `g-${ts}-1`, type: "goguma", intensity: "medium", desc: k ? "NOA 판단 오류" : "NOA judgment error", episode: 1 }],
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

const GENRE_SMART_DEFAULTS: Record<string, GenreSmartDefault> = {
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

const TENSION_LEVEL_MAP: Record<string, number> = { low: 25, medium: 50, high: 75, very_high: 90 };

// ============================================================
// PART 2 — PlotBarEditor 서브컴포넌트 (Section 헬퍼 포함)
// ============================================================

/** Collapsible section wrapper */
function Section({ title, children, defaultOpen = true, badge, desc, highlight }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string; desc?: string; highlight?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border-b ${highlight ? 'border-accent-purple/30 bg-accent-purple/[0.03] rounded-lg -mx-1 px-1' : 'border-border'}`}>
      <button type="button" onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label={`${title} ${open ? 'collapse' : 'expand'}`}
        className="flex items-center gap-2 w-full py-3 px-1 text-left min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {highlight && <span className="w-1.5 h-1.5 rounded-full bg-accent-purple shrink-0" />}
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-text-primary">{title}</span>
          </div>
          {desc && <p className="text-[9px] text-text-quaternary mt-0.5 ml-0 font-normal normal-case tracking-normal">{desc}</p>}
        </div>
        {badge && (
          <span className="text-[9px] font-mono font-bold text-accent-purple bg-accent-purple/10 border border-accent-purple/20 rounded-full px-2 py-0.5 shrink-0">
            {badge}
          </span>
        )}
        <span className={`text-[10px] text-text-tertiary transition-transform shrink-0 ${open ? "rotate-90" : ""}`}>&#9654;</span>
      </button>
      {open && <div className="pb-4 px-1 space-y-3">{children}</div>}
    </div>
  );
}

/** PlotBarEditor — advanced plot structure editor */
function PlotBarEditor({ lang, onPlotChange, initialPlot }: { lang: Lang; onPlotChange?: (preset: string) => void; initialPlot?: string }) {
  const [selectedPreset, setSelectedPreset] = useState<PlotType>((initialPlot as PlotType) || "three-act");
  const [segments, setSegments] = useState<PlotSegment[]>(
    PLOT_PRESETS["three-act"].segments.map((s, i) => ({ ...s, id: `seg-${i}` }))
  );
  const loadPreset = (preset: PlotType) => {
    setSelectedPreset(preset);
    setSegments(PLOT_PRESETS[preset].segments.map((s, i) => ({ ...s, id: `seg-${Date.now()}-${i}` })));
    onPlotChange?.(preset);
  };
  const updateWidth = useCallback((idx: number, delta: number) => {
    setSegments(prev => {
      const next = [...prev];
      const newWidth = Math.max(5, Math.min(80, next[idx].width + delta));
      const diff = newWidth - next[idx].width;
      const neighborIdx = idx < next.length - 1 ? idx + 1 : idx - 1;
      if (neighborIdx >= 0 && neighborIdx < next.length) {
        const neighborNew = next[neighborIdx].width - diff;
        if (neighborNew >= 5) {
          next[idx] = { ...next[idx], width: newWidth };
          next[neighborIdx] = { ...next[neighborIdx], width: neighborNew };
        }
      }
      return next;
    });
  }, []);
  const addSegment = () => {
    setSegments(prev => [...prev, { id: `seg-${Date.now()}`, label: L4(lang, { ko: "새 구간", en: "New Segment", ja: "New Segment", zh: "New Segment" }), color: "#6b7280", width: 10, desc: "" }]);
  };
  const removeSegment = (idx: number) => { if (segments.length <= 2) return; setSegments(prev => prev.filter((_, i) => i !== idx)); };
  const updateSegment = (idx: number, updates: Partial<PlotSegment>) => { setSegments(prev => prev.map((s, i) => i === idx ? { ...s, ...updates } : s)); };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PLOT_PRESETS) as PlotType[]).map(key => (
          <button key={key} onClick={() => loadPreset(key)}
            className={`px-3 py-1.5 rounded text-[13px] font-bold border transition-colors min-h-[44px] ${selectedPreset === key ? "bg-accent-purple text-white border-accent-purple" : "bg-bg-primary text-text-tertiary border-border hover:border-text-tertiary"}`}>
            {L4(lang, PLOT_PRESETS[key])}
          </button>
        ))}
        <button onClick={addSegment} className="px-3 py-1.5 rounded text-[10px] font-bold border border-dashed border-border text-text-tertiary hover:text-accent-purple hover:border-accent-purple transition-colors min-h-[44px]">
          + {L4(lang, { ko: "구간 추가", en: "Add Segment", ja: "区間を追加", zh: "添加区间" })}
        </button>
      </div>
      <div className="flex rounded-lg overflow-hidden h-12 border border-border">
        {segments.map((seg, i) => (
          <div key={seg.id} className="relative flex items-center justify-center text-[9px] font-bold text-white cursor-pointer select-none group"
            style={{ width: `${seg.width}%`, background: seg.color, minWidth: 30 }}>
            <span className="truncate px-1">{seg.label}</span>
            <span className="absolute bottom-0.5 right-1 text-[7px] opacity-60">{seg.width}%</span>
            {i < segments.length - 1 && (
              <div className="absolute right-0 top-0 bottom-0 w-3 sm:w-1 cursor-col-resize hover:bg-white/30 z-10" style={{ touchAction: "none" }}
                onPointerDown={(e) => {
                  e.stopPropagation(); e.preventDefault();
                  const target = e.target as HTMLElement;
                  target.setPointerCapture?.(e.pointerId);
                  const startX = e.clientX;
                  const barWidth = target.closest(".flex")?.getBoundingClientRect().width || 600;
                  const handleMove = (pe: PointerEvent) => { const d = Math.round(((pe.clientX - startX) / barWidth) * 100); if (Math.abs(d) >= 1) updateWidth(i, d); };
                  const handleUp = () => { document.removeEventListener("pointermove", handleMove); document.removeEventListener("pointerup", handleUp); document.removeEventListener("pointercancel", handleUp); };
                  document.addEventListener("pointermove", handleMove); document.addEventListener("pointerup", handleUp); document.addEventListener("pointercancel", handleUp);
                }} />
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {segments.map((seg, i) => (
          <div key={seg.id} className="border border-border rounded-lg p-3 bg-bg-primary space-y-2" style={{ borderLeftWidth: 3, borderLeftColor: seg.color }}>
            <div className="flex justify-between items-center">
              <input value={seg.label} onChange={e => updateSegment(i, { label: e.target.value })} maxLength={100} className="bg-transparent font-bold text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 flex-1" />
              <div className="flex items-center gap-1">
                <input type="color" value={seg.color} onChange={e => updateSegment(i, { color: e.target.value })} aria-label={`${seg.label || "segment"} color`} className="w-5 h-5 rounded cursor-pointer border-0" />
                {segments.length > 2 && <button onClick={() => removeSegment(i)} aria-label={L4(lang, { ko: `${seg.label || '구간'} 삭제`, en: `Delete ${seg.label || 'segment'}`, ja: `${seg.label || '区間'}を削除`, zh: `删除${seg.label || '区间'}` })} className="text-text-tertiary hover:text-accent-red text-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>}
              </div>
            </div>
            <input value={seg.desc} onChange={e => updateSegment(i, { desc: e.target.value })} placeholder={L4(lang, { ko: "설명...", en: "Description...", ja: "説明...", zh: "描述..." })} maxLength={500} className="w-full bg-bg-secondary border border-border rounded px-2 py-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50" />
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-text-tertiary">{L4(lang, { ko: "비중", en: "Weight", ja: "Weight", zh: "Weight" })}:</span>
              <input type="range" min={5} max={80} value={seg.width} aria-label={L4(lang, { ko: `${seg.label} 비중`, en: `${seg.label} weight`, ja: `${seg.label} weight`, zh: `${seg.label} weight` })} onChange={e => { const nw = parseInt(e.target.value); updateWidth(i, nw - seg.width); }} className="flex-1 h-1 accent-accent-purple" />
              <span className="text-[9px] font-bold text-accent-purple w-8 text-right">{seg.width}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PART 3 — SceneSheet 메인 컴포넌트 (3-section 씬시트 + 13탭 고급 설정)
// ============================================================

export default function SceneSheet({
  lang: langProp, language: languageProp, synopsis, characterNames, tierContext,
  onDirectionUpdate, onSimRefUpdate, initialDirection, onSaveEpisodeSheet,
  initialTab: _initialTab, episodeSceneSheets, currentEpisode, onDeleteEpisodeSheet, onLoadEpisodeSheet,
  grammarRegion: grammarRegionProp, onGrammarRegionChange,
}: SceneSheetProps) {
  const lang: Lang = langProp ?? ((languageProp === "KO" || languageProp === "JP") ? "ko" : "en");
  const tl = createT(languageProp ?? (lang === "ko" ? "KO" : "EN"));
  const { showConfirm, closeConfirm } = useStudioUI();

  // --- Unified direction state ---
  const [gogumas, setGogumas] = useState<GogumaEntry[]>(initialDirection?.goguma ?? []);
  const [hooks, setHooks] = useState<HookEntry[]>(initialDirection?.hooks ?? []);
  const [emotions, setEmotions] = useState<EmotionPoint[]>(initialDirection?.emotions ?? []);
  const [dialogueRules, setDialogueRules] = useState<DialogueRule[]>(initialDirection?.dialogueRules ?? []);
  const [dopamines, setDopamines] = useState<DopamineEntry[]>(initialDirection?.dopamines ?? []);
  const [cliffs, setCliffs] = useState<CliffEntry[]>(initialDirection?.cliffs ?? []);
  const [foreshadows, setForeshadows] = useState<ForeshadowEntry[]>(initialDirection?.foreshadows ?? []);
  const [pacings, setPacings] = useState<PacingEntry[]>(initialDirection?.pacings ?? [
    { id: "p-1", section: L4(lang, { ko: "도입", en: "Intro", ja: "導入", zh: "引入" }), percent: 20, desc: "" },
    { id: "p-2", section: L4(lang, { ko: "전개", en: "Development", ja: "展開", zh: "发展" }), percent: 50, desc: "" },
    { id: "p-3", section: L4(lang, { ko: "전환", en: "Transition", ja: "転換", zh: "转折" }), percent: 30, desc: "" },
  ]);
  const [tensionPoints, setTensionPoints] = useState<TensionPoint[]>(initialDirection?.tensionPoints ?? []);
  const [canons, setCanons] = useState<CanonEntry[]>(initialDirection?.canons ?? []);
  const [transitions, setTransitions] = useState<TransitionEntry[]>(initialDirection?.transitions ?? []);
  const [writerNotes, setWriterNotes] = useState(initialDirection?.writerNotes ?? "");
  const [plotStructure, setPlotStructure] = useState(initialDirection?.plotStructure ?? "");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [grammarRegion, setGrammarRegion] = useState<GrammarRegion>(grammarRegionProp ?? "KR");
  const [showGrammarPanel, setShowGrammarPanel] = useState(false);
  // [C] "빈 씬시트로 바로 시작" 의도 추적 — 사용자가 EmptyState에서 "빈 시트" 선택하면 EmptyState 숨김
  const [blankStarted, setBlankStarted] = useState(false);

  // [C] 핵심 데이터가 모두 비어 있는지 계산. initialDirection이 있으면 false.
  //     pacings는 기본값으로 3개 세팅되므로 제외.
  const isSceneSheetEmpty =
    !blankStarted &&
    !activePreset &&
    !writerNotes.trim() &&
    (initialDirection?.goguma?.length ?? 0) === 0 &&
    !initialDirection?.writerNotes;

  // grammarRegion 변경 시 상위(StoryConfig)에 전파
  useEffect(() => {
    if (grammarRegionProp !== undefined && grammarRegion !== grammarRegionProp) {
      onGrammarRegionChange?.(grammarRegion);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grammarRegion]);

  // 상위에서 grammarRegion이 변경되면 로컬 state 동기화
  useEffect(() => {
    if (grammarRegionProp !== undefined && grammarRegionProp !== grammarRegion) {
      setGrammarRegion(grammarRegionProp);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grammarRegionProp]);

  const sortedEmotions = useMemo(() => [...emotions].sort((a, b) => a.position - b.position), [emotions]);
  const sortedTensionPoints = useMemo(() => [...tensionPoints].sort((a, b) => a.position - b.position), [tensionPoints]);

  // Simulator reference checkpoints
  const [simRef, setSimRef] = useState({ worldConsistency: false, civRelations: false, timeline: false, territoryMap: false, languageSystem: false, genreLevel: false });

  /** Build current FullDirectionData snapshot */
  const buildDirection = useCallback((): FullDirectionData => ({
    goguma: gogumas, hooks, emotions, dialogueRules, dopamines, cliffs,
    foreshadows, pacings, tensionPoints, canons, transitions, writerNotes, plotStructure,
  }), [gogumas, hooks, emotions, dialogueRules, dopamines, cliffs, foreshadows, pacings, tensionPoints, canons, transitions, writerNotes, plotStructure]);

  // Sync direction to parent (debounced 300ms)
  const onDirRef = useRef(onDirectionUpdate);
  onDirRef.current = onDirectionUpdate;
  useEffect(() => {
    const timer = setTimeout(() => onDirRef.current?.(buildDirection()), 300);
    return () => clearTimeout(timer);
  }, [buildDirection]);

  /** Apply a genre preset into current direction state */
  const applyScenePreset = useCallback((presetKey: string) => {
    const preset = SCENE_PRESETS.find(p => p.key === presetKey);
    if (!preset) return;
    showConfirm({
      title: L4(lang, { ko: "프리셋 덮어쓰기", en: "Overwrite with Preset", ja: "プリセット上書き", zh: "预设覆盖" }),
      message: L4(lang, { ko: "현재 연출 데이터를 프리셋으로 덮어쓰시겠습니까?", en: "Overwrite current scene sheet data with this preset?", ja: "現在の演出データをプリセットで上書きしますか？", zh: "要将当前演出数据以预设覆盖吗？" }),
      variant: 'warning',
      confirmLabel: L4(lang, { ko: "덮어쓰기", en: "Overwrite", ja: "上書き", zh: "覆盖" }),
      cancelLabel: L4(lang, { ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" }),
      onConfirm: () => {
        const ts = Date.now();
        const data = preset.gen(ts, lang === "ko");
        setGogumas(data.gogumas);
        setHooks(data.hooks);
        setEmotions(data.emotions);
        setDialogueRules(data.dialogue);
        setDopamines(data.dopamines);
        setCliffs(data.cliffs);
        setActivePreset(presetKey);
        closeConfirm();
      },
    });
  }, [lang, showConfirm, closeConfirm]);

  /** Apply smart defaults — fills only empty fields based on active genre preset */
  const applySmartDefaults = useCallback((presetKey: string) => {
    const defaults = GENRE_SMART_DEFAULTS[presetKey];
    if (!defaults) return;
    const ts = Date.now();
    const isKO = lang === "ko";

    // Goguma: fill only if empty
    if (gogumas.length === 0) {
      setGogumas([
        { id: `sd-g-${ts}-1`, type: "goguma", intensity: defaults.goguma_intensity, desc: "", episode: 1 },
        { id: `sd-g-${ts}-2`, type: "cider", intensity: "large", desc: "", episode: 1 },
      ]);
    }

    // Hooks: fill only if empty
    if (hooks.length === 0) {
      setHooks(defaults.hooks.map((ht, i) => ({
        id: `sd-h-${ts}-${i}`, position: (i === 0 ? "opening" : "ending") as "opening" | "middle" | "ending",
        hookType: ht, desc: "",
      })));
    }

    // Cliffhanger: fill only if empty
    if (cliffs.length === 0) {
      setCliffs([{ id: `sd-cl-${ts}`, cliffType: defaults.cliffhanger, desc: "", episode: 1 }]);
    }

    // Dopamine: fill only if empty
    if (dopamines.length === 0) {
      setDopamines(defaults.dopamine.map((dev, i) => ({
        id: `sd-dp-${ts}-${i}`, scale: "medium" as const, device: dev, desc: "", resolved: false,
      })));
    }

    // Tension: fill only if empty
    if (tensionPoints.length === 0) {
      const level = TENSION_LEVEL_MAP[defaults.tension] ?? 50;
      setTensionPoints([{ id: `sd-tp-${ts}`, position: 50, level, label: isKO ? "기본 텐션" : "Base tension" }]);
    }

    setActivePreset(presetKey);
  }, [lang, gogumas.length, hooks.length, cliffs.length, dopamines.length, tensionPoints.length]);

  /** Save current direction as episode scene sheet */
  const handleSaveEpisode = useCallback(() => {
    if (!onSaveEpisodeSheet) return;
    const ep = currentEpisode ?? 1;
    const dir = buildDirection();
    const sheet: EpisodeSceneSheet = {
      episode: ep,
      title: L4(lang, { ko: `${ep}화 씬시트`, en: `Episode ${ep} Scene Sheet`, ja: `第${ep}話 シーンシート`, zh: `第${ep}章 场景表` }),
      directionSnapshot: {
        goguma: dir.goguma.map(g => ({ type: g.type, intensity: g.intensity, desc: g.desc, episode: g.episode })),
        hooks: dir.hooks.map(h => ({ position: h.position, hookType: h.hookType, desc: h.desc })),
        emotionTargets: dir.emotions.map(e => ({ emotion: e.emotion, intensity: e.intensity, position: e.position })),
        dialogueTones: dir.dialogueRules.map(d => ({ character: d.character, tone: d.tone, notes: d.notes })),
        dopamineDevices: dir.dopamines.map(dp => ({ scale: dp.scale, device: dp.device, desc: dp.desc, resolved: dp.resolved })),
        cliffhanger: dir.cliffs[0] ? { cliffType: dir.cliffs[0].cliffType, desc: dir.cliffs[0].desc, episode: dir.cliffs[0].episode } : undefined,
        foreshadows: dir.foreshadows.map(f => ({ planted: f.planted, payoff: f.payoff, episode: f.episode, resolved: f.resolved })),
        pacings: dir.pacings.map(p => ({ section: p.section, percent: p.percent, desc: p.desc })),
        tensionCurve: dir.tensionPoints.map(t => ({ position: t.position, level: t.level, label: t.label })),
        canonRules: dir.canons.map(c => ({ character: c.character, rule: c.rule })),
        sceneTransitions: dir.transitions.map(t => ({ fromScene: t.fromScene, toScene: t.toScene, method: t.method })),
        writerNotes: dir.writerNotes,
        activeCharacters: dir.dialogueRules.map(d => d.character),
        plotStructure: dir.plotStructure,
      },
      presetUsed: activePreset ?? undefined,
      lastUpdate: Date.now(),
    };
    onSaveEpisodeSheet(sheet);
  }, [onSaveEpisodeSheet, currentEpisode, buildDirection, activePreset, lang]);

  /** AI auto-generate direction */
  const handleAIGenerate = useCallback(async () => {
    const { activeSupportsStructured } = await import("@/lib/ai-providers");
    if (!activeSupportsStructured()) { showAlert(L4(lang, { ko: "현재 노아 엔진은 구조화 생성 미지원.", en: "Current NOA does not support structured generation.", ja: "現在のノアエンジンは構造化生成に未対応。", zh: "当前诺亚引擎不支持结构化生成。" })); return; }
    if (!synopsis) { showAlert(tl("sceneSheet.synopsisRequired")); return; }
    try {
      const { generateSceneDirection } = await import("@/services/geminiService");
      const appLang: AppLanguage = lang === "ko" ? (languageProp === "JP" ? "JP" : languageProp === "CN" ? "CN" : "KO") : "EN";
      const result = await generateSceneDirection(synopsis, characterNames ?? [], appLang, tierContext);
      const ts = Date.now();
      if (result.hooks?.length) setHooks(result.hooks.map((h: { position?: string; hookType?: string; desc?: string }, i: number) => ({ id: `ai-h-${ts}-${i}`, position: (h.position || "opening") as "opening" | "middle" | "ending", hookType: h.hookType || "question", desc: h.desc || "" })));
      if (result.goguma?.length) setGogumas(result.goguma.map((g: { type?: string; intensity?: string; desc?: string }, i: number) => ({ id: `ai-g-${ts}-${i}`, type: (g.type === "cider" ? "cider" : "goguma") as "goguma" | "cider", intensity: (g.intensity || "medium") as "small" | "medium" | "large", desc: g.desc || "", episode: 1 })));
      if (result.cliffhanger) setCliffs([{ id: `ai-c-${ts}`, cliffType: result.cliffhanger.cliffType || "info-before", desc: result.cliffhanger.desc || "", episode: 1 }]);
      if (result.emotionTargets?.length) setEmotions(result.emotionTargets.map((e: { emotion: string; intensity?: number }, i: number) => ({ id: `ai-e-${ts}-${i}`, position: Math.round((i / Math.max(result.emotionTargets.length - 1, 1)) * 100), emotion: e.emotion, intensity: e.intensity || 70 })));
      if (result.dialogueTones?.length) setDialogueRules(result.dialogueTones.map((d: { character: string; tone: string }, i: number) => ({ id: `ai-d-${ts}-${i}`, character: d.character, tone: d.tone, notes: "" })));
      if (result.foreshadows?.length) setForeshadows(result.foreshadows.map((f: { planted: string; payoff: string }, i: number) => ({ id: `ai-f-${ts}-${i}`, planted: f.planted, payoff: f.payoff, episode: 1, resolved: false })));
      if (result.dopamineDevices?.length) setDopamines(result.dopamineDevices.map((dp: { scale?: string; device: string; desc: string }, i: number) => ({ id: `ai-dp-${ts}-${i}`, scale: (dp.scale || "medium") as "micro" | "medium" | "macro", device: dp.device, desc: dp.desc, resolved: false })));
      if (result.pacings?.length) setPacings(result.pacings.map((p: { section: string; percent?: number; desc: string }, i: number) => ({ id: `ai-p-${ts}-${i}`, section: p.section, percent: p.percent || 25, desc: p.desc })));
      if (result.tensionCurve?.length) setTensionPoints(result.tensionCurve.map((t: { position: number; level: number; label: string }, i: number) => ({ id: `ai-t-${ts}-${i}`, position: t.position, level: t.level, label: t.label })));
    } catch { showAlert(tl("sceneSheet.aiFailed")); }
  }, [lang, languageProp, synopsis, characterNames, tierContext, tl]);

  // --- Render ---
  return (
    <div className="flex gap-0">
      {/* Left: main content */}
      <div className="flex-1 space-y-4 min-w-0">
        {/* Header */}
        <div className="doc-header rounded-t mb-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5 p-0.5 bg-black/30 rounded-lg">
              {GRAMMAR_REGIONS.map(r => (
                <button key={r} onClick={() => setGrammarRegion(r)}
                  aria-pressed={grammarRegion === r}
                  aria-label={L4(lang, { ko: `문법팩 ${GRAMMAR_PACKS[r].label.ko}`, en: `Grammar pack ${GRAMMAR_PACKS[r].label.en}`, ja: `文法パック ${GRAMMAR_PACKS[r].label.en}`, zh: `语法包 ${GRAMMAR_PACKS[r].label.en}` })}
                  className={`px-2 py-1 rounded text-[11px] transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${grammarRegion === r ? "bg-accent-purple text-white shadow" : "text-text-tertiary hover:text-text-primary"}`}>
                  {GRAMMAR_PACKS[r].flag}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-amber mr-2">SCENE</span>
              {L4(lang, { ko: "씬시트 — 장르 문법 설계", en: "Scene Sheet — Genre Grammar Design", ja: "シーンシート — ジャンル文法の設計", zh: "场景表 — 类型文法设计" })}
              <span className="text-[10px] text-accent-green/70 font-mono ml-auto">
                {L4(lang, { ko: '자동 저장', en: 'Auto-saved', ja: '自動保存', zh: '自动保存' })}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowGrammarPanel(v => !v)}
              aria-expanded={showGrammarPanel}
              aria-pressed={showGrammarPanel}
              className={`px-3 py-1.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${showGrammarPanel ? "bg-accent-green text-white" : "bg-bg-secondary text-text-tertiary border border-border hover:text-text-primary"}`}>
              {GRAMMAR_PACKS[grammarRegion].flag} {L4(lang, { ko: "문법", en: "Grammar", ja: "Grammar", zh: "Grammar" })}
            </button>
            <button onClick={handleAIGenerate}
              className="px-3 py-1.5 bg-accent-purple text-white rounded text-[10px] font-bold font-mono uppercase tracking-wider hover:opacity-80 transition-opacity min-h-[44px]">
              {tl("sceneSheet.aiGenerate")}
            </button>
          </div>
        </div>

        {/* Grammar Panel */}
        {showGrammarPanel && (() => {
          const pack = GRAMMAR_PACKS[grammarRegion];
          return (
            <div className="border border-t-0 border-border bg-bg-secondary/50 p-4 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black flex items-center gap-2"><span className="text-lg">{pack.flag}</span> {L4(lang, pack.label)}</h3>
                <span className="text-[9px] text-text-tertiary">{pack.episodeLength.min.toLocaleString()}~{pack.episodeLength.max.toLocaleString()} {pack.episodeLength.unit}/{tl("sceneSheet.episodeUnit")}</span>
              </div>
              <div className="h-2 bg-bg-primary rounded-full overflow-hidden flex">
                {pack.beatSheet.map((beat, i) => {
                  const next = pack.beatSheet[i + 1]?.position ?? 100;
                  return <div key={i} className="h-full relative group cursor-default" style={{ width: `${next - beat.position}%`, backgroundColor: `hsl(${(beat.position / 100) * 270}, 60%, 30%)` }}>
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-bg-primary border border-border text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                      <div className="font-bold">{beat.name}</div><div className="text-text-tertiary">{beat.position}% — {beat.desc}</div>
                    </div>
                  </div>;
                })}
              </div>
            </div>
          );
        })()}

        {/* Main scrollable content */}
        <div className="border border-t-0 border-border rounded-b bg-bg-secondary p-4 space-y-2">
          {/* Empty state — 완전 공백일 때 장르 프리셋 안내 */}
          {isSceneSheetEmpty && (
            <EmptyState
              icon={FileText}
              title={L4(lang, {
                ko: '씬시트가 비어 있습니다',
                en: 'Your scene sheet is empty',
                ja: 'シーンシートが空です',
                zh: '场景表是空的',
              })}
              description={L4(lang, {
                ko: '장면 개요부터 시작하세요. 10+ 장르 프리셋 지원.',
                en: 'Start with a scene outline. Supports 10+ genre presets.',
                ja: 'シーン概要から始めましょう。10+ ジャンルプリセット対応。',
                zh: '从场景概述开始。支持 10+ 类型预设。',
              })}
              actions={[
                {
                  label: L4(lang, {
                    ko: '장르 프리셋 선택',
                    en: 'Choose genre preset',
                    ja: 'ジャンルプリセット選択',
                    zh: '选择类型预设',
                  }),
                  variant: 'primary',
                  onClick: () => {
                    // [C] 첫 프리셋 버튼으로 포커스 이동 — 시각적 힌트
                    const firstPreset = document.querySelector<HTMLButtonElement>(
                      '[aria-pressed][aria-label*="preset" i], [aria-pressed][aria-label*="프리셋"]',
                    );
                    firstPreset?.focus();
                  },
                },
                {
                  label: L4(lang, {
                    ko: '빈 씬시트 시작',
                    en: 'Start blank',
                    ja: '空のシーンシートで開始',
                    zh: '从空白开始',
                  }),
                  variant: 'secondary',
                  onClick: () => setBlankStarted(true),
                },
              ]}
            />
          )}

          {/* Preset Bar — 장르별 색상 + 이모지 */}
          <div className="grid grid-cols-5 gap-2 pb-2">
            {SCENE_PRESETS.map(p => {
              const meta = GENRE_VISUAL[p.key] ?? { emoji: "📖", bg: "bg-bg-tertiary", border: "border-border", text: "text-text-primary" };
              const isActive = activePreset === p.key;
              return (
                <button key={p.key} onClick={() => { setActivePreset(p.key); }}
                  aria-pressed={isActive}
                  aria-label={L4(lang, { ko: `${L4(lang, p)} 프리셋 선택`, en: `Select ${L4(lang, p)} preset`, ja: `${L4(lang, p)} プリセットを選択`, zh: `选择 ${L4(lang, p)} 预设` })}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-center transition-[transform,opacity,background-color,border-color,color] min-h-[64px] border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
                    isActive
                      ? `${meta.bg} ${meta.border} ring-2 ring-offset-1 ring-accent-purple shadow-lg scale-[1.04]`
                      : `bg-bg-primary border-border/50 hover:${meta.bg} hover:${meta.border} hover:shadow-md`
                  }`}>
                  <span className="text-xl leading-none">{meta.emoji}</span>
                  <span className={`text-[13px] font-bold leading-tight ${isActive ? meta.text : "text-text-secondary"}`}>
                    {L4(lang, p)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Smart Defaults + Full Overwrite buttons */}
          {activePreset && (
            <div className="flex gap-2 pb-3">
              <button
                onClick={() => applySmartDefaults(activePreset)}
                className="flex-1 px-4 py-2.5 bg-accent-green/10 border border-accent-green/30 rounded-xl text-[10px] font-bold text-accent-green hover:bg-accent-green/20 transition-colors min-h-[44px] font-mono uppercase tracking-wider"
              >
                {L4(lang, { ko: "기본값 적용 (빈 필드만)", en: "Apply Defaults (empty only)", ja: "デフォルト適用 (空のみ)", zh: "应用默认值 (仅空字段)" })}
              </button>
              <button
                onClick={() => applyScenePreset(activePreset)}
                className="px-4 py-2.5 bg-accent-amber/10 border border-accent-amber/30 rounded-xl text-[10px] font-bold text-accent-amber hover:bg-accent-amber/20 transition-colors min-h-[44px] font-mono uppercase tracking-wider"
              >
                {L4(lang, { ko: "전체 덮어쓰기", en: "Full Overwrite", ja: "全上書き", zh: "全部覆盖" })}
              </button>
            </div>
          )}

          {/* ========== 핵심 3개: goguma/cider, hooks, cliffhanger ========== */}
          <div className="mb-2">
            <span className="text-[9px] font-black text-accent-purple uppercase tracking-widest">
              {L4(lang, { ko: "이번 화에 꼭 설정할 것", en: "Must-set for this episode", ja: "今回必ず設定", zh: "本话必设" })}
            </span>
          </div>

          {/* Section 1: Story (핵심 섹션 강조) */}
          <Section title={L4(lang, { ko: "줄거리", en: "Story", ja: "ストーリー", zh: "故事" })}
            highlight
            desc={L4(lang, { ko: "이번 화의 줄거리, 고구마/사이다, 클리프행어를 설계합니다", en: "Design this episode's story, tension/release, and cliffhanger", ja: "ストーリー・テンション・クリフハンガーを設計", zh: "设计故事、张力/释放和悬念" })}
            badge={(() => {
              const items = [writerNotes.trim(), gogumas.length > 0, cliffs.length > 0, foreshadows.length > 0, hooks.length > 0];
              const filled = items.filter(Boolean).length;
              return `${filled}/5 ${L4(lang, { ko: "항목 설정", en: "set", ja: "項目設定", zh: "项目设置" })}`;
            })()}>
            {/* Writer summary */}
            <input value={writerNotes.split("\n")[0] ?? ""} onChange={e => {
              const lines = writerNotes.split("\n"); lines[0] = e.target.value; setWriterNotes(lines.join("\n"));
            }} placeholder={L4(lang, { ko: "이번 화 요약 (한 줄)", en: "Episode summary (one line)", ja: "Episode summary (one line)", zh: "Episode summary (one line)" })} maxLength={200}
              className="w-full bg-bg-primary border border-border rounded px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple transition-colors min-h-[44px]" />
            {/* Goguma / Cider — 핵심 1 */}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-amber shrink-0" />
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "고구마/사이다", en: "Tension/Release", ja: "テンション", zh: "张力" })}</span>
              </div>
              <p className="text-[9px] text-text-quaternary mt-0.5 mb-1">{L4(lang, { ko: "독자가 답답함을 느끼는 장치 (해소 시 사이다)", en: "Device that builds frustration (releases as catharsis)", ja: "読者がもどかしさを感じる仕掛け", zh: "让读者感到焦急的装置 (释放时的爽快感)" })}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(["small", "medium", "large"] as const).map(intensity => (
                  <button key={`g-${intensity}`} onClick={() => setGogumas(prev => [...prev, { id: `g-${Date.now()}`, type: "goguma", intensity, desc: "", episode: 1 }])}
                    className="px-2.5 py-1.5 bg-amber-600/10 border border-amber-600/30 rounded text-[10px] font-bold text-amber-500 hover:bg-amber-600/20 transition-colors min-h-[44px]">
                    {L4(lang, ({ small: { ko: "소", en: "S", ja: "小", zh: "小" }, medium: { ko: "중", en: "M", ja: "中", zh: "中" }, large: { ko: "대", en: "L", ja: "大", zh: "大" } })[intensity])}
                  </button>
                ))}
                <button onClick={() => setGogumas(prev => [...prev, { id: `g-${Date.now()}`, type: "cider", intensity: "large", desc: "", episode: 1 }])}
                  className="px-2.5 py-1.5 bg-cyan-600/10 border border-cyan-600/30 rounded text-[10px] font-bold text-cyan-400 hover:bg-cyan-600/20 transition-colors min-h-[44px]">
                  {L4(lang, { ko: "사이다", en: "Cider", ja: "サイダー", zh: "解除" })}
                </button>
              </div>
              {gogumas.map((g, i) => (
                <div key={g.id} className={`flex items-center gap-2 mt-1.5 border rounded px-2.5 py-2 ${g.type === "goguma" ? "border-amber-600/30 bg-amber-600/5" : "border-cyan-500/30 bg-cyan-500/5"}`}>
                  <span className="text-[9px] font-bold uppercase min-w-[32px]">{g.type === "goguma" ? g.intensity[0].toUpperCase() : "R"}</span>
                  <input value={g.desc} onChange={e => setGogumas(prev => prev.map((gg, ii) => ii === i ? { ...gg, desc: e.target.value } : gg))}
                    placeholder={L4(lang, { ko: "설명...", en: "Description...", ja: "説明...", zh: "描述..." })} maxLength={500} className="flex-1 bg-transparent text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 text-text-secondary min-h-[44px]" />
                  <button onClick={() => setGogumas(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `고구마/사이다 ${i + 1} 삭제`, en: `Delete tension/release ${i + 1}`, ja: `テンション ${i + 1} を削除`, zh: `删除张力 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red text-xs min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                </div>
              ))}
            </div>
            {/* Cliffhanger — 핵심 3 */}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-red shrink-0" />
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "클리프행어", en: "Cliffhanger", ja: "クリフハンガー", zh: "悬念" })}</span>
              </div>
              <p className="text-[9px] text-text-quaternary mt-0.5 mb-1">{L4(lang, { ko: "화 끝에 긴장감을 남기는 방법", en: "How to leave tension at the end of the episode", ja: "エピソード終わりに緊張感を残す方法", zh: "在每话结尾留下悬念的方法" })}</p>
              <div className="flex gap-2 mt-1.5">
                <select value={cliffs[0]?.cliffType ?? ""} onChange={e => {
                  if (cliffs.length === 0) setCliffs([{ id: `cl-${Date.now()}`, cliffType: e.target.value, desc: "", episode: 1 }]);
                  else setCliffs(prev => [{ ...prev[0], cliffType: e.target.value }, ...prev.slice(1)]);
                }} className="bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]">
                  <option value="">{L4(lang, { ko: "-- 선택 --", en: "-- Select --", ja: "-- 選択 --", zh: "-- 选择 --" })}</option>
                  {CLIFF_TYPES.map(ct => <option key={ct.id} value={ct.id}>{L4(lang, ct)}</option>)}
                </select>
                <input value={cliffs[0]?.desc ?? ""} onChange={e => {
                  if (cliffs.length === 0) setCliffs([{ id: `cl-${Date.now()}`, cliffType: "crisis-cut", desc: e.target.value, episode: 1 }]);
                  else setCliffs(prev => [{ ...prev[0], desc: e.target.value }, ...prev.slice(1)]);
                }} placeholder={L4(lang, { ko: "클리프행어 내용...", en: "Cliffhanger content...", ja: "クリフハンガー内容...", zh: "悬念钩子内容..." })} maxLength={500} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
              </div>
            </div>
            {/* Foreshadow */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "복선/떡밥", en: "Foreshadow", ja: "伏線", zh: "伏笔" })}</span>
                <button onClick={() => setForeshadows(prev => [...prev, { id: `fs-${Date.now()}`, planted: "", payoff: "", episode: 1, resolved: false }])}
                  className="text-[13px] text-accent-purple hover:underline min-h-[44px]">+ {L4(lang, { ko: "추가", en: "Add", ja: "追加", zh: "添加" })}</button>
              </div>
              {foreshadows.map((fs, i) => (
                <div key={fs.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2 py-1.5 bg-bg-primary text-[10px]">
                  <input value={fs.planted} onChange={e => setForeshadows(prev => prev.map((f, ii) => ii === i ? { ...f, planted: e.target.value } : f))}
                    placeholder={L4(lang, { ko: "심기", en: "Plant", ja: "Plant", zh: "Plant" })} maxLength={500} className="flex-1 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                  <span className="text-text-tertiary">&#8594;</span>
                  <input value={fs.payoff} onChange={e => setForeshadows(prev => prev.map((f, ii) => ii === i ? { ...f, payoff: e.target.value } : f))}
                    placeholder={L4(lang, { ko: "회수", en: "Payoff", ja: "Payoff", zh: "Payoff" })} maxLength={500} className="flex-1 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                  <label className="flex items-center gap-1 text-[9px] text-text-tertiary cursor-pointer">
                    <input type="checkbox" checked={fs.resolved} onChange={e => setForeshadows(prev => prev.map((f, ii) => ii === i ? { ...f, resolved: e.target.checked } : f))} className="accent-accent-green" />
                    {L4(lang, { ko: "완료", en: "Done", ja: "完了", zh: "完成" })}
                  </label>
                  <button onClick={() => setForeshadows(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `복선 ${i + 1} 삭제`, en: `Delete foreshadow ${i + 1}`, ja: `伏線 ${i + 1} を削除`, zh: `删除伏笔 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                </div>
              ))}
            </div>
          </Section>

          {/* Section 2: Mood (핵심 2: 훅 포함) */}
          <Section title={L4(lang, { ko: "분위기 · 훅", en: "Mood · Hooks", ja: "ムード · フック", zh: "氛围 · 钩子" })}
            highlight
            desc={L4(lang, { ko: "감정선과 훅(독자 유입 장치)을 설계합니다", en: "Design emotion arcs and hooks to engage readers", ja: "感情線とフックを設計", zh: "设计情绪曲线和读者引入装置" })}
            badge={emotions.length > 0
              ? `${L4(lang, { ko: "감정", en: "Emotion", ja: "Emotion", zh: "Emotion" })}: ${emotions[0].emotion} ${Math.round(emotions[0].intensity)}%`
              : undefined}>
            {/* Emotion chips */}
            <div>
              <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "감정", en: "Emotion", ja: "感情", zh: "情绪" })}</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {EMOTIONS.map(emo => (
                  <button key={emo} onClick={() => setEmotions(prev => [...prev, { id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, position: prev.length * 20, emotion: emo, intensity: 50 }])}
                    className="px-2.5 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-colors min-h-[44px]">
                    {emo}
                  </button>
                ))}
              </div>
              {emotions.length > 0 && (
                <div className="relative h-20 border border-border rounded-lg bg-bg-primary overflow-hidden mt-2">
                  <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none" role="img" aria-label={L4(lang, { ko: "감정 곡선", en: "Emotion curve", ja: "Emotion curve", zh: "Emotion curve" })}>
                    {emotions.length >= 2 && <polyline fill="none" stroke="var(--color-accent-purple)" strokeWidth="0.5" points={sortedEmotions.map(e => `${e.position},${50 - e.intensity / 2}`).join(" ")} />}
                    {emotions.map(e => <circle key={e.id} cx={e.position} cy={50 - e.intensity / 2} r="1.5" fill="var(--color-accent-purple)" />)}
                  </svg>
                </div>
              )}
              {emotions.map((em, i) => (
                <div key={em.id} className="flex items-center gap-2 mt-1.5 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                  <span className="text-[10px] font-bold w-12 truncate">{em.emotion}</span>
                  <input type="range" min={0} max={100} value={em.intensity} aria-label={L4(lang, { ko: "감정 강도", en: "Emotion intensity", ja: "Emotion intensity", zh: "Emotion intensity" })}
                    onChange={e => setEmotions(prev => prev.map((ee, ii) => ii === i ? { ...ee, intensity: parseInt(e.target.value) } : ee))} className="flex-1 h-1 accent-accent-purple" />
                  <span className="text-[9px] font-bold text-accent-purple w-6 text-right">{em.intensity}</span>
                  <button onClick={() => setEmotions(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `감정점 ${i + 1} 삭제`, en: `Delete emotion point ${i + 1}`, ja: `感情点 ${i + 1} を削除`, zh: `删除情感点 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red text-xs min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                </div>
              ))}
            </div>
            {/* Tension slider */}
            <div>
              <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "텐션 레벨", en: "Tension Level", ja: "テンション", zh: "张力等级" })}</span>
              {tensionPoints.length === 0 && (
                <button onClick={() => setTensionPoints([{ id: `tp-${Date.now()}`, position: 50, level: 50, label: "" }])}
                  className="block mt-1 text-[13px] text-accent-purple hover:underline min-h-[44px]">+ {L4(lang, { ko: "텐션 포인트 추가", en: "Add Tension Point", ja: "テンションポイントを追加", zh: "添加张力点" })}</button>
              )}
              {tensionPoints.length > 0 && tensionPoints.slice(0, 1).map((tp, i) => (
                <div key={tp.id} className="flex items-center gap-2 mt-1.5">
                  <input type="range" min={0} max={100} value={tp.level} aria-label={L4(lang, { ko: "텐션 레벨", en: "Tension level", ja: "Tension level", zh: "Tension level" })}
                    onChange={e => setTensionPoints(prev => prev.map((t, ii) => ii === i ? { ...t, level: parseInt(e.target.value) } : t))} className="flex-1 h-1 accent-accent-red" />
                  <span className="text-[10px] font-bold text-accent-red w-10 text-right">{tp.level}%</span>
                </div>
              ))}
            </div>
            {/* Hook — 핵심 2 */}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-purple shrink-0" />
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "훅 배치", en: "Hook Design", ja: "フック", zh: "钩子" })}</span>
              </div>
              <p className="text-[9px] text-text-quaternary mt-0.5 mb-1">{L4(lang, { ko: "독자가 다음 화를 클릭하게 만드는 요소", en: "Elements that make readers click the next episode", ja: "読者が次話をクリックしたくなる要素", zh: "让读者点击下一话的要素" })}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(["opening", "middle", "ending"] as const).map(pos => (
                  <button key={pos} onClick={() => setHooks(prev => [...prev, { id: `h-${Date.now()}`, position: pos, hookType: "question", desc: "" }])}
                    className="px-2.5 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple transition-colors min-h-[44px]">
                    + {L4(lang, ({ opening: { ko: "오프닝", en: "Opening", ja: "オープニング", zh: "开头" }, middle: { ko: "미들", en: "Middle", ja: "ミドル", zh: "中间" }, ending: { ko: "엔딩", en: "Ending", ja: "エンディング", zh: "结尾" } })[pos])}
                  </button>
                ))}
              </div>
              {hooks.map((h, i) => (
                <div key={h.id} className="flex items-center gap-2 mt-1.5 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${h.position === "opening" ? "bg-blue-500/10 text-blue-400" : h.position === "ending" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>{h.position}</span>
                  <select value={h.hookType} onChange={e => setHooks(prev => prev.map((hh, ii) => ii === i ? { ...hh, hookType: e.target.value } : hh))}
                    className="bg-bg-secondary border border-border rounded px-1.5 py-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]">
                    {HOOK_TYPES.map(ht => <option key={ht.id} value={ht.id}>{L4(lang, ht)}</option>)}
                  </select>
                  <input value={h.desc} onChange={e => setHooks(prev => prev.map((hh, ii) => ii === i ? { ...hh, desc: e.target.value } : hh))}
                    placeholder={L4(lang, { ko: "훅 내용...", en: "Hook content...", ja: "フック内容...", zh: "钩子内容..." })} maxLength={500} className="flex-1 bg-transparent text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                  <button onClick={() => setHooks(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `훅 ${i + 1} 삭제`, en: `Delete hook ${i + 1}`, ja: `フック ${i + 1} を削除`, zh: `删除钩子 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red text-xs min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                </div>
              ))}
            </div>
          </Section>

          {/* ========== 추가 설정 (non-essential sections) ========== */}
          <div className="mt-4 mb-2">
            <span className="text-[9px] font-bold text-text-quaternary uppercase tracking-widest">
              {L4(lang, { ko: "추가 설정", en: "Additional Settings", ja: "追加設定", zh: "附加设置" })}
            </span>
          </div>

          {/* Section 3: Cast */}
          <Section title={L4(lang, { ko: "캐릭터", en: "Cast", ja: "キャスト", zh: "角色" })}
            defaultOpen={false}
            desc={L4(lang, { ko: "캐릭터별 대사 톤과 등장 규칙", en: "Dialogue tone and rules per character", ja: "キャラクター別台詞トーンとルール", zh: "角色对话语气和规则" })}
            badge={dialogueRules.length > 0
              ? `${dialogueRules.length}${L4(lang, { ko: "명 선택", en: " selected", ja: "名 選択", zh: "人 选择" })}`
              : characterNames && characterNames.length > 0
                ? `${characterNames.length}${L4(lang, { ko: "명 등록", en: " available", ja: "名 登録", zh: "人 提交" })}`
                : undefined}>
            {characterNames && characterNames.length > 0 ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button onClick={() => { const names = characterNames ?? []; setDialogueRules(names.map(n => ({ id: `d-${Date.now()}-${n}`, character: n, tone: "", notes: "" }))); }}
                    className="text-[13px] text-accent-purple hover:underline min-h-[44px]">{L4(lang, { ko: "전체 선택", en: "Select All", ja: "すべて 選択", zh: "全部 选择" })}</button>
                  <button onClick={() => setDialogueRules([])} className="text-[13px] text-text-tertiary hover:underline min-h-[44px]">{L4(lang, { ko: "초기화", en: "Clear All", ja: "リセット", zh: "重置" })}</button>
                </div>
                {(characterNames ?? []).map(name => {
                  const rule = dialogueRules.find(d => d.character === name);
                  const isActive = !!rule;
                  return (
                    <div key={name} className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                        <input type="checkbox" checked={isActive} onChange={e => {
                          if (e.target.checked) setDialogueRules(prev => [...prev, { id: `d-${Date.now()}-${name}`, character: name, tone: "", notes: "" }]);
                          else setDialogueRules(prev => prev.filter(d => d.character !== name));
                        }} className="accent-accent-purple" />
                        <span className="text-xs font-bold">{name}</span>
                      </label>
                      {isActive && (
                        <select value={rule?.tone ?? ""} onChange={e => setDialogueRules(prev => prev.map(d => d.character === name ? { ...d, tone: e.target.value } : d))}
                          className="bg-bg-secondary border border-border rounded px-2 py-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]">
                          <option value="">{L4(lang, { ko: "톤 선택", en: "Select tone", ja: "トーン選択", zh: "选择语调" })}</option>
                          {TONE_OPTIONS.map(t => <option key={t.id} value={t.id}>{L4(lang, t)}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <button onClick={() => setDialogueRules(prev => [...prev, { id: `d-${Date.now()}`, character: "", tone: "", notes: "" }])}
                  className="text-[13px] text-accent-purple hover:underline min-h-[44px]">+ {L4(lang, { ko: "캐릭터 대사 규칙 추가", en: "Add Dialogue Rule", ja: "キャラクターの台詞ルールを追加", zh: "添加角色台词规则" })}</button>
                {dialogueRules.map((dr, i) => (
                  <div key={dr.id} className="flex items-center gap-2 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                    <input value={dr.character} onChange={e => setDialogueRules(prev => prev.map((d, ii) => ii === i ? { ...d, character: e.target.value } : d))}
                      placeholder={L4(lang, { ko: "캐릭터명", en: "Character", ja: "キャラクター名", zh: "角色人" })} maxLength={100} className="w-24 bg-bg-secondary border border-border rounded px-2 py-1.5 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                    <input value={dr.tone} onChange={e => setDialogueRules(prev => prev.map((d, ii) => ii === i ? { ...d, tone: e.target.value } : d))}
                      placeholder={L4(lang, { ko: "톤", en: "Tone", ja: "Tone", zh: "Tone" })} maxLength={200} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                    <button onClick={() => setDialogueRules(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `대사 규칙 ${i + 1} 삭제`, en: `Delete dialogue rule ${i + 1}`, ja: `台詞ルール ${i + 1} を削除`, zh: `删除对话规则 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Writer Notes (multi-line) */}
          <div className="pt-2">
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "작가 메모", en: "Writer Notes", ja: "作家メモ", zh: "作者笔记" })}</span>
            <textarea value={writerNotes} onChange={e => setWriterNotes(e.target.value)} maxLength={10000}
              className="w-full mt-1 min-h-[80px] bg-bg-primary border border-border rounded-lg p-3 text-sm leading-relaxed text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple transition-colors resize-y"
              placeholder={tl("sceneSheet.writerNotesPlaceholder")} />
            <div className="text-[9px] text-text-tertiary font-mono mt-0.5">{writerNotes.length.toLocaleString()}{tl("sceneSheet.chars")}</div>
          </div>

          {/* Advanced Settings */}
          <details className="pt-2">
            <summary className="flex items-center gap-1 cursor-pointer text-[13px] font-bold tracking-wider text-text-tertiary hover:text-text-secondary select-none py-2 min-h-[44px]">
              <span className="text-[10px]">&#9654;</span> {L4(lang, { ko: "고급 설정", en: "Advanced Settings", ja: "詳細設定", zh: "高级设置" })}
            </summary>
            <div className="space-y-4 pt-2">
              {/* Dopamine devices */}
              <div>
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "도파민 장치", en: "Dopamine Devices", ja: "Dopamine Devices", zh: "Dopamine Devices" })}</span>
                <button onClick={() => setDopamines(prev => [...prev, { id: `dp-${Date.now()}`, scale: "medium", device: "growth", desc: "", resolved: false }])}
                  className="block mt-1 text-[13px] text-accent-purple hover:underline min-h-[44px]">+ {L4(lang, { ko: "추가", en: "Add", ja: "追加", zh: "添加" })}</button>
                {dopamines.map((dp, i) => (
                  <div key={dp.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                    <select value={dp.scale} onChange={e => setDopamines(prev => prev.map((d, ii) => ii === i ? { ...d, scale: e.target.value as "micro" | "medium" | "macro" } : d))}
                      className="bg-bg-secondary border border-border rounded px-1.5 py-1 text-[9px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 uppercase min-h-[44px]">
                      <option value="micro">{L4(lang, { ko: "소", en: "Micro", ja: "Micro", zh: "Micro" })}</option>
                      <option value="medium">{L4(lang, { ko: "중", en: "Medium", ja: "Medium", zh: "Medium" })}</option>
                      <option value="macro">{L4(lang, { ko: "대", en: "Macro", ja: "Macro", zh: "Macro" })}</option>
                    </select>
                    <select value={dp.device} onChange={e => setDopamines(prev => prev.map((d, ii) => ii === i ? { ...d, device: e.target.value } : d))}
                      className="bg-bg-secondary border border-border rounded px-1.5 py-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]">
                      {DOPAMINE_DEVICES.map(dd => <option key={dd.id} value={dd.id}>{L4(lang, dd)}</option>)}
                    </select>
                    <input value={dp.desc} onChange={e => setDopamines(prev => prev.map((d, ii) => ii === i ? { ...d, desc: e.target.value } : d))}
                      placeholder={L4(lang, { ko: "설명...", en: "Description...", ja: "説明...", zh: "描述..." })} maxLength={500} className="flex-1 bg-transparent text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                    <label className="flex items-center gap-1 text-[9px] text-text-tertiary cursor-pointer">
                      <input type="checkbox" checked={dp.resolved} onChange={e => setDopamines(prev => prev.map((d, ii) => ii === i ? { ...d, resolved: e.target.checked } : d))} className="accent-accent-green" />
                      {L4(lang, { ko: "회수", en: "Resolved", ja: "Resolved", zh: "Resolved" })}
                    </label>
                    <button onClick={() => setDopamines(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `도파민 ${i + 1} 삭제`, en: `Delete dopamine ${i + 1}`, ja: `ドーパミン ${i + 1} を削除`, zh: `删除多巴胺 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                  </div>
                ))}
              </div>
              {/* Canon rules */}
              <div>
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "캐릭터 규칙", en: "Canon Rules", ja: "キャラクタールール", zh: "角色规则" })}</span>
                <button onClick={() => setCanons(prev => [...prev, { id: `cn-${Date.now()}`, character: "", rule: "" }])}
                  className="block mt-1 text-[13px] text-accent-purple hover:underline min-h-[44px]">+ {L4(lang, { ko: "추가", en: "Add", ja: "追加", zh: "添加" })}</button>
                {canons.map((cn, i) => (
                  <div key={cn.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                    <input value={cn.character} onChange={e => setCanons(prev => prev.map((c, ii) => ii === i ? { ...c, character: e.target.value } : c))}
                      placeholder={L4(lang, { ko: "캐릭터명", en: "Character", ja: "キャラクター名", zh: "角色人" })} maxLength={100} className="w-24 bg-bg-secondary border border-border rounded px-2 py-1.5 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                    <input value={cn.rule} onChange={e => setCanons(prev => prev.map((c, ii) => ii === i ? { ...c, rule: e.target.value } : c))}
                      placeholder={L4(lang, { ko: "규칙", en: "Rule", ja: "Rule", zh: "Rule" })} maxLength={500} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                    <button onClick={() => setCanons(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `캐논 규칙 ${i + 1} 삭제`, en: `Delete canon rule ${i + 1}`, ja: `キャノン ${i + 1} を削除`, zh: `删除规则 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                  </div>
                ))}
              </div>
              {/* Scene transitions */}
              <div>
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "장면 전환", en: "Scene Transitions", ja: "シーン転換", zh: "场景切换" })}</span>
                <button onClick={() => setTransitions(prev => [...prev, { id: `tr-${Date.now()}`, fromScene: "", toScene: "", method: "" }])}
                  className="block mt-1 text-[13px] text-accent-purple hover:underline min-h-[44px]">+ {L4(lang, { ko: "추가", en: "Add", ja: "追加", zh: "添加" })}</button>
                {transitions.map((tr, i) => (
                  <div key={tr.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                    <input value={tr.fromScene} onChange={e => setTransitions(prev => prev.map((t, ii) => ii === i ? { ...t, fromScene: e.target.value } : t))}
                      placeholder={L4(lang, { ko: "장면 A", en: "Scene A", ja: "シーン A", zh: "场景 A" })} maxLength={200} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                    <span className="text-text-tertiary text-xs">&#8594;</span>
                    <input value={tr.toScene} onChange={e => setTransitions(prev => prev.map((t, ii) => ii === i ? { ...t, toScene: e.target.value } : t))}
                      placeholder={L4(lang, { ko: "장면 B", en: "Scene B", ja: "シーン B", zh: "场景 B" })} maxLength={200} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                    <input value={tr.method} onChange={e => setTransitions(prev => prev.map((t, ii) => ii === i ? { ...t, method: e.target.value } : t))}
                      placeholder={L4(lang, { ko: "전환 방법", en: "Method", ja: "Method", zh: "Method" })} maxLength={200} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                    <button onClick={() => setTransitions(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `전환 ${i + 1} 삭제`, en: `Delete transition ${i + 1}`, ja: `トランジション ${i + 1} を削除`, zh: `删除转场 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                  </div>
                ))}
              </div>
              {/* Pacing */}
              <div>
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "분량 배분", en: "Pacing", ja: "Pacing", zh: "Pacing" })}</span>
                <div className="flex rounded-lg overflow-hidden h-8 border border-border mt-1.5">
                  {pacings.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${p.percent}%`, background: i === 0 ? "#3b82f6" : i === 1 ? "#f59e0b" : "#10b981" }}>
                      {p.section} {p.percent}%
                    </div>
                  ))}
                </div>
                {pacings.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                    <span className="text-[10px] font-bold w-16">{p.section}</span>
                    <input type="range" min={5} max={80} value={p.percent} aria-label={L4(lang, { ko: "페이싱 비중", en: "Pacing weight", ja: "Pacing weight", zh: "Pacing weight" })}
                      onChange={e => setPacings(prev => prev.map((pp, ii) => ii === i ? { ...pp, percent: parseInt(e.target.value) } : pp))} className="flex-1 h-1 accent-accent-purple" />
                    <span className="text-[10px] font-bold text-accent-purple w-8 text-right">{p.percent}%</span>
                  </div>
                ))}
              </div>
              {/* Plot Bar Editor */}
              <div>
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "플롯 구조", en: "Plot Structure", ja: "Plot Structure", zh: "Plot Structure" })}</span>
                <div className="mt-1.5"><PlotBarEditor lang={lang} onPlotChange={setPlotStructure} initialPlot={plotStructure} /></div>
              </div>
              {/* Tension curve (full) */}
              {tensionPoints.length > 1 && (
                <div>
                  <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "텐션 곡선 (상세)", en: "Tension Curve (Detail)", ja: "Tension Curve (Detail)", zh: "Tension Curve (Detail)" })}</span>
                  <div className="relative h-24 border border-border rounded-lg bg-bg-primary overflow-hidden mt-1.5">
                    <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none" role="img" aria-label={L4(lang, { ko: "텐션 곡선", en: "Tension curve", ja: "Tension curve", zh: "Tension curve" })}>
                      {tensionPoints.length >= 2 && <polyline fill="none" stroke="var(--color-accent-red)" strokeWidth="0.8" points={sortedTensionPoints.map(t => `${t.position},${50 - t.level / 2}`).join(" ")} />}
                      {tensionPoints.map(t => <circle key={t.id} cx={t.position} cy={50 - t.level / 2} r="2" fill="var(--color-accent-red)" />)}
                    </svg>
                  </div>
                  <button onClick={() => setTensionPoints(prev => [...prev, { id: `tp-${Date.now()}`, position: prev.length * 20, level: 50, label: "" }])}
                    className="mt-1 text-[13px] text-accent-purple hover:underline min-h-[44px]">+ {L4(lang, { ko: "텐션 포인트", en: "Tension Point", ja: "Tension Point", zh: "Tension Point" })}</button>
                  {tensionPoints.map((tp, i) => (
                    <div key={tp.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                      <input value={tp.label} onChange={e => setTensionPoints(prev => prev.map((t, ii) => ii === i ? { ...t, label: e.target.value } : t))}
                        placeholder={L4(lang, { ko: "라벨", en: "Label", ja: "Label", zh: "Label" })} maxLength={100} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                      <span className="text-[9px] text-text-tertiary">Pos</span>
                      <input type="range" min={0} max={100} value={tp.position} aria-label="position" onChange={e => setTensionPoints(prev => prev.map((t, ii) => ii === i ? { ...t, position: parseInt(e.target.value) } : t))} className="w-16 h-1 accent-accent-purple" />
                      <span className="text-[9px] text-text-tertiary">Lv</span>
                      <input type="range" min={0} max={100} value={tp.level} aria-label="level" onChange={e => setTensionPoints(prev => prev.map((t, ii) => ii === i ? { ...t, level: parseInt(e.target.value) } : t))} className="w-16 h-1 accent-accent-red" />
                      <span className="text-[9px] font-bold text-accent-red w-6">{tp.level}</span>
                      <button onClick={() => setTensionPoints(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `긴장점 ${i + 1} 삭제`, en: `Delete tension point ${i + 1}`, ja: `テンション点 ${i + 1} を削除`, zh: `删除张力点 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>

          {/* Simulator reference checkpoints */}
          <div className="border border-border rounded-xl p-4 bg-bg-primary space-y-3 mt-2">
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-text-tertiary">{tl("sceneSheet.worldSimRef")}</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {([
                { key: "worldConsistency" as const, ko: "세계관 일관성 검증", en: "World Consistency" },
                { key: "civRelations" as const, ko: "문명 관계도", en: "Civilization Relations" },
                { key: "timeline" as const, ko: "시대 타임라인", en: "Era Timeline" },
                { key: "territoryMap" as const, ko: "세력권 지도", en: "Territory Map" },
                { key: "languageSystem" as const, ko: "세계관 언어", en: "Language System" },
                { key: "genreLevel" as const, ko: "장르 레벨 규칙", en: "Genre Level Rules" },
              ]).map(item => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer group min-h-[44px]">
                  <input type="checkbox" checked={simRef[item.key]} onChange={e => { const next = { ...simRef, [item.key]: e.target.checked }; setSimRef(next); onSimRefUpdate?.(next); }} className="accent-accent-purple w-3.5 h-3.5" />
                  <span className={`text-[10px] font-bold transition-colors ${simRef[item.key] ? "text-accent-purple" : "text-text-tertiary group-hover:text-text-secondary"}`}>{L4(lang, item)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Save button */}
          {onSaveEpisodeSheet && (
            <div className="pt-3 border-t border-border mt-2">
              <button onClick={handleSaveEpisode}
                className="w-full px-4 py-2.5 text-xs font-bold bg-accent-purple/15 hover:bg-accent-purple/25 border border-accent-purple/30 rounded-lg text-accent-purple font-mono transition-colors min-h-[44px]">
                {L4(lang, { ko: `${currentEpisode ?? ""}화 씬시트 저장`, en: `Save Episode ${currentEpisode ?? ""} Scene Sheet`, ja: `第${currentEpisode ?? ""}話シーンシートを保存`, zh: `保存第${currentEpisode ?? ""}话场景表` })}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* PART 3 — Episode Sheet History Sidebar  (lines ~640–700) */}
      {/* ============================================================ */}
      {episodeSceneSheets && episodeSceneSheets.length > 0 && (
        <div className="w-64 border-l border-border bg-bg-primary pl-4 ml-4 shrink-0 hidden lg:block">
          <h3 className="text-[10px] font-bold font-mono uppercase tracking-wider text-text-tertiary mb-3 pt-2">
            {L4(lang, { ko: "씬시트 이력", en: "Scene Sheet History", ja: "シーンシート履歴", zh: "场景表历史" })}
          </h3>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {[...episodeSceneSheets].sort((a, b) => b.lastUpdate - a.lastUpdate).map(sheet => {
              const ago = Math.round((Date.now() - sheet.lastUpdate) / 60000);
              const timeLabel = ago < 60
                ? L4(lang, { ko: `${ago}분 전`, en: `${ago}m ago`, ja: `${ago}m ago`, zh: `${ago}m ago` })
                : ago < 1440
                  ? L4(lang, { ko: `${Math.round(ago / 60)}시간 전`, en: `${Math.round(ago / 60)}h ago`, ja: `${Math.round(ago / 60)}h ago`, zh: `${Math.round(ago / 60)}h ago` })
                  : L4(lang, { ko: `${Math.round(ago / 1440)}일 전`, en: `${Math.round(ago / 1440)}d ago`, ja: `${Math.round(ago / 1440)}d ago`, zh: `${Math.round(ago / 1440)}d ago` });
              const emotionSummary = sheet.directionSnapshot?.emotionTargets?.slice(0, 2).map(e => e.emotion).join(", ") ?? "";
              return (
                <div key={sheet.episode} className="border border-border rounded-lg p-3 bg-bg-secondary hover:border-accent-purple/50 transition-colors group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-black text-text-primary">
                      {L4(lang, { ko: `${sheet.episode}화`, en: `EP ${sheet.episode}`, ja: `EP ${sheet.episode}`, zh: `EP ${sheet.episode}` })}
                    </span>
                    <span className="text-[9px] text-text-tertiary">{timeLabel}</span>
                  </div>
                  {sheet.presetUsed && (
                    <span className="inline-block px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[8px] font-bold uppercase mb-1">
                      {sheet.presetUsed}
                    </span>
                  )}
                  {emotionSummary && <div className="text-[9px] text-text-tertiary truncate">{emotionSummary}</div>}
                  <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onLoadEpisodeSheet?.(sheet.episode)}
                      className="flex-1 px-2 py-1 bg-accent-purple/10 text-accent-purple rounded text-[9px] font-bold hover:bg-accent-purple/20 transition-colors min-h-[44px]">
                      {L4(lang, { ko: "불러오기", en: "Load", ja: "Load", zh: "Load" })}
                    </button>
                    <button onClick={() => {
                      showConfirm({
                        title: L4(lang, { ko: "씬시트 삭제", en: "Delete Scene Sheet", ja: "シーンシート削除", zh: "删除场景表" }),
                        message: L4(lang, { ko: "이 씬시트를 삭제하시겠습니까? 되돌릴 수 없습니다.", en: "Delete this scene sheet? This cannot be undone.", ja: "このシーンシートを削除しますか? 元に戻せません。", zh: "要删除此场景表吗? 此操作不可恢复。" }),
                        variant: 'danger',
                        confirmLabel: L4(lang, { ko: "삭제", en: "Delete", ja: "削除", zh: "删除" }),
                        cancelLabel: L4(lang, { ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" }),
                        onConfirm: () => { onDeleteEpisodeSheet?.(sheet.episode); closeConfirm(); },
                      });
                    }}
                      className="px-2 py-1 bg-accent-red/10 text-accent-red rounded text-[9px] font-bold hover:bg-accent-red/20 transition-colors min-h-[44px]">
                      {L4(lang, { ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PART 4 — 기본 export 및 타입 재노출
// ============================================================
// `export default function SceneSheet` (PART 3 시작부) + `export interface FullDirectionData` (PART 1)
// 외부 호출자는 이 두 심볼을 직접 import 한다.
