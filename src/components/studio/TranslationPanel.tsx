"use client";

// ============================================================
// Translation Panel — 번역 엔진 UI (Advanced)
// ============================================================

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Languages, Play, Square, ChevronDown, Check, AlertTriangle, Loader2, Settings2, FileText, ChevronRight } from "lucide-react";
import { logger } from "@/lib/logger";
import type { AppLanguage, StoryConfig, EpisodeManuscript } from "@/lib/studio-types";
import type { TranslationMode, TranslationTarget, TranslationProgress, TranslationChunk } from "@/engine/translation";
import { bandLabel, modeDescription, BAND_META, getDefaultConfig } from "@/engine/translation";
import { GENRE_PRESETS } from "@/engine/genre-presets";
import { useTranslation, toManuscriptEntry } from "@/hooks/useTranslation";

interface TranslationPanelProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: (c: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;
}

interface LogEntry {
  id: number;
  type: 'info' | 'warn' | 'success' | 'error';
  text: string;
  detail?: string;
}

export default function TranslationPanel({ language, config, setConfig }: TranslationPanelProps) {
  const isKO = language === "KO";
  const [mode, setMode] = useState<TranslationMode>("fidelity");
  const [targetLang, setTargetLang] = useState<TranslationTarget>("EN");
  const [band, setBand] = useState<number>(BAND_META.default);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Advanced Settings
  const [contractionLevel, setContractionLevel] = useState<'none'|'low'|'normal'|'high'>('normal');
  const [targetGenre, setTargetGenre] = useState<string>('');
  const [scoreThreshold, setScoreThreshold] = useState<number>(0.75);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const { translateEpisode, progress, isTranslating, abort } = useTranslation({
    onProgress: (p) => {
      if (p.status === 'scoring') {
         setLogs(prev => [...prev.slice(-49), { id: Date.now(), type: 'info', text: `Analyzing metrics for chunk ${p.currentChunk + 1}...` }]);
      } else if (p.status === 'recreating') {
         setLogs(prev => [...prev.slice(-49), { id: Date.now(), type: 'warn', text: `Quality Gate failed. Re-creating chunk ${p.currentChunk + 1} (Attempt ${p.recreateCount})...` }]);
      }
    },
    onChunkComplete: (chunk) => {
      setLogs(prev => [...prev.slice(-49), { 
        id: Date.now(), 
        type: chunk.passed ? 'success' : 'error',
        text: `Chunk ${chunk.index + 1} completed — Score: ${(chunk.score * 100).toFixed(1)}%, Attempts: ${chunk.attempt}`,
        detail: chunk.translatedText
      }]);
    },
    onError: (err) => {
      logger.error("Translation", err);
      setLogs(prev => [...prev.slice(-49), { id: Date.now(), type: 'error', text: `Error: ${err}` }]);
    },
    onSave: (entry) => {
      setConfig((prev) => ({
        ...prev,
        translatedManuscripts: [...(prev.translatedManuscripts ?? []), entry],
      }));
      setLogs(prev => [...prev, { id: Date.now(), type: 'success', text: `Episode ${entry.episode} finalization completed and saved to manuscript.` }]);
    },
  });

  const manuscripts: EpisodeManuscript[] = useMemo(() =>
    (config.manuscripts ?? []).map((m, i) => ({
      ...m,
      episode: i + 1,
      title: m.title,
      content: m.content,
      charCount: m.charCount ?? m.content.length,
      lastUpdate: m.lastUpdate ?? 0,
    })),
    [config.manuscripts]
  );

  const handleTranslate = useCallback(async () => {
    if (selectedEpisode === null) return;
    const ms = manuscripts.find((m) => m.episode === selectedEpisode);
    if (!ms) return;
    setLogs([]);
    setLogs([{ id: Date.now(), type: 'info', text: `Initialization: Parsing episode ${selectedEpisode} (${ms.charCount} chars) into syntax chunks...` }]);
    await translateEpisode(ms, { 
      mode, 
      targetLang, 
      band,
      contractionLevel,
      genre: targetGenre || undefined,
      scoreThreshold
    });
  }, [selectedEpisode, mode, targetLang, band, contractionLevel, targetGenre, scoreThreshold, manuscripts, translateEpisode]);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Languages className="h-5 w-5 text-accent-purple" />
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-text-primary">
            {isKO ? "자율 현지화 엔진" : "Autonomous Localization Engine"}
          </h2>
          <span className="rounded-full border border-accent-purple/20 bg-accent-purple/8 px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-accent-purple">
            NOA-X v2.1
          </span>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] transition-all font-[family-name:var(--font-mono)] ${
            showAdvanced ? 'bg-white/[0.05] border-white/20 text-text-primary' : 'border-transparent text-text-tertiary hover:bg-white/[0.02]'
          }`}
        >
          <Settings2 className="h-3.5 w-3.5" />
          {isKO ? "고급 설정" : "Advanced Settings"}
          <ChevronRight className={`h-3 w-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
        </button>
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
                  ? "border-accent-purple/30 bg-accent-purple/8 ring-1 ring-accent-purple/20"
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
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-white/8 bg-bg-secondary">
        {/* Target language */}
        <div className="space-y-1.5 min-w-[140px]">
          <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-text-tertiary">
            {isKO ? "대상 국가 (Target)" : "Target Language"}
          </label>
          <div className="flex gap-1">
            {(["EN", "JP", "CN"] as TranslationTarget[]).map((l) => (
              <button
                key={l}
                onClick={() => setTargetLang(l)}
                title={l === 'JP' ? '나로우/라노벨 최적화 알고리즘 탑재' : l === 'CN' ? '선협/웹소설 전용 호칭 처리 포함' : '영미권 픽션 표준 번역'}
                className={`rounded-md border px-3 py-1.5 font-[family-name:var(--font-mono)] text-[11px] font-bold transition-all ${
                  targetLang === l
                    ? "border-accent-green/30 bg-accent-green/12 text-accent-green"
                    : "border-white/8 text-text-tertiary hover:bg-white/[0.04] hover:text-text-secondary"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Band slider */}
        <div className="flex-1 min-w-[200px] space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-text-tertiary">
              Translation Band
            </label>
            <span className="font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-sm bg-accent-purple/10 text-accent-purple">{bandLbl} ({(band).toFixed(3)})</span>
          </div>
          <input
            type="range"
            min={BAND_META.min}
            max={BAND_META.max}
            step={BAND_META.step}
            value={band}
            onChange={(e) => setBand(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-full appearance-none outline-none accent-accent-purple"
          />
        </div>
      </div>

      {/* Advanced Settings Panel */}
      {showAdvanced && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl border border-accent-purple/20 bg-accent-purple/[0.02]">
          <div className="space-y-1">
            <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-accent-purple/70">
              {isKO ? "장르 현지화 프리셋" : "Genre Prefix"}
            </label>
            <select
              value={targetGenre}
              onChange={(e) => setTargetGenre(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-bg-secondary px-2 py-1.5 font-[family-name:var(--font-mono)] text-[11px] text-text-secondary outline-none focus:border-accent-purple/40"
            >
              <option value="">(None - Auto Detect)</option>
              {Object.keys(GENRE_PRESETS).map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-accent-purple/70">
              {isKO ? "품질 게이트 기준점" : "Score Threshold"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0.5} max={0.99} step={0.01}
                value={scoreThreshold}
                onChange={(e) => setScoreThreshold(parseFloat(e.target.value) || 0.75)}
                className="w-full rounded-md border border-white/10 bg-bg-secondary px-2 py-1.5 font-[family-name:var(--font-mono)] text-[11px] text-text-secondary outline-none focus:border-accent-purple/40"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-accent-purple/70">
              {isKO ? "축약형(Contraction) 허용률" : "Contraction Flow"}
            </label>
            <select
              value={contractionLevel}
              onChange={(e) => setContractionLevel(e.target.value as any)}
              disabled={mode !== 'experience'}
              className="w-full rounded-md border border-white/10 bg-bg-secondary px-2 py-1.5 font-[family-name:var(--font-mono)] text-[11px] disabled:opacity-50 text-text-secondary outline-none focus:border-accent-purple/40"
            >
              <option value="none">None (Strict/Formal)</option>
              <option value="low">Low (Dialogue only)</option>
              <option value="normal">Normal (Default)</option>
              <option value="high">High (Casual/Web Novel)</option>
            </select>
          </div>
        </div>
      )}

      {/* Execution Area */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
        <div className="flex-1 w-full space-y-1.5">
          <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-text-tertiary">
            {isKO ? "에피소드 롤아웃" : "Episode Rollout"}
          </label>
          <div className="relative">
            <select
              value={selectedEpisode ?? ""}
              onChange={(e) => setSelectedEpisode(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full appearance-none rounded-lg border border-white/10 bg-bg-secondary px-4 py-3 pr-8 font-[family-name:var(--font-mono)] text-[12px] text-text-primary outline-none focus:border-accent-purple/30 transition-colors"
            >
              <option value="">{isKO ? "-- 대기 중인 에피소드 선택 --" : "-- Select queued episode --"}</option>
              {manuscripts.map((m) => (
                <option key={m.episode} value={m.episode}>
                  EP {m.episode} — {m.title || `Episode ${m.episode}`} ({m.content.length.toLocaleString()} chars)
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          </div>
        </div>

        {isTranslating ? (
          <button
            onClick={abort}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-accent-red/20 px-6 py-3 font-[family-name:var(--font-mono)] text-[12px] font-bold uppercase text-accent-red transition-all hover:bg-accent-red/30 shadow-lg shadow-accent-red/5"
          >
            <Square className="h-4 w-4" /> {isKO ? "강제 종료" : "Halt"}
          </button>
        ) : (
          <button
            onClick={handleTranslate}
            disabled={selectedEpisode === null || manuscripts.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-accent-purple px-6 py-3 font-[family-name:var(--font-mono)] text-[12px] font-bold uppercase text-bg-primary transition-all hover:brightness-110 disabled:opacity-30 disabled:hover:brightness-100 shadow-lg shadow-accent-purple/20"
          >
            <Play className="h-4 w-4" /> {isKO ? "번역 파이프라인 가동" : "Run Pipeline"}
          </button>
        )}
      </div>

      {/* Live Operations Terminal */}
      {(progress.status !== "idle" || logs.length > 0) && (
        <div className="rounded-xl border border-white/8 bg-[#0D0D0D] overflow-hidden flex flex-col h-[280px]">
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/5">
            <div className={`flex items-center gap-2 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase ${progress.status === 'idle' ? 'text-text-tertiary' : statusColor}`}>
              {(progress.status === "translating" || progress.status === "scoring") && <Loader2 className="h-3 w-3 animate-spin" />}
              {progress.status === "recreating" && <AlertTriangle className="h-3 w-3" />}
              {progress.status === "done" && <Check className="h-3 w-3" />}
              {progress.status === 'idle' ? 'PIPELINE STANDBY' : `PIPELINE: ${progress.status}`}
              {progress.recreateCount > 0 && ` (RETRY LOCK: ${progress.recreateCount})`}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary">
                {progress.completedChunks} / {progress.totalChunks} BLOCKS
              </span>
              <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-accent-purple transition-all duration-300"
                  style={{ width: `${progress.totalChunks > 0 ? (progress.completedChunks / progress.totalChunks) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Terminal Output */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 font-[family-name:var(--font-mono)] text-[11px]">
            {logs.map(log => (
              <div key={log.id} className="flex gap-3">
                <span className="text-text-tertiary shrink-0">[{new Date(log.id).toISOString().substring(11, 19)}]</span>
                <span className={`shrink-0 w-16 uppercase opacity-80 ${
                  log.type === 'error' ? 'text-accent-red' :
                  log.type === 'success' ? 'text-accent-green' :
                  log.type === 'warn' ? 'text-accent-amber' :
                  'text-accent-blue'
                }`}>[{log.type}]</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white/80">{log.text}</div>
                  {log.detail && (
                    <div className="mt-1 text-white/40 truncate text-[10px] italic border-l border-white/10 pl-2">
                       "{log.detail}"
                    </div>
                  )}
                </div>
              </div>
            ))}
            {progress.status !== 'idle' && progress.status !== 'done' && (
              <div className="flex gap-3 animate-pulse text-text-tertiary">
                <span className="shrink-0">[{new Date().toISOString().substring(11, 19)}]</span>
                <span>_</span>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Translated results */}
      {translatedList.length > 0 && (
        <div className="pt-4 border-t border-white/5 space-y-3">
          <div className="flex items-center gap-2 text-text-tertiary">
            <FileText className="h-4 w-4" />
            <h3 className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider">
              {isKO ? "현지화 완료 에피소드" : "Localized Episodes"} ({translatedList.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {translatedList.map((t, i) => (
              <div key={i} className="flex flex-col gap-1.5 rounded-xl border border-white/8 bg-bg-secondary p-3 transition-colors hover:border-accent-green/30">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-accent-green" />
                  <div className="font-[family-name:var(--font-mono)] text-[12px] font-bold text-text-primary truncate">
                    EP {t.episode} — {t.translatedTitle || `Episode ${t.episode}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary ml-6">
                  <span className="bg-white/5 px-1.5 py-0.5 rounded">{t.sourceLang} → {t.targetLang}</span>
                  <span className="bg-white/5 px-1.5 py-0.5 rounded">{t.mode.toUpperCase()}</span>
                  <span className="text-accent-green">SCORE: {(t.avgScore * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
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
