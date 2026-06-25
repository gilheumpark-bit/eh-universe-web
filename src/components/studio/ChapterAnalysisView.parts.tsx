"use client";

import { useCallback, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";
import { createT } from "@/lib/i18n";
import type {
  AppLanguage,
  BackgroundState,
  CharacterStateEntry,
  EmotionIntensity,
  ImagePromptPack,
  MusicPromptPack,
  SceneAnalysisState,
  SoundState,
} from "@/lib/studio-types";

export const EMPTY_CHARACTER: CharacterStateEntry = {
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

export const EMPTY_BACKGROUND: BackgroundState = {
  location: "",
  spaceType: "",
  time: "",
  weather: "",
  lighting: "",
  mood: [],
  keyObjects: [],
  environmentCondition: [],
};

export const EMPTY_SCENE: SceneAnalysisState = {
  summary: "",
  phase: "",
  tension: "mid",
  conflictType: [],
  characterGoal: "",
  obstacle: "",
  turningPoint: "",
  symbolicTags: [],
};

export const EMPTY_SOUND: SoundState = {
  ambient: [],
  effects: [],
  voiceTone: [],
  audioMood: [],
  bgmTags: [],
};

export const EMPTY_IMAGE_PROMPT: ImagePromptPack = {
  characterFocus: "",
  backgroundFocus: "",
  sceneFocus: "",
  styleHints: [],
};

export const EMPTY_MUSIC_PROMPT: MusicPromptPack = {
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

export function SectionHeader({
  icon,
  title,
  open,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between py-2.5 px-1 group">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest font-mono text-text-secondary group-hover:text-text-primary transition-colors">
        {icon} {title}
      </div>
      {open ? <ChevronUp className="w-3.5 h-3.5 text-text-tertiary" /> : <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />}
    </button>
  );
}

export function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
      <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-mono shrink-0 w-24 pt-1.5">{label}</label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple transition-colors"
    />
  );
}

export function ArrayInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={arrayToString(value)}
      onChange={(e) => onChange(stringToArray(e.target.value))}
      placeholder={placeholder}
      className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple transition-colors"
    />
  );
}

export function IntensitySelect({
  value,
  onChange,
  language,
}: {
  value: EmotionIntensity;
  onChange: (v: EmotionIntensity) => void;
  language: AppLanguage;
}) {
  const t = createT(language);
  return (
    <div className="flex gap-1">
      {INTENSITY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2 py-1 rounded text-[9px] font-bold font-mono border transition-colors ${
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

export function CopyButton({ text, language }: { text: string; language: AppLanguage }) {
  const t = createT(language);
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return (
    <button onClick={handleCopy} aria-label="복사" className="p-1.5 rounded bg-bg-tertiary/50 text-text-tertiary hover:text-accent-green transition-colors" title={t("chapterAnalysis.copy")}>
      {copied ? <Check className="w-3 h-3 text-accent-green" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}
