"use client";

// ============================================================
// PART 1 — 문장 리듬 분석: 단문/장문 비율 시각화
// ============================================================

import { useMemo, memo } from 'react';
import { Message, AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

interface Props {
  messages: Message[];
  language: AppLanguage;
}

interface RhythmBucket {
  label: string;
  min: number;
  max: number;
  count: number;
  color: string;
}

interface RhythmStats {
  totalSentences: number;
  avgLength: number;
  shortRatio: number;  // 15자 이하 비율
  longRatio: number;   // 60자 이상 비율
  buckets: RhythmBucket[];
  rhythmScore: number; // 0-100 (균형도)
  dominantPattern: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=interfaces

// ============================================================
// PART 2 — 텍스트 분석 엔진
// ============================================================

function splitSentences(text: string): string[] {
  // 한국어·영어·일본어 혼합 문장 분리
  return text
    .split(/(?<=[.!?。！？~\n])\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 1);
}

function analyzeRhythm(messages: Message[], isKO: boolean): RhythmStats | null {
  const allText = messages
    .filter(m => m.role === 'assistant' && m.content)
    .map(m => m.content)
    .join('\n');

  if (!allText || allText.length < 100) return null;

  const sentences = splitSentences(allText);
  if (sentences.length < 5) return null;

  const lengths = sentences.map(s => s.length);
  const totalSentences = lengths.length;
  const avgLength = Math.round(lengths.reduce((s, l) => s + l, 0) / totalSentences);

  // 버킷 분류
  const bucketDefs: { label: string; labelEN: string; min: number; max: number; color: string }[] = [
    { label: '극단문', labelEN: 'Ultra-short', min: 0, max: 10, color: '#3b82f6' },
    { label: '단문', labelEN: 'Short', min: 11, max: 25, color: '#06b6d4' },
    { label: '중문', labelEN: 'Medium', min: 26, max: 45, color: '#22c55e' },
    { label: '장문', labelEN: 'Long', min: 46, max: 80, color: '#f59e0b' },
    { label: '극장문', labelEN: 'Ultra-long', min: 81, max: Infinity, color: '#ef4444' },
  ];

  const buckets: RhythmBucket[] = bucketDefs.map(def => ({
    label: isKO ? def.label : def.labelEN,
    min: def.min,
    max: def.max,
    count: lengths.filter(l => l >= def.min && l <= def.max).length,
    color: def.color,
  }));

  const shortCount = lengths.filter(l => l <= 15).length;
  const longCount = lengths.filter(l => l >= 60).length;
  const shortRatio = Math.round((shortCount / totalSentences) * 100);
  const longRatio = Math.round((longCount / totalSentences) * 100);

  // 리듬 점수: 분포가 고를수록 높음 (엔트로피 기반)
  const probs = buckets.map(b => b.count / totalSentences).filter(p => p > 0);
  const maxEntropy = Math.log(buckets.length);
  const entropy = -probs.reduce((s, p) => s + p * Math.log(p), 0);
  const rhythmScore = Math.round((entropy / maxEntropy) * 100);

  // 지배 패턴
  const maxBucket = buckets.reduce((a, b) => b.count > a.count ? b : a);
  const dominantRatio = Math.round((maxBucket.count / totalSentences) * 100);
  let dominantPattern: string;
  if (dominantRatio > 60) {
    dominantPattern = isKO
      ? `${maxBucket.label} 편향 (${dominantRatio}%)`
      : `${maxBucket.label}-heavy (${dominantRatio}%)`;
  } else if (rhythmScore > 70) {
    dominantPattern = isKO ? '균형 잡힌 리듬' : 'Balanced rhythm';
  } else {
    dominantPattern = isKO ? '혼합 리듬' : 'Mixed rhythm';
  }

  return {
    totalSentences,
    avgLength,
    shortRatio,
    longRatio,
    buckets,
    rhythmScore,
    dominantPattern,
  };
}

// IDENTITY_SEAL: PART-2 | role=text analysis | inputs=Message[] | outputs=RhythmStats

// ============================================================
// PART 3 — 시각화 렌더링
// ============================================================

function RhythmAnalyzer({ messages, language }: Props) {
  const isKO = language === 'KO';
  const stats = useMemo(() => analyzeRhythm(messages, isKO), [messages, isKO]);

  if (!stats) {
    return (
      <div className="text-center py-4 text-text-tertiary text-[10px]">
        {isKO ? '리듬 분석에 충분한 텍스트가 없습니다.' : 'Not enough text for rhythm analysis.'}
      </div>
    );
  }

  const maxCount = Math.max(...stats.buckets.map(b => b.count), 1);

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-mono">
          {L4(language, { ko: '문장 리듬 분석', en: 'Sentence Rhythm', ja: '文章リズム分析', zh: '句子节奏分析' })}
        </h3>
        <span className="text-[9px] text-text-tertiary font-mono">
          {stats.totalSentences} {isKO ? '문장' : 'sentences'}
        </span>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-black/30 rounded-lg p-2 text-center">
          <div className="text-sm font-black text-text-primary">{stats.avgLength}</div>
          <div className="text-[8px] text-text-tertiary uppercase">{isKO ? '평균 길이' : 'Avg len'}</div>
        </div>
        <div className="bg-black/30 rounded-lg p-2 text-center">
          <div className="text-sm font-black text-blue-400">{stats.shortRatio}%</div>
          <div className="text-[8px] text-text-tertiary uppercase">{isKO ? '단문' : 'Short'}</div>
        </div>
        <div className="bg-black/30 rounded-lg p-2 text-center">
          <div className="text-sm font-black text-amber-400">{stats.longRatio}%</div>
          <div className="text-[8px] text-text-tertiary uppercase">{isKO ? '장문' : 'Long'}</div>
        </div>
        <div className="bg-black/30 rounded-lg p-2 text-center">
          <div className={`text-sm font-black ${stats.rhythmScore >= 60 ? 'text-green-400' : stats.rhythmScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
            {stats.rhythmScore}
          </div>
          <div className="text-[8px] text-text-tertiary uppercase">{isKO ? '균형도' : 'Balance'}</div>
        </div>
      </div>

      {/* 히스토그램 */}
      <div className="space-y-1.5">
        {stats.buckets.map(bucket => {
          const pct = Math.max(2, (bucket.count / maxCount) * 100);
          const ratio = stats.totalSentences > 0 ? Math.round((bucket.count / stats.totalSentences) * 100) : 0;
          return (
            <div key={bucket.label} className="flex items-center gap-2">
              <span className="text-[9px] text-text-tertiary w-14 shrink-0 text-right font-mono">
                {bucket.label}
              </span>
              <div className="flex-1 h-4 bg-white/5 rounded overflow-hidden relative">
                <div
                  className="h-full rounded transition-all"
                  style={{ width: `${pct}%`, backgroundColor: bucket.color, opacity: 0.7 }}
                />
                <span className="absolute right-1 top-0 h-full flex items-center text-[8px] text-text-tertiary font-mono">
                  {bucket.count} ({ratio}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 진단 */}
      <div className="bg-black/30 border border-border/50 rounded-lg p-3">
        <div className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5">
          {L4(language, { ko: '리듬 진단', en: 'Rhythm Diagnosis', ja: 'リズム診断', zh: '节奏诊断' })}
        </div>
        <div className="text-[10px] text-text-secondary leading-relaxed space-y-1">
          <div>
            {isKO ? '지배 패턴: ' : 'Dominant: '}
            <span className="font-bold text-text-primary">{stats.dominantPattern}</span>
          </div>
          {stats.shortRatio > 50 && (
            <div className="text-blue-400">
              {isKO ? '💡 단문 비율이 높습니다. 속도감은 좋지만, 장문으로 호흡을 늘리면 깊이가 생깁니다.'
                : '💡 High short-sentence ratio. Great momentum, but longer sentences add depth.'}
            </div>
          )}
          {stats.longRatio > 40 && (
            <div className="text-amber-400">
              {isKO ? '💡 장문 비율이 높습니다. 짧은 문장을 중간에 끊어 넣으면 리듬감이 살아납니다.'
                : '💡 High long-sentence ratio. Injecting short sentences creates better rhythm.'}
            </div>
          )}
          {stats.rhythmScore >= 60 && stats.shortRatio <= 50 && stats.longRatio <= 40 && (
            <div className="text-green-400">
              {isKO ? '✓ 단문·장문이 잘 섞여 있어 리듬이 건강합니다.'
                : '✓ Good mix of short and long sentences. Healthy rhythm.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(RhythmAnalyzer);

// IDENTITY_SEAL: PART-3 | role=rhythm visualization | inputs=messages+language | outputs=JSX
