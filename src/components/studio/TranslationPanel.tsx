"use client";

// ============================================================
// Translation Panel — 번역 엔진 UI
// ============================================================

import { useState, useCallback } from "react";
import { Languages, Play, Square, ChevronDown, Check, AlertTriangle, Loader2 } from "lucide-react";
import type { AppLanguage, StoryConfig, EpisodeManuscript } from "@/lib/studio-types";
import type { TranslationMode, TranslationTarget, TranslationProgress } from "@/engine/translation";
import { bandLabel, modeDescription, BAND_META, getDefaultConfig } from "@/engine/translation";
import { useTranslation, toManuscriptEntry } from "@/hooks/useTranslation";

interface TranslationPanelProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: (c: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;
}

export default function TranslationPanel({ language, config, setConfig }: TranslationPanelProps) {
  const isKO = language === "KO";
  const [mode, setMode] = useState<TranslationMode>("fidelity");
  const [targetLang, setTargetLang] = useState<TranslationTarget>("EN");
  const [band, setBand] = useState(BAND_META.default);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);

  const { translateEpisode, progress, isTranslating, abort } = useTranslation({
    onProgress: () => {},
    onError: (err) => console.error("[Translation]", err),
    onSave: (entry) => {
      setConfig((prev) => ({
        ...prev,
        translatedManuscripts: [...(prev.translatedManuscripts ?? []), entry],
      }));
    },
  });

  const manuscripts: EpisodeManuscript[] = (config.manuscripts ?? []).map((m, i) => ({
    episode: i + 1,
    title: m.title,
    content: m.content,
  }));

  const handleTranslate = useCallback(async () => {
    if (selectedEpisode === null) return;
    const ms = manuscripts.find((m) => m.episode === selectedEpisode);
    if (!ms) return;
    await translateEpisode(ms, { mode, targetLang, band });
  }, [selectedEpisode, mode, targetLang, band, manuscripts, translateEpisode]);

  const modeInfo = modeDescription(mode, isKO);
  const bandLbl = bandLabel(band, mode, isKO);

  const statusColor = {
    idle: "text-text-tertiary",
    translating: "text-accent-blue",
    scoring: "text-accent-purple",
    recreating: "text-accent-amber",
    done: "text-accent-green",
    error: "text-accent-red",
  }[progress.status];

  const translatedList = config.translatedManuscripts ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Languages className="h-5 w-5 text-accent-purple" />
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-text-primary">
          {isKO ? "번역 엔진" : "Translation Engine"}
        </h2>
        <span className="rounded-full border border-accent-purple/20 bg-accent-purple/8 px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-accent-purple">
          v2
        </span>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-3">
        {(["fidelity", "experience"] as TranslationMode[]).map((m) => {
          const info = modeDescription(m, isKO);
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-xl border p-4 text-left transition-all ${
                mode === m
                  ? "border-accent-purple/30 bg-accent-purple/8"
                  : "border-white/8 bg-white/[0.02] hover:border-white/12"
              }`}
            >
              <div className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-wider text-text-primary">
                {info.title}
              </div>
              <div className="mt-1 text-[11px] leading-relaxed text-text-tertiary">{info.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Config row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Target language */}
        <div className="space-y-1">
          <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-text-tertiary">
            {isKO ? "대상 언어" : "Target"}
          </label>
          <div className="flex gap-1">
            {(["EN", "JP", "CN"] as TranslationTarget[]).map((l) => (
              <button
                key={l}
                onClick={() => setTargetLang(l)}
                className={`rounded-lg border px-3 py-1.5 font-[family-name:var(--font-mono)] text-[11px] font-bold transition-all ${
                  targetLang === l
                    ? "border-accent-green/30 bg-accent-green/12 text-accent-green"
                    : "border-white/8 text-text-tertiary hover:text-text-primary"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Band slider */}
        <div className="flex-1 min-w-[200px] space-y-1">
          <div className="flex items-center justify-between">
            <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-text-tertiary">
              Band: {band.toFixed(3)}
            </label>
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-accent-purple">{bandLbl}</span>
          </div>
          <input
            type="range"
            min={BAND_META.min}
            max={BAND_META.max}
            step={BAND_META.step}
            value={band}
            onChange={(e) => setBand(parseFloat(e.target.value))}
            className="w-full accent-accent-purple"
          />
        </div>
      </div>

      {/* Episode selector + Translate button */}
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1">
          <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-text-tertiary">
            {isKO ? "에피소드 선택" : "Episode"}
          </label>
          <div className="relative">
            <select
              value={selectedEpisode ?? ""}
              onChange={(e) => setSelectedEpisode(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full appearance-none rounded-lg border border-white/8 bg-bg-secondary px-3 py-2.5 pr-8 font-[family-name:var(--font-mono)] text-[12px] text-text-primary outline-none focus:border-accent-purple/30"
            >
              <option value="">{isKO ? "에피소드를 선택하세요" : "Select episode"}</option>
              {manuscripts.map((m) => (
                <option key={m.episode} value={m.episode}>
                  EP {m.episode} — {m.title || `Episode ${m.episode}`} ({m.content.length}자)
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          </div>
        </div>

        {isTranslating ? (
          <button
            onClick={abort}
            className="flex items-center gap-2 rounded-lg bg-accent-red/20 px-4 py-2.5 font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase text-accent-red transition-all hover:bg-accent-red/30"
          >
            <Square className="h-3.5 w-3.5" /> {isKO ? "중지" : "Stop"}
          </button>
        ) : (
          <button
            onClick={handleTranslate}
            disabled={selectedEpisode === null || manuscripts.length === 0}
            className="flex items-center gap-2 rounded-lg bg-accent-purple/20 px-4 py-2.5 font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase text-accent-purple transition-all hover:bg-accent-purple/30 disabled:opacity-30"
          >
            <Play className="h-3.5 w-3.5" /> {isKO ? "번역 시작" : "Translate"}
          </button>
        )}
      </div>

      {/* Progress */}
      {progress.status !== "idle" && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase ${statusColor}`}>
              {progress.status === "translating" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {progress.status === "scoring" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {progress.status === "recreating" && <AlertTriangle className="h-3.5 w-3.5" />}
              {progress.status === "done" && <Check className="h-3.5 w-3.5" />}
              {progress.status}
              {progress.recreateCount > 0 && ` (retry ${progress.recreateCount})`}
            </div>
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-text-tertiary">
              {progress.completedChunks}/{progress.totalChunks} chunks
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-accent-purple transition-all"
              style={{ width: `${progress.totalChunks > 0 ? (progress.completedChunks / progress.totalChunks) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Translated results */}
      {translatedList.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-text-tertiary">
            {isKO ? "번역 완료" : "Completed"} ({translatedList.length})
          </h3>
          {translatedList.map((t, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
              <Check className="h-3.5 w-3.5 shrink-0 text-accent-green" />
              <div className="flex-1 min-w-0">
                <div className="font-[family-name:var(--font-mono)] text-[11px] font-bold text-text-primary truncate">
                  EP {t.episode} — {t.translatedTitle || `Episode ${t.episode}`}
                </div>
                <div className="text-[10px] text-text-tertiary">
                  {t.sourceLang}→{t.targetLang} · {t.mode} · score {(t.avgScore * 100).toFixed(0)}% · {t.charCount}자
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {manuscripts.length === 0 && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-8 text-center">
          <Languages className="mx-auto h-8 w-8 text-text-tertiary mb-3" />
          <p className="font-[family-name:var(--font-mono)] text-[11px] text-text-tertiary">
            {isKO ? "에피소드를 먼저 작성하세요. 집필 완료된 에피소드가 여기에 표시됩니다." : "Write episodes first. Completed episodes will appear here."}
          </p>
        </div>
      )}
    </div>
  );
}
