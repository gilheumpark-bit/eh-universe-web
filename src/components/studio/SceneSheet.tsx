"use client";

import { showAlert } from '@/lib/show-alert';
import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { GRAMMAR_PACKS, GRAMMAR_REGIONS, type GrammarRegion } from '@/lib/grammar-packs';
import { createT, L4 } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/studio-types';

// ============================================================
// PART 0: TYPES & DATA
// ============================================================

type Lang = "ko" | "en";
type SheetTab = "goguma" | "hook" | "emotion" | "dialogue" | "dopamine" | "cliff" | "plot" | "foreshadow" | "pacing" | "tension" | "canon" | "transition" | "notes";

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

// Plot bar types
type PlotType = "three-act" | "hero-journey" | "kishotenketsu" | "fichtean";
interface PlotSegment { id: string; label: string; color: string; width: number; desc: string; }

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

const TAB_DEF: { id: SheetTab; ko: string; en: string; emoji: string }[] = [
  { id: "plot", ko: "플롯 구조", en: "Plot Structure", emoji: "📊" },
  { id: "tension", ko: "텐션 곡선", en: "Tension Curve", emoji: "📈" },
  { id: "pacing", ko: "분량 배분", en: "Pacing", emoji: "📏" },
  { id: "goguma", ko: "고구마/사이다", en: "Tension/Release", emoji: "🍠" },
  { id: "hook", ko: "훅 배치", en: "Hook Design", emoji: "🪝" },
  { id: "cliff", ko: "클리프행어", en: "Cliffhanger", emoji: "🔚" },
  { id: "dopamine", ko: "도파민 루프", en: "Dopamine Loop", emoji: "⚡" },
  { id: "transition", ko: "장면 전환", en: "Scene Transition", emoji: "🔄" },
  { id: "emotion", ko: "감정선", en: "Emotion Arc", emoji: "💓" },
  { id: "dialogue", ko: "대사 톤", en: "Dialogue Tone", emoji: "💬" },
  { id: "canon", ko: "캐릭터 규칙", en: "Canon Rules", emoji: "📌" },
  { id: "foreshadow", ko: "떡밥/복선", en: "Foreshadow", emoji: "🧩" },
  { id: "notes", ko: "작가 메모", en: "Writer Notes", emoji: "📝" },
];

const TAB_GROUPS: { ko: string; en: string; tabs: SheetTab[] }[] = [
  { ko: "전체 구조", en: "Structure", tabs: ["plot", "tension", "pacing"] },
  { ko: "장면 설계", en: "Scene Design", tabs: ["goguma", "hook", "cliff", "dopamine", "transition"] },
  { ko: "캐릭터·감정", en: "Character", tabs: ["emotion", "dialogue", "canon"] },
  { ko: "복선·메모", en: "Notes", tabs: ["foreshadow", "notes"] },
];

