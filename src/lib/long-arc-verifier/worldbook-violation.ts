// ============================================================
// PART 1 — Module Header
// ============================================================
//
// worldbook-violation.ts — 세계관 룰 위반 검증.
//
// 휴리스틱 매칭:
//   StoryConfig 의 magicTechSystem / lawOrder / taboo 등에서 "X 못 함" / "Y 금지" 패턴 추출
//   → 본문에서 해당 X/Y 등장 시 위반 후보로 마킹.
//
// Phase 1 한계:
//   - 의미적 위반 (마법 못 쓰는 캐릭터가 마법 사용) 100% 잡기 어려움 — LLM 보조 Phase 2
//   - 단순 키워드 매칭 — false positive 가능 (사용자 dismiss 가능)
//
// [C] 룰 빈 입력 → 위반 0
// [G] regex pre-compile 1회
// [K] 5종 룰 패턴만 — over-engineering 회피
// ============================================================

import type { StoryConfig, EpisodeManuscript } from '@/lib/studio-types';
import type { AxisResult, Violation } from './types';

// ============================================================
// PART 2 — Rule extraction patterns
// ============================================================

/** 룰 텍스트에서 "X 못 함" / "X 금지" 류 패턴 추출 */
function extractProhibitions(text: string | undefined): string[] {
  if (!text) return [];
  const out: string[] = [];
  const patterns: RegExp[] = [
    /([가-힣a-zA-Z]{2,15})\s*(?:못|불가|금지|허용되지)/g,
    /([가-힣a-zA-Z]{2,15})\s*(?:할 수 없|쓸 수 없)/g,
    /(?:no|cannot|forbidden)\s+([a-zA-Z]{3,20})/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const target = m[1].trim();
      if (target.length >= 2) out.push(target);
    }
  }
  return Array.from(new Set(out));
}

// ============================================================
// PART 3 — Axis runner
// ============================================================

export function runWorldViolationAxis(
  config: StoryConfig | null | undefined,
  episodes: EpisodeManuscript[] | null | undefined,
): AxisResult {
  const start = Date.now();

  if (!config || !episodes || episodes.length === 0) {
    return {
      axis: 'world',
      score: 100,
      violations: [],
      durationMs: Date.now() - start,
    };
  }

  // 룰북 영역 5개에서 prohibition 추출
  const ruleFields: Array<[string, string | undefined]> = [
    ['magic', config.magicTechSystem],
    ['law', config.lawOrder],
    ['taboo', config.taboo],
    ['religion', config.religion],
    ['social', config.socialSystem],
  ];

  const prohibitions: Array<{ field: string; keyword: string }> = [];
  for (const [field, val] of ruleFields) {
    for (const kw of extractProhibitions(val)) {
      prohibitions.push({ field, keyword: kw });
    }
  }

  if (prohibitions.length === 0) {
    return {
      axis: 'world',
      score: 100,
      violations: [],
      durationMs: Date.now() - start,
    };
  }

  // 각 episode 본문에 prohibition 키워드 등장 시 위반 후보
  const violations: Violation[] = [];
  for (const ep of episodes) {
    if (!ep.content) continue;
    for (const { field, keyword } of prohibitions) {
      // 키워드 등장 + 긍정 문맥 (예: "마법을 사용했다") 휴리스틱
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const positiveCtx = new RegExp(
        `${escaped}.{0,20}(?:사용|썼|발동|시전|행사|발현|사용했|쓸 수 있|허용)`,
        'g',
      );
      const matches = ep.content.match(positiveCtx);
      if (matches && matches.length > 0) {
        violations.push({
          kind: 'world-rule-violation',
          severity: 'warning',
          episodeId: ep.episode,
          messages: {
            ko: `세계관 룰 후보 위반 (${field}): "${keyword}" 금지로 정의되었으나 EP${ep.episode} 에서 사용 표현 발견`,
            en: `World rule candidate violation (${field}): "${keyword}" defined as prohibited but used in EP${ep.episode}`,
            ja: `世界観ルール違反候補 (${field}): EP${ep.episode}`,
            zh: `世界观规则疑似违反 (${field}): EP${ep.episode}`,
          },
          jumpTarget: { episodeId: ep.episode },
          meta: { field, keyword, occurrences: matches.length },
        });
      }
    }
  }

  const score = Math.max(0, 100 - violations.length * 8);

  return {
    axis: 'world',
    score,
    violations,
    durationMs: Date.now() - start,
  };
}
