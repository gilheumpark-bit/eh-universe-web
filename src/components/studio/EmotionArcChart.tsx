"use client";

// ============================================================
// PART 1 — 감정 아크 그래프: 회차별 감정 추이 시각화
// ============================================================

import React, { useMemo } from 'react';
import { Message, AppLanguage } from '@/lib/studio-types';
import { EngineReport } from '@/engine/types';
import { L4 } from '@/lib/i18n';

interface Props {
  messages: Message[];
  language: AppLanguage;
}

interface EmotionPoint {
  index: number;
  tension: number;
  immersion: number;
  emotionScore: number; // 합산 감정 강도
  label: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=interfaces

// ============================================================
// PART 2 — 감정 데이터 추출 및 분석
// ============================================================

function extractEmotionArc(messages: Message[]): EmotionPoint[] {
  const points: EmotionPoint[] = [];
  let idx = 0;

  for (const msg of messages) {
    if (msg.role !== 'assistant' || !msg.content) continue;
    idx++;
    const report = msg.meta?.engineReport as EngineReport | undefined;
    const tension = report?.metrics?.tension ?? 0;
    const immersion = report?.metrics?.immersion ?? 0;
    const pacing = report?.metrics?.pacing ?? 0;
    // 감정 강도 = 긴장 * 0.4 + 몰입 * 0.35 + 호흡 * 0.25
    const emotionScore = Math.round(tension * 0.4 + immersion * 0.35 + pacing * 0.25);

    let label = '';
    if (emotionScore >= 80) label = '🔥';
    else if (emotionScore >= 60) label = '⚡';
    else if (emotionScore <= 20) label = '💤';

    points.push({ index: idx, tension, immersion, emotionScore, label });
  }

  return points;
}

function findPeaksAndValleys(points: EmotionPoint[]): { peaks: number[]; valleys: number[] } {
  const peaks: number[] = [];
  const valleys: number[] = [];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1].emotionScore;
    const curr = points[i].emotionScore;
    const next = points[i + 1].emotionScore;

    if (curr > prev && curr > next && curr >= 60) peaks.push(i);
    if (curr < prev && curr < next && curr <= 30) valleys.push(i);
  }

  return { peaks, valleys };
}

// IDENTITY_SEAL: PART-2 | role=emotion extraction | inputs=Message[] | outputs=EmotionPoint[]

// ============================================================
// PART 3 — SVG 감정 아크 렌더링
// ============================================================

const EMOTION_COLORS = {
  high: '#ef4444',
  mid: '#f59e0b',
  low: '#3b82f6',
  bg: 'rgba(239,68,68,0.08)',
};

function getEmotionColor(score: number): string {
  if (score >= 70) return EMOTION_COLORS.high;
  if (score >= 40) return EMOTION_COLORS.mid;
  return EMOTION_COLORS.low;
}

