"use client";

// ============================================================
// Translation Panel — 번역 엔진 UI (Advanced)
// ============================================================

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Languages, Play, Square, ChevronDown, Check, AlertTriangle, Loader2, Settings2, FileText, ChevronRight } from "lucide-react";
import { logger } from "@/lib/logger";
import type { AppLanguage, StoryConfig, EpisodeManuscript } from "@/lib/studio-types";
import type { TranslationMode, TranslationTarget } from "@/engine/translation";
import { bandLabel, modeDescription, BAND_META } from "@/engine/translation";
import { GENRE_PRESETS } from "@/engine/genre-presets";
import { useTranslation } from "@/hooks/useTranslation";

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

  const bandLbl = bandLabel(band, mode, isKO);

  const translatedList = config.translatedManuscripts ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6 animate-fade-in">
      {/* Header - Nexus Bridge */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(184,149,92,0.3)] bg-[linear-gradient(135deg,rgba(184,149,92,0.15),rgba(55,48,38,0.1))] text-[rgba(235,220,190,0.9)] shadow-[0_0_20px_rgba(184,149,92,0.15)]">
            <Languages className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(184,149,92,0.7)]">
                Nexus Bridge
              </span>
              <span className="flex h-1.5 w-1.5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgba(184,149,92,0.6)] opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[rgba(184,149,92,0.9)]"></span>
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white/95">
              {isKO ? "자율 현지화 엔진" : "Autonomous Localization Engine"}
            </h2>
          </div>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`group flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider transition-all duration-300 ${
            showAdvanced 
              ? 'border-[rgba(184,149,92,0.4)] bg-[rgba(184,149,92,0.1)] text-[rgba(228,215,190,0.95)] shadow-[0_0_15px_rgba(184,149,92,0.1)]' 
              : 'border-white/8 bg-black/20 text-text-tertiary hover:border-[rgba(184,149,92,0.2)] hover:bg-[rgba(184,149,92,0.05)] hover:text-text-secondary'
          }`}
        >
          <Settings2 className="h-4 w-4" />
          {isKO ? "고급 연동 설정" : "Advanced Settings"}
          <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-300 ${showAdvanced ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Mode selector - Nexus Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(["fidelity", "experience"] as TranslationMode[]).map((m) => {
          const info = modeDescription(m, isKO);
          const isSelected = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`relative overflow-hidden rounded-[1.25rem] border p-5 text-left transition-all duration-300 ${
                isSelected
                  ? "border-[rgba(184,149,92,0.4)] bg-[linear-gradient(145deg,rgba(184,149,92,0.12),rgba(0,0,0,0.6))] shadow-[0_8px_32px_rgba(184,149,92,0.1)] translate-y-[-2px]"
                  : "border-white/8 bg-white/2 hover:border-white/15 hover:bg-white/4"
              }`}
            >
              {isSelected && (
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(184,149,92,0.2),transparent_70%)]" />
              )}
              <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className={`flex h-2 w-2 rounded-full ${isSelected ? 'bg-[rgba(184,149,92,0.9)] shadow-[0_0_8px_rgba(184,149,92,0.8)]' : 'bg-white/20'}`} />
                  <div className={`font-mono text-[12px] font-bold uppercase tracking-[0.15em] ${isSelected ? 'text-[rgba(200,225,255,0.95)]' : 'text-text-secondary'}`}>
                    {info.title}
                  </div>
                </div>
                <div className="text-[12px] leading-relaxed text-text-tertiary font-sans pl-4">
                  {info.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Config row - Nexus Bridge Dashboard */}
      <div className="relative flex flex-col md:flex-row items-center gap-6 rounded-[1.25rem] border border-white/8 bg-black/40 backdrop-blur-xl p-5 shadow-2xl before:absolute before:inset-0 before:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent)] before:pointer-events-none before:rounded-[1.25rem]">
        {/* Target language */}
        <div className="space-y-2.5 w-full md:w-auto md:min-w-[160px] relative z-10">
          <label className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-text-tertiary">
            <div className="w-1.5 h-1.5 rounded-full bg-[rgba(184,149,92,0.5)]"></div>
            {isKO ? "대상 국가 (Target)" : "Target Language"}
          </label>
          <div className="flex gap-2 bg-black/30 p-1 rounded-xl border border-white/5">
            {(["EN", "JP", "CN"] as TranslationTarget[]).map((l) => (
              <button
                key={l}
                onClick={() => setTargetLang(l)}
                title={l === 'JP' ? '나로우/라노벨 최적화 알고리즘 탑재' : l === 'CN' ? '선협/웹소설 전용 호칭 처리 포함' : '영미권 픽션 표준 번역'}
                className={`flex-1 rounded-lg px-3 py-2 font-mono text-[12px] font-bold tracking-wider transition-all duration-200 ${
                  targetLang === l
                    ? "bg-[rgba(184,149,92,0.15)] text-[rgba(228,215,190,0.95)] shadow-[inset_0_0_0_1px_rgba(184,149,92,0.3),0_0_10px_rgba(184,149,92,0.1)]"
                    : "text-text-tertiary hover:bg-white/5 hover:text-text-secondary"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Vertical divider */}
        <div className="hidden md:block w-px h-16 bg-linear-to-b from-transparent via-white/10 to-transparent"></div>

        {/* Band slider */}
        <div className="flex-1 w-full space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-text-tertiary">
              <div className="w-1.5 h-1.5 rounded-full bg-[rgba(184,149,92,0.5)]"></div>
              Translation Band
            </label>
            <div className="font-mono text-[10px] px-2.5 py-1 rounded-md bg-[rgba(184,149,92,0.1)] border border-[rgba(184,149,92,0.2)] text-[rgba(228,215,190,0.95)] flex items-center gap-2 shadow-[0_0_10px_rgba(184,149,92,0.05)]">
              <span className="font-bold tracking-widest">{bandLbl}</span>
              <span className="text-[rgba(184,149,92,0.6)]">|</span>
              <span>MATH. {(band).toFixed(3)}</span>
            </div>
          </div>
          <div className="relative pt-1">
            <input
              type="range"
              min={BAND_META.min}
              max={BAND_META.max}
              step={BAND_META.step}
              value={band}
              onChange={(e) => setBand(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-black/60 rounded-full appearance-none outline-none accent-[rgba(184,149,92,0.9)] cursor-pointer"
            />
            {/* Custom slider track overlay for premium feel */}
            <div 
              className="absolute top-1 left-0 h-1.5 bg-[linear-gradient(90deg,rgba(184,149,92,0.4),rgba(184,149,92,0.9))] rounded-full pointer-events-none"
              style={{ width: `${((band - BAND_META.min) / (BAND_META.max - BAND_META.min)) * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(184,149,92,0.8)] border-2 border-[rgba(184,149,92,1)]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Settings Panel - Nexus Blue */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5 rounded-[1.25rem] border border-[rgba(184,149,92,0.2)] bg-[linear-gradient(to_bottom_right,rgba(184,149,92,0.05),rgba(0,0,0,0.5))] shadow-[inset_0_0_20px_rgba(184,149,92,0.02)] animate-in slide-in-from-top-2 duration-300">
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[rgba(184,149,92,0.7)]">
              <Settings2 className="h-3 w-3" />
              {isKO ? "장르 현지화 프리셋" : "Genre Prefix"}
            </label>
            <select
              value={targetGenre}
              onChange={(e) => setTargetGenre(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-[11px] text-[rgba(235,230,215,0.9)] outline-none focus:border-[rgba(184,149,92,0.5)] focus:ring-1 focus:ring-[rgba(184,149,92,0.3)] transition-all"
            >
              <option value="">(None - Auto Detect)</option>
              {Object.keys(GENRE_PRESETS).map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[rgba(184,149,92,0.7)]">
              <Check className="h-3 w-3" />
              {isKO ? "품질 게이트 기준점" : "Score Threshold"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0.5} max={0.99} step={0.01}
                value={scoreThreshold}
                onChange={(e) => setScoreThreshold(parseFloat(e.target.value) || 0.75)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-[11px] text-[rgba(235,230,215,0.9)] outline-none focus:border-[rgba(184,149,92,0.5)] focus:ring-1 focus:ring-[rgba(184,149,92,0.3)] transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[rgba(184,149,92,0.7)]">
              <Languages className="h-3 w-3" />
              {isKO ? "축약형(Contraction) 허용률" : "Contraction Flow"}
            </label>
            <select
              value={contractionLevel}
              onChange={(e) => setContractionLevel(e.target.value as typeof contractionLevel)}
              disabled={mode !== 'experience'}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-[11px] disabled:opacity-30 disabled:cursor-not-allowed text-[rgba(235,230,215,0.9)] outline-none focus:border-[rgba(184,149,92,0.5)] focus:ring-1 focus:ring-[rgba(184,149,92,0.3)] transition-all"
            >
              <option value="none">None (Strict/Formal)</option>
              <option value="low">Low (Dialogue only)</option>
              <option value="normal">Normal (Default)</option>
              <option value="high">High (Casual/Web Novel)</option>
            </select>
          </div>
        </div>
      )}

      {/* Execution Area - Cyber Button */}
      <div className="flex flex-col sm:flex-row items-end gap-4 p-5 rounded-[1.25rem] border border-white/8 bg-black/20 backdrop-blur-md">
        <div className="flex-1 w-full space-y-2">
          <label className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-text-tertiary">
            <FileText className="h-3 w-3 text-[rgba(184,149,92,0.7)]" />
            {isKO ? "에피소드 타겟 지정" : "Episode Target"}
          </label>
          <div className="relative group">
            <select
              value={selectedEpisode ?? ""}
              onChange={(e) => setSelectedEpisode(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full appearance-none rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 pr-10 font-mono text-[13px] text-text-primary outline-none focus:border-[rgba(184,149,92,0.4)] group-hover:border-white/20 transition-all shadow-inner"
            >
              <option value="">{isKO ? "/// 번역 대기 큐에서 선택 ///" : "/// Select queued episode ///"}</option>
              {manuscripts.map((m) => (
                <option key={m.episode} value={m.episode}>
                  EP {m.episode} — {m.title || `Episode ${m.episode}`} [ {m.content.length.toLocaleString()} BYTE ]
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(184,149,92,0.5)] group-hover:text-[rgba(184,149,92,0.9)] transition-colors" />
          </div>
        </div>

        {isTranslating ? (
          <button
            onClick={abort}
            className="w-full sm:w-[220px] h-[52px] flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(to_bottom,rgba(255,100,100,0.15),rgba(200,50,50,0.4))] border border-[rgba(255,100,100,0.5)] px-6 font-mono text-[12px] font-black uppercase tracking-widest text-[#ffa0a0] transition-all hover:brightness-125 shadow-[0_0_20px_rgba(200,50,50,0.2)]"
          >
            <Square className="h-4 w-4" /> {isKO ? "강제 종료 (HALT)" : "HALT"}
          </button>
        ) : (
          <button
            onClick={handleTranslate}
            disabled={selectedEpisode === null || manuscripts.length === 0}
            className="w-full sm:w-[220px] h-[52px] flex items-center justify-center gap-3 rounded-xl bg-[linear-gradient(45deg,rgba(130,95,45,0.6),rgba(184,149,92,0.9))] border border-[rgba(235,220,190,0.4)] px-6 font-mono text-[12px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(184,149,92,0.4)] disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none shadow-[0_5px_20px_rgba(184,149,92,0.2)]"
          >
            <Play className="h-4 w-4" fill="currentColor" /> {isKO ? "번역 연결 (INIT)" : "INIT"}
          </button>
        )}
      </div>

      {/* Live Operations Terminal - Data Stream */}
      {(progress.status !== "idle" || logs.length > 0) && (
        <div className="rounded-[1.25rem] border border-[rgba(184,149,92,0.2)] bg-[#141311] overflow-hidden flex flex-col h-[320px] shadow-[0_10px_40px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(184,149,92,0.03)] relative">
          {/* Terminal Scanline overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(184,149,92,0.02)_50%,transparent_50%)] bg-size-[100%_4px] z-10" />
          
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(184,149,92,0.15)] bg-[rgba(184,149,92,0.05)] relative z-20">
            <div className={`flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] ${progress.status === 'idle' ? 'text-[rgba(184,149,92,0.5)]' : 'text-[rgba(235,220,190,0.9)]'}`}>
              {(progress.status === "translating" || progress.status === "scoring") && <Loader2 className="h-3 w-3 animate-spin text-[rgba(184,149,92,0.8)]" />}
              {progress.status === "recreating" && <AlertTriangle className="h-3 w-3 text-accent-amber" />}
              {progress.status === "done" && <Check className="h-3 w-3 text-accent-green" />}
              {progress.status === 'idle' ? 'DATA STREAM: STANDBY' : `NEXUS: ${progress.status}`}
              {progress.recreateCount > 0 && <span className="text-accent-amber bg-accent-amber/10 px-1.5 rounded">RETRY:{progress.recreateCount}</span>}
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] font-bold tracking-widest text-[rgba(184,149,92,0.6)]">
                BLK[{progress.completedChunks.toString().padStart(3, '0')}/{progress.totalChunks.toString().padStart(3, '0')}]
              </span>
              <div className="w-32 h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5 relative">
                <div
                  className="absolute inset-y-0 left-0 bg-[rgba(184,149,92,0.9)] shadow-[0_0_10px_rgba(184,149,92,0.8)] transition-all duration-300"
                  style={{ width: `${progress.totalChunks > 0 ? (progress.completedChunks / progress.totalChunks) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Terminal Output */}
          <div className="flex-1 overflow-y-auto p-5 font-mono text-[11px] relative z-20 custom-scrollbar-archive">
            <div className="space-y-3">
              {logs.map(log => (
                <div key={log.id} className="flex gap-4 items-start group">
                  <span className="text-[rgba(184,149,92,0.4)] shrink-0 font-bold group-hover:text-[rgba(184,149,92,0.6)] transition-colors">[{new Date(log.id).toISOString().substring(11, 23)}]</span>
                  <span className={`shrink-0 w-12 text-center uppercase text-[9px] font-black tracking-widest py-0.5 rounded-sm border ${
                    log.type === 'error' ? 'text-[#ff6b6b] border-[#ff6b6b]/30 bg-[#ff6b6b]/10' :
                    log.type === 'success' ? 'text-[#38d9a9] border-[#38d9a9]/30 bg-[#38d9a9]/10' :
                    log.type === 'warn' ? 'text-[#fcc419] border-[#fcc419]/30 bg-[#fcc419]/10' :
                    'text-[rgba(235,220,190,0.9)] border-[rgba(184,149,92,0.3)] bg-[rgba(184,149,92,0.1)]'
                  }`}>SYS</span>
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div className={`leading-relaxed ${
                      log.type === 'error' ? 'text-[#ff6b6b]' :
                      log.type === 'warn' ? 'text-[#ffe066]' :
                      log.type === 'success' ? 'text-[#a9e34b]' :
                      'text-[rgba(235,230,215,0.95)]'
                    }`}>{log.text}</div>
                    {log.detail && (
                      <div className="relative pl-3 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-[linear-gradient(to_bottom,rgba(184,149,92,0.4),transparent)]">
                        <div className="text-[rgba(235,220,190,0.6)] text-[10px] leading-relaxed font-sans line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
                          {log.detail}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {progress.status !== 'idle' && progress.status !== 'done' && (
                <div className="flex gap-4 animate-pulse">
                  <span className="text-[rgba(184,149,92,0.4)] shrink-0 font-bold">[{new Date().toISOString().substring(11, 23)}]</span>
                  <span className="w-2 h-3 bg-[rgba(184,149,92,0.7)] mt-0.5" />
                </div>
              )}
            </div>
            <div ref={logsEndRef} className="h-4" />
          </div>
          <style jsx>{`
            .custom-scrollbar-archive::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar-archive::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar-archive::-webkit-scrollbar-thumb { background: rgba(184,149,92,0.2); border-radius: 10px; }
            .custom-scrollbar-archive::-webkit-scrollbar-thumb:hover { background: rgba(184,149,92,0.4); }
          `}</style>
        </div>
      )}

      {/* Translated results - Glassmorphism Cards */}
      {translatedList.length > 0 && (
        <div className="pt-6 border-t border-[rgba(184,149,92,0.15)] space-y-4">
          <div className="flex items-center gap-3 text-[rgba(235,220,190,0.8)]">
            <FileText className="h-5 w-5" />
            <h3 className="font-mono text-[13px] font-bold uppercase tracking-[0.2em]">
              {isKO ? "현지화 완료 데이터베이스" : "Localized Database"} <span className="text-[rgba(184,149,92,0.5)]">({translatedList.length})</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {translatedList.map((t, i) => (
               <div key={i} className="group relative flex flex-col gap-2.5 rounded-2xl border border-[rgba(184,149,92,0.15)] bg-black/40 backdrop-blur-md p-4 transition-all duration-300 hover:border-[rgba(184,149,92,0.4)] hover:bg-[rgba(184,149,92,0.05)] hover:-translate-y-1 shadow-lg hover:shadow-[0_10px_30px_rgba(184,149,92,0.1)]">
                <div className="absolute top-0 left-4 right-4 h-px bg-[linear-gradient(90deg,transparent,rgba(184,149,92,0.3),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(184,149,92,0.1)] text-[rgba(235,220,190,0.9)]">
                    <Check className="h-4 w-4" />
                  </div>
                  <div className="font-mono text-[13px] font-bold text-white/90 truncate">
                    EP_{t.episode.toString().padStart(2, '0')} {'//'} {t.translatedTitle || `Episode ${t.episode}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-[rgba(235,220,190,0.7)] ml-11">
                  <span className="bg-black/50 border border-white/10 px-2 py-1 rounded-[0.5rem] tracking-wider font-bold shadow-inner">
                    {t.sourceLang} <span className="text-[rgba(184,149,92,0.5)]">→</span> {t.targetLang}
                  </span>
                  <span className="bg-black/50 border border-white/10 px-2 py-1 rounded-[0.5rem] tracking-wider uppercase font-bold shadow-inner">
                    MODE:{t.mode.slice(0,3)}
                  </span>
                  <span className="text-emerald-400 font-bold ml-auto pr-1">Q_GATE: {(t.avgScore * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {manuscripts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-[rgba(184,149,92,0.3)] bg-black/20 backdrop-blur-md p-12 text-center shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]">
          <Languages className="mb-4 h-10 w-10 text-[rgba(184,149,92,0.4)]" />
          <p className="font-mono text-[12px] tracking-widest text-[rgba(235,220,190,0.7)]">
            {isKO ? "대기열(Queue)이 비어 있습니다. 집필 모드에서 에피소드를 작성하십시오." : "Translation Queue is empty. Write episodes in Zenith Canvas."}
          </p>
        </div>
      )}
    </div>
  );
}
