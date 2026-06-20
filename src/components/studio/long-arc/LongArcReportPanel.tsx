"use client";
// ============================================================
// LongArcReportPanel — 5축 점수 카드 + 위반 list 메인 패널.
// Studio 사이드 (Settings 아님 — 메인 작업 흐름).
//
// [C] report null → 안내 / [G] 위반 list virt 없음 (50개 cap) / [K] 단일 패널
// ============================================================

import React from 'react';
import { AlertTriangle, AlertCircle, Info, RefreshCw, Loader2, FileDown } from 'lucide-react';
import type { VerifierReport, Violation } from '@/lib/long-arc-verifier/types';
// [검수 wiring — 2026-05-07] report-builder 미연결 해결 — Markdown/HTML export 버튼.
import { renderReportMarkdown, renderReportHtml } from '@/lib/long-arc-verifier/report-builder';
import type { EpisodeManuscript } from '@/lib/studio-types';

const AXIS_LABEL_KO = {
  plotDrift: '시놉시스',
  characterArc: '캐릭터',
  worldViolation: '룰',
  foreshadow: '떡밥',
  tension: '텐션',
} as const;

const AXIS_LABEL_EN = {
  plotDrift: 'Synopsis',
  characterArc: 'Character',
  worldViolation: 'Rules',
  foreshadow: 'Foreshadow',
  tension: 'Tension',
} as const;

function severityIcon(s: Violation['severity']) {
  if (s === 'error') return <AlertCircle className="w-3.5 h-3.5 text-accent-red" />;
  if (s === 'warning') return <AlertTriangle className="w-3.5 h-3.5 text-accent-amber" />;
  return <Info className="w-3.5 h-3.5 text-accent-blue" />;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-accent-green';
  if (score >= 60) return 'text-accent-amber';
  return 'text-accent-red';
}

export interface LongArcReportPanelProps {
  report: VerifierReport | null;
  loading?: boolean;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
  /** [검수 wiring] Markdown/HTML export 시 텐션 SVG 그릴 episode 본문. 미주입 시 export 비활성. */
  episodes?: EpisodeManuscript[];
  onRefresh?: () => void;
  onJump?: (episodeId: number, charOffset?: number) => void;
}

function triggerDownload(filename: string, content: string, mimeType: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

export const LongArcReportPanel: React.FC<LongArcReportPanelProps> = ({
  report,
  loading = false,
  language = 'KO',
  episodes,
  onRefresh,
  onJump,
}) => {
  const isKO = language === 'KO';
  const labels = isKO ? AXIS_LABEL_KO : AXIS_LABEL_EN;
  const lang = language === 'KO' ? 'ko' : language === 'EN' ? 'en' : language === 'JP' ? 'ja' : 'zh';

  // [검수 wiring] export 핸들러
  const handleExport = (format: 'md' | 'html') => {
    if (!report) return;
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const slug = report.projectId.slice(0, 8);
    if (format === 'md') {
      const content = renderReportMarkdown(report, episodes, lang);
      triggerDownload(`loreguard-long-arc-${slug}-${ts}.md`, content, 'text/markdown');
    } else {
      const content = renderReportHtml(report, episodes, lang);
      triggerDownload(`loreguard-long-arc-${slug}-${ts}.html`, content, 'text/html');
    }
  };

  return (
    <section
      className="bg-bg-secondary border border-border rounded-xl overflow-hidden flex flex-col"
      role="region"
      aria-label={isKO ? 'Long-Arc 검증 리포트' : 'Long-Arc Verifier Report'}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-tertiary/30">
        <div>
          <h3 className="text-sm font-bold text-text-primary">
            {isKO ? 'Long-Arc 검증' : 'Long-Arc Verifier'}
          </h3>
          {report && (
            <p className="text-[10px] text-text-tertiary font-mono mt-0.5">
              {report.totalViolations}{isKO ? '건 위반' : ' violations'} · hash {report.manuscriptHash.slice(0, 8)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {report && (
            <>
              <button
                type="button"
                onClick={() => handleExport('md')}
                className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-bg-tertiary/50 hover:bg-bg-tertiary text-text-secondary hover:text-accent-purple rounded transition-colors flex items-center gap-1"
                aria-label="Export Markdown"
                title="Markdown"
              >
                <FileDown className="w-3 h-3" /> MD
              </button>
              <button
                type="button"
                onClick={() => handleExport('html')}
                className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-bg-tertiary/50 hover:bg-bg-tertiary text-text-secondary hover:text-accent-purple rounded transition-colors flex items-center gap-1"
                aria-label="Export HTML"
                title="HTML"
              >
                <FileDown className="w-3 h-3" /> HTML
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-md bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25 disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue outline-none"
            aria-label={isKO ? '재검증' : 'Re-verify'}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {!report ? (
          <div className="p-6 text-center text-xs text-text-tertiary">
            {isKO ? '재검증 버튼을 눌러 시작' : 'Click refresh to start'}
          </div>
        ) : (
          <>
            {/* Overall score */}
            <div className="px-4 py-4 border-b border-border text-center">
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">
                {isKO ? '종합 점수' : 'Overall'}
              </div>
              <div className={`text-4xl font-bold ${scoreColor(report.overallScore)}`}>
                {report.overallScore}
                <span className="text-sm text-text-tertiary ml-1">/ 100</span>
              </div>
            </div>

            {/* 5축 카드 */}
            <div className="grid grid-cols-5 gap-1 px-4 py-3 border-b border-border">
              {(Object.keys(labels) as Array<keyof typeof labels>).map((key) => {
                const axis = report.axes[key];
                return (
                  <div key={key} className="text-center">
                    <div className="text-[9px] uppercase text-text-tertiary tracking-wider truncate">
                      {labels[key]}
                    </div>
                    <div className={`text-lg font-bold ${scoreColor(axis.score)}`}>
                      {axis.score}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Violations */}
            <div className="px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">
                {isKO ? '위반 우선순위' : 'Prioritized'}
              </div>
              {report.prioritized.length === 0 ? (
                <p className="text-xs text-accent-green">
                  {isKO ? '✓ 위반 없음' : '✓ No violations'}
                </p>
              ) : (
                <ul className="space-y-1">
                  {report.prioritized.slice(0, 30).map((v, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => v.jumpTarget && onJump?.(v.jumpTarget.episodeId, v.jumpTarget.charOffset)}
                        className="w-full flex items-start gap-2 px-2 py-1.5 rounded hover:bg-bg-tertiary/30 text-left"
                      >
                        {severityIcon(v.severity)}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-text-secondary leading-snug line-clamp-2">
                            {v.episodeId && (
                              <span className="text-accent-purple font-mono mr-1">EP{v.episodeId}</span>
                            )}
                            {v.messages[language === 'KO' ? 'ko' : language === 'EN' ? 'en' : language === 'JP' ? 'ja' : 'zh'] ?? v.messages.ko}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default LongArcReportPanel;
