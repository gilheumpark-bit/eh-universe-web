/**
 * 축 2: 캐릭터 설정 준수 (Character Fidelity).
 *
 * 각 캐릭터의 이름·alias가 초안에 나타난 경우, 설정된 **금지어(forbiddenWords)**
 * 가 해당 캐릭터 맥락에 섞여 있는지 검사. 말투 재현 정확도는 AI 판정 영역이라
 * MVP에선 **금지어 기반 부정 체크**로 한정.
 *
 * 확장 포인트:
 *   - speechStyle 키워드가 대사에 얼마나 포함됐는지 (긍정 체크) — 추후 LLM
 *   - speechExample과 실제 대사의 stylometric similarity — 추후 n-gram
 */

import type { AxisContext, AxisResult, AxisIssue } from '../types';
import { DEFAULT_WEIGHTS } from '../types';

const AXIS_WEIGHT = DEFAULT_WEIGHTS[2];

export function scoreAxis2Character(ctx: AxisContext): AxisResult {
  const characters = ctx.characters ?? [];
  const draft = ctx.draft ?? '';

  if (characters.length === 0) {
    return {
      axis: 2,
      name: '캐릭터 설정 준수',
      score: 100,
      weight: AXIS_WEIGHT,
      passed: true,
      issues: [],
      recommendations: ['캐릭터 미등록 — 채점 생략 (Codex 캐릭터 정의 권장).'],
    };
  }

  const issues: AxisIssue[] = [];
  let checked = 0;
  let violations = 0;

  for (const char of characters) {
    const names = [char.name, ...(char.aliases ?? [])].filter(n => n && n.length >= 2);
    const charMentioned = names.some(n => draft.includes(n));
    if (!charMentioned) continue;
    checked += 1;

    // 금지어 매칭 — 현재 초안 내에서 캐릭터 맥락을 좁히기 어려움 (MVP)
    // 대신 초안 전체에서 금지어가 등장하면 flag. precise context-scoped 체크는
    // 추후 대사 추출 로직과 결합.
    for (const forbidden of char.forbiddenWords ?? []) {
      if (forbidden && forbidden.length >= 2 && draft.includes(forbidden)) {
        issues.push({
          severity: 'critical',
          message: `캐릭터 "${char.name}"의 금지어 "${forbidden}"가 초안에 등장.`,
        });
        violations += 1;
      }
    }
  }

  // 등장 캐릭터 수가 0이면 점수 100 (대상 없음)
  const base = checked === 0 ? 100 : 100 - violations * 15;
  const score = Math.max(0, Math.min(100, base));
  const passed = score >= 80 && !issues.some(i => i.severity === 'critical');

  return {
    axis: 2,
    name: '캐릭터 설정 준수',
    score,
    weight: AXIS_WEIGHT,
    passed,
    issues,
    recommendations: passed ? [] : [
      '캐릭터 금지어·말투 이탈 감지 — 재생성 시 해당 캐릭터의 speechStyle·forbiddenWords 재강조.',
    ],
  };
}
