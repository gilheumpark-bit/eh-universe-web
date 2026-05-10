"use client";
// ============================================================
// NcgNctDetailPanel — NCG (pre-flight) + NCT (post-completion) 상세 패널.
// 시장 분석 4차 §"NCG/NCT" 본질 시각화.
// AuditPanel 의 작은 배지를 확장한 상세 view.
// ============================================================

import React, { useEffect, useState } from 'react';
import { Shield, ShieldCheck, ShieldAlert, AlertTriangle, FileBadge2 } from 'lucide-react';
import type { NCGReport, NCTReport } from '@/lib/translation/ncg-nct';

export interface NcgNctDetailPanelProps {
  language?: 'KO' | 'EN' | 'JP' | 'CN';
}

export function NcgNctDetailPanel({ language = 'KO' }: NcgNctDetailPanelProps) {
  const isKo = language === 'KO';
  const [ncg, setNcg] = useState<NCGReport | null>(null);
  const [nct, setNct] = useState<NCTReport | null>(null);

  useEffect(() => {
    const refresh = () => {
      try {
        const ncgRaw = typeof window !== 'undefined' ? window.localStorage.getItem('noa_translator_lastNCG') : null;
        setNcg(ncgRaw ? (JSON.parse(ncgRaw) as NCGReport) : null);
        const nctRaw = typeof window !== 'undefined' ? window.localStorage.getItem('noa_translator_lastNCT') : null;
        setNct(nctRaw ? (JSON.parse(nctRaw) as NCTReport) : null);
      } catch { /* skip */ }
    };
    refresh();
    if (typeof window !== 'undefined') {
      const handler = () => refresh();
      window.addEventListener('noa:translator-ncg-nct-updated', handler);
      const storageH = (e: StorageEvent) => {
        if (e.key === 'noa_translator_lastNCG' || e.key === 'noa_translator_lastNCT') refresh();
      };
      window.addEventListener('storage', storageH);
      const polling = setInterval(refresh, 60_000);
      return () => {
        window.removeEventListener('noa:translator-ncg-nct-updated', handler);
        window.removeEventListener('storage', storageH);
        clearInterval(polling);
      };
    }
    return undefined;
  }, []);

  if (!ncg && !nct) {
    return (
      <section className="bg-bg-secondary border border-border rounded-xl p-6 text-center">
        <Shield className="w-5 h-5 text-text-tertiary mx-auto mb-2" />
        <p className="text-xs text-text-tertiary">
          {isKo
            ? 'NCG / NCT 결과 없음. 듀얼 번역 실행 시 자동 표시됩니다.'
            : 'No NCG / NCT results. Auto-displayed on dual translation.'}
        </p>
      </section>
    );
  }

  return (
    <section className="bg-bg-secondary border border-border rounded-xl overflow-hidden flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-tertiary/30">
        <div className="flex items-center gap-2">
          <FileBadge2 className="w-4 h-4 text-accent-blue" />
          <h3 className="text-sm font-bold text-text-primary">
            {isKo ? 'NCG / NCT 상세' : 'NCG / NCT Detail'}
          </h3>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto max-h-[60vh] divide-y divide-border">
        {/* NCG 섹션 */}
        {ncg && (
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <NcgDecisionBadge decision={ncg.decision} />
              <span className="text-xs text-text-secondary">
                {isKo ? '사전 게이트 — 번역 전 검사' : 'Pre-flight gate — pre-translation check'}
              </span>
            </div>
            {ncg.violations.length > 0 ? (
              <ul className="space-y-1.5 mt-2">
                {ncg.violations.map((v, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px]">
                    <SeverityIcon severity={v.severity} />
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-text-tertiary">{v.kind}</span>
                      <p className="text-text-secondary">{isKo ? v.message.ko : v.message.en}</p>
                      {v.metric && (
                        <span className="text-[9px] font-mono text-text-tertiary">
                          value: {v.metric.value} / threshold: {v.metric.threshold}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-accent-green italic">
                {isKo ? '이슈 없음 — 통과' : 'No issues — passed'}
              </p>
            )}
            <p className="text-[9px] text-text-tertiary font-mono">{ncg.timestamp}</p>
          </div>
        )}

        {/* NCT 섹션 */}
        {nct && (
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <NctRecommendationBadge recommendation={nct.recommendation} />
              <span className="text-xs text-text-secondary">
                {isKo ? '사후 검증 — 번역 후 검사' : 'Post-completion test'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
              <TrackBox
                title="Faithful"
                report={nct.faithful}
                isKo={isKo}
                color="green"
              />
              <TrackBox
                title="Market"
                report={nct.market}
                isKo={isKo}
                color="amber"
              />
            </div>
            {nct.glossaryMisses.length > 0 && (
              <div className="mt-2 p-2 rounded bg-accent-amber/10 border border-accent-amber/30">
                <p className="text-[10px] font-bold text-accent-amber">
                  {isKo ? `Glossary 누락 ${nct.glossaryMisses.length}건` : `${nct.glossaryMisses.length} glossary misses`}
                </p>
                <ul className="text-[10px] text-text-secondary mt-1 space-y-0.5">
                  {nct.glossaryMisses.slice(0, 5).map((m, i) => (
                    <li key={i} className="font-mono">
                      <span className="text-accent-amber">[{m.track}]</span> {m.source} → {m.expected}
                    </li>
                  ))}
                  {nct.glossaryMisses.length > 5 && (
                    <li className="text-text-tertiary italic">+ {nct.glossaryMisses.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
            <p className="text-[9px] text-text-tertiary font-mono">{nct.timestamp}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function NcgDecisionBadge({ decision }: { decision: 'block' | 'warn' | 'pass' }) {
  const cls =
    decision === 'block'
      ? 'bg-accent-red/15 text-accent-red border-accent-red/40'
      : decision === 'warn'
        ? 'bg-accent-amber/15 text-accent-amber border-accent-amber/40'
        : 'bg-accent-green/15 text-accent-green border-accent-green/40';
  return (
    <span className={`flex items-center gap-1 px-2 py-1 rounded border font-mono text-[10px] font-bold uppercase ${cls}`}>
      <Shield className="w-3 h-3" />
      NCG · {decision}
    </span>
  );
}

function NctRecommendationBadge({ recommendation }: { recommendation: 'publish' | 'review' | 'reject' }) {
  const cls =
    recommendation === 'reject'
      ? 'bg-accent-red/15 text-accent-red border-accent-red/40'
      : recommendation === 'review'
        ? 'bg-accent-amber/15 text-accent-amber border-accent-amber/40'
        : 'bg-accent-green/15 text-accent-green border-accent-green/40';
  return (
    <span className={`flex items-center gap-1 px-2 py-1 rounded border font-mono text-[10px] font-bold uppercase ${cls}`}>
      <ShieldCheck className="w-3 h-3" />
      NCT · {recommendation}
    </span>
  );
}

function SeverityIcon({ severity }: { severity: 'error' | 'warn' | 'info' }) {
  if (severity === 'error') return <ShieldAlert className="w-3 h-3 text-accent-red shrink-0 mt-0.5" />;
  if (severity === 'warn') return <AlertTriangle className="w-3 h-3 text-accent-amber shrink-0 mt-0.5" />;
  return <Shield className="w-3 h-3 text-accent-blue shrink-0 mt-0.5" />;
}

function TrackBox({
  title,
  report,
  isKo,
  color,
}: {
  title: string;
  report: NCTReport['faithful'] | NCTReport['market'];
  isKo: boolean;
  color: 'green' | 'amber';
}) {
  if (!report) {
    return (
      <div className="p-2 rounded bg-white/[0.02] border border-white/10">
        <span className="font-mono text-[9px] uppercase text-text-tertiary">{title}</span>
        <p className="text-[10px] text-text-tertiary italic">
          {isKo ? '결과 없음' : 'no result'}
        </p>
      </div>
    );
  }
  const colorCls = color === 'green' ? 'text-accent-green' : 'text-accent-amber';
  const statusCls =
    report.status === 'fail'
      ? 'text-accent-red'
      : report.status === 'warn'
        ? 'text-accent-amber'
        : 'text-accent-green';
  return (
    <div className="p-2 rounded bg-white/[0.02] border border-white/10">
      <span className={`font-mono text-[9px] uppercase font-bold ${colorCls}`}>{title}</span>
      <p className={`text-[11px] font-mono ${statusCls}`}>
        {isKo ? '상태' : 'status'}: {report.status} · {report.score}%
      </p>
      <p className="text-[9px] text-text-tertiary">
        {isKo ? '이슈' : 'issues'}: {report.issues.length}
      </p>
    </div>
  );
}

export default NcgNctDetailPanel;
