"use client";

/**
 * TranslationCostMeter (2026-05-10 신설 — P-05 수리)
 *
 * Translation Studio 의 dual-pipeline 호출 비용·시간 표시.
 *
 * 배경:
 *   - dual-pipeline 은 7 호출 (단일 5의 1.4x). Stage 1~3 공유 + Stage 4~5 병렬.
 *   - BYOK 사용자는 호출 수가 비용 직접 영향 — 가시화 필수.
 *   - DGX (자체 호스팅) 사용 시 비용 0 (단 GPU 활용도 정보 제공).
 *
 * Props:
 *   - totalCalls: dual-pipeline DualPipelineResult.totalCalls
 *   - durationMs: 동일 .durationMs
 *   - track: 'dual' | 'single' — 어느 pipeline 인지
 *   - usingDgx: 자체 호스팅 여부 (BYOK 분기)
 *   - language: 4언어 라벨
 *
 * [C] 안전성: undefined props 안전 fallback
 * [G] 성능: 정적 컴포넌트, useMemo 활용
 * [K] 간결성: 단일 컴포넌트 + 4언어 라벨
 */

import { useMemo } from 'react';

// ============================================================
// PART 1 — 4언어 라벨
// ============================================================

const LABELS = {
  ko: {
    title: '번역 비용·시간',
    calls: '호출',
    duration: '소요 시간',
    track: '파이프라인',
    dual: 'Dual (Faithful + Market)',
    single: 'Single',
    dgx: '자체 호스팅 (비용 0)',
    byok: 'BYOK',
    multiplier: '단일 대비',
    saved: '공유 base 절감',
  },
  en: {
    title: 'Translation Cost & Time',
    calls: 'Calls',
    duration: 'Duration',
    track: 'Pipeline',
    dual: 'Dual (Faithful + Market)',
    single: 'Single',
    dgx: 'Self-hosted (zero cost)',
    byok: 'BYOK',
    multiplier: 'vs single',
    saved: 'Shared-base savings',
  },
  ja: {
    title: '翻訳コストと所要時間',
    calls: '呼び出し',
    duration: '所要時間',
    track: 'パイプライン',
    dual: 'Dual (Faithful + Market)',
    single: 'Single',
    dgx: 'セルフホスト (コスト 0)',
    byok: 'BYOK',
    multiplier: 'シングル比',
    saved: '共有ベース節約',
  },
  zh: {
    title: '翻译成本与耗时',
    calls: '调用',
    duration: '耗时',
    track: '流水线',
    dual: 'Dual (Faithful + Market)',
    single: 'Single',
    dgx: '自托管 (零成本)',
    byok: 'BYOK',
    multiplier: '相比 single',
    saved: '共享底层节省',
  },
} as const;

// ============================================================
// PART 2 — Component
// ============================================================

interface Props {
  totalCalls: number;
  durationMs: number;
  track?: 'dual' | 'single';
  usingDgx?: boolean;
  language?: 'ko' | 'en' | 'ja' | 'zh';
  className?: string;
}

export default function TranslationCostMeter({
  totalCalls,
  durationMs,
  track = 'dual',
  usingDgx = false,
  language = 'ko',
  className = '',
}: Props) {
  const L = LABELS[language];

  const stats = useMemo(() => {
    const seconds = Math.round(durationMs / 100) / 10;
    const baseline = track === 'dual' ? 5 : 5;
    const multiplier = baseline > 0 ? Math.round((totalCalls / baseline) * 10) / 10 : 0;
    // dual-pipeline 의 공유 base 절감: 단순 dual 은 10 호출, 실제는 7 → 30% 절감
    const savedRatio = track === 'dual' ? Math.round(((10 - totalCalls) / 10) * 100) : 0;
    return { seconds, multiplier, savedRatio };
  }, [totalCalls, durationMs, track]);

  return (
    <div
      className={`px-4 py-3 border border-border bg-bg-primary text-xs font-mono ${className}`}
      role="status"
      aria-label={L.title}
    >
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
        <span className="font-bold tracking-wider uppercase text-text-primary">{L.title}</span>
        <span className="text-text-tertiary">
          {usingDgx ? L.dgx : L.byok}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <div className="text-text-tertiary text-[10px] uppercase tracking-wider mb-1">{L.calls}</div>
          <div className="text-text-primary text-base font-bold">{totalCalls}</div>
          {track === 'dual' && stats.savedRatio > 0 && (
            <div className="text-accent-blue text-[10px] mt-1">
              {L.saved} {stats.savedRatio}%
            </div>
          )}
        </div>

        <div>
          <div className="text-text-tertiary text-[10px] uppercase tracking-wider mb-1">{L.duration}</div>
          <div className="text-text-primary text-base font-bold">{stats.seconds}s</div>
        </div>

        <div>
          <div className="text-text-tertiary text-[10px] uppercase tracking-wider mb-1">{L.track}</div>
          <div className="text-text-primary text-sm font-bold">
            {track === 'dual' ? L.dual : L.single}
          </div>
          <div className="text-text-tertiary text-[10px] mt-1">
            {stats.multiplier}× {L.multiplier}
          </div>
        </div>
      </div>
    </div>
  );
}
