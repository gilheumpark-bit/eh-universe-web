"use client";

// ============================================================
// PART 1 — Overview (M1.5.0 Shadow Diff Dashboard)
// ============================================================
//
// 개발자 전용 Shadow Mode Diff 대시보드.
// - 최근 1,000 쓰기의 일치율 시각화
// - 불일치 Top-10 operation
// - "On 승격 준비도" 지표 (99.9% + 최소 100 표본)
// - 로그 초기화 / 수동 재조회
//
// [C] 모든 영역에 None 가드. isJournalEngineActive 꺼진 상태에서도 렌더 가능(데이터만 0).
// [G] useShadowDiff 훅이 구독·주기갱신 담당. 이 컴포넌트는 순수 표시.
// [K] ds-card-lg + 토큰 기반 색상. 불필요한 추상화 없음.

import React, { useState } from 'react';
import { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { Activity, AlertTriangle, CheckCircle2, RefreshCcw, Trash2, Clock } from 'lucide-react';
import { useShadowDiff } from '@/hooks/useShadowDiff';
import {
  getJournalEngineMode,
  type JournalEngineMode,
} from '@/lib/feature-flags';

// ============================================================
// PART 2 — Props
// ============================================================

export interface ShadowDiffDashboardProps {
  language: AppLanguage;
}

// ============================================================
// PART 3 — Mode badge
// ============================================================

function ModeBadge({ language }: { language: AppLanguage }): React.ReactElement {
  const [mode, setMode] = useState<JournalEngineMode>(() => {
    try { return getJournalEngineMode(); } catch { return 'off'; }
  });

  // mode가 런타임에 바뀔 수 있으므로 storage 이벤트로 업데이트
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      try { setMode(getJournalEngineMode()); } catch { /* noop */ }
    };
    window.addEventListener('storage', handler);
    window.addEventListener('noa:feature-flag-changed', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('noa:feature-flag-changed', handler);
    };
  }, []);

  const label = L4(language, {
    ko: mode === 'on' ? '활성 (primary)' : mode === 'shadow' ? 'Shadow (관찰)' : '비활성',
    en: mode === 'on' ? 'Active (primary)' : mode === 'shadow' ? 'Shadow (observe)' : 'Off',
    ja: mode === 'on' ? '有効 (primary)' : mode === 'shadow' ? 'Shadow (観察)' : '無効',
    zh: mode === 'on' ? '活动 (primary)' : mode === 'shadow' ? 'Shadow (观察)' : '已关闭',
  });
  const cls =
    mode === 'on' ? 'bg-accent-green/20 text-accent-green'
      : mode === 'shadow' ? 'bg-accent-amber/20 text-accent-amber'
      : 'bg-bg-tertiary text-text-tertiary';

  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${cls}`}>
      {label}
    </span>
  );
}

// ============================================================
// PART 4 — Main dashboard
// ============================================================

const ShadowDiffDashboard: React.FC<ShadowDiffDashboardProps> = ({ language }) => {
  const { report, readiness, refresh, clear, loading, lastRefreshedAt } = useShadowDiff();
  const [confirmClear, setConfirmClear] = useState(false);

  // 일치율 색상 (95% 이하 빨강, 99.9% 이상 녹색)
  const rateColor = report
    ? report.matchRatePct >= 99.9
      ? 'text-accent-green'
      : report.matchRatePct >= 95
      ? 'text-accent-amber'
      : 'text-accent-red'
    : 'text-text-tertiary';

  const rateBg = report
    ? report.matchRatePct >= 99.9
      ? 'bg-accent-green/10 border-accent-green/30'
      : report.matchRatePct >= 95
      ? 'bg-accent-amber/10 border-accent-amber/30'
      : 'bg-accent-red/10 border-accent-red/30'
    : 'bg-bg-secondary/20 border-border';

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    await clear();
    setConfirmClear(false);
  };

  return (
    <div
      className="ds-card-lg rounded-2xl bg-bg-secondary/20 border border-border p-4 md:p-6 space-y-4"
      role="region"
      aria-label={L4(language, {
        ko: 'Shadow Diff 대시보드',
        en: 'Shadow Diff Dashboard',
        ja: 'Shadow Diff ダッシュボード',
        zh: 'Shadow Diff 仪表板',
      })}
    >
      {/* ========================================================== */}
      {/* PART 5 — Header                                            */}
      {/* ========================================================== */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-[11px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent-blue" />
          {L4(language, {
            ko: 'Shadow Diff (M1.5.0)',
            en: 'Shadow Diff (M1.5.0)',
            ja: 'Shadow Diff (M1.5.0)',
            zh: 'Shadow Diff (M1.5.0)',
          })}
        </h3>
        <div className="flex items-center gap-2">
          <ModeBadge language={language} />
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            aria-label={L4(language, { ko: '새로고침', en: 'Refresh', ja: '更新', zh: '刷新' })}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/60 focus-visible:ring-2 focus-visible:ring-accent-blue transition-colors disabled:opacity-50"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <p className="text-[12px] text-text-tertiary leading-relaxed">
        {L4(language, {
          ko: 'Shadow 모드에서 저널 엔진이 기존 경로와 병렬로 기록한 쓰기의 일치율. 99.9% + 최소 100 표본 충족 시 On 승격 가능.',
          en: 'Match rate of journal engine writes shadowing the legacy path. Promotion to On requires 99.9% + 100+ samples.',
          ja: 'Shadowモードでジャーナルエンジンが既存経路と並行記録した書き込みの一致率。99.9% + 100サンプル以上でOn昇格可能。',
          zh: 'Shadow 模式下日志引擎与原路径并行写入的一致率。99.9% 且样本≥100 可晋升到 On。',
        })}
      </p>

      {/* ========================================================== */}
      {/* PART 6 — Match rate card                                    */}
      {/* ========================================================== */}
      <div className={`rounded-2xl border p-4 ${rateBg}`}>
        <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-1">
          {L4(language, {
            ko: '전체 일치율',
            en: 'Overall Match Rate',
            ja: '全体一致率',
            zh: '总体一致率',
          })}
        </div>
        <div className="flex items-baseline gap-3">
          <div className={`text-3xl font-black tabular-nums ${rateColor}`}>
            {report ? report.matchRatePct.toFixed(2) : '—'}
            <span className="text-xl">%</span>
          </div>
          {report && (
            <div className="text-[11px] text-text-tertiary">
              {L4(language, {
                ko: `일치 ${report.matched} / 전체 ${report.total}`,
                en: `${report.matched} matched / ${report.total} total`,
                ja: `一致 ${report.matched} / 合計 ${report.total}`,
                zh: `匹配 ${report.matched} / 总计 ${report.total}`,
              })}
            </div>
          )}
        </div>

        {/* 시간대별 */}
        {report && (
          <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
            <div className="flex items-center gap-1.5 text-text-tertiary">
              <Clock className="w-3 h-3" />
              {L4(language, { ko: '최근 1h', en: 'Last 1h', ja: '直近1h', zh: '近1h' })}:{' '}
              <span className="text-text-primary tabular-nums font-bold">
                {report.recent1hMatchRatePct !== null ? `${report.recent1hMatchRatePct.toFixed(2)}%` : '—'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-text-tertiary">
              <Clock className="w-3 h-3" />
              {L4(language, { ko: '최근 24h', en: 'Last 24h', ja: '直近24h', zh: '近24h' })}:{' '}
              <span className="text-text-primary tabular-nums font-bold">
                {report.recent24hMatchRatePct !== null ? `${report.recent24hMatchRatePct.toFixed(2)}%` : '—'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================== */}
      {/* PART 7 — On 승격 준비도                                    */}
      {/* ========================================================== */}
      {readiness && (
        <div
          className={`rounded-2xl border p-4 flex items-start gap-3 ${
            readiness.ready
              ? 'bg-accent-green/10 border-accent-green/30'
              : 'bg-bg-secondary/40 border-border'
          }`}
          role="status"
          aria-live="polite"
        >
          {readiness.ready ? (
            <CheckCircle2 className="w-5 h-5 text-accent-green shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-accent-amber shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <div className={`text-sm font-black ${readiness.ready ? 'text-accent-green' : 'text-text-primary'}`}>
              {readiness.ready
                ? L4(language, {
                    ko: 'On 승격 준비 완료',
                    en: 'Ready for On promotion',
                    ja: 'On昇格の準備完了',
                    zh: '准备晋升到 On',
                  })
                : L4(language, {
                    ko: 'On 승격 조건 미충족',
                    en: 'Not ready for On promotion',
                    ja: 'On昇格条件未達',
                    zh: '未达到 On 晋升条件',
                  })}
            </div>
            <div className="text-[12px] text-text-tertiary mt-1">
              {readiness.reason}
            </div>
            <div className="text-[11px] text-text-tertiary mt-1.5 tabular-nums">
              {L4(language, {
                ko: `기준 ≥ ${readiness.threshold}% · 최소 표본 ${readiness.minSampleSize}`,
                en: `Threshold ≥ ${readiness.threshold}% · Min sample ${readiness.minSampleSize}`,
                ja: `基準 ≥ ${readiness.threshold}% · 最小サンプル ${readiness.minSampleSize}`,
                zh: `阈值 ≥ ${readiness.threshold}% · 最小样本 ${readiness.minSampleSize}`,
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* PART 8 — Unmatched operations Top-10                        */}
      {/* ========================================================== */}
      <div>
        <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">
          {L4(language, {
            ko: '불일치 Top-10 operation',
            en: 'Top-10 Unmatched Operations',
            ja: '不一致 Top-10 operation',
            zh: '前 10 个不匹配操作',
          })}
        </h4>
        {!report || report.byOperation.length === 0 ? (
          <div className="text-[12px] text-text-tertiary px-2 py-3 rounded-lg bg-bg-secondary/30">
            {L4(language, {
              ko: '수집된 데이터가 없습니다 — Shadow 모드 활성화 필요',
              en: 'No data collected — enable Shadow mode',
              ja: '収集データなし — Shadowモード有効化が必要',
              zh: '无数据 — 需要启用 Shadow 模式',
            })}
          </div>
        ) : (
          <ul className="space-y-1">
            {report.byOperation
              .filter((o) => o.unmatched > 0)
              .slice(0, 10)
              .map((o) => (
                <li
                  key={o.operation}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-bg-secondary/30 hover:bg-bg-secondary/50 transition-colors text-[11px]"
                >
                  <span className="font-bold text-text-primary truncate">{o.operation}</span>
                  <div className="flex items-center gap-3 shrink-0 tabular-nums">
                    <span className="text-accent-red font-black">
                      {o.unmatched} / {o.total}
                    </span>
                    <span className="text-text-tertiary">
                      {o.matchRatePct.toFixed(1)}%
                    </span>
                  </div>
                </li>
              ))}
            {report.byOperation.filter((o) => o.unmatched > 0).length === 0 && (
              <li className="text-[12px] text-accent-green px-2 py-3 rounded-lg bg-accent-green/10">
                {L4(language, {
                  ko: '모든 operation 완전 일치',
                  en: 'All operations fully matched',
                  ja: 'すべてのoperationが完全一致',
                  zh: '所有操作完全匹配',
                })}
              </li>
            )}
          </ul>
        )}
      </div>

      {/* ========================================================== */}
      {/* PART 9 — Top diff patterns                                  */}
      {/* ========================================================== */}
      {report && report.topDiffPatterns.length > 0 && (
        <div>
          <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">
            {L4(language, {
              ko: '반복 diff 필드',
              en: 'Recurring Diff Fields',
              ja: '繰り返しdiffフィールド',
              zh: '重复 diff 字段',
            })}
          </h4>
          <div className="flex flex-wrap gap-2">
            {report.topDiffPatterns.map((p) => (
              <span
                key={p.pattern}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-accent-red/10 text-accent-red border border-accent-red/30 tabular-nums"
              >
                {p.pattern} · {p.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* PART 10 — Footer actions                                    */}
      {/* ========================================================== */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-border">
        <div className="text-[10px] text-text-tertiary tabular-nums">
          {lastRefreshedAt
            ? L4(language, {
                ko: `마지막 갱신: ${new Date(lastRefreshedAt).toLocaleTimeString()}`,
                en: `Last refreshed: ${new Date(lastRefreshedAt).toLocaleTimeString()}`,
                ja: `最終更新: ${new Date(lastRefreshedAt).toLocaleTimeString()}`,
                zh: `最后更新: ${new Date(lastRefreshedAt).toLocaleTimeString()}`,
              })
            : L4(language, {
                ko: '로딩 중…',
                en: 'Loading…',
                ja: '読み込み中…',
                zh: '加载中…',
              })}
        </div>
        <button
          type="button"
          onClick={() => void handleClear()}
          className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-accent-red/50 ${
            confirmClear
              ? 'bg-accent-red/30 text-accent-red animate-pulse'
              : 'bg-bg-tertiary text-text-tertiary hover:bg-accent-red/20 hover:text-accent-red'
          }`}
          aria-label={L4(language, {
            ko: 'Shadow 로그 초기화',
            en: 'Clear shadow log',
            ja: 'Shadowログ初期化',
            zh: '清除 Shadow 日志',
          })}
        >
          <Trash2 className="w-3 h-3" />
          {confirmClear
            ? L4(language, {
                ko: '다시 클릭해 초기화',
                en: 'Click again to clear',
                ja: 'もう一度クリックで初期化',
                zh: '再次点击以清除',
              })
            : L4(language, {
                ko: '로그 초기화',
                en: 'Clear Log',
                ja: 'ログ初期化',
                zh: '清除日志',
              })}
        </button>
      </div>
    </div>
  );
};

export default ShadowDiffDashboard;