export default function EmotionArcChart({ messages, language }: Props) {
  const points = useMemo(() => extractEmotionArc(messages), [messages]);
  const { peaks, valleys } = useMemo(() => findPeaksAndValleys(points), [points]);

  if (points.length < 2) {
    return (
      <div className="text-center py-6 text-text-tertiary text-[10px]">
        {language === 'KO' ? '감정 아크를 표시하려면 최소 2개 챕터가 필요합니다.' : 'Need at least 2 chapters for emotion arc.'}
      </div>
    );
  }

  const w = Math.max(300, points.length * 40);
  const h = 120;
  const padX = 20;
  const padY = 10;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  const toX = (i: number) => padX + (i / (points.length - 1)) * chartW;
  const toY = (val: number) => padY + chartH - (val / 100) * chartH;

  // 곡선 포인트
  const linePoints = points.map((p, i) => `${toX(i)},${toY(p.emotionScore)}`).join(' ');
  // 영역 채움
  const areaPoints = `${toX(0)},${toY(0)} ${linePoints} ${toX(points.length - 1)},${toY(0)}`;

  // 감정 영역 색상 그라데이션
  const avgScore = Math.round(points.reduce((s, p) => s + p.emotionScore, 0) / points.length);
  const variance = Math.round(
    Math.sqrt(points.reduce((s, p) => s + (p.emotionScore - avgScore) ** 2, 0) / points.length)
  );

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)]">
          {L4(language, { ko: '감정 아크', en: 'Emotion Arc', jp: '感情アーク', cn: '情感弧线' })}
        </h3>
        <div className="flex gap-3 text-[8px] text-text-tertiary">
          <span>AVG: <span className="text-text-secondary font-bold">{avgScore}%</span></span>
          <span>{L4(language, { ko: '변동', en: 'Var', jp: '変動', cn: '变动' })}: <span className="text-text-secondary font-bold">{variance}</span></span>
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28" preserveAspectRatio="xMidYMid meet" role="img" aria-label={L4(language, { ko: '감정 아크 차트', en: 'Emotion arc chart', jp: '感情アークチャート', cn: '情感弧线图表' })}>
        <defs>
          <linearGradient id="emotionGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* 배경 격자 */}
        {[25, 50, 75].map(v => (
          <line key={v} x1={padX} y1={toY(v)} x2={w - padX} y2={toY(v)}
            stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        ))}

        {/* 감정 영역 (그라데이션 채움) */}
        <polygon points={areaPoints} fill="url(#emotionGrad)" />

        {/* 감정 라인 */}
        <polyline fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round"
          points={linePoints} />

        {/* 긴장감 보조 라인 */}
        <polyline fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="3,3" opacity="0.5"
          points={points.map((p, i) => `${toX(i)},${toY(p.tension)}`).join(' ')} />

        {/* 몰입도 보조 라인 */}
        <polyline fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="3,3" opacity="0.5"
          points={points.map((p, i) => `${toX(i)},${toY(p.immersion)}`).join(' ')} />

        {/* 피크 마커 */}
        {peaks.map(i => (
          <g key={`peak-${i}`}>
            <circle cx={toX(i)} cy={toY(points[i].emotionScore)} r="5"
              fill="#ef4444" opacity="0.3" />
            <circle cx={toX(i)} cy={toY(points[i].emotionScore)} r="3"
              fill="#ef4444" />
            <text x={toX(i)} y={toY(points[i].emotionScore) - 8}
              fill="#ef4444" fontSize="7" textAnchor="middle" fontWeight="bold">
              ▲{points[i].emotionScore}
            </text>
          </g>
        ))}

        {/* 밸리 마커 */}
        {valleys.map(i => (
          <g key={`valley-${i}`}>
            <circle cx={toX(i)} cy={toY(points[i].emotionScore)} r="4"
              fill="#3b82f6" opacity="0.4" />
            <text x={toX(i)} y={toY(points[i].emotionScore) + 12}
              fill="#3b82f6" fontSize="7" textAnchor="middle">
              ▼{points[i].emotionScore}
            </text>
          </g>
        ))}

        {/* 데이터 포인트 */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(p.emotionScore)} r="2.5"
              fill={getEmotionColor(p.emotionScore)} />
            {p.label && (
              <text x={toX(i)} y={padY - 1} fontSize="8" textAnchor="middle">
                {p.label}
              </text>
            )}
          </g>
        ))}

        {/* X축 레이블 */}
        {points.map((p, i) => (
          <text key={`label-${i}`} x={toX(i)} y={h - 1}
            fill="rgba(255,255,255,0.3)" fontSize="6" textAnchor="middle">
            {p.index}
          </text>
        ))}
      </svg>

      {/* 범례 */}
      <div className="flex flex-wrap gap-4 text-[8px]">
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 bg-amber-500 inline-block rounded" />
          {L4(language, { ko: '감정 강도', en: 'Emotion Score', jp: '感情強度', cn: '情感强度' })}
        </span>
        <span className="flex items-center gap-1 opacity-50">
          <span className="w-4 h-0.5 bg-red-500 inline-block rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #ef4444 0 3px, transparent 3px 6px)' }} />
          {L4(language, { ko: '긴장감', en: 'Tension', jp: '緊張感', cn: '紧张感' })}
        </span>
        <span className="flex items-center gap-1 opacity-50">
          <span className="w-4 h-0.5 bg-green-500 inline-block rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #22c55e 0 3px, transparent 3px 6px)' }} />
          {L4(language, { ko: '몰입도', en: 'Immersion', jp: '没入度', cn: '沉浸度' })}
        </span>
        <span className="text-red-400">▲ {L4(language, { ko: '피크', en: 'Peak', jp: 'ピーク', cn: '峰值' })}</span>
        <span className="text-blue-400">▼ {L4(language, { ko: '밸리', en: 'Valley', jp: '谷', cn: '谷值' })}</span>
      </div>

      {/* 감정 흐름 진단 */}
      {points.length >= 3 && (
        <div className="bg-black/30 border border-border/50 rounded-lg p-3">
          <div className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5">
            {L4(language, { ko: '흐름 진단', en: 'Flow Diagnosis', jp: 'フロー診断', cn: '流程诊断' })}
          </div>
          <div className="text-[10px] text-text-secondary leading-relaxed">
            {variance < 10 ? (
              <span className="text-amber-400">
                {L4(language, {
                  ko: '⚠ 감정 변동폭이 낮습니다. 클라이맥스 구간에 더 강한 긴장을 넣어보세요.',
                  en: '⚠ Low emotional variance. Consider adding stronger tension at climax points.',
                  jp: '⚠ 感情の変動幅が低いです。クライマックスにもっと強い緊張を入れてみてください。',
                  cn: '⚠ 情感变动幅度较低。考虑在高潮部分加入更强的紧张感。',
                })}
              </span>
            ) : variance > 35 ? (
              <span className="text-blue-400">
                {L4(language, {
                  ko: '💡 감정 기복이 큽니다. 독자 안정 구간(쿨링 비트)을 확인해보세요.',
                  en: '💡 High emotional swings. Check for reader cooling beats.',
                  jp: '💡 感情の起伏が大きいです。読者安定区間を確認してください。',
                  cn: '💡 情感起伏较大。请检查读者冷却节点。',
                })}
              </span>
            ) : (
              <span className="text-green-400">
                {L4(language, {
                  ko: '✓ 감정 흐름이 건강한 범위 내에 있습니다.',
                  en: '✓ Emotional flow is within a healthy range.',
                  jp: '✓ 感情の流れは健全な範囲内です。',
                  cn: '✓ 情感流程在健康范围内。',
                })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=SVG emotion arc rendering | inputs=messages+language | outputs=JSX
