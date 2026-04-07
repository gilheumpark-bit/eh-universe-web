"use client";

// ============================================================
// PART 1 — 독자 피로도 감지: 반복 패턴 경고 시스템
// ============================================================

import { useMemo, memo } from 'react';
import { Message, AppLanguage } from '@/lib/studio-types';
import { EngineReport } from '@/engine/types';
import { L4 } from '@/lib/i18n';

interface Props {
  messages: Message[];
  language: AppLanguage;
}

type FatigueLevel = 'info' | 'warning' | 'danger';

interface FatigueAlert {
  id: string;
  level: FatigueLevel;
  message: string;
  detail: string;
  range: string; // "3~5화" 식의 범위
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=interfaces

// ============================================================
// PART 2 — 패턴 분석 엔진
// ============================================================

interface MetricSnapshot {
  index: number;
  tension: number;
  pacing: number;
  immersion: number;
  grade: string;
  charCount: number;
  avgSentenceLen: number;
  dialogueRatio: number;
}

function extractSnapshots(messages: Message[]): MetricSnapshot[] {
  const result: MetricSnapshot[] = [];
  let idx = 0;

  for (const msg of messages) {
    if (msg.role !== 'assistant' || !msg.content) continue;
    idx++;
    const report = msg.meta?.engineReport as EngineReport | undefined;
    const content = msg.content;

    // 문장 분리 (한국어/영어 혼합)
    const sentences = content.split(/[.!?。！？]\s*/).filter(s => s.trim().length > 2);
    const avgSentenceLen = sentences.length > 0
      ? Math.round(sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length)
      : 0;

    // 대화 비율 (따옴표 기준)
    const dialogueMatches = content.match(/["「『"](.*?)["」』"]/g) || ([] as string[]);
    const dialogueChars = dialogueMatches.reduce((sum, d) => sum + d.length, 0);
    const dialogueRatio = content.length > 0 ? Math.round((dialogueChars / content.length) * 100) : 0;

    result.push({
      index: idx,
      tension: report?.metrics?.tension ?? 0,
      pacing: report?.metrics?.pacing ?? 0,
      immersion: report?.metrics?.immersion ?? 0,
      grade: report?.grade || '—',
      charCount: content.length,
      avgSentenceLen,
      dialogueRatio,
    });
  }

  return result;
}

function detectFatigue(snapshots: MetricSnapshot[], isKO: boolean): FatigueAlert[] {
  const alerts: FatigueAlert[] = [];
  if (snapshots.length < 3) return alerts;

  // 1. 동일 긴장 범위 3회 연속
  for (let i = 0; i <= snapshots.length - 3; i++) {
    const window = snapshots.slice(i, i + 3);
    const tensionBand = window.map(s => Math.round(s.tension / 20)); // 0~5 밴드
    if (tensionBand[0] === tensionBand[1] && tensionBand[1] === tensionBand[2]) {
      alerts.push({
        id: `tension-flat-${i}`,
        level: 'warning',
        message: isKO ? '긴장감 정체 감지' : 'Tension flatline detected',
        detail: isKO
          ? `${window[0].index}~${window[2].index}화에서 긴장감이 유사 범위(${window[0].tension}~${window[2].tension}%)에 머물고 있습니다. 독자 이탈 위험.`
          : `Chapters ${window[0].index}-${window[2].index}: tension stays in similar range (${window[0].tension}-${window[2].tension}%). Risk of reader drop-off.`,
        range: `${window[0].index}~${window[2].index}`,
      });
      break; // 첫 번째만
    }
  }

  // 2. 동일 등급 3회 연속
  for (let i = 0; i <= snapshots.length - 3; i++) {
    const window = snapshots.slice(i, i + 3);
    if (window[0].grade !== '—' && window[0].grade === window[1].grade && window[1].grade === window[2].grade) {
      const g = window[0].grade;
      const isLow = ['C', 'D', 'F'].includes(g);
      alerts.push({
        id: `grade-repeat-${i}`,
        level: isLow ? 'danger' : 'info',
        message: isKO ? `동일 등급(${g}) 3회 연속` : `Same grade (${g}) 3 times in a row`,
        detail: isKO
          ? `${window[0].index}~${window[2].index}화가 모두 ${g}등급입니다. ${isLow ? '품질 개선이 필요합니다.' : '안정적이지만 변화를 시도해보세요.'}`
          : `Chapters ${window[0].index}-${window[2].index} are all grade ${g}. ${isLow ? 'Quality improvement needed.' : 'Stable, but consider trying variation.'}`,
        range: `${window[0].index}~${window[2].index}`,
      });
      break;
    }
  }

  // 3. 대화 비율 극단값 3회 연속
  for (let i = 0; i <= snapshots.length - 3; i++) {
    const window = snapshots.slice(i, i + 3);
    const allHigh = window.every(s => s.dialogueRatio > 60);
    const allLow = window.every(s => s.dialogueRatio < 10);

    if (allHigh) {
      alerts.push({
        id: `dialogue-heavy-${i}`,
        level: 'warning',
        message: isKO ? '대화 과다 패턴' : 'Dialogue-heavy pattern',
        detail: isKO
          ? `${window[0].index}~${window[2].index}화에서 대화 비율이 60% 이상입니다. 서술·묘사 비중을 높여보세요.`
          : `Chapters ${window[0].index}-${window[2].index}: dialogue ratio exceeds 60%. Consider more narration/description.`,
        range: `${window[0].index}~${window[2].index}`,
      });
      break;
    }
    if (allLow) {
      alerts.push({
        id: `dialogue-sparse-${i}`,
        level: 'info',
        message: isKO ? '대화 부족 패턴' : 'Sparse dialogue pattern',
        detail: isKO
          ? `${window[0].index}~${window[2].index}화에서 대화 비율이 10% 미만입니다. 캐릭터 목소리를 더 넣어보세요.`
          : `Chapters ${window[0].index}-${window[2].index}: dialogue under 10%. Consider adding more character voice.`,
        range: `${window[0].index}~${window[2].index}`,
      });
      break;
    }
  }

  // 4. 분량 단조 (편차 < 5%)
  if (snapshots.length >= 4) {
    const lengths = snapshots.map(s => s.charCount);
    const avgLen = lengths.reduce((s, v) => s + v, 0) / lengths.length;
    const maxDev = Math.max(...lengths.map(l => Math.abs(l - avgLen) / avgLen));
    if (maxDev < 0.05 && avgLen > 0) {
      alerts.push({
        id: 'length-monotone',
        level: 'info',
        message: isKO ? '분량 균일 패턴' : 'Uniform length pattern',
        detail: isKO
          ? `모든 챕터 분량이 거의 동일합니다(편차 <5%). 의도적이면 OK, 아니면 챕터마다 분량을 다르게 해보세요.`
          : `All chapters have nearly identical length (deviation <5%). Intentional? If not, try varying chapter length.`,
        range: `1~${snapshots.length}`,
      });
    }
  }

  // 5. 호흡(pacing) 하락 추세
  if (snapshots.length >= 4) {
    const last4 = snapshots.slice(-4);
    const declining = last4.every((s, i) => i === 0 || s.pacing <= last4[i - 1].pacing);
    if (declining && last4[3].pacing < last4[0].pacing - 15) {
      alerts.push({
        id: 'pacing-decline',
        level: 'warning',
        message: isKO ? '호흡 하락 추세' : 'Pacing decline trend',
        detail: isKO
          ? `최근 4화에서 호흡이 계속 떨어지고 있습니다(${last4[0].pacing}% → ${last4[3].pacing}%). 장면 전환이나 이벤트 삽입을 검토해보세요.`
          : `Pacing declining over last 4 chapters (${last4[0].pacing}% → ${last4[3].pacing}%). Consider adding scene breaks or events.`,
        range: `${last4[0].index}~${last4[3].index}`,
      });
    }
  }

  return alerts;
}

// IDENTITY_SEAL: PART-2 | role=pattern analysis | inputs=MetricSnapshot[] | outputs=FatigueAlert[]

// ============================================================
// PART 3 — UI 렌더링
// ============================================================

const LEVEL_STYLES: Record<FatigueLevel, { bg: string; border: string; icon: string; text: string }> = {
  danger:  { bg: 'bg-red-500/5', border: 'border-red-500/20', icon: '🔴', text: 'text-red-400' },
  warning: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', icon: '🟡', text: 'text-amber-400' },
  info:    { bg: 'bg-blue-500/5', border: 'border-blue-500/20', icon: '🔵', text: 'text-blue-400' },
};

function FatigueDetector({ messages, language }: Props) {
  const isKO = language === 'KO';
  const snapshots = useMemo(() => extractSnapshots(messages), [messages]);
  const alerts = useMemo(() => detectFatigue(snapshots, isKO), [snapshots, isKO]);

  if (snapshots.length < 3) {
    return (
      <div className="text-center py-4 text-text-tertiary text-[10px]">
        {isKO ? '피로도 분석에는 최소 3개 챕터가 필요합니다.' : 'Need at least 3 chapters for fatigue analysis.'}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-4">
        <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-mono mb-2">
          {L4(language, { ko: '독자 피로도', en: 'Reader Fatigue', ja: '読者疲労度', zh: '读者疲劳度' })}
        </h3>
        <div className="text-[10px] text-green-400">
          ✓ {isKO ? '반복 패턴이 감지되지 않았습니다. 건강한 흐름입니다.' : 'No repetitive patterns detected. Healthy flow.'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-mono">
          {L4(language, { ko: '독자 피로도 감지', en: 'Reader Fatigue Detection', ja: '読者疲労度検出', zh: '读者疲劳度检测' })}
        </h3>
        <span className="text-[9px] font-bold text-amber-400">
          {alerts.length} {isKO ? '건 감지' : 'alert(s)'}
        </span>
      </div>

      {alerts.map(alert => {
        const style = LEVEL_STYLES[alert.level];
        return (
          <div key={alert.id} className={`${style.bg} border ${style.border} rounded-lg p-3`}>
            <div className="flex items-center gap-2 mb-1">
              <span>{style.icon}</span>
              <span className={`text-[11px] font-bold ${style.text}`}>{alert.message}</span>
              <span className="text-[8px] text-text-tertiary ml-auto font-mono">
                [{alert.range}]
              </span>
            </div>
            <div className="text-[10px] text-text-secondary leading-relaxed pl-6">
              {alert.detail}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(FatigueDetector);

// IDENTITY_SEAL: PART-3 | role=fatigue UI | inputs=messages+language | outputs=JSX alert cards
