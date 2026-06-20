/**
 * 축 3: 연출 지시 준수 (Direction — POV & Tone).
 *
 * 씬시트에 명시된 POV(1인칭/3인칭/전지)와 분위기 키워드가 초안에서 유지되는지 검사.
 *
 * MVP 방법:
 *   - POV: "나는 / 내가 / 나의" 등 1인칭 대명사와 "그는 / 그녀는 / 그들" 등 3인칭
 *     대명사 출현 빈도를 단락 단위로 집계.
 *   - Tone: 분위기 키워드 리스트가 초안에 몇 개 매칭되는지.
 */

import type { AxisContext, AxisResult, AxisIssue, Pov } from '../types';
import { DEFAULT_WEIGHTS } from '../types';

const AXIS_WEIGHT = DEFAULT_WEIGHTS[3];

const FIRST_PERSON = ['나는 ', '내가 ', '나의 ', '나를 ', '내게 '];
const THIRD_PERSON = ['그는 ', '그녀는 ', '그들은 ', '그의 ', '그녀의 '];

function detectPov(draft: string): Pov {
  let first = 0;
  let third = 0;
  for (const token of FIRST_PERSON) first += countOccurrences(draft, token);
  for (const token of THIRD_PERSON) third += countOccurrences(draft, token);
  if (first === 0 && third === 0) return 'unknown';
  if (first >= third * 2) return 'first';
  if (third >= first * 2) return 'third';
  return 'omniscient';
}

function countOccurrences(text: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = text.indexOf(needle);
  while (idx !== -1) {
    count += 1;
    idx = text.indexOf(needle, idx + needle.length);
  }
  return count;
}

export function scoreAxis3Direction(ctx: AxisContext): AxisResult {
  const scene = ctx.sceneSheet;
  const draft = ctx.draft ?? '';

  if (!scene || (!scene.pov && (!scene.atmosphereKeywords || scene.atmosphereKeywords.length === 0))) {
    return {
      axis: 3,
      name: '연출 지시 준수',
      score: 100,
      weight: AXIS_WEIGHT,
      passed: true,
      issues: [],
      recommendations: ['씬시트 연출 지시 미정의 — 채점 생략.'],
    };
  }

  const issues: AxisIssue[] = [];
  let povPenalty = 0;
  if (scene.pov && scene.pov !== 'unknown') {
    const detected = detectPov(draft);
    if (detected !== 'unknown' && detected !== scene.pov) {
      povPenalty = 30;
      issues.push({
        severity: 'critical',
        message: `씬시트 POV=${scene.pov} vs 초안 감지 POV=${detected}.`,
      });
    }
  }

  let tonePenalty = 0;
  if (scene.atmosphereKeywords && scene.atmosphereKeywords.length > 0) {
    let matched = 0;
    for (const kw of scene.atmosphereKeywords) {
      if (kw && kw.length >= 2 && draft.includes(kw)) matched += 1;
    }
    const ratio = matched / scene.atmosphereKeywords.length;
    if (ratio < 0.3) {
      tonePenalty = 15;
      issues.push({
        severity: 'warning',
        message: `분위기 키워드 매칭 ${Math.round(ratio * 100)}% — 톤 이탈 의심.`,
      });
    }
  }

  const score = Math.max(0, 100 - povPenalty - tonePenalty);
  const passed = score >= 80 && !issues.some(i => i.severity === 'critical');

  return {
    axis: 3,
    name: '연출 지시 준수',
    score,
    weight: AXIS_WEIGHT,
    passed,
    issues,
    recommendations: passed ? [] : [
      povPenalty > 0 ? `POV 불일치 — 씬시트의 ${scene.pov}로 재생성.` : '',
      tonePenalty > 0 ? `분위기 키워드 반영 강화 — ${(scene.atmosphereKeywords ?? []).slice(0, 3).join(', ')}.` : '',
    ].filter(Boolean),
  };
}
