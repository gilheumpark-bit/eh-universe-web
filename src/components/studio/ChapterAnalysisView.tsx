"use client";

import React, { useState, useCallback } from "react";
import { Sparkles, Copy, Check, ChevronDown, ChevronUp, Download, User, MapPin, Clapperboard, Volume2, Image, Music } from "lucide-react";
import type {
  AppLanguage,
  ChapterAnalysis,
  CharacterStateEntry,
  BackgroundState,
  SceneAnalysisState,
  SoundState,
  ImagePromptPack,
  MusicPromptPack,
  EmotionIntensity,
} from "@/lib/studio-types";
import { createT } from "@/lib/i18n";

// ============================================================
// PART 1 — HELPERS & DEFAULTS
// ============================================================

interface ChapterAnalysisViewProps {
  language: AppLanguage;
  episode: number;
  manuscriptContent: string;
  analysis: ChapterAnalysis | null;
  onSaveAnalysis: (analysis: ChapterAnalysis) => void;
  onClose: () => void;
}

const EMPTY_CHARACTER: CharacterStateEntry = {
  name: "",
  presence: "direct",
  sceneRole: "",
  emotion: { primary: "", intensity: "mid" },
  expression: "",
  gaze: { direction: "", target: "" },
  pose: "",
  actionState: "",
  bodyState: [],
  outfitDelta: [],
  heldItem: [],
  relationContext: "",
  aura: [],
};

const EMPTY_BACKGROUND: BackgroundState = {
  location: "",
  spaceType: "",
  time: "",
  weather: "",
  lighting: "",
  mood: [],
  keyObjects: [],
  environmentCondition: [],
};

const EMPTY_SCENE: SceneAnalysisState = {
  summary: "",
  phase: "",
  tension: "mid",
  conflictType: [],
  characterGoal: "",
  obstacle: "",
  turningPoint: "",
  symbolicTags: [],
};

const EMPTY_SOUND: SoundState = {
  ambient: [],
  effects: [],
  voiceTone: [],
  audioMood: [],
  bgmTags: [],
};

const EMPTY_IMAGE_PROMPT: ImagePromptPack = {
  characterFocus: "",
  backgroundFocus: "",
  sceneFocus: "",
  styleHints: [],
};

const EMPTY_MUSIC_PROMPT: MusicPromptPack = {
  mood: "",
  emotionFlow: "",
  soundKeywords: [],
  musicStyle: [],
};

const INTENSITY_OPTIONS: { value: EmotionIntensity; tKey: string }[] = [
  { value: "low", tKey: "chapterAnalysis.intensityLow" },
  { value: "mid", tKey: "chapterAnalysis.intensityMid" },
  { value: "high", tKey: "chapterAnalysis.intensityHigh" },
  { value: "extreme", tKey: "chapterAnalysis.intensityExtreme" },
];

function arrayToString(arr: string[]): string {
  return arr.join(", ");
}

function stringToArray(str: string): string[] {
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

// ============================================================
// PART 2 — SUB-COMPONENTS
// ============================================================

function SectionHeader({ icon, title, open, onToggle }: { icon: React.ReactNode; title: string; open: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between py-2.5 px-1 group">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest font-[family-name:var(--font-mono)] text-text-secondary group-hover:text-text-primary transition-colors">
        {icon} {title}
      </div>
      {open ? <ChevronUp className="w-3.5 h-3.5 text-text-tertiary" /> : <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />}
    </button>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
      <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)] shrink-0 w-24 pt-1.5">{label}</label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-accent-purple transition-colors"
    />
  );
}

function ArrayInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <input
      value={arrayToString(value)}
      onChange={(e) => onChange(stringToArray(e.target.value))}
      placeholder={placeholder}
      className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-accent-purple transition-colors"
    />
  );
}

