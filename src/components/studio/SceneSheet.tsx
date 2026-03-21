"use client";

import React, { useState, useCallback } from "react";

// ============================================================
// PART 0: TYPES & DATA
// ============================================================

type Lang = "ko" | "en";
type SheetTab = "goguma" | "hook" | "emotion" | "dialogue" | "dopamine" | "cliff" | "plot";

interface GogumaEntry { id: string; type: "goguma" | "cider"; intensity: "small" | "medium" | "large"; desc: string; episode: number; }
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
      { label: "Setup", color: "#3b82f6", width: 25, desc: "도입/설정" },
      { label: "Confrontation", color: "#f59e0b", width: 50, desc: "대립/갈등" },
      { label: "Resolution", color: "#10b981", width: 25, desc: "해결/결말" },
    ],
  },
  "hero-journey": {
    ko: "영웅의 여정", en: "Hero's Journey",
    segments: [
      { label: "Ordinary", color: "#6b7280", width: 10, desc: "일상 세계" },
      { label: "Call", color: "#3b82f6", width: 10, desc: "모험의 부름" },
      { label: "Threshold", color: "#8b5cf6", width: 10, desc: "문턱 넘기" },
      { label: "Trials", color: "#f59e0b", width: 25, desc: "시련/동맹/적" },
      { label: "Ordeal", color: "#ef4444", width: 15, desc: "시련/죽음" },
      { label: "Reward", color: "#10b981", width: 10, desc: "보상" },
      { label: "Return", color: "#06b6d4", width: 20, desc: "귀환/변화" },
    ],
  },
  "kishotenketsu": {
    ko: "기승전결", en: "Ki-Sho-Ten-Ketsu",
    segments: [
      { label: "起 (Ki)", color: "#3b82f6", width: 25, desc: "도입" },
      { label: "承 (Sho)", color: "#f59e0b", width: 25, desc: "전개" },
      { label: "転 (Ten)", color: "#ef4444", width: 25, desc: "전환/반전" },
      { label: "結 (Ketsu)", color: "#10b981", width: 25, desc: "결말" },
    ],
  },
  "fichtean": {
    ko: "피히테 곡선", en: "Fichtean Curve",
    segments: [
      { label: "Crisis 1", color: "#f59e0b", width: 15, desc: "첫 번째 위기" },
      { label: "Rise 1", color: "#ef4444", width: 15, desc: "상승" },
      { label: "Crisis 2", color: "#f59e0b", width: 15, desc: "두 번째 위기" },
      { label: "Rise 2", color: "#ef4444", width: 15, desc: "상승 가속" },
      { label: "Climax", color: "#dc2626", width: 20, desc: "절정" },
      { label: "Resolution", color: "#10b981", width: 20, desc: "하강/해결" },
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
  { id: "goguma", ko: "고구마/사이다", en: "Tension/Release", emoji: "🍠" },
  { id: "hook", ko: "훅 배치", en: "Hook Design", emoji: "🪝" },
  { id: "emotion", ko: "감정선", en: "Emotion Arc", emoji: "💓" },
  { id: "dialogue", ko: "대사 톤", en: "Dialogue Tone", emoji: "💬" },
  { id: "dopamine", ko: "도파민 루프", en: "Dopamine Loop", emoji: "⚡" },
  { id: "cliff", ko: "클리프행어", en: "Cliffhanger", emoji: "🔚" },
  { id: "plot", ko: "플롯 구조", en: "Plot Structure", emoji: "📊" },
];

// ============================================================
// PART 1: PLOT BAR EDITOR
// ============================================================

function PlotBarEditor({ lang }: { lang: Lang }) {
  const [selectedPreset, setSelectedPreset] = useState<PlotType>("three-act");
  const [segments, setSegments] = useState<PlotSegment[]>(
    PLOT_PRESETS["three-act"].segments.map((s, i) => ({ ...s, id: `seg-${i}` }))
  );
  const loadPreset = (preset: PlotType) => {
    setSelectedPreset(preset);
    setSegments(PLOT_PRESETS[preset].segments.map((s, i) => ({ ...s, id: `seg-${Date.now()}-${i}` })));
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
      label: lang === "ko" ? "새 구간" : "New Segment",
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
            {lang === "ko" ? PLOT_PRESETS[key].ko : PLOT_PRESETS[key].en}
          </button>
        ))}
        <button onClick={addSegment} className="px-3 py-1.5 rounded text-[10px] font-bold border border-dashed border-border text-text-tertiary hover:text-accent-purple hover:border-accent-purple transition-all">
          + {lang === "ko" ? "구간 추가" : "Add Segment"}
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
              {/* Drag handle */}
              {i < segments.length - 1 && (
                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-white/30 z-10"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const startX = e.clientX;
                    const barWidth = (e.target as HTMLElement).closest('.flex')?.getBoundingClientRect().width || 600;
                    const handleMove = (me: MouseEvent) => {
                      const delta = Math.round(((me.clientX - startX) / barWidth) * 100);
                      if (Math.abs(delta) >= 1) updateWidth(i, delta);
                    };
                    const handleUp = () => {
                      document.removeEventListener('mousemove', handleMove);
                      document.removeEventListener('mouseup', handleUp);
                    };
                    document.addEventListener('mousemove', handleMove);
                    document.addEventListener('mouseup', handleUp);
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
                className="bg-transparent font-bold text-xs outline-none flex-1" />
              <div className="flex items-center gap-1">
                <input type="color" value={seg.color} onChange={e => updateSegment(i, { color: e.target.value })} className="w-5 h-5 rounded cursor-pointer border-0" />
                {segments.length > 2 && (
                  <button onClick={() => removeSegment(i)} className="text-text-tertiary hover:text-accent-red text-[10px]">✕</button>
                )}
              </div>
            </div>
            <input value={seg.desc} onChange={e => updateSegment(i, { desc: e.target.value })}
              placeholder={lang === "ko" ? "설명..." : "Description..."}
              className="w-full bg-bg-secondary border border-border rounded px-2 py-1 text-[10px] outline-none" />
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-text-tertiary">{lang === "ko" ? "비중" : "Weight"}:</span>
              <input type="range" min={5} max={80} value={seg.width}
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

export default function SceneSheet({ lang = "ko" }: { lang?: Lang }) {
  const [activeTab, setActiveTab] = useState<SheetTab>("goguma");
  const [gogumas, setGogumas] = useState<GogumaEntry[]>([]);
  const [hooks, setHooks] = useState<HookEntry[]>([]);
  const [emotions, setEmotions] = useState<EmotionPoint[]>([]);
  const [dialogueRules, setDialogueRules] = useState<DialogueRule[]>([]);
  const [dopamines, setDopamines] = useState<DopamineEntry[]>([]);
  const [cliffs, setCliffs] = useState<CliffEntry[]>([]);

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="doc-header rounded-t mb-0">
        <span className="badge badge-amber mr-2">SCENE</span>
        {lang === "ko" ? "씬시트 — 장르 문법 설계" : "Scene Sheet — Genre Grammar Design"}
      </div>

      <div className="border border-t-0 border-border rounded-b bg-bg-secondary p-4 sm:p-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TAB_DEF.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-t text-[10px] font-bold font-[family-name:var(--font-mono)] tracking-wider transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-accent-purple/10 text-accent-purple border-b-2 border-accent-purple"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}>
              {tab.emoji} {lang === "ko" ? tab.ko : tab.en}
            </button>
          ))}
        </div>

        {/* ====== GOGUMA / CIDER TAB ====== */}
        {activeTab === "goguma" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["small", "medium", "large"] as const).map(intensity => (
                <React.Fragment key={intensity}>
                  <button onClick={() => addGoguma("goguma", intensity)}
                    className="px-3 py-1.5 bg-amber-600/10 border border-amber-600/30 rounded text-[10px] font-bold text-amber-500 hover:bg-amber-600/20 transition-colors">
                    🍠 {lang === "ko" ? ({small:"소(오해)",medium:"중(배신)",large:"대(절망)"})[intensity] : ({small:"Small",medium:"Medium",large:"Large"})[intensity]}
                  </button>
                </React.Fragment>
              ))}
              <button onClick={() => addGoguma("cider", "large")}
                className="px-3 py-1.5 bg-cyan-600/10 border border-cyan-600/30 rounded text-[10px] font-bold text-cyan-400 hover:bg-cyan-600/20 transition-colors">
                🥤 {lang === "ko" ? "사이다 추가" : "Add Cider"}
              </button>
            </div>
            {gogumas.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary text-xs italic">
                {lang === "ko" ? "고구마(답답함)와 사이다(해소)를 배치하세요. 2~3 고구마 후 1 사이다가 이상적." : "Place tension (goguma) and release (cider). 2-3 tensions then 1 release is ideal."}
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
                      placeholder={lang === "ko" ? "설명..." : "Description..."} className="flex-1 bg-transparent text-xs outline-none text-text-secondary" />
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
                  + {lang === "ko" ? ({opening:"오프닝 훅",middle:"미들 훅",ending:"엔딩 훅"})[pos] : ({opening:"Opening Hook",middle:"Middle Hook",ending:"Ending Hook"})[pos]}
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
                    {HOOK_TYPES.map(ht => <option key={ht.id} value={ht.id}>{lang === "ko" ? ht.ko : ht.en}</option>)}
                  </select>
                  <button onClick={() => setHooks(prev => prev.filter((_, ii) => ii !== i))} className="ml-auto text-text-tertiary hover:text-accent-red text-xs">✕</button>
                </div>
                <input value={h.desc} onChange={e => setHooks(prev => prev.map((hh, ii) => ii === i ? { ...hh, desc: e.target.value } : hh))}
                  placeholder={lang === "ko" ? "훅 내용 (예: \"문이 열렸다. 죽었어야 할 사람이 서 있었다.\")" : "Hook content..."}
                  className="w-full bg-bg-secondary border border-border rounded px-2 py-1.5 text-[11px] outline-none" />
              </div>
            ))}
          </div>
        )}

        {/* ====== EMOTION TAB ====== */}
        {activeTab === "emotion" && (
          <div className="space-y-4">
            <button onClick={addEmotion} className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple transition-colors">
              + {lang === "ko" ? "감정 포인트 추가" : "Add Emotion Point"}
            </button>
            {/* Emotion curve visualization */}
            {emotions.length > 0 && (
              <div className="relative h-24 border border-border rounded-lg bg-bg-primary overflow-hidden">
                <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
                  {emotions.length >= 2 && (
                    <polyline fill="none" stroke="var(--color-accent-purple)" strokeWidth="0.5"
                      points={emotions.sort((a, b) => a.position - b.position).map(e => `${e.position},${50 - e.intensity / 2}`).join(" ")} />
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
                <span className="text-[9px] text-text-tertiary">{lang === "ko" ? "위치" : "Pos"}:</span>
                <input type="range" min={0} max={100} value={em.position}
                  onChange={e => setEmotions(prev => prev.map((ee, ii) => ii === i ? { ...ee, position: parseInt(e.target.value) } : ee))}
                  className="flex-1 h-1 accent-accent-purple" />
                <span className="text-[9px] text-text-tertiary">{lang === "ko" ? "강도" : "Int"}:</span>
                <input type="range" min={0} max={100} value={em.intensity}
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
              + {lang === "ko" ? "캐릭터 대사 규칙 추가" : "Add Dialogue Rule"}
            </button>
            {dialogueRules.map((dr, i) => (
              <div key={dr.id} className="border border-border rounded-lg p-3 bg-bg-primary space-y-2">
                <div className="flex gap-2">
                  <input value={dr.character} onChange={e => setDialogueRules(prev => prev.map((d, ii) => ii === i ? { ...d, character: e.target.value } : d))}
                    placeholder={lang === "ko" ? "캐릭터명" : "Character"} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-xs outline-none font-bold" />
                  <input value={dr.tone} onChange={e => setDialogueRules(prev => prev.map((d, ii) => ii === i ? { ...d, tone: e.target.value } : d))}
                    placeholder={lang === "ko" ? "톤 (예: 냉소적, 다정함)" : "Tone (e.g. sarcastic, warm)"} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-xs outline-none" />
                  <button onClick={() => setDialogueRules(prev => prev.filter((_, ii) => ii !== i))} className="text-text-tertiary hover:text-accent-red">✕</button>
                </div>
                <input value={dr.notes} onChange={e => setDialogueRules(prev => prev.map((d, ii) => ii === i ? { ...d, notes: e.target.value } : d))}
                  placeholder={lang === "ko" ? "특이사항 (예: 긴장 시 짧게, 경어 사용)" : "Notes (e.g. short in tension, uses formal speech)"}
                  className="w-full bg-bg-secondary border border-border rounded px-2 py-1.5 text-[10px] outline-none" />
              </div>
            ))}
          </div>
        )}

        {/* ====== DOPAMINE TAB ====== */}
        {activeTab === "dopamine" && (
          <div className="space-y-4">
            <button onClick={addDopamine} className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple transition-colors">
              + {lang === "ko" ? "도파민 장치 추가" : "Add Dopamine Device"}
            </button>
            {dopamines.map((dp, i) => (
              <div key={dp.id} className="flex items-center gap-2 border border-border rounded px-3 py-2 bg-bg-primary">
                <select value={dp.scale} onChange={e => setDopamines(prev => prev.map((d, ii) => ii === i ? { ...d, scale: e.target.value as "micro"|"medium"|"macro" } : d))}
                  className="bg-bg-secondary border border-border rounded px-2 py-1 text-[9px] font-bold outline-none uppercase">
                  <option value="micro">{lang === "ko" ? "마이크로" : "Micro"}</option>
                  <option value="medium">{lang === "ko" ? "미디엄" : "Medium"}</option>
                  <option value="macro">{lang === "ko" ? "매크로" : "Macro"}</option>
                </select>
                <select value={dp.device} onChange={e => setDopamines(prev => prev.map((d, ii) => ii === i ? { ...d, device: e.target.value } : d))}
                  className="bg-bg-secondary border border-border rounded px-2 py-1 text-[10px] outline-none">
                  {DOPAMINE_DEVICES.map(dd => <option key={dd.id} value={dd.id}>{lang === "ko" ? dd.ko : dd.en}</option>)}
                </select>
                <input value={dp.desc} onChange={e => setDopamines(prev => prev.map((d, ii) => ii === i ? { ...d, desc: e.target.value } : d))}
                  placeholder={lang === "ko" ? "설명..." : "Description..."} className="flex-1 bg-transparent text-[10px] outline-none text-text-secondary" />
                <label className="flex items-center gap-1 text-[9px] text-text-tertiary cursor-pointer">
                  <input type="checkbox" checked={dp.resolved} onChange={e => setDopamines(prev => prev.map((d, ii) => ii === i ? { ...d, resolved: e.target.checked } : d))} className="accent-accent-green" />
                  {lang === "ko" ? "회수" : "Resolved"}
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
              + {lang === "ko" ? "클리프행어 추가" : "Add Cliffhanger"}
            </button>
            {cliffs.map((cl, i) => (
              <div key={cl.id} className="flex items-center gap-2 border border-border rounded px-3 py-2 bg-bg-primary">
                <select value={cl.cliffType} onChange={e => setCliffs(prev => prev.map((c, ii) => ii === i ? { ...c, cliffType: e.target.value } : c))}
                  className="bg-bg-secondary border border-border rounded px-2 py-1 text-[10px] outline-none">
                  {CLIFF_TYPES.map(ct => <option key={ct.id} value={ct.id}>{lang === "ko" ? ct.ko : ct.en}</option>)}
                </select>
                <input value={cl.desc} onChange={e => setCliffs(prev => prev.map((c, ii) => ii === i ? { ...c, desc: e.target.value } : c))}
                  placeholder={lang === "ko" ? "내용 (예: \"칼끝이 목에 닿았다. 그 순간—\")" : "Content..."}
                  className="flex-1 bg-transparent text-[10px] outline-none text-text-secondary" />
                <input type="number" min={1} value={cl.episode} onChange={e => setCliffs(prev => prev.map((c, ii) => ii === i ? { ...c, episode: parseInt(e.target.value) || 1 } : c))}
                  className="w-12 bg-bg-secondary border border-border rounded px-1 py-0.5 text-[9px] text-center outline-none" title="EP" />
                <button onClick={() => setCliffs(prev => prev.filter((_, ii) => ii !== i))} className="text-text-tertiary hover:text-accent-red text-xs">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* ====== PLOT TAB ====== */}
        {activeTab === "plot" && (
          <PlotBarEditor lang={lang} />
        )}

        {/* Simulator reference checkpoints */}
        <div className="border border-border rounded-xl p-4 bg-bg-primary space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider text-text-tertiary">
              🗺️ {lang === "ko" ? "세계관 시뮬레이터 참고" : "World Simulator Reference"}
            </span>
            <span className="text-[8px] text-text-tertiary">
              {lang === "ko" ? "체크한 항목이 연출에 반영됩니다" : "Checked items will be referenced in direction"}
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
                  onChange={e => setSimRef(prev => ({ ...prev, [item.key]: e.target.checked }))}
                  className="accent-accent-purple w-3.5 h-3.5" />
                <span className={`text-[10px] font-bold transition-colors ${simRef[item.key] ? "text-accent-purple" : "text-text-tertiary group-hover:text-text-secondary"}`}>
                  {lang === "ko" ? item.ko : item.en}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Validation receipt */}
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider text-text-tertiary">
              {lang === "ko" ? "장르 문법 검사" : "Genre Grammar Check"}
            </span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
              passCount === 7 ? "bg-accent-green/10 text-accent-green" : passCount >= 4 ? "bg-accent-amber/10 text-accent-amber" : "bg-accent-red/10 text-accent-red"
            }`}>
              {passCount}/7
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[9px]">
            {([
              [validation.gogumaOk, lang === "ko" ? "고구마/사이다" : "Tension/Release"],
              [validation.hookOpeningOk, lang === "ko" ? "오프닝 훅" : "Opening Hook"],
              [validation.hookEndingOk, lang === "ko" ? "엔딩 훅" : "Ending Hook"],
              [validation.emotionOk, lang === "ko" ? "감정선" : "Emotion Arc"],
              [validation.dialogueOk, lang === "ko" ? "대사 톤" : "Dialogue Tone"],
              [validation.dopamineOk, lang === "ko" ? "도파민 루프" : "Dopamine Loop"],
              [validation.cliffOk, lang === "ko" ? "클리프행어" : "Cliffhanger"],
            ] as [boolean, string][]).map(([ok, label]) => (
              <div key={label} className={`flex items-center gap-1.5 px-2 py-1 rounded ${ok ? "bg-accent-green/5 text-accent-green" : "bg-bg-primary text-text-tertiary"}`}>
                <span>{ok ? "✓" : "○"}</span>
                <span className="font-bold">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
