/**
 * 축 5: 씬시트 이벤트 커버리지 (Scene Sheet Coverage).
 *
 * 씬시트에 정의된 예정 이벤트 문구가 초안에서 **핵심 토큰 기준**으로 반영됐는지 검사.
 *
 * MVP 방법:
 *   - 각 이벤트 문구에서 **길이 2+ 한글 토큰** 추출 (공백·조사 제거)
 *   - 이벤트 토큰 중 30% 이상이 초안에 등장하면 "커버됨"으로 판정
 */

import type { AxisContext, AxisResult, AxisIssue } from '../types';
import { DEFAULT_WEIGHTS } from '../types';

const AXIS_WEIGHT = DEFAULT_WEIGHTS[5];

/**
 * 한글·영숫자 토큰 추출 (2자 이상). 조사·공백·부호 제거.
 * 완벽한 형태소 분석 아님 — MVP 근사치.
 */
function extractTokens(text: string): string[] {
  const raw = text.split(/[^\uac00-\ud7afA-Za-z0-9]+/).filter(Boolean);
  return raw.filter(t => t.length >= 2);
}

function eventCovered(eventText: string, draft: string, threshold = 0.3): boolean {
  const tokens = extractTokens(eventText);
  if (tokens.length === 0) return true; // 비어 있으면 pass
  let found = 0;
  for (const t of tokens) {
    if (draft.includes(t)) found += 1;
  }
  return found / tokens.length >= threshold;
}

export function scoreAxis5SceneSheet(ctx: AxisContext): AxisResult {
  const events = ctx.sceneSheet?.events ?? [];
  const draft = ctx.draft ?? '';

  if (events.length === 0) {
    return {
      axis: 5,
      name: '씬시트 이벤트 커버리지',
      score: 100,
      weight: AXIS_WEIGHT,
      passed: true,
      issues: [],
      recommendations: ['씬시트 이벤트 미정의 — 채점 생략.'],
    };
  }

  const issues: AxisIssue[] = [];
  let covered = 0;
  const uncoveredEvents: string[] = [];

  for (const event of events) {
    if (eventCovered(event, draft)) {
      covered += 1;
    } else {
      uncoveredEvents.push(event);
      issues.push({
        severity: 'warning',
        message: `씬시트 이벤트 "${event.slice(0, 40)}${event.length > 40 ? '…' : ''}" 미반영.`,
      });
    }
  }

  const coverage = covered / events.length;
  const score = Math.round(coverage * 100);
  const passed = score >= 80;

  return {
    axis: 5,
    name: '씬시트 이벤트 커버리지',
    score,
    weight: AXIS_WEIGHT,
    passed,
    issues,
    recommendations: passed ? [] : [
      `이벤트 커버리지 ${Math.round(coverage * 100)}% — 미반영: ${uncoveredEvents.slice(0, 2).map(e => `"${e.slice(0, 30)}"`).join(', ')}.`,
    ],
  };
}