function IntensitySelect({ value, onChange, language }: { value: EmotionIntensity; onChange: (v: EmotionIntensity) => void; language: AppLanguage }) {
  const t = createT(language);
  return (
    <div className="flex gap-1">
      {INTENSITY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2 py-1 rounded text-[9px] font-bold font-[family-name:var(--font-mono)] border transition-colors ${
            value === opt.value
              ? "bg-accent-purple/20 border-accent-purple/40 text-accent-purple"
              : "bg-bg-secondary border-border text-text-tertiary hover:text-text-primary"
          }`}
        >
          {t(opt.tKey)}
        </button>
      ))}
    </div>
  );
}

function CopyButton({ text, language }: { text: string; language: AppLanguage }) {
  const t = createT(language);
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return (
    <button onClick={handleCopy} aria-label="복사" className="p-1.5 rounded bg-bg-tertiary/50 text-text-tertiary hover:text-accent-green transition-colors" title={t('chapterAnalysis.copy')}>
      {copied ? <Check className="w-3 h-3 text-accent-green" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ============================================================
// PART 3 — MAIN COMPONENT
// ============================================================

export default function ChapterAnalysisView({
  language,
  episode,
  manuscriptContent,
  analysis,
  onSaveAnalysis,
  onClose,
}: ChapterAnalysisViewProps) {
  const t = createT(language);

  const [characters, setCharacters] = useState<CharacterStateEntry[]>(analysis?.characterState ?? []);
  const [background, setBackground] = useState<BackgroundState>(analysis?.backgroundState ?? { ...EMPTY_BACKGROUND });
  const [scene, setScene] = useState<SceneAnalysisState>(analysis?.sceneState ?? { ...EMPTY_SCENE });
  const [sound, setSound] = useState<SoundState>(analysis?.soundState ?? { ...EMPTY_SOUND });
  const [imagePrompt, setImagePrompt] = useState<ImagePromptPack>(analysis?.imagePromptPack ?? { ...EMPTY_IMAGE_PROMPT });
  const [musicPrompt, setMusicPrompt] = useState<MusicPromptPack>(analysis?.musicPromptPack ?? { ...EMPTY_MUSIC_PROMPT });

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    character: true, background: true, scene: true, sound: true, image: true, music: true,
  });
  const [analyzing, setAnalyzing] = useState(false);

  const toggleSection = (key: string) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Update a single character
  const updateCharacter = useCallback((index: number, patch: Partial<CharacterStateEntry>) => {
    setCharacters((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }, []);

  const addCharacter = useCallback(() => {
    setCharacters((prev) => [...prev, { ...EMPTY_CHARACTER }]);
  }, []);

  const removeCharacter = useCallback((index: number) => {
    setCharacters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // AI auto-analysis
  const runAutoAnalysis = useCallback(async () => {
    if (!manuscriptContent.trim() || analyzing) return;
    setAnalyzing(true);

    try {
      const res = await fetch("/api/analyze-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: manuscriptContent, language }),
      });

      if (!res.ok) throw new Error("Analysis failed");

      const data = await res.json();

      if (data.characterState) setCharacters(data.characterState);
      if (data.backgroundState) setBackground(data.backgroundState);
      if (data.sceneState) setScene(data.sceneState);
      if (data.soundState) setSound(data.soundState);
      if (data.imagePromptPack) setImagePrompt(data.imagePromptPack);
      if (data.musicPromptPack) setMusicPrompt(data.musicPromptPack);
    } catch {
      // [확인 필요] API 엔드포인트 미구현 시 수동 입력으로 폴백
      console.warn("Auto-analysis API not available. Use manual input.");
    } finally {
      setAnalyzing(false);
    }
  }, [manuscriptContent, language, analyzing]);

  // Save
  const handleSave = useCallback(() => {
    const result: ChapterAnalysis = {
      id: analysis?.id ?? `analysis-${Date.now()}`,
      episode,
      timestamp: Date.now(),
      characterState: characters,
      backgroundState: background,
      sceneState: scene,
      soundState: sound,
      imagePromptPack: imagePrompt,
      musicPromptPack: musicPrompt,
    };
    onSaveAnalysis(result);
  }, [analysis, episode, characters, background, scene, sound, imagePrompt, musicPrompt, onSaveAnalysis]);

  // Export all prompts as text
  const exportPrompts = useCallback(() => {
    const lines = [
      `=== EP.${episode} ${t('chapterAnalysis.chapterAnalysisPrompts')} ===`,
      "",
      `--- ${t('chapterAnalysis.imagePrompt')} ---`,
      `[${t('chapterAnalysis.character')}] ${imagePrompt.characterFocus}`,
      `[${t('chapterAnalysis.background')}] ${imagePrompt.backgroundFocus}`,
      `[${t('chapterAnalysis.scene')}] ${imagePrompt.sceneFocus}`,
      `[${t('chapterAnalysis.style')}] ${imagePrompt.styleHints.join(", ")}`,
      "",
      `--- ${t('chapterAnalysis.musicPrompt')} ---`,
      `[${t('chapterAnalysis.mood')}] ${musicPrompt.mood}`,
      `[${t('chapterAnalysis.emotionFlow')}] ${musicPrompt.emotionFlow}`,
      `[${t('chapterAnalysis.sound')}] ${musicPrompt.soundKeywords.join(", ")}`,
      `[${t('chapterAnalysis.musicStyle')}] ${musicPrompt.musicStyle.join(", ")}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ep${episode}-prompts.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [episode, imagePrompt, musicPrompt, t]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-amber" />
          <h3 className="text-sm font-black tracking-tighter uppercase font-[family-name:var(--font-mono)]">
            EP.{episode} {t('chapterAnalysis.title')}
          </h3>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={runAutoAnalysis}
            disabled={analyzing || !manuscriptContent.trim()}
            className="px-3 py-1.5 bg-accent-amber/20 border border-accent-amber/30 text-accent-amber rounded-lg text-[9px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider hover:opacity-80 transition-opacity disabled:opacity-30"
          >
            <Sparkles className="w-3 h-3 inline mr-1" />
            {analyzing ? t('chapterAnalysis.analyzing') : t('chapterAnalysis.aiAutoAnalyze')}
          </button>
          <button
            onClick={exportPrompts}
            className="px-3 py-1.5 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-tertiary hover:text-text-primary font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors"
          >
            <Download className="w-3 h-3 inline mr-1" />
            {t('chapterAnalysis.exportPrompts')}
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-accent-purple text-white rounded-lg text-[9px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider hover:opacity-80 transition-opacity"
          >
            {t('chapterAnalysis.save')}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-tertiary hover:text-text-primary font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors"
          >
            {t('chapterAnalysis.close')}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 1 — Character State */}
      {/* ============================================================ */}
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <SectionHeader
          icon={<User className="w-3.5 h-3.5" />}
          title={t('chapterAnalysis.characterState')}
          open={openSections.character}
          onToggle={() => toggleSection("character")}
        />
        {openSections.character && (
          <div className="p-4 pt-0 space-y-4">
            {characters.map((char, idx) => (
              <div key={idx} className="bg-bg-primary border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-accent-purple font-[family-name:var(--font-mono)]">
                    {`${t('chapterAnalysis.characterN')} ${idx + 1}`}
                  </span>
                  <button onClick={() => removeCharacter(idx)} className="text-[9px] text-text-tertiary hover:text-accent-red transition-colors">
                    {t('chapterAnalysis.remove')}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FieldRow label={t('chapterAnalysis.name')}>
                    <TextInput value={char.name} onChange={(v) => updateCharacter(idx, { name: v })} />
                  </FieldRow>
                  <FieldRow label={t('chapterAnalysis.role')}>
                    <TextInput value={char.sceneRole} onChange={(v) => updateCharacter(idx, { sceneRole: v })} />
                  </FieldRow>
                  <FieldRow label={t('chapterAnalysis.emotion')}>
                    <TextInput value={char.emotion.primary} onChange={(v) => updateCharacter(idx, { emotion: { ...char.emotion, primary: v } })} />
                  </FieldRow>
                  <FieldRow label={t('chapterAnalysis.intensity')}>
                    <IntensitySelect value={char.emotion.intensity} onChange={(v) => updateCharacter(idx, { emotion: { ...char.emotion, intensity: v } })} language={language} />
                  </FieldRow>
                  <FieldRow label={t('chapterAnalysis.expression')}>
                    <TextInput value={char.expression} onChange={(v) => updateCharacter(idx, { expression: v })} />
                  </FieldRow>
                  <FieldRow label={t('chapterAnalysis.gaze')}>
                    <TextInput value={char.gaze.direction} onChange={(v) => updateCharacter(idx, { gaze: { ...char.gaze, direction: v } })} placeholder={t('chapterAnalysis.gazeDirection')} />
                  </FieldRow>
                  <FieldRow label={t('chapterAnalysis.gazeTarget')}>
                    <TextInput value={char.gaze.target} onChange={(v) => updateCharacter(idx, { gaze: { ...char.gaze, target: v } })} />
                  </FieldRow>
                  <FieldRow label={t('chapterAnalysis.pose')}>
                    <TextInput value={char.pose} onChange={(v) => updateCharacter(idx, { pose: v })} />
                  </FieldRow>
                  <FieldRow label={t('chapterAnalysis.action')}>
                    <TextInput value={char.actionState} onChange={(v) => updateCharacter(idx, { actionState: v })} />
                  </FieldRow>
                  <FieldRow label={t('chapterAnalysis.relation')}>
                    <TextInput value={char.relationContext} onChange={(v) => updateCharacter(idx, { relationContext: v })} />
                  </FieldRow>
                </div>
                <div className="space-y-2">
                  <FieldRow label={t('chapterAnalysis.body')}>
                    <ArrayInput value={char.bodyState} onChange={(v) => updateCharacter(idx, { bodyState: v })} placeholder={t('chapterAnalysis.commaSeparated')} />
                  </FieldRow>
                  <FieldRow label={t('chapterAnalysis.outfit')}>
                    <ArrayInput value={char.outfitDelta} onChange={(v) => updateCharacter(idx, { outfitDelta: v })} placeholder={t('chapterAnalysis.commaSeparated')} />
                  </FieldRow>
                  <FieldRow label={t('chapterAnalysis.items')}>
                    <ArrayInput value={char.heldItem} onChange={(v) => updateCharacter(idx, { heldItem: v })} placeholder={t('chapterAnalysis.commaSeparated')} />
                  </FieldRow>
                  <FieldRow label={t('chapterAnalysis.aura')}>
                    <ArrayInput value={char.aura} onChange={(v) => updateCharacter(idx, { aura: v })} placeholder={t('chapterAnalysis.commaSeparated')} />
                  </FieldRow>
                </div>
              </div>
            ))}
            <button
              onClick={addCharacter}
              className="w-full py-2 border border-dashed border-border rounded-lg text-[10px] font-bold text-text-tertiary hover:text-accent-purple hover:border-accent-purple/40 transition-colors font-[family-name:var(--font-mono)]"
            >
              + {t('chapterAnalysis.addCharacter')}
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SECTION 2 — Background State */}
      {/* ============================================================ */}
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <SectionHeader
          icon={<MapPin className="w-3.5 h-3.5" />}
          title={t('chapterAnalysis.backgroundState')}
          open={openSections.background}
          onToggle={() => toggleSection("background")}
        />
        {openSections.background && (
          <div className="p-4 pt-0 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FieldRow label={isKO ? "장소" : "Location"}>
                <TextInput value={background.location} onChange={(v) => setBackground((p) => ({ ...p, location: v }))} />
              </FieldRow>
              <FieldRow label={isKO ? "공간 유형" : "Space"}>
                <TextInput value={background.spaceType} onChange={(v) => setBackground((p) => ({ ...p, spaceType: v }))} />
              </FieldRow>
              <FieldRow label={isKO ? "시간대" : "Time"}>
                <TextInput value={background.time} onChange={(v) => setBackground((p) => ({ ...p, time: v }))} />
              </FieldRow>
              <FieldRow label={isKO ? "날씨" : "Weather"}>
                <TextInput value={background.weather} onChange={(v) => setBackground((p) => ({ ...p, weather: v }))} />
              </FieldRow>
              <FieldRow label={isKO ? "조명" : "Lighting"}>
                <TextInput value={background.lighting} onChange={(v) => setBackground((p) => ({ ...p, lighting: v }))} />
              </FieldRow>
            </div>
            <FieldRow label={isKO ? "분위기" : "Mood"}>
              <ArrayInput value={background.mood} onChange={(v) => setBackground((p) => ({ ...p, mood: v }))} placeholder={isKO ? "쉼표로 구분" : "Comma-separated"} />
            </FieldRow>
            <FieldRow label={isKO ? "핵심 오브젝트" : "Key Objects"}>
              <ArrayInput value={background.keyObjects} onChange={(v) => setBackground((p) => ({ ...p, keyObjects: v }))} placeholder={isKO ? "쉼표로 구분" : "Comma-separated"} />
            </FieldRow>
            <FieldRow label={isKO ? "환경 상태" : "Condition"}>
              <ArrayInput value={background.environmentCondition} onChange={(v) => setBackground((p) => ({ ...p, environmentCondition: v }))} placeholder={isKO ? "쉼표로 구분" : "Comma-separated"} />
            </FieldRow>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SECTION 3 — Scene State */}
      {/* ============================================================ */}
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <SectionHeader
          icon={<Clapperboard className="w-3.5 h-3.5" />}
          title={isKO ? "장면 상황" : "Scene State"}
          open={openSections.scene}
          onToggle={() => toggleSection("scene")}
        />
        {openSections.scene && (
          <div className="p-4 pt-0 space-y-2">
            <FieldRow label={isKO ? "요약" : "Summary"}>
              <TextInput value={scene.summary} onChange={(v) => setScene((p) => ({ ...p, summary: v }))} />
            </FieldRow>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FieldRow label={isKO ? "사건 단계" : "Phase"}>
                <TextInput value={scene.phase} onChange={(v) => setScene((p) => ({ ...p, phase: v }))} />
              </FieldRow>
              <FieldRow label={isKO ? "긴장도" : "Tension"}>
                <IntensitySelect value={scene.tension} onChange={(v) => setScene((p) => ({ ...p, tension: v }))} isKO={isKO} />
              </FieldRow>
              <FieldRow label={isKO ? "목표" : "Goal"}>
                <TextInput value={scene.characterGoal} onChange={(v) => setScene((p) => ({ ...p, characterGoal: v }))} />
              </FieldRow>
              <FieldRow label={isKO ? "방해 요소" : "Obstacle"}>
                <TextInput value={scene.obstacle} onChange={(v) => setScene((p) => ({ ...p, obstacle: v }))} />
              </FieldRow>
            </div>
            <FieldRow label={isKO ? "갈등 종류" : "Conflict"}>
              <ArrayInput value={scene.conflictType} onChange={(v) => setScene((p) => ({ ...p, conflictType: v }))} />
            </FieldRow>
            <FieldRow label={isKO ? "전환 포인트" : "Turning"}>
              <TextInput value={scene.turningPoint} onChange={(v) => setScene((p) => ({ ...p, turningPoint: v }))} />
            </FieldRow>
            <FieldRow label={isKO ? "상징 태그" : "Symbols"}>
              <ArrayInput value={scene.symbolicTags} onChange={(v) => setScene((p) => ({ ...p, symbolicTags: v }))} />
            </FieldRow>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SECTION 4 — Sound State */}
      {/* ============================================================ */}
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <SectionHeader
          icon={<Volume2 className="w-3.5 h-3.5" />}
          title={isKO ? "소리 / 분위기" : "Sound / Ambience"}
          open={openSections.sound}
          onToggle={() => toggleSection("sound")}
        />
        {openSections.sound && (
          <div className="p-4 pt-0 space-y-2">
            <FieldRow label={isKO ? "환경음" : "Ambient"}>
              <ArrayInput value={sound.ambient} onChange={(v) => setSound((p) => ({ ...p, ambient: v }))} />
            </FieldRow>
            <FieldRow label={isKO ? "효과음" : "Effects"}>
              <ArrayInput value={sound.effects} onChange={(v) => setSound((p) => ({ ...p, effects: v }))} />
            </FieldRow>
            <FieldRow label={isKO ? "음성 톤" : "Voice"}>
              <ArrayInput value={sound.voiceTone} onChange={(v) => setSound((p) => ({ ...p, voiceTone: v }))} />
            </FieldRow>
            <FieldRow label={isKO ? "음향 인상" : "Audio Mood"}>
              <ArrayInput value={sound.audioMood} onChange={(v) => setSound((p) => ({ ...p, audioMood: v }))} />
            </FieldRow>
            <FieldRow label={isKO ? "BGM 태그" : "BGM Tags"}>
              <ArrayInput value={sound.bgmTags} onChange={(v) => setSound((p) => ({ ...p, bgmTags: v }))} />
            </FieldRow>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SECTION 5 — Image Prompt Pack */}
      {/* ============================================================ */}
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <SectionHeader
          icon={<Image className="w-3.5 h-3.5" />}
          title={isKO ? "이미지 프롬프트" : "Image Prompt"}
          open={openSections.image}
          onToggle={() => toggleSection("image")}
        />
        {openSections.image && (
          <div className="p-4 pt-0 space-y-2">
            <FieldRow label={isKO ? "캐릭터" : "Character"}>
              <div className="flex gap-1">
                <textarea
                  value={imagePrompt.characterFocus}
                  onChange={(e) => setImagePrompt((p) => ({ ...p, characterFocus: e.target.value }))}
                  rows={2}
                  className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-accent-purple transition-colors resize-y"
                />
                <CopyButton text={imagePrompt.characterFocus} isKO={isKO} />
              </div>
            </FieldRow>
            <FieldRow label={isKO ? "배경" : "Background"}>
              <div className="flex gap-1">
                <textarea
                  value={imagePrompt.backgroundFocus}
                  onChange={(e) => setImagePrompt((p) => ({ ...p, backgroundFocus: e.target.value }))}
                  rows={2}
                  className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-accent-purple transition-colors resize-y"
                />
                <CopyButton text={imagePrompt.backgroundFocus} isKO={isKO} />
              </div>
            </FieldRow>
            <FieldRow label={isKO ? "장면" : "Scene"}>
              <div className="flex gap-1">
                <textarea
                  value={imagePrompt.sceneFocus}
                  onChange={(e) => setImagePrompt((p) => ({ ...p, sceneFocus: e.target.value }))}
                  rows={2}
                  className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-accent-purple transition-colors resize-y"
                />
                <CopyButton text={imagePrompt.sceneFocus} isKO={isKO} />
              </div>
            </FieldRow>
            <FieldRow label={isKO ? "스타일" : "Style"}>
              <ArrayInput value={imagePrompt.styleHints} onChange={(v) => setImagePrompt((p) => ({ ...p, styleHints: v }))} />
            </FieldRow>
            {/* Combined prompt for quick copy */}
            {(imagePrompt.characterFocus || imagePrompt.backgroundFocus || imagePrompt.sceneFocus) && (
              <div className="mt-2 p-3 bg-bg-primary border border-accent-purple/20 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold text-accent-purple font-[family-name:var(--font-mono)] uppercase">{isKO ? "통합 프롬프트" : "Combined Prompt"}</span>
                  <CopyButton text={[imagePrompt.characterFocus, imagePrompt.backgroundFocus, imagePrompt.sceneFocus, imagePrompt.styleHints.join(", ")].filter(Boolean).join(". ")} isKO={isKO} />
                </div>
                <p className="text-[10px] text-text-secondary leading-relaxed">
                  {[imagePrompt.characterFocus, imagePrompt.backgroundFocus, imagePrompt.sceneFocus, imagePrompt.styleHints.join(", ")].filter(Boolean).join(". ")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SECTION 6 — Music Prompt Pack */}
      {/* ============================================================ */}
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <SectionHeader
          icon={<Music className="w-3.5 h-3.5" />}
          title={isKO ? "음악 프롬프트" : "Music Prompt"}
          open={openSections.music}
          onToggle={() => toggleSection("music")}
        />
        {openSections.music && (
          <div className="p-4 pt-0 space-y-2">
            <FieldRow label={isKO ? "분위기" : "Mood"}>
              <div className="flex gap-1">
                <TextInput value={musicPrompt.mood} onChange={(v) => setMusicPrompt((p) => ({ ...p, mood: v }))} />
                <CopyButton text={musicPrompt.mood} isKO={isKO} />
              </div>
            </FieldRow>
            <FieldRow label={isKO ? "감정 흐름" : "Emotion"}>
              <div className="flex gap-1">
                <TextInput value={musicPrompt.emotionFlow} onChange={(v) => setMusicPrompt((p) => ({ ...p, emotionFlow: v }))} />
                <CopyButton text={musicPrompt.emotionFlow} isKO={isKO} />
              </div>
            </FieldRow>
            <FieldRow label={isKO ? "사운드" : "Sound"}>
              <ArrayInput value={musicPrompt.soundKeywords} onChange={(v) => setMusicPrompt((p) => ({ ...p, soundKeywords: v }))} />
            </FieldRow>
            <FieldRow label={isKO ? "음악 스타일" : "Style"}>
              <ArrayInput value={musicPrompt.musicStyle} onChange={(v) => setMusicPrompt((p) => ({ ...p, musicStyle: v }))} />
            </FieldRow>
            {/* Combined music prompt */}
            {(musicPrompt.mood || musicPrompt.emotionFlow) && (
              <div className="mt-2 p-3 bg-bg-primary border border-accent-blue/20 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold text-accent-blue font-[family-name:var(--font-mono)] uppercase">{isKO ? "통합 프롬프트" : "Combined Prompt"}</span>
                  <CopyButton text={[musicPrompt.mood, musicPrompt.emotionFlow, musicPrompt.soundKeywords.join(", "), musicPrompt.musicStyle.join(", ")].filter(Boolean).join(". ")} isKO={isKO} />
                </div>
                <p className="text-[10px] text-text-secondary leading-relaxed">
                  {[musicPrompt.mood, musicPrompt.emotionFlow, musicPrompt.soundKeywords.join(", "), musicPrompt.musicStyle.join(", ")].filter(Boolean).join(". ")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