// ============================================================
// PART 1: PLOT BAR EDITOR
// ============================================================

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
      // Steal from neighbor
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
    setSegments(prev => [...prev, {
      id: `seg-${Date.now()}`,
      label: L4(lang, { ko: "새 구간", en: "New Segment" }),
      color: "#6b7280",
      width: 10,
      desc: "",
    }]);
  };

  const removeSegment = (idx: number) => {
    if (segments.length <= 2) return;
    setSegments(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSegment = (idx: number, updates: Partial<PlotSegment>) => {
    setSegments(prev => prev.map((s, i) => i === idx ? { ...s, ...updates } : s));
  };

  return (
    <div className="space-y-4">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PLOT_PRESETS) as PlotType[]).map(key => (
          <button key={key} onClick={() => loadPreset(key)}
            className={`px-3 py-1.5 rounded text-[10px] font-bold border transition-all ${
              selectedPreset === key ? "bg-accent-purple text-white border-accent-purple" : "bg-bg-primary text-text-tertiary border-border hover:border-text-tertiary"
            }`}>
            {L4(lang, PLOT_PRESETS[key])}
          </button>
        ))}
        <button onClick={addSegment} className="px-3 py-1.5 rounded text-[10px] font-bold border border-dashed border-border text-text-tertiary hover:text-accent-purple hover:border-accent-purple transition-all">
          + {L4(lang, { ko: "구간 추가", en: "Add Segment" })}
        </button>
      </div>

      {/* Visual bar */}
      <div className="relative">
        <div className="flex rounded-lg overflow-hidden h-12 border border-border">
          {segments.map((seg, i) => (
            <div key={seg.id} className="relative flex items-center justify-center text-[9px] font-bold text-white cursor-pointer select-none group"
              style={{ width: `${seg.width}%`, background: seg.color, minWidth: 30 }}
            >
              <span className="truncate px-1">{seg.label}</span>
              <span className="absolute bottom-0.5 right-1 text-[7px] opacity-60">{seg.width}%</span>
              {/* Drag handle — supports both mouse and touch */}
              {i < segments.length - 1 && (
                <div className="absolute right-0 top-0 bottom-0 w-3 sm:w-1 cursor-col-resize hover:bg-white/30 z-10"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                    const startX = e.clientX;
                    const barWidth = (e.target as HTMLElement).closest('.flex')?.getBoundingClientRect().width || 600;
                    const handleMove = (pe: PointerEvent) => {
                      const delta = Math.round(((pe.clientX - startX) / barWidth) * 100);
                      if (Math.abs(delta) >= 1) updateWidth(i, delta);
                    };
                    const handleUp = () => {
                      document.removeEventListener('pointermove', handleMove);
                      document.removeEventListener('pointerup', handleUp);
                    };
                    document.addEventListener('pointermove', handleMove);
                    document.addEventListener('pointerup', handleUp);
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Segment editor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {segments.map((seg, i) => (
          <div key={seg.id} className="border border-border rounded-lg p-3 bg-bg-primary space-y-2" style={{ borderLeftWidth: 3, borderLeftColor: seg.color }}>
            <div className="flex justify-between items-center">
              <input value={seg.label} onChange={e => updateSegment(i, { label: e.target.value })}
                maxLength={100}
                className="bg-transparent font-bold text-xs outline-none flex-1" />
              <div className="flex items-center gap-1">
                <input type="color" value={seg.color} onChange={e => updateSegment(i, { color: e.target.value })} className="w-5 h-5 rounded cursor-pointer border-0" />
                {segments.length > 2 && (
                  <button onClick={() => removeSegment(i)} className="text-text-tertiary hover:text-accent-red text-[10px]">✕</button>
                )}
              </div>
            </div>
            <input value={seg.desc} onChange={e => updateSegment(i, { desc: e.target.value })}
              placeholder={L4(lang, { ko: "설명...", en: "Description..." })}
              maxLength={500}
              className="w-full bg-bg-secondary border border-border rounded px-2 py-1 text-[10px] outline-none" />
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-text-tertiary">{L4(lang, { ko: "비중", en: "Weight" })}:</span>
              <input type="range" min={5} max={80} value={seg.width}
                aria-label={L4(lang, { ko: `${seg.label} 비중`, en: `${seg.label} weight` })}
                onChange={e => {
                  const newW = parseInt(e.target.value);
                  const diff = newW - seg.width;
                  updateWidth(i, diff);
                }}
                className="flex-1 h-1 accent-accent-purple" />
              <span className="text-[9px] font-bold text-accent-purple w-8 text-right">{seg.width}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PART 2: MAIN SCENE SHEET COMPONENT
// ============================================================

interface FullDirectionData {
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
  onSimRefUpdate?: (ref: { worldConsistency: boolean; civRelations: boolean; timeline: boolean; territoryMap: boolean; languageSystem: boolean; genreLevel: boolean }) => void;
  initialDirection?: Partial<FullDirectionData>;
  onSaveEpisodeSheet?: () => void;
}

// Scene direction presets (10 genres) — static, defined at module scope to avoid stale-closure deps
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
    hooks: [{ id: `h-${ts}-1`, position: "opening", hookType: "mystery", desc: k ? "운명적 재회" : "Fateful reunion" }],
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
    hooks: [{ id: `h-${ts}-1`, position: "opening", hookType: "mystery", desc: k ? "고대 유적 발견" : "Ancient ruins found" }],
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
    gogumas: [{ id: `g-${ts}-1`, type: "goguma", intensity: "medium", desc: k ? "AI 판단 오류" : "AI judgment error", episode: 1 }],
    hooks: [{ id: `h-${ts}-1`, position: "opening", hookType: "mystery", desc: k ? "미지 신호 수신" : "Unknown signal received" }],
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

export default function SceneSheet({ lang: langProp, language: languageProp, synopsis, characterNames, tierContext, onDirectionUpdate, onSimRefUpdate, initialDirection, onSaveEpisodeSheet }: SceneSheetProps) {
  const lang: Lang = langProp ?? ((languageProp === 'KO' || languageProp === 'JP') ? 'ko' : 'en');
  const tl = createT(languageProp ?? (lang === 'ko' ? 'KO' : 'EN'));
  const [activeTab, setActiveTab] = useState<SheetTab>("goguma");
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [grammarRegion, setGrammarRegion] = useState<GrammarRegion>('KR');
  const [showGrammarPanel, setShowGrammarPanel] = useState(false);
  const [gogumas, setGogumas] = useState<GogumaEntry[]>(initialDirection?.goguma || []);
  const [hooks, setHooks] = useState<HookEntry[]>(initialDirection?.hooks || []);
  const [emotions, setEmotions] = useState<EmotionPoint[]>(initialDirection?.emotions || []);
  const [dialogueRules, setDialogueRules] = useState<DialogueRule[]>(initialDirection?.dialogueRules || []);
  const [dopamines, setDopamines] = useState<DopamineEntry[]>(initialDirection?.dopamines || []);
  const [cliffs, setCliffs] = useState<CliffEntry[]>(initialDirection?.cliffs || []);
  const [foreshadows, setForeshadows] = useState<ForeshadowEntry[]>(initialDirection?.foreshadows || []);
  const [pacings, setPacings] = useState<PacingEntry[]>(initialDirection?.pacings || [
    { id: 'p-1', section: lang === 'ko' ? '도입' : 'Intro', percent: 20, desc: '' },
    { id: 'p-2', section: lang === 'ko' ? '전개' : 'Development', percent: 50, desc: '' },
    { id: 'p-3', section: lang === 'ko' ? '전환' : 'Transition', percent: 30, desc: '' },
  ]);
  const [tensionPoints, setTensionPoints] = useState<TensionPoint[]>(initialDirection?.tensionPoints || []);
  const [canons, setCanons] = useState<CanonEntry[]>(initialDirection?.canons || []);
  const [transitions, setTransitions] = useState<TransitionEntry[]>(initialDirection?.transitions || []);
  const [writerNotes, setWriterNotes] = useState(initialDirection?.writerNotes || '');
  const [plotStructure, setPlotStructure] = useState(initialDirection?.plotStructure || '');

  // Memoized sorted arrays for SVG polyline rendering (avoid re-sort on every render)
  const sortedEmotions = useMemo(
    () => [...emotions].sort((a, b) => a.position - b.position),
    [emotions],
  );
  const sortedTensionPoints = useMemo(
    () => [...tensionPoints].sort((a, b) => a.position - b.position),
    [tensionPoints],
  );

  // Sync to parent whenever data changes
  const onDirectionUpdateRef = useRef(onDirectionUpdate);
  onDirectionUpdateRef.current = onDirectionUpdate;
  const syncDirection = useCallback(() => {
    onDirectionUpdateRef.current?.({ goguma: gogumas, hooks, emotions, dialogueRules, dopamines, cliffs, foreshadows, pacings, tensionPoints, canons, transitions, writerNotes, plotStructure });
  }, [gogumas, hooks, emotions, dialogueRules, dopamines, cliffs, foreshadows, pacings, tensionPoints, canons, transitions, writerNotes, plotStructure]);

  // Simulator reference checkpoints
  const [simRef, setSimRef] = useState({
    worldConsistency: false,
    civRelations: false,
    timeline: false,
    territoryMap: false,
    languageSystem: false,
    genreLevel: false,
  });

  // Quick-add helpers
  const addGoguma = (type: "goguma" | "cider", intensity: "small" | "medium" | "large") => {
    setGogumas(prev => [...prev, { id: `g-${Date.now()}`, type, intensity, desc: "", episode: 1 }]);
  };
  const addHook = (position: "opening" | "middle" | "ending") => {
    setHooks(prev => [...prev, { id: `h-${Date.now()}`, position, hookType: "question", desc: "" }]);
  };
  const addEmotion = () => {
    setEmotions(prev => [...prev, { id: `e-${Date.now()}`, position: prev.length * 20, emotion: "분노", intensity: 50 }]);
  };
  const addDialogue = () => {
    setDialogueRules(prev => [...prev, { id: `d-${Date.now()}`, character: "", tone: "", notes: "" }]);
  };
  const addDopamine = () => {
    setDopamines(prev => [...prev, { id: `dp-${Date.now()}`, scale: "medium", device: "growth", desc: "", resolved: false }]);
  };
  const addCliff = () => {
    setCliffs(prev => [...prev, { id: `cl-${Date.now()}`, cliffType: "crisis-cut", desc: "", episode: 1 }]);
  };

  // Auto-sync all direction data to parent (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      syncDirection();
    }, 300);
    return () => clearTimeout(timer);
  }, [syncDirection]);

  const [showScenePresetMenu, setShowScenePresetMenu] = useState(false);

  const applyScenePreset = useCallback((presetKey: string) => {
    const preset = SCENE_PRESETS.find(p => p.key === presetKey);
    if (!preset) return;
    const confirmMsg = L4(lang, { ko: "현재 씬시트 데이터를 프리셋으로 덮어쓰시겠습니까?", en: "Overwrite current scene sheet data with this preset?" });
    if (!window.confirm(confirmMsg)) return;
    const ts = Date.now();
    const isKO = lang === "ko";
    const data = preset.gen(ts, isKO);
    setGogumas(data.gogumas);
    setHooks(data.hooks);
    setEmotions(data.emotions);
    setDialogueRules(data.dialogue);
    setDopamines(data.dopamines);
    setCliffs(data.cliffs);
    setShowScenePresetMenu(false);
  }, [lang]);

  // Validation summary
  const validation = {
    gogumaOk: gogumas.length > 0,
    hookOpeningOk: hooks.some(h => h.position === "opening"),
    hookEndingOk: hooks.some(h => h.position === "ending"),
    emotionOk: emotions.length >= 1,
    dialogueOk: dialogueRules.length >= 1,
    dopamineOk: dopamines.length >= 1,
    cliffOk: cliffs.length >= 1,
  };
  const passCount = Object.values(validation).filter(Boolean).length;

  // 3-tier 연동 검증
  const tierWarnings: string[] = [];
  if (tierContext) {
    const hasCharData = tierContext.charProfiles?.some(c => c.desire || c.conflict);
    if (!hasCharData) {
      tierWarnings.push(L4(lang, { ko: "캐릭터 뼈대(욕망/갈등)가 비어있어 연출이 서사와 연결되지 않습니다", en: "Character skeleton (desire/conflict) is empty — direction won't connect to narrative" }));
    }
    if (!tierContext.corePremise) {
      tierWarnings.push(L4(lang, { ko: "세계관 핵심 전제가 없어 훅/클리프행어가 세계관과 무관합니다", en: "No world premise — hooks/cliffs won't relate to the world" }));
    }
    if (!tierContext.currentConflict) {
      tierWarnings.push(L4(lang, { ko: "세계 갈등이 없어 긴장 장치가 맥락을 잃습니다", en: "No world conflict — tension devices lose context" }));
    }
    // 대사 톤이 있는데 해당 캐릭터의 values가 없으면
    if (tierContext.charProfiles?.length) {
      for (const rule of dialogueRules) {
        const profile = tierContext.charProfiles.find(c => c.name === rule.character);
        if (profile && !profile.values) {
          tierWarnings.push(L4(lang, { ko: `${rule.character}의 가치관/금지선이 없어 대사 톤이 캐릭터와 분리됩니다`, en: `${rule.character} has no values — dialogue tone disconnected from character` }));
          break;
        }
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="doc-header rounded-t mb-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* 국가별 문법 팩 셀렉터 */}
          <div className="flex items-center gap-0.5 p-0.5 bg-black/30 rounded-lg">
            {GRAMMAR_REGIONS.map(r => (
              <button key={r} onClick={() => setGrammarRegion(r)}
                className={`px-2 py-1 rounded text-[11px] transition-all ${
                  grammarRegion === r
                    ? 'bg-accent-purple text-white shadow'
                    : 'text-text-tertiary hover:text-text-primary'
                }`}
              >
                {GRAMMAR_PACKS[r].flag}
              </button>
            ))}
          </div>
          <div>
            <span className="badge badge-amber mr-2">SCENE</span>
            {L4(lang, { ko: "씬시트 — 장르 문법 설계", en: "Scene Sheet — Genre Grammar Design" })}
          </div>
        </div>
        <div className="flex gap-2 relative">
          <button onClick={() => setShowGrammarPanel(v => !v)}
            className={`px-3 py-1.5 rounded text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
              showGrammarPanel ? 'bg-accent-green text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-primary'
            }`}>
            {GRAMMAR_PACKS[grammarRegion].flag} {L4(lang, { ko: "문법", en: "Grammar" })}
          </button>
          <button onClick={() => setShowScenePresetMenu(v => !v)}
            className="px-3 py-1.5 bg-accent-purple text-white rounded text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider hover:opacity-80 transition-opacity">
            ⚡ {L4(lang, { ko: "프리셋", en: "Preset" })}
          </button>
          {showScenePresetMenu && (
            <div className="absolute top-full mt-1 right-0 bg-bg-secondary border border-border rounded-lg shadow-xl z-50 min-w-[180px] max-h-[300px] overflow-y-auto">
              {SCENE_PRESETS.map(p => (
                <button key={p.key} onClick={() => applyScenePreset(p.key)}
                  className="w-full text-left px-4 py-2.5 text-[11px] text-text-secondary hover:bg-accent-purple/20 hover:text-text-primary transition-colors border-b border-border/50 last:border-0">
                  {L4(lang, p)}
                </button>
              ))}
            </div>
          )}
          <button onClick={async () => {
            const { activeSupportsStructured } = await import('@/lib/ai-providers');
            if (!activeSupportsStructured()) { showAlert(lang === 'ko' ? '현재 프로바이더는 구조화 생성 미지원. Gemini를 사용하세요.' : 'Current provider does not support structured generation.'); return; }
            if (!synopsis) { showAlert(tl('sceneSheet.synopsisRequired')); return; }
            try {
              const { generateSceneDirection } = await import('@/services/geminiService');
              const result = await generateSceneDirection(synopsis, characterNames || [], lang === "ko" ? 'KO' : 'EN', tierContext);
              const ts = Date.now();
              // hooks
              if (result.hooks?.length) setHooks(result.hooks.map((h, i) => ({ id: `ai-h-${ts}-${i}`, position: (h.position || 'opening') as "opening" | "middle" | "ending", hookType: h.hookType || 'question', desc: h.desc || '' })));
              // goguma/cider
              if (result.goguma?.length) setGogumas(result.goguma.map((g, i) => ({ id: `ai-g-${ts}-${i}`, type: (g.type === 'cider' ? 'cider' : 'goguma') as "goguma" | "cider", intensity: (g.intensity || 'medium') as "small" | "medium" | "large", desc: g.desc || '', episode: 1 })));
              // cliffhanger
              if (result.cliffhanger) setCliffs([{ id: `ai-c-${ts}`, cliffType: result.cliffhanger.cliffType || 'info-before', desc: result.cliffhanger.desc || '', episode: 1 }]);
              // emotions
              if (result.emotionTargets?.length) setEmotions(result.emotionTargets.map((e, i) => ({ id: `ai-e-${ts}-${i}`, position: Math.round((i / Math.max(result.emotionTargets.length - 1, 1)) * 100), emotion: e.emotion, intensity: e.intensity || 70 })));
              // dialogue tones
              if (result.dialogueTones?.length) setDialogueRules(result.dialogueTones.map((d, i) => ({ id: `ai-d-${ts}-${i}`, character: d.character, tone: d.tone, notes: '' })));
              // foreshadows
              if (result.foreshadows?.length) setForeshadows(result.foreshadows.map((f, i) => ({ id: `ai-f-${ts}-${i}`, planted: f.planted, payoff: f.payoff, episode: 1, resolved: false })));
              // dopamine devices
              if (result.dopamineDevices?.length) setDopamines(result.dopamineDevices.map((dp, i) => ({ id: `ai-dp-${ts}-${i}`, scale: (dp.scale || 'medium') as "micro" | "medium" | "macro", device: dp.device, desc: dp.desc, resolved: false })));
              // pacing
              if (result.pacings?.length) setPacings(result.pacings.map((p, i) => ({ id: `ai-p-${ts}-${i}`, section: p.section, percent: p.percent || 25, desc: p.desc })));
              // tension curve
              if (result.tensionCurve?.length) setTensionPoints(result.tensionCurve.map((t, i) => ({ id: `ai-t-${ts}-${i}`, position: t.position, level: t.level, label: t.label })));
            } catch { showAlert(tl('sceneSheet.aiFailed')); }
          }}
            className="px-3 py-1.5 bg-accent-purple text-white rounded text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider hover:opacity-80 transition-opacity">
            🤖 {tl('sceneSheet.aiGenerate')}
          </button>
        </div>
      </div>

      {/* 국가별 문법 패널 */}
      {showGrammarPanel && (() => {
        const pack = GRAMMAR_PACKS[grammarRegion];
        return (
          <div className="border border-t-0 border-border bg-bg-secondary/50 p-4 sm:p-6 space-y-5 animate-in fade-in duration-300">
            {/* 팩 헤더 */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black flex items-center gap-2">
                  <span className="text-lg">{pack.flag}</span>
                  {lang === 'ko' ? pack.label.ko : pack.label.en}
                </h3>
                <p className="text-[9px] text-text-tertiary font-bold tracking-wider uppercase mt-0.5">
                  {lang === 'ko' ? pack.subtitle.ko : pack.subtitle.en}
                </p>
              </div>
              <div className="text-[9px] text-text-tertiary">
                {pack.episodeLength.min.toLocaleString()}~{pack.episodeLength.max.toLocaleString()} {pack.episodeLength.unit}/{tl('sceneSheet.episodeUnit')}
              </div>
            </div>

            {/* 비트시트 타임라인 */}
            <div className="space-y-2">
              <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">
                {tl('sceneSheet.beatSheet')} ({pack.beatSheet.length} beats)
              </span>
              <div className="relative">
                <div className="h-2 bg-bg-primary rounded-full overflow-hidden flex">
                  {pack.beatSheet.map((beat, i) => {
                    const next = pack.beatSheet[i + 1]?.position ?? 100;
                    const width = next - beat.position;
                    const hue = (beat.position / 100) * 270;
                    return (
                      <div key={i} className="h-full relative group cursor-default"
                        style={{ width: `${width}%`, backgroundColor: `hsl(${hue}, 60%, 30%)` }}>
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-bg-primary border border-border text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                          <div className="font-bold text-text-primary">{beat.name}</div>
                          <div className="text-text-tertiary">{beat.position}% — {beat.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1 text-[7px] text-text-tertiary">
                  {pack.beatSheet.filter((_, i) => i % Math.ceil(pack.beatSheet.length / 5) === 0).map(b => (
                    <span key={b.name}>{b.name}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 리듬 규칙 */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-accent-purple uppercase tracking-widest">
                  {tl('sceneSheet.rhythmRules')}
                </span>
                <div className="space-y-1.5">
                  {pack.rhythmRules.map((r, i) => (
                    <div key={i} className="p-2 bg-accent-purple/5 border border-accent-purple/10 rounded-lg">
                      <div className="text-[10px] font-bold text-accent-purple">{r.name}</div>
                      <div className="text-[9px] text-text-tertiary mt-0.5">{r.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 보상 패턴 */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-accent-green uppercase tracking-widest">
                  {tl('sceneSheet.readerReward')}
                </span>
                <div className="space-y-1.5">
                  {pack.rewardPatterns.map((r, i) => (
                    <div key={i} className="p-2 bg-accent-green/5 border border-accent-green/10 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-accent-green">{r.name}</span>
                        <span className="text-[10px] text-text-tertiary bg-bg-primary px-1.5 py-0.5 rounded">{r.interval}</span>
                      </div>
                      <div className="text-[9px] text-text-tertiary mt-0.5">{r.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 필수 / 금기 */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-accent-green uppercase tracking-widest">
                    {tl('sceneSheet.mustHave')}
                  </span>
                  {pack.mustHave.map((m, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[9px]">
                      <span className="text-accent-green">✓</span>
                      <span className="text-text-secondary">{m}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-accent-red uppercase tracking-widest">
                    {tl('sceneSheet.taboo')}
                  </span>
                  {pack.taboo.map((t, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[9px]">
                      <span className="text-accent-red">✕</span>
                      <span className="text-text-secondary">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="border border-t-0 border-border rounded-b bg-bg-secondary p-4 sm:p-6 space-y-5">
        {/* Tabs — grouped with collapsible sections */}
        <div className="space-y-1">
          {TAB_GROUPS.map((group, gi) => {
            const hasActive = group.tabs.includes(activeTab);
            const groupLabel = L4(lang, group);
            return (
              <details key={gi} open={hasActive} className="group/tab">
                <summary className={`flex items-center gap-1 cursor-pointer text-[10px] font-bold tracking-wider select-none py-1 ${
                  hasActive ? "text-accent-purple" : "text-text-tertiary hover:text-text-secondary"
                }`}>
                  <span className="text-[10px] group-open/tab:rotate-90 transition-transform">▶</span>
                  {groupLabel}
                </summary>
                <div className="flex flex-wrap gap-1 pl-3 pb-1 pt-0.5 overflow-x-auto overscroll-x-contain" role="tablist" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {group.tabs.map(tabId => {
                    const tab = TAB_DEF.find(t => t.id === tabId);
                    if (!tab) return null;
                    return (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        className={`px-2.5 py-2 sm:py-1.5 rounded text-[10px] font-bold font-[family-name:var(--font-mono)] tracking-wider transition-all whitespace-nowrap min-h-[36px] sm:min-h-0 shrink-0 ${
                          activeTab === tab.id
                            ? "bg-accent-purple/10 text-accent-purple border border-accent-purple/30"
                            : "text-text-tertiary hover:text-text-secondary border border-transparent active:bg-white/5"
                        }`}>
                        {tab.emoji} {L4(lang, tab)}
                      </button>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>

        {/* ====== GOGUMA / CIDER TAB ====== */}
        {activeTab === "goguma" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["small", "medium", "large"] as const).map(intensity => (
                <React.Fragment key={intensity}>
                  <button onClick={() => addGoguma("goguma", intensity)}
                    className="px-3 py-1.5 bg-amber-600/10 border border-amber-600/30 rounded text-[10px] font-bold text-amber-500 hover:bg-amber-600/20 transition-colors">
                    🍠 {L4(lang, ({small:{ko:"소(오해)",en:"Small"},medium:{ko:"중(배신)",en:"Medium"},large:{ko:"대(절망)",en:"Large"}})[intensity])}
                  </button>
                </React.Fragment>
              ))}
              <button onClick={() => addGoguma("cider", "large")}
                className="px-3 py-1.5 bg-cyan-600/10 border border-cyan-600/30 rounded text-[10px] font-bold text-cyan-400 hover:bg-cyan-600/20 transition-colors">
                🥤 {L4(lang, { ko: "사이다 추가", en: "Add Cider" })}
              </button>
            </div>
            {gogumas.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary text-xs italic">
                {L4(lang, { ko: "고구마(답답함)와 사이다(해소)를 배치하세요. 2~3 고구마 후 1 사이다가 이상적.", en: "Place tension (goguma) and release (cider). 2-3 tensions then 1 release is ideal." })}
              </div>
            ) : (
              <div className="space-y-2">
                {gogumas.map((g, i) => (
                  <div key={g.id} className={`flex items-center gap-3 border rounded-lg px-3 py-2 ${g.type === "goguma" ? "border-amber-600/30 bg-amber-600/5" : "border-cyan-500/30 bg-cyan-500/5"}`}>
                    <span className="text-sm">{g.type === "goguma" ? "🍠" : "🥤"}</span>
                    <span className={`text-[9px] font-bold uppercase ${g.type === "goguma" ? "text-amber-500" : "text-cyan-400"}`}>
                      {g.type === "goguma" ? g.intensity : "RELEASE"}
                    </span>
                    <input value={g.desc} onChange={e => setGogumas(prev => prev.map((gg, ii) => ii === i ? { ...gg, desc: e.target.value } : gg))}
                      placeholder={L4(lang, { ko: "설명...", en: "Description..." })} maxLength={500} className="flex-1 bg-transparent text-xs outline-none text-text-secondary" />
                    <input type="number" min={1} value={g.episode} onChange={e => setGogumas(prev => prev.map((gg, ii) => ii === i ? { ...gg, episode: parseInt(e.target.value) || 1 } : gg))}
                      className="w-12 bg-bg-secondary border border-border rounded px-1 py-0.5 text-[9px] text-center outline-none" />
                    <button onClick={() => setGogumas(prev => prev.filter((_, ii) => ii !== i))} className="text-text-tertiary hover:text-accent-red text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ====== HOOK TAB ====== */}
        {activeTab === "hook" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(["opening", "middle", "ending"] as const).map(pos => (
                <button key={pos} onClick={() => addHook(pos)}
                  className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-colors">
                  + {L4(lang, ({opening:{ko:"오프닝 훅",en:"Opening Hook"},middle:{ko:"미들 훅",en:"Middle Hook"},ending:{ko:"엔딩 훅",en:"Ending Hook"}})[pos])}
                </button>
              ))}
            </div>
            {hooks.map((h, i) => (
              <div key={h.id} className="border border-border rounded-lg p-3 bg-bg-primary space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                    h.position === "opening" ? "bg-blue-500/10 text-blue-400" : h.position === "ending" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
                  }`}>{h.position}</span>
                  <select value={h.hookType} onChange={e => setHooks(prev => prev.map((hh, ii) => ii === i ? { ...hh, hookType: e.target.value } : hh))}
                    className="bg-bg-secondary border border-border rounded px-2 py-1 text-[10px] outline-none">
                    {HOOK_TYPES.map(ht => <option key={ht.id} value={ht.id}>{L4(lang, ht)}</option>)}
                  </select>
                  <button onClick={() => setHooks(prev => prev.filter((_, ii) => ii !== i))} className="ml-auto text-text-tertiary hover:text-accent-red text-xs">✕</button>
                </div>
                <input value={h.desc} onChange={e => setHooks(prev => prev.map((hh, ii) => ii === i ? { ...hh, desc: e.target.value } : hh))}
                  placeholder={L4(lang, { ko: "훅 내용 (예: \"문이 열렸다. 죽었어야 할 사람이 서 있었다.\")", en: "Hook content..." })}
                  maxLength={500}
                  className="w-full bg-bg-secondary border border-border rounded px-2 py-1.5 text-[11px] outline-none" />
              </div>
            ))}
          </div>
        )}

        {/* ====== EMOTION TAB ====== */}
        {activeTab === "emotion" && (
          <div className="space-y-4">
            <button onClick={addEmotion} className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple transition-colors">
              + {L4(lang, { ko: "감정 포인트 추가", en: "Add Emotion Point" })}
            </button>
            {/* Emotion curve visualization */}
            {emotions.length > 0 && (
              <div className="relative h-24 border border-border rounded-lg bg-bg-primary overflow-hidden">
                <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none" role="img" aria-label={L4(lang, { ko: "감정 곡선 시각화", en: "Emotion curve visualization" })}>
                  {emotions.length >= 2 && (
                    <polyline fill="none" stroke="var(--color-accent-purple)" strokeWidth="0.5"
                      points={sortedEmotions.map(e => `${e.position},${50 - e.intensity / 2}`).join(" ")} />
                  )}
                  {emotions.map(e => (
                    <circle key={e.id} cx={e.position} cy={50 - e.intensity / 2} r="1.5" fill="var(--color-accent-purple)" />
                  ))}
                </svg>
              </div>
            )}
            {emotions.map((em, i) => (
              <div key={em.id} className="flex items-center gap-2 border border-border rounded px-3 py-2 bg-bg-primary">
                <select value={em.emotion} onChange={e => setEmotions(prev => prev.map((ee, ii) => ii === i ? { ...ee, emotion: e.target.value } : ee))}
                  className="bg-bg-secondary border border-border rounded px-2 py-1 text-[10px] outline-none">
                  {EMOTIONS.map(emo => <option key={emo} value={emo}>{emo}</option>)}
                </select>
                <span className="text-[9px] text-text-tertiary">{L4(lang, { ko: "위치", en: "Pos" })}:</span>
                <input type="range" min={0} max={100} value={em.position}
                  aria-label={L4(lang, { ko: "감정 위치", en: "Emotion position" })}
                  onChange={e => setEmotions(prev => prev.map((ee, ii) => ii === i ? { ...ee, position: parseInt(e.target.value) } : ee))}
                  className="flex-1 h-1 accent-accent-purple" />
                <span className="text-[9px] text-text-tertiary">{L4(lang, { ko: "강도", en: "Int" })}:</span>
                <input type="range" min={0} max={100} value={em.intensity}
                  aria-label={L4(lang, { ko: "감정 강도", en: "Emotion intensity" })}
                  onChange={e => setEmotions(prev => prev.map((ee, ii) => ii === i ? { ...ee, intensity: parseInt(e.target.value) } : ee))}
                  className="w-20 h-1 accent-accent-red" />
                <span className="text-[9px] font-bold text-accent-purple w-6 text-right">{em.intensity}</span>
                <button onClick={() => setEmotions(prev => prev.filter((_, ii) => ii !== i))} className="text-text-tertiary hover:text-accent-red text-xs">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* ====== DIALOGUE TAB ====== */}
        {activeTab === "dialogue" && (
          <div className="space-y-4">
            <button onClick={addDialogue} className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple transition-colors">
              + {L4(lang, { ko: "캐릭터 대사 규칙 추가", en: "Add Dialogue Rule" })}
            </button>
            {dialogueRules.map((dr, i) => (
              <div key={dr.id} className="border border-border rounded-lg p-3 bg-bg-primary space-y-2">
                <div className="flex gap-2">
                  <input value={dr.character} onChange={e => setDialogueRules(prev => prev.map((d, ii) => ii === i ? { ...d, character: e.target.value } : d))}
                    placeholder={L4(lang, { ko: "캐릭터명", en: "Character" })} maxLength={100} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-xs outline-none font-bold" />
                  <input value={dr.tone} onChange={e => setDialogueRules(prev => prev.map((d, ii) => ii === i ? { ...d, tone: e.target.value } : d))}
                    placeholder={L4(lang, { ko: "톤 (예: 냉소적, 다정함)", en: "Tone (e.g. sarcastic, warm)" })} maxLength={200} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-xs outline-none" />
                  <button onClick={() => setDialogueRules(prev => prev.filter((_, ii) => ii !== i))} className="text-text-tertiary hover:text-accent-red">✕</button>
                </div>
                <input value={dr.notes} onChange={e => setDialogueRules(prev => prev.map((d, ii) => ii === i ? { ...d, notes: e.target.value } : d))}
                  placeholder={L4(lang, { ko: "특이사항 (예: 긴장 시 짧게, 경어 사용)", en: "Notes (e.g. short in tension, uses formal speech)" })}
                  maxLength={500}
                  className="w-full bg-bg-secondary border border-border rounded px-2 py-1.5 text-[10px] outline-none" />
              </div>
            ))}
          </div>
        )}

        {/* ====== DOPAMINE TAB ====== */}
        {activeTab === "dopamine" && (
          <div className="space-y-4">
            <button onClick={addDopamine} className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple transition-colors">
              + {L4(lang, { ko: "도파민 장치 추가", en: "Add Dopamine Device" })}
            </button>
            {dopamines.map((dp, i) => (
              <div key={dp.id} className="flex items-center gap-2 border border-border rounded px-3 py-2 bg-bg-primary">
                <select value={dp.scale} onChange={e => setDopamines(prev => prev.map((d, ii) => ii === i ? { ...d, scale: e.target.value as "micro"|"medium"|"macro" } : d))}
                  className="bg-bg-secondary border border-border rounded px-2 py-1 text-[9px] font-bold outline-none uppercase">
                  <option value="micro">{L4(lang, { ko: "소 (문단)", en: "Micro" })}</option>
                  <option value="medium">{L4(lang, { ko: "중 (에피소드)", en: "Medium" })}</option>
                  <option value="macro">{L4(lang, { ko: "대 (아크)", en: "Macro" })}</option>
                </select>
                <select value={dp.device} onChange={e => setDopamines(prev => prev.map((d, ii) => ii === i ? { ...d, device: e.target.value } : d))}
                  className="bg-bg-secondary border border-border rounded px-2 py-1 text-[10px] outline-none">
                  {DOPAMINE_DEVICES.map(dd => <option key={dd.id} value={dd.id}>{L4(lang, dd)}</option>)}
                </select>
                <input value={dp.desc} onChange={e => setDopamines(prev => prev.map((d, ii) => ii === i ? { ...d, desc: e.target.value } : d))}
                  placeholder={L4(lang, { ko: "설명...", en: "Description..." })} maxLength={500} className="flex-1 bg-transparent text-[10px] outline-none text-text-secondary" />
                <label className="flex items-center gap-1 text-[9px] text-text-tertiary cursor-pointer">
                  <input type="checkbox" checked={dp.resolved} onChange={e => setDopamines(prev => prev.map((d, ii) => ii === i ? { ...d, resolved: e.target.checked } : d))} className="accent-accent-green" />
                  {L4(lang, { ko: "회수", en: "Resolved" })}
                </label>
                <button onClick={() => setDopamines(prev => prev.filter((_, ii) => ii !== i))} className="text-text-tertiary hover:text-accent-red text-xs">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* ====== CLIFFHANGER TAB ====== */}
        {activeTab === "cliff" && (
          <div className="space-y-4">
            <button onClick={addCliff} className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple transition-colors">
              + {L4(lang, { ko: "클리프행어 추가", en: "Add Cliffhanger" })}
            </button>
            {cliffs.map((cl, i) => (
              <div key={cl.id} className="flex items-center gap-2 border border-border rounded px-3 py-2 bg-bg-primary">
                <select value={cl.cliffType} onChange={e => setCliffs(prev => prev.map((c, ii) => ii === i ? { ...c, cliffType: e.target.value } : c))}
                  className="bg-bg-secondary border border-border rounded px-2 py-1 text-[10px] outline-none">
                  {CLIFF_TYPES.map(ct => <option key={ct.id} value={ct.id}>{L4(lang, ct)}</option>)}
                </select>
                <input value={cl.desc} onChange={e => setCliffs(prev => prev.map((c, ii) => ii === i ? { ...c, desc: e.target.value } : c))}
                  placeholder={L4(lang, { ko: "내용 (예: \"칼끝이 목에 닿았다. 그 순간—\")", en: "Content..." })}
                  maxLength={500} className="flex-1 bg-transparent text-[10px] outline-none text-text-secondary" />
                <input type="number" min={1} value={cl.episode} onChange={e => setCliffs(prev => prev.map((c, ii) => ii === i ? { ...c, episode: parseInt(e.target.value) || 1 } : c))}
                  className="w-12 bg-bg-secondary border border-border rounded px-1 py-0.5 text-[9px] text-center outline-none" title="EP" />
                <button onClick={() => setCliffs(prev => prev.filter((_, ii) => ii !== i))} className="text-text-tertiary hover:text-accent-red text-xs">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* ====== PLOT TAB ====== */}
        {/* ====== FORESHADOW (떡밥/복선) ====== */}
        {activeTab === "foreshadow" && (
          <div className="space-y-4">
            <button onClick={() => setForeshadows(prev => [...prev, { id: `fs-${Date.now()}`, planted: '', payoff: '', episode: 1, resolved: false }])}
              className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple transition-colors">
              + {L4(lang, { ko: "떡밥 추가", en: "Add Foreshadow" })}
            </button>
            {foreshadows.length === 0 && <p className="text-center py-8 text-text-tertiary text-xs italic">{L4(lang, { ko: "복선을 심고 회수를 추적하세요", en: "Plant foreshadowing and track payoffs" })}</p>}
            {foreshadows.map((fs, i) => (
              <div key={fs.id} className="border border-border rounded-lg p-3 bg-bg-primary space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <span className="text-[9px] text-text-tertiary">{L4(lang, { ko: "🌱 심기", en: "🌱 Plant" })}</span>
                    <input value={fs.planted} onChange={e => setForeshadows(prev => prev.map((f, ii) => ii === i ? { ...f, planted: e.target.value } : f))}
                      placeholder={L4(lang, { ko: "복선 내용...", en: "Foreshadow content..." })} maxLength={500} className="w-full bg-bg-secondary border border-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-accent-purple" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[9px] text-text-tertiary">{L4(lang, { ko: "🎯 회수", en: "🎯 Payoff" })}</span>
                    <input value={fs.payoff} onChange={e => setForeshadows(prev => prev.map((f, ii) => ii === i ? { ...f, payoff: e.target.value } : f))}
                      placeholder={L4(lang, { ko: "회수 방법...", en: "Payoff method..." })} maxLength={500} className="w-full bg-bg-secondary border border-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-accent-purple" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-[10px] text-text-tertiary cursor-pointer">
                    <input type="checkbox" checked={fs.resolved} onChange={e => setForeshadows(prev => prev.map((f, ii) => ii === i ? { ...f, resolved: e.target.checked } : f))} className="accent-accent-green" />
                    {L4(lang, { ko: "회수 완료", en: "Resolved" })}
                  </label>
                  <input type="number" min={1} value={fs.episode} onChange={e => setForeshadows(prev => prev.map((f, ii) => ii === i ? { ...f, episode: parseInt(e.target.value) || 1 } : f))}
                    className="w-12 bg-bg-secondary border border-border rounded px-1 py-0.5 text-[9px] text-center outline-none" title="EP" />
                  <button onClick={() => setForeshadows(prev => prev.filter((_, ii) => ii !== i))} className="ml-auto text-text-tertiary hover:text-accent-red text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ====== PACING (분량 배분) ====== */}
        {activeTab === "pacing" && (
          <div className="space-y-4">
            <div className="flex rounded-lg overflow-hidden h-10 border border-border">
              {pacings.map((p, i) => (
                <div key={p.id} className="flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${p.percent}%`, background: i === 0 ? '#3b82f6' : i === 1 ? '#f59e0b' : '#10b981' }}>
                  {p.section} {p.percent}%
                </div>
              ))}
            </div>
            {pacings.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 border border-border rounded px-3 py-2 bg-bg-primary">
                <span className="text-[10px] font-bold w-16">{p.section}</span>
                <input type="range" min={5} max={80} value={p.percent}
                  aria-label={L4(lang, { ko: "페이싱 비중", en: "Pacing weight" })}
                  onChange={e => {
                  setPacings(prev => prev.map((pp, ii) => ii === i ? { ...pp, percent: parseInt(e.target.value) } : pp));
                }} className="flex-1 h-1 accent-accent-purple" />
                <span className="text-[10px] font-bold text-accent-purple w-8 text-right">{p.percent}%</span>
                <input value={p.desc} onChange={e => setPacings(prev => prev.map((pp, ii) => ii === i ? { ...pp, desc: e.target.value } : pp))}
                  placeholder={L4(lang, { ko: "메모...", en: "Note..." })} maxLength={500} className="w-32 bg-bg-secondary border border-border rounded px-2 py-1 text-[10px] outline-none" />
              </div>
            ))}
          </div>
        )}

        {/* ====== TENSION CURVE (텐션 곡선) ====== */}
        {activeTab === "tension" && (
          <div className="space-y-4">
            <button onClick={() => setTensionPoints(prev => [...prev, { id: `tp-${Date.now()}`, position: prev.length * 20, level: 50, label: '' }])}
              className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple transition-colors">
              + {L4(lang, { ko: "텐션 포인트", en: "Tension Point" })}
            </button>
            {tensionPoints.length > 0 && (
              <div className="relative h-32 border border-border rounded-lg bg-bg-primary overflow-hidden">
                <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none" role="img" aria-label={L4(lang, { ko: "텐션 곡선 시각화", en: "Tension curve visualization" })}>
                  {tensionPoints.length >= 2 && (
                    <polyline fill="none" stroke="var(--color-accent-red)" strokeWidth="0.8"
                      points={sortedTensionPoints.map(t => `${t.position},${50 - t.level / 2}`).join(" ")} />
                  )}
                  {tensionPoints.map(t => (
                    <circle key={t.id} cx={t.position} cy={50 - t.level / 2} r="2" fill="var(--color-accent-red)" />
                  ))}
                </svg>
              </div>
            )}
            {tensionPoints.map((tp, i) => (
              <div key={tp.id} className="flex items-center gap-2 border border-border rounded px-3 py-2 bg-bg-primary">
                <input value={tp.label} onChange={e => setTensionPoints(prev => prev.map((t, ii) => ii === i ? { ...t, label: e.target.value } : t))}
                  placeholder={L4(lang, { ko: "라벨 (예: 첫 대치)", en: "Label" })} maxLength={100} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1 text-[10px] outline-none" />
                <span className="text-[9px] text-text-tertiary">{L4(lang, { ko: "위치", en: "Pos" })}</span>
                <input type="range" min={0} max={100} value={tp.position}
                  aria-label={L4(lang, { ko: "텐션 위치", en: "Tension position" })}
                  onChange={e => setTensionPoints(prev => prev.map((t, ii) => ii === i ? { ...t, position: parseInt(e.target.value) } : t))}
                  className="w-20 h-1 accent-accent-purple" />
                <span className="text-[9px] text-text-tertiary">{L4(lang, { ko: "강도", en: "Lv" })}</span>
                <input type="range" min={0} max={100} value={tp.level}
                  aria-label={L4(lang, { ko: "텐션 강도", en: "Tension level" })}
                  onChange={e => setTensionPoints(prev => prev.map((t, ii) => ii === i ? { ...t, level: parseInt(e.target.value) } : t))}
                  className="w-20 h-1 accent-accent-red" />
                <span className="text-[9px] font-bold text-accent-red w-6">{tp.level}</span>
                <button onClick={() => setTensionPoints(prev => prev.filter((_, ii) => ii !== i))} className="text-text-tertiary hover:text-accent-red text-xs">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* ====== CANON RULES (캐릭터 규칙) ====== */}
        {activeTab === "canon" && (
          <div className="space-y-4">
            <button onClick={() => setCanons(prev => [...prev, { id: `cn-${Date.now()}`, character: '', rule: '' }])}
              className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple transition-colors">
              + {L4(lang, { ko: "규칙 추가", en: "Add Canon Rule" })}
            </button>
            {canons.length === 0 && <p className="text-center py-8 text-text-tertiary text-xs italic">{L4(lang, { ko: "캐릭터 설정 모순을 방지하는 규칙을 정의하세요", en: "Define rules to prevent character inconsistencies" })}</p>}
            {canons.map((cn, i) => (
              <div key={cn.id} className="flex items-center gap-2 border border-border rounded px-3 py-2 bg-bg-primary">
                <input value={cn.character} onChange={e => setCanons(prev => prev.map((c, ii) => ii === i ? { ...c, character: e.target.value } : c))}
                  placeholder={L4(lang, { ko: "캐릭터명", en: "Character" })} maxLength={100} className="w-24 bg-bg-secondary border border-border rounded px-2 py-1.5 text-xs font-bold outline-none" />
                <input value={cn.rule} onChange={e => setCanons(prev => prev.map((c, ii) => ii === i ? { ...c, rule: e.target.value } : c))}
                  placeholder={L4(lang, { ko: '규칙 (예: "절대 웃지 않는다", "경어만 사용")', en: 'Rule (e.g. "never smiles")' })} maxLength={500} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[10px] outline-none" />
                <button onClick={() => setCanons(prev => prev.filter((_, ii) => ii !== i))} className="text-text-tertiary hover:text-accent-red text-xs">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* ====== SCENE TRANSITION (장면 전환) ====== */}
        {activeTab === "transition" && (
          <div className="space-y-4">
            <button onClick={() => setTransitions(prev => [...prev, { id: `tr-${Date.now()}`, fromScene: '', toScene: '', method: '' }])}
              className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple transition-colors">
              + {L4(lang, { ko: "전환 추가", en: "Add Transition" })}
            </button>
            {transitions.length === 0 && <p className="text-center py-8 text-text-tertiary text-xs italic">{L4(lang, { ko: "시점/장소/시간 전환 타이밍을 설계하세요", en: "Design POV/location/time transition timing" })}</p>}
            {transitions.map((tr, i) => (
              <div key={tr.id} className="flex items-center gap-2 border border-border rounded px-3 py-2 bg-bg-primary">
                <input value={tr.fromScene} onChange={e => setTransitions(prev => prev.map((t, ii) => ii === i ? { ...t, fromScene: e.target.value } : t))}
                  placeholder={L4(lang, { ko: "장면 A", en: "Scene A" })} maxLength={200} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[10px] outline-none" />
                <span className="text-text-tertiary text-xs">→</span>
                <input value={tr.toScene} onChange={e => setTransitions(prev => prev.map((t, ii) => ii === i ? { ...t, toScene: e.target.value } : t))}
                  placeholder={L4(lang, { ko: "장면 B", en: "Scene B" })} maxLength={200} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[10px] outline-none" />
                <input value={tr.method} onChange={e => setTransitions(prev => prev.map((t, ii) => ii === i ? { ...t, method: e.target.value } : t))}
                  placeholder={L4(lang, { ko: "전환 방법 (컷/페이드/시간경과)", en: "Method" })} maxLength={200} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[10px] outline-none" />
                <button onClick={() => setTransitions(prev => prev.filter((_, ii) => ii !== i))} className="text-text-tertiary hover:text-accent-red text-xs">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* ====== WRITER NOTES (작가 메모) ====== */}
        {activeTab === "notes" && (
          <div className="space-y-3">
            <p className="text-[10px] text-text-tertiary">{L4(lang, { ko: "이번 에피소드에 대한 자유 메모. 자동 생성 시 참고됩니다.", en: "Free notes for this episode. Will be referenced during AI generation." })}</p>
            <textarea
              value={writerNotes}
              onChange={e => setWriterNotes(e.target.value)}
              maxLength={10000}
              className="w-full min-h-[300px] bg-bg-primary border border-border rounded-xl p-4 text-sm leading-relaxed text-text-primary outline-none focus:border-accent-purple transition-colors resize-y"
              placeholder={tl('sceneSheet.writerNotesPlaceholder')}
            />
            <div className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)]">
              {writerNotes.length.toLocaleString()}{tl('sceneSheet.chars')}
            </div>
          </div>
        )}

        {activeTab === "plot" && (
          <PlotBarEditor lang={lang} onPlotChange={setPlotStructure} initialPlot={plotStructure} />
        )}

        {/* Simulator reference checkpoints */}
        <div className="border border-border rounded-xl p-4 bg-bg-primary space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider text-text-tertiary">
              🗺️ {tl('sceneSheet.worldSimRef')}
            </span>
            <span className="text-[10px] text-text-tertiary">
              {tl('sceneSheet.simRefDesc')}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {([
              { key: "worldConsistency" as const, ko: "세계관 일관성 검증", en: "World Consistency" },
              { key: "civRelations" as const, ko: "문명 관계도", en: "Civilization Relations" },
              { key: "timeline" as const, ko: "시대 타임라인", en: "Era Timeline" },
              { key: "territoryMap" as const, ko: "세력권 지도", en: "Territory Map" },
              { key: "languageSystem" as const, ko: "세계관 언어", en: "Language System" },
              { key: "genreLevel" as const, ko: "장르 레벨 규칙", en: "Genre Level Rules" },
            ]).map(item => (
              <label key={item.key} className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={simRef[item.key]}
                  onChange={e => {
                    const next = { ...simRef, [item.key]: e.target.checked };
                    setSimRef(next);
                    onSimRefUpdate?.(next);
                  }}
                  className="accent-accent-purple w-3.5 h-3.5" />
                <span className={`text-[10px] font-bold transition-colors ${simRef[item.key] ? "text-accent-purple" : "text-text-tertiary group-hover:text-text-secondary"}`}>
                  {L4(lang, item)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Validation receipt */}
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider text-text-tertiary">
              {L4(lang, { ko: "장르 문법 검사", en: "Genre Grammar Check" })}
            </span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
              passCount === 7 ? "bg-accent-green/10 text-accent-green" : passCount >= 4 ? "bg-accent-amber/10 text-accent-amber" : "bg-accent-red/10 text-accent-red"
            }`}>
              {passCount}/7
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[9px]">
            {([
              [validation.gogumaOk, L4(lang, { ko: "고구마/사이다", en: "Tension/Release" })],
              [validation.hookOpeningOk, L4(lang, { ko: "오프닝 훅", en: "Opening Hook" })],
              [validation.hookEndingOk, L4(lang, { ko: "엔딩 훅", en: "Ending Hook" })],
              [validation.emotionOk, L4(lang, { ko: "감정선", en: "Emotion Arc" })],
              [validation.dialogueOk, L4(lang, { ko: "대사 톤", en: "Dialogue Tone" })],
              [validation.dopamineOk, L4(lang, { ko: "도파민 루프", en: "Dopamine Loop" })],
              [validation.cliffOk, L4(lang, { ko: "클리프행어", en: "Cliffhanger" })],
            ] as [boolean, string][]).map(([ok, label]) => (
              <div key={label} className={`flex items-center gap-1.5 px-2 py-1 rounded ${ok ? "bg-accent-green/5 text-accent-green" : "bg-bg-primary text-text-tertiary"}`}>
                <span>{ok ? "✓" : "○"}</span>
                <span className="font-bold">{label}</span>
              </div>
            ))}
          </div>

          {/* 3-tier 서사 연동 경고 */}
          {tierWarnings.length > 0 && (
            <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-1">
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                ⚠ {L4(lang, { ko: "서사 연동 경고", en: "Narrative Link Warning" })}
              </span>
              {tierWarnings.map((w, i) => (
                <p key={i} className="text-[9px] text-amber-300/70">{w}</p>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* Direction Assembly — 설정 조립 요약 카드 + AI 프롬프트 미리보기 */}
        {/* ============================================================ */}
        <div className="border-t border-border pt-4 space-y-3">
          <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider text-text-tertiary">
            {L4(lang, { ko: "설정 조립", en: "Direction Assembly" })}
          </span>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {([
              { tab: "goguma" as SheetTab, emoji: "🍠", label: L4(lang, { ko: "고구마/사이다", en: "Tension/Release" }),
                count: gogumas.length,
                detail: gogumas.length > 0 ? gogumas.map(g => g.type === "goguma" ? (L4(lang, { ko: "고", en: "T" })) : (L4(lang, { ko: "사", en: "R" }))).join("") : null },
              { tab: "hook" as SheetTab, emoji: "🪝", label: L4(lang, { ko: "훅", en: "Hook" }),
                count: hooks.length,
                detail: hooks.length > 0 ? hooks.map(h => h.position[0].toUpperCase()).join("/") : null },
              { tab: "emotion" as SheetTab, emoji: "💓", label: L4(lang, { ko: "감정선", en: "Emotion" }),
                count: emotions.length,
                detail: emotions.length > 0 ? emotions.slice(0, 3).map(e => e.emotion).join("→") : null },
              { tab: "dialogue" as SheetTab, emoji: "💬", label: L4(lang, { ko: "대사 톤", en: "Dialogue" }),
                count: dialogueRules.length,
                detail: dialogueRules.length > 0 ? dialogueRules.map(d => d.character).join("/") : null },
              { tab: "dopamine" as SheetTab, emoji: "⚡", label: L4(lang, { ko: "도파민", en: "Dopamine" }),
                count: dopamines.length,
                detail: dopamines.length > 0 ? dopamines.map(d => d.scale === "micro" ? (L4(lang, { ko: "소", en: "μ" })) : d.scale === "medium" ? (L4(lang, { ko: "중", en: "M" })) : (L4(lang, { ko: "대", en: "L" }))).join("/") : null },
              { tab: "cliff" as SheetTab, emoji: "🔚", label: L4(lang, { ko: "클리프행어", en: "Cliff" }),
                count: cliffs.length,
                detail: cliffs.length > 0 ? cliffs[0].cliffType : null },
            ]).map(card => (
              <button key={card.tab} onClick={() => setActiveTab(card.tab)}
                className={`text-left p-2.5 rounded-lg border transition-all ${card.count > 0 ? "border-accent-purple/30 bg-accent-purple/5 hover:bg-accent-purple/10" : "border-border bg-bg-primary hover:bg-bg-secondary"}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs">{card.emoji}</span>
                  <span className="text-[9px] font-bold font-[family-name:var(--font-mono)] uppercase">{card.label}</span>
                  <span className={`ml-auto text-[9px] font-bold ${card.count > 0 ? "text-accent-purple" : "text-text-tertiary"}`}>{card.count}</span>
                </div>
                <div className="text-[10px] text-text-tertiary truncate">
                  {card.detail || (L4(lang, { ko: "미설정", en: "Not set" }))}
                </div>
              </button>
            ))}
          </div>

          {/* AI Prompt Preview toggle */}
          <div>
            <button onClick={() => setShowPromptPreview(p => !p)}
              className="text-[9px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider text-text-tertiary hover:text-accent-purple transition-colors">
              {showPromptPreview ? "▼" : "▶"} {L4(lang, { ko: "AI 지시문 미리보기", en: "AI Prompt Preview" })}
            </button>

            {showPromptPreview && (() => {
              const parts: string[] = [];
              if (gogumas.length > 0) {
                parts.push(L4(lang, { ko: "[고구마/사이다 리듬]", en: "[Tension/Release Rhythm]" }));
                gogumas.forEach(g => {
                  parts.push(`  - ${g.type === "goguma" ? (L4(lang, { ko: "고구마", en: "Tension" })) : (L4(lang, { ko: "사이다", en: "Release" }))} (${g.intensity}): ${g.desc}`);
                });
              }
              if (hooks.length > 0) {
                parts.push(L4(lang, { ko: "[훅 배치]", en: "[Hook Placement]" }));
                hooks.forEach(h => {
                  parts.push(`  - ${h.position}: ${h.hookType} — ${h.desc}`);
                });
              }
              if (emotions.length > 0) {
                parts.push(L4(lang, { ko: "[감정선 목표]", en: "[Emotion Targets]" }));
                emotions.forEach(e => {
                  parts.push(`  - ${e.emotion}: ${L4(lang, { ko: "강도", en: "intensity" })} ${e.intensity}%`);
                });
              }
              if (dialogueRules.length > 0) {
                parts.push(L4(lang, { ko: "[대사 톤 규칙]", en: "[Dialogue Tone Rules]" }));
                dialogueRules.forEach(d => {
                  parts.push(`  - ${d.character}: ${d.tone}${d.notes ? ` (${d.notes})` : ""}`);
                });
              }
              if (dopamines.length > 0) {
                parts.push(L4(lang, { ko: "[도파민 장치]", en: "[Dopamine Devices]" }));
                dopamines.forEach(dp => {
                  parts.push(`  - [${dp.scale}] ${dp.device}: ${dp.desc}`);
                });
              }
              if (cliffs.length > 0) {
                parts.push(L4(lang, { ko: "[클리프행어]", en: "[Cliffhanger]" }));
                cliffs.forEach(cl => {
                  parts.push(`  - ${cl.cliffType}: ${cl.desc}`);
                });
              }

              const preview = parts.length > 0
                ? "[SCENE DIRECTION]\n" + parts.join("\n")
                : (L4(lang, { ko: "(설정 없음 — 연출 데이터를 추가하세요)", en: "(No direction data — add entries above)" }));

              return (
                <div className="mt-2 relative">
                  <pre className="text-[9px] text-text-secondary bg-bg-primary border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-[family-name:var(--font-mono)] max-h-60 overflow-y-auto">
                    {preview}
                  </pre>
                  {parts.length > 0 && (
                    <button onClick={() => { navigator.clipboard.writeText(preview); }}
                      className="absolute top-2 right-2 text-[10px] font-bold text-text-tertiary hover:text-accent-purple bg-bg-secondary px-2 py-1 rounded border border-border transition-colors">
                      {L4(lang, { ko: "복사", en: "Copy" })}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Save current episode scene sheet button */}
        {onSaveEpisodeSheet && (
          <div className="mt-4 pt-3 border-t border-border">
            <button
              onClick={onSaveEpisodeSheet}
              className="w-full px-4 py-2.5 text-xs font-bold bg-accent-purple/15 hover:bg-accent-purple/25 border border-accent-purple/30 rounded-lg text-accent-purple font-[family-name:var(--font-mono)] transition-colors"
            >
              📋 {L4(lang, { ko: "현재 화 씬시트 저장", en: "Save Current Episode Scene Sheet" })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
