// ============================================================
// PART 0 — IMPORTS
// ============================================================
import React, { useState, useMemo } from 'react';
import { buildContinuityReport, type ContinuityReport, type EpisodeSnapshot } from '@/engine/continuity-tracker';
import type { AppLanguage, StoryConfig, EpisodeManuscript } from '@/lib/studio-types';
import { AlertTriangle, CheckCircle, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { createT } from '@/lib/i18n';

// ============================================================
// PART 1 — PROPS & CONSTANTS
// ============================================================

interface ContinuityGraphProps {
  language: AppLanguage;
  config: StoryConfig;
}

const WINDOW_PRESETS = [3, 5, 10, 15, 25] as const;

const SCORE_COLOR = (score: number): string => {
  if (score >= 85) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
};

// ============================================================
// PART 2 — MINI BAR CHART (에피소드별 점수 막대)
// ============================================================

const MiniBarChart: React.FC<{
  episodes: EpisodeSnapshot[];
  lang: 'ko' | 'en';
  onSelect: (ep: EpisodeSnapshot) => void;
  selectedEp: number | null;
}> = ({ episodes, lang, onSelect, selectedEp }) => {
  if (episodes.length === 0) return null;
  const barWidth = Math.max(16, Math.min(40, 280 / episodes.length));

  return (
    <div className="flex items-end gap-0.5 h-16">
      {episodes.map(ep => {
        const h = Math.max(4, (ep.continuityScore / 100) * 56);
        const color = SCORE_COLOR(ep.continuityScore);
        const isSelected = selectedEp === ep.episode;

        return (
          <button
            key={ep.episode}
            onClick={() => onSelect(ep)}
            className={`relative group flex flex-col items-center transition-all ${isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            style={{ width: barWidth }}
            title={`EP.${ep.episode}: ${ep.continuityScore}${lang === 'ko' ? '점' : 'pt'}`}
          >
            <div
              className="rounded-t-sm transition-all"
              style={{
                height: h,
                width: barWidth - 2,
                backgroundColor: color,
                boxShadow: isSelected ? `0 0 8px ${color}60` : 'none',
              }}
            />
            <span className="text-[7px] text-text-tertiary mt-0.5">{ep.episode}</span>
            {ep.warnings.length > 0 && (
              <div className="absolute -top-1 -right-0.5 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        );
      })}
    </div>
  );
};

// ============================================================
// PART 3 — WARNING LIST
// ============================================================

const WarningList: React.FC<{ ep: EpisodeSnapshot; lang: 'ko' | 'en' }> = ({ ep, lang }) => {
  const tw = createT(lang === 'ko' ? 'KO' : 'EN');
  if (ep.warnings.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-400 text-[10px]">
        <CheckCircle className="w-3 h-3" />
        {tw('continuity.noIssues')}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {ep.warnings.map((w, i) => (
        <div key={i} className={`flex items-start gap-1.5 text-[10px] ${
          w.severity === 'danger' ? 'text-red-400' : w.severity === 'warn' ? 'text-amber-400' : 'text-text-tertiary'
        }`}>
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span>{w.message[lang]}</span>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// PART 4 — CHARACTER PRESENCE GRID
// ============================================================

const CharPresenceRow: React.FC<{ ep: EpisodeSnapshot; lang: 'ko' | 'en' }> = ({ ep, lang }) => {
  const activeChars = ep.characters.filter(c => c.present);
  if (activeChars.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {activeChars.map(c => (
        <span
          key={c.name}
          className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-bg-primary border border-border"
          title={c.stateFlags.length > 0 ? c.stateFlags.join(', ') : undefined}
        >
          {c.name}
          {c.stateFlags.includes('부상') && <span className="ml-0.5 text-red-400">🩹</span>}
          {c.stateFlags.includes('사망') && <span className="ml-0.5 text-red-500">💀</span>}
          {c.stateFlags.includes('분노') && <span className="ml-0.5 text-amber-400">🔥</span>}
          {c.stateFlags.includes('슬픔') && <span className="ml-0.5 text-blue-400">💧</span>}
          {c.dialogueCount > 0 && (
            <span className="ml-0.5 text-text-tertiary">({c.dialogueCount})</span>
          )}
        </span>
      ))}
    </div>
  );
};

// ============================================================
// PART 5 — MAIN COMPONENT
// ============================================================

const ContinuityGraph: React.FC<ContinuityGraphProps> = ({ language, config }) => {
  const isKO = language === 'KO';
  const lang = isKO ? 'ko' : 'en';
  const t = createT(language);

  const [windowSize, setWindowSize] = useState(5);
  const [selectedEpNum, setSelectedEpNum] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const manuscripts: EpisodeManuscript[] = config.manuscripts ?? [];
  const currentEp = config.episode ?? 1;

  const report: ContinuityReport = useMemo(
    () => buildContinuityReport(manuscripts, config.characters, currentEp, windowSize),
    [manuscripts, config.characters, currentEp, windowSize],
  );

  const selectedEp = report.episodes.find(e => e.episode === selectedEpNum) ?? null;

  const handleBarSelect = (ep: EpisodeSnapshot) => {
    setSelectedEpNum(prev => prev === ep.episode ? null : ep.episode);
    if (!expanded) setExpanded(true);
  };

  // 원고 없으면 미니 안내만
  if (manuscripts.length === 0) {
    return (
      <div className="bg-bg-secondary/50 border border-border rounded-xl px-3 py-2 flex items-center gap-2">
        <Eye className="w-3.5 h-3.5 text-text-tertiary" />
        <span className="text-[10px] text-text-tertiary">
          {t('continuity.activate')}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary/50 border border-border rounded-xl overflow-hidden">
      {/* Header row: score + graph + window control */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-bg-secondary/80 transition-colors"
      >
        {/* Overall score badge */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <span className="text-lg font-black" style={{ color: SCORE_COLOR(report.overallScore) }}>
            {report.overallScore}
          </span>
          <span className="text-[7px] text-text-tertiary uppercase tracking-wider">
            {t('continuity.context')}
          </span>
        </div>

        {/* Mini bar chart */}
        <div className="flex-1 min-w-0">
          <MiniBarChart
            episodes={report.episodes}
            lang={lang}
            onSelect={handleBarSelect}
            selectedEp={selectedEpNum}
          />
        </div>

        {/* Stats */}
        <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1.5 text-[9px]">
            {report.totalWarnings > 0 ? (
              <span className="text-amber-400 font-bold">⚠️ {report.totalWarnings}</span>
            ) : (
              <span className="text-emerald-400 font-bold">✅</span>
            )}
          </div>
          <div className="text-[10px] text-text-tertiary">
            {`${t('continuity.threads')} ${report.threadStatus.open}↗ ${report.threadStatus.resolved}✓`}
          </div>
          {expanded ? <ChevronUp className="w-3 h-3 text-text-tertiary" /> : <ChevronDown className="w-3 h-3 text-text-tertiary" />}
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="border-t border-border px-3 py-3 space-y-3">
          {/* Window size selector */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-text-tertiary font-bold uppercase">
              {t('continuity.window')}
            </span>
            <div className="flex gap-1">
              {WINDOW_PRESETS.map(w => (
                <button
                  key={w}
                  onClick={(e) => { e.stopPropagation(); setWindowSize(w); }}
                  className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${
                    windowSize === w
                      ? 'bg-accent-purple text-white'
                      : 'bg-bg-primary text-text-tertiary hover:text-text-primary'
                  }`}
                >
                  {w}{t('continuity.episode')}
                </button>
              ))}
            </div>
            {/* Custom slider */}
            <input
              type="range"
              min={3}
              max={25}
              value={windowSize}
              onChange={(e) => setWindowSize(Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 h-1 accent-accent-purple"
            />
            <span className="text-[9px] text-text-tertiary w-8 text-right">{windowSize}{t('continuity.episode')}</span>
          </div>

          {/* Selected episode detail */}
          {selectedEp ? (
            <div className="bg-bg-primary border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">
                  EP.{selectedEp.episode} — {selectedEp.title}
                </span>
                <span className="text-xs font-black" style={{ color: SCORE_COLOR(selectedEp.continuityScore) }}>
                  {selectedEp.continuityScore}{t('continuity.point')}
                </span>
              </div>

              {selectedEp.location && (
                <p className="text-[10px] text-text-tertiary">📍 {selectedEp.location}</p>
              )}

              <CharPresenceRow ep={selectedEp} lang={lang} />
              <WarningList ep={selectedEp} lang={lang} />

              {selectedEp.openThreads.length > 0 && (
                <div>
                  <span className="text-[9px] text-text-tertiary font-bold uppercase">
                    {t('continuity.openThreads')}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedEp.openThreads.slice(0, 5).map((t, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-400">
                        {t}
                      </span>
                    ))}
                    {selectedEp.openThreads.length > 5 && (
                      <span className="text-[10px] text-text-tertiary">+{selectedEp.openThreads.length - 5}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-text-tertiary text-center py-2">
              {t('continuity.clickBar')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ContinuityGraph;
