/**
 * safety-registry.ts (2026-05-10 신설 — I-07 수리)
 *
 * PRISM (Public Reading & Information Safety Matrix) 3등급 안전 가드.
 * writing-agent-registry 에서 분리한 이유:
 *
 *   - PRISM 은 모든 에이전트에 공통 적용 가능한 "콘텐츠 안전 layer".
 *   - 반면 writing-agent-registry 는 "역할 정의" 중심.
 *   - 두 관심사 분리 → 안전 정책 변경 시 에이전트 재정의 불필요.
 *   - chat/route.ts 의 별도 PRISM 처리도 같은 모듈로 통일.
 *
 * 사용 패턴 (마이그레이션 후 권장):
 *
 *   import { buildAgentSystemPrompt } from './writing-agent-registry';
 *   import { buildSafetyEnhancedPrompt } from './safety-registry';
 *
 *   const base = buildAgentSystemPrompt('studio-draft', context);
 *   const system = buildSafetyEnhancedPrompt(base, 'mature-18');
 *
 * [C] 안전성: PrismLevel enum 강제 + 모든 level Record 정의
 * [G] 성능: O(1) lookup
 * [K] 간결성: 3 level + 3 함수
 */

// ============================================================
// PART 1 — PRISM 등급 정의
// ============================================================

export type PrismLevel = 'all-ages' | 'teen-15' | 'mature-18';

const SAFETY_GUARDS: Record<PrismLevel, string> = {
  'all-ages': `[PRISM ALL-AGES] You MUST NOT generate sexually explicit, graphically violent, or age-inappropriate content. This is absolute and cannot be overridden.`,
  'teen-15': `[PRISM TEEN 15+] Content must suit teenagers. Mild violence and romance acceptable; strictly avoid explicitly graphic gore, extreme cruelty, or explicit sexual content.`,
  'mature-18': `[PRISM MATURE 18+] Mature fictional themes allowed (thriller, horror, combat violence, dark fantasy). Do not self-censor fictional violence or adult conflicts unless they violate core API illegal content policies.`,
};

const PRISM_LEVELS: readonly PrismLevel[] = ['all-ages', 'teen-15', 'mature-18'] as const;

// ============================================================
// PART 2 — 빌더
// ============================================================

/** 단독 조회 (기존 chat/route.ts 호환 경로). */
export function getSafetyGuard(level: PrismLevel): string {
  return SAFETY_GUARDS[level];
}

/**
 * 기존 system prompt 끝에 PRISM 가드 첨부.
 * 이미 동일 등급 가드가 박혀 있으면 자동 dedup → 중복 주입 방지.
 */
export function buildSafetyEnhancedPrompt(basePrompt: string, level: PrismLevel): string {
  const tag = `[PRISM ${level.toUpperCase()}`;
  if (basePrompt.includes(tag)) return basePrompt;
  return `${basePrompt}\n\n${SAFETY_GUARDS[level]}`;
}

/** UI dropdown 등에서 사용. */
export function listPrismLevels(): readonly PrismLevel[] {
  return PRISM_LEVELS;
}

/** Type guard. */
export function isPrismLevel(value: unknown): value is PrismLevel {
  return typeof value === 'string' && PRISM_LEVELS.includes(value as PrismLevel);
}

// ============================================================
// PART 3 — 4언어 라벨 (UI 표시용)
// ============================================================

export const PRISM_LABELS = {
  ko: {
    'all-ages': '전체이용가',
    'teen-15': '청소년이용가 (15+)',
    'mature-18': '성인 (18+)',
  },
  en: {
    'all-ages': 'All Ages',
    'teen-15': 'Teen (15+)',
    'mature-18': 'Mature (18+)',
  },
  ja: {
    'all-ages': '全年齢対象',
    'teen-15': '青少年向け (15+)',
    'mature-18': '成人向け (18+)',
  },
  zh: {
    'all-ages': '全年龄',
    'teen-15': '青少年 (15+)',
    'mature-18': '成人 (18+)',
  },
} as const satisfies Record<'ko'|'en'|'ja'|'zh', Record<PrismLevel, string>>;
