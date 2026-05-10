/**
 * codex-prompts/types.ts (2026-05-10 신설 — I-06 수리)
 *
 * Codex 구조화 생성기 (캐릭터·아이템·스킬·마법·세계관 등) 의
 * 4 도메인 × 7 handler prompt 매트릭스 타입 정의.
 *
 * 도메인 ↔ 언어 1:1 매핑 (default):
 *   ko → korean-webnovel  (한국 웹소설 — 회귀/빙의/헌터/무협 정형)
 *   en → western-fantasy  (Western fantasy/epic — sword & sorcery 정형)
 *   ja → japanese-lightnovel (일본 라노벨 — 異世界転生·属性魔法 정형)
 *   zh → chinese-xianxia  (중국 선협·현환 — 修真境界·法宝 정형)
 *
 * 사용자 결정 (2026-05-10): "각 나라 문법 훼손 X" — 각 도메인 prompt 는
 * 그 언어로 직접 작성. 영어 명령 + 다른 언어 출력 강제 패턴 폐기.
 *
 * 호출 측 (geminiStructuredTaskService) 는 language → domain 매핑 후
 * domain 모듈에서 prompt builder 호출.
 *
 * [C] 안전성: 도메인 enum + Record<CodexDomain> 강제
 * [G] 성능: O(1) 도메인 lookup
 * [K] 간결성: 각 도메인 모듈이 동일 7 builder 인터페이스 export
 */

import type { AppLanguage } from '@/lib/studio-types';

// ============================================================
// PART 1 — Domain enum + 1:1 language mapping
// ============================================================

export type CodexDomain =
  | 'korean-webnovel'
  | 'western-fantasy'
  | 'japanese-lightnovel'
  | 'chinese-xianxia';

const APP_LANG_TO_DOMAIN: Record<AppLanguage, CodexDomain> = {
  KO: 'korean-webnovel',
  EN: 'western-fantasy',
  JP: 'japanese-lightnovel',
  CN: 'chinese-xianxia',
};

/** AppLanguage → 기본 CodexDomain. 향후 사용자 override 가능. */
export function defaultDomainFor(lang: AppLanguage): CodexDomain {
  return APP_LANG_TO_DOMAIN[lang] ?? 'korean-webnovel';
}

// ============================================================
// PART 2 — Prompt builder 인터페이스
// ============================================================

export interface CharactersPromptInput {
  genre: string;
  synopsis: string;
  count: number;
  existingNames: string[];
}

export interface ItemsPromptInput {
  genre: string;
  synopsis: string;
  count: number;
  existingNames: string[];
}

export interface SkillsPromptInput {
  genre: string;
  synopsis: string;
  count: number;
  existingNames: string[];
}

export interface MagicSystemsPromptInput {
  genre: string;
  synopsis: string;
  count: number;
  existingNames: string[];
}

export interface WorldDesignPromptInput {
  genre: string;
  hints?: {
    title?: string;
    povCharacter?: string;
    setting?: string;
    primaryEmotion?: string;
    synopsis?: string;
    subGenreTags?: string[];
    narrativeIntensity?: string;
    totalEpisodes?: number;
    platform?: string;
  };
}

export interface WorldSimPromptInput {
  synopsis: string;
  genre: string;
  worldContext?: {
    corePremise?: string;
    powerStructure?: string;
    currentConflict?: string;
    factionRelations?: string;
  };
}

export interface SceneDirectionPromptInput {
  synopsis: string;
  characters: string[];
  tierContext?: {
    charProfiles?: { name: string; desire?: string; conflict?: string; changeArc?: string; values?: string }[];
    corePremise?: string;
    powerStructure?: string;
    currentConflict?: string;
  };
}

/**
 * 각 도메인 모듈이 구현해야 할 7 builder 인터페이스.
 * 모든 함수는 system prompt 또는 user prompt 한 덩어리 반환.
 * JSON schema 자체는 호출 측 (geminiStructuredTaskService) 책임.
 */
export interface CodexDomainPrompts {
  buildCharactersPrompt(input: CharactersPromptInput): string;
  buildItemsPrompt(input: ItemsPromptInput): string;
  buildSkillsPrompt(input: SkillsPromptInput): string;
  buildMagicSystemsPrompt(input: MagicSystemsPromptInput): string;
  buildWorldDesignPrompt(input: WorldDesignPromptInput): string;
  buildWorldSimPrompt(input: WorldSimPromptInput): string;
  buildSceneDirectionPrompt(input: SceneDirectionPromptInput): string;
}
