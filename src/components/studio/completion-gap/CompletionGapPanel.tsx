"use client";
// ============================================================
// CompletionGapPanel — AI 완료 주장 자동 검증 결과 표시.
// [검증 루프 fix — 2026-05-08] messages prop + settings 토글 + 자체 trigger.
// ============================================================

import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, RefreshCw, Loader2, FileWarning } from 'lucide-react';
import type { CompletionGapReport, ClaimVerification, GapSeverity } from '@/lib/completion-gap/types';
import { buildCompletionGapReport } from '@/lib/completion-gap/orchestrator';
import { useNovelIDESettings } from '@/hooks/useNovelIDESettings';
import type { Message } from '@/lib/studio-types';

const SEV_COLOR: Record<GapSeverity, string> = {
  pass: 'text-accent-green',
  warn: 'text-accent-amber',
  fail: 'text-accent-red',
};

function severityIcon(s: GapSeverity, className = 'w-3.5 h-3.5') {
  if (s === 'pass') return <ShieldCheck className={`${className} ${SEV_COLOR.pass}`} />;
  if (s === 'warn') return <AlertTriangle className={`${className} ${SEV_COLOR.warn}`} />;
  return <ShieldAlert className={`${className} ${SEV_COLOR.fail}`} />;
}

export interface CompletionGapPanelProps {
  /** 외부 주입 — 미주입 시 messages 로 자체 trigger */
  report?: CompletionGapReport | null;
  /** [검증 루프 fix] messages 직접 받아 자체 검증 */
  messages?: Message[];
  loading?: boolean;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
  onRefresh?: () => void;
}

export const CompletionGapPanel: React.FC<CompletionGapPanelProps> = ({
  report: externalReport,
  messages,
  loading: externalLoading = false,
  language = 'KO',
  onRefresh: externalRefresh,
}) => {
  const isKO = language === 'KO';
  const lang = language === 'KO' ? 'ko' : 'en';
  const { settings } = useNovelIDESettings();

  // [검증 루프 fix] 자체 검증 — messages 주입 시 + settings 토글 ON
  const [internalReport, setInternalReport] = useState<CompletionGapReport | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);

  const report = externalReport ?? internalReport;
  const loading = externalLoading || internalLoading;

  const refresh = () => {
    if (externalRefresh) {
      externalRefresh();
      return;
    }
    if (!messages) return;
    setInternalLoading(true);
    requestAnimationFrame(() => {
      const r = buildCompletionGapReport(messages, { recentN: 10 });
      setInternalReport(r);
      setInternalLoading(false);
    });
  };

  useEffect(() => {
    // [legitimate cleanup] settings 비활성 시 stale 리포트 클리어.
    if (!settings.completionGapDetect) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInternalReport(null);
    }
  }, [settings.completionGapDetect]);

  if (!settings.completionGapDetect) {
    return (
      <section className="bg-bg-secondary border border-border rounded-xl p-6 text-center">
        <FileWarning className="w-5 h-5 text-text-tertiary mx-auto mb-2" />
        <p className="text-xs text-text-tertiary">
          {isKO
            ? 'Completion Gap 검증 OFF (Settings 에서 켜기)'
            : 'Completion Gap detection OFF (enable in Settings)'}
        </p>
      </section>
    );
  }

  return (
    <section className="bg-bg-secondary border border-border rounded-xl overflow-hidden flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-tertiary/30">
        <div className="flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-accent-purple" />
          <h3 className="text-sm font-bold text-text-primary">
            {isKO ? 'AI 완료 검증 (L3)' : 'Completion Gap (L3)'}
          </h3>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="p-2 rounded-md bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25 disabled:opacity-50 transition-colors"
          aria-label={isKO ? '재검증' : 'Re-verify'}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto max-h-[60vh]">
        {!report || report.totalClaims === 0 ? (
          <div className="p-6 text-center text-xs text-text-tertiary">
            {isKO ? 'AI 완료 주장 없음 (직전 10 turn)' : 'No completion claims (last 10 turns)'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-1 px-4 py-3 border-b border-border">
              <div className="text-center">
                <div className="text-[9px] uppercase text-accent-green tracking-wider">{isKO ? '통과' : 'Pass'}</div>
                <div className="text-lg font-bold text-accent-green">{report.passedClaims}</div>
              </div>
              <div className="text-center">
                <div className="text-[9px] uppercase text-accent-amber tracking-wider">{isKO ? '경고' : 'Warn'}</div>
                <div className="text-lg font-bold text-accent-amber">{report.warnedClaims}</div>
              </div>
              <div className="text-center">
                <div className="text-[9px] uppercase text-accent-red tracking-wider">{isKO ? '실패' : 'Fail'}</div>
                <div className="text-lg font-bold text-accent-red">{report.failedClaims}</div>
              </div>
            </div>

            <ul className="divide-y divide-border">
              {report.verifications.map((v, idx) => (
                <ClaimRow key={idx} verification={v} lang={lang} />
              ))}
            </ul>
          </>
        )}
      </div>

      <footer className="px-4 py-2 border-t border-border text-[10px] text-text-tertiary font-mono text-right">
        {report ? `${report.durationMs}ms` : ''}
      </footer>
    </section>
  );
};

function ClaimRow({ verification, lang }: { verification: ClaimVerification; lang: 'ko' | 'en' }) {
  return (
    <li className="px-4 py-2">
      <div className="flex items-start gap-2">
        {severityIcon(verification.overallSeverity)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className="text-[10px] font-mono text-accent-purple">{verification.claim.surface}</code>
            <span className={`text-[10px] font-mono ${SEV_COLOR[verification.overallSeverity]}`}>
              {verification.gapScore}/100
            </span>
          </div>
          {verification.claim.filePath && (
            <code className="text-[10px] text-text-tertiary truncate block">{verification.claim.filePath}</code>
          )}
          <ul className="mt-1 space-y-0.5">
            {verification.verdicts
              .filter((v) => v.severity !== 'pass')
              .slice(0, 3)
              .map((v, i) => (
                <li key={i} className="flex items-start gap-1 text-[10px]">
                  {severityIcon(v.severity, 'w-3 h-3')}
                  <span className="text-text-secondary">{v.message[lang]}</span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

export default CompletionGapPanel;
