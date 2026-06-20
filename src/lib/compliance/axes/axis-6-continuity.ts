/**
 * 축 6: 어조·시점 연속성 (Continuity).
 *
 * 이전 화의 POV·문체·밀도와 이번 화의 일치도를 검사.
 *
 * MVP 방법:
 *   - POV 비율 편차 (first-person ratio 차이 > 0.3이면 점프)
 *   - 평균 문장 길이 편차 (20% 이상 차이면 경고)
 *   - 대사 비율 편차 (따옴표 비율 30% 이상 차이면 경고)
 *
 * 이전 화가 없으면 만점 처리 (첫 화 등).
 */

import type { AxisContext, AxisResult, AxisIssue } from '../types';
import { DEFAULT_WEIGHTS } from '../types';

const AXIS_WEIGHT = DEFAULT_WEIGHTS[6];

function firstPersonRatio(text: string): number {
  const tokens = ['나는 ', '내가 ', '나의 ', '나를 '];
  let first = 0;
  for (const t of tokens) {
    let idx = text.indexOf(t);
    while (idx !== -1) {
      first += 1;
      idx = text.indexOf(t, idx + t.length);
    }
  }
  const words = text.split(/\s+/).filter(Boolean).length;
  return words === 0 ? 0 : first / words;
}

function avgSentenceLength(text: string): number {
  const sentences = text.split(/[.!?。…]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  const total = sentences.reduce((s, sent) => s + sent.trim().length, 0);
  return total / sentences.length;
}

function dialogueRatio(text: string): number {
  // 따옴표 안 텍스트 비율 (한글 「」, 『』, "…", '…')
  const matches = text.match(/(?:"[^"]*"|「[^」]*」|『[^』]*』|'[^']*')/g) ?? [];
  const dialogueChars = matches.reduce((s, m) => s + m.length, 0);
  const total = text.length;
  return total === 0 ? 0 : dialogueChars / total;
}

export function scoreAxis6Continuity(ctx: AxisContext): AxisResult {
  const draft = ctx.draft ?? '';
  const prev = ctx.previousChapter ?? '';

  if (!prev.trim()) {
    return {
      axis: 6,
      name: '어조·시점 연속성',
      score: 100,
      weight: AXIS_WEIGHT,
      passed: true,
      issues: [],
      recommendations: ['이전 화 미제공 — 연속성 채점 생략 (첫 화이거나 단편일 가능성).'],
    };
  }

  const issues: AxisIssue[] = [];
  let penalty = 0;

  const povDelta = Math.abs(firstPersonRatio(draft) - firstPersonRatio(prev));
  if (povDelta > 0.03) { // 문장당 비율 기준 3% (작은 수지만 POV 점프에 민감)
    penalty += 20;
    issues.push({
      severity: 'critical',
      message: `1인칭 비율 변동 ${(povDelta * 100).toFixed(1)}%p — POV 점프 의심.`,
    });
  }

  const prevLen = avgSentenceLength(prev);
  const curLen = avgSentenceLength(draft);
  if (prevLen > 0) {
    const lenDelta = Math.abs(curLen - prevLen) / prevLen;
    if (lenDelta > 0.2) {
      penalty += 10;
      issues.push({
        severity: 'warning',
        message: `평균 문장 길이 ${Math.round(lenDelta * 100)}% 변동 — 리듬 이탈.`,
      });
    }
  }

  const prevDlg = dialogueRatio(prev);
  const curDlg = dialogueRatio(draft);
  if (Math.abs(prevDlg - curDlg) > 0.3) {
    penalty += 10;
    issues.push({
      severity: 'warning',
      message: `대사 비율 ${Math.round(Math.abs(prevDlg - curDlg) * 100)}%p 변동 — 장면 성격 이탈.`,
    });
  }

  const score = Math.max(0, 100 - penalty);
  const passed = score >= 80 && !issues.some(i => i.severity === 'critical');

  return {
    axis: 6,
    name: '어조·시점 연속성',
    score,
    weight: AXIS_WEIGHT,
    passed,
    issues,
    recommendations: passed ? [] : [
      '이전 화 대비 리듬·POV 편차 — 재생성 시 이전 화 마지막 단락을 참조 컨텍스트로 주입.',
    ],
  };
}
