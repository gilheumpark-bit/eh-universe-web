/**
 * codex-prompts/index.ts — 4 도메인 dispatcher.
 *
 * Codex 호출 측 (geminiStructuredTaskService) 의 단일 진입점.
 * AppLanguage → CodexDomain → CodexDomainPrompts 매핑을 통해
 * 그 언어 / 그 문화권에 맞는 prompt 출력.
 *
 * 도메인 매핑 (default, 사용자 override 가능):
 *   KO → korean-webnovel (한국 웹소설)
 *   EN → western-fantasy (Western fantasy/epic)
 *   JP → japanese-lightnovel (라노벨)
 *   CN → chinese-xianxia (중국 선협·현환)
 *
 * 사용:
 *   import { getDomainPrompts } from '@/lib/ai/codex-prompts';
 *   const prompts = getDomainPrompts(language); // AppLanguage
 *   const prompt = prompts.buildCharactersPrompt({ ... });
 */

import type { AppLanguage } from '@/lib/studio-types';
import type { CodexDomain, CodexDomainPrompts } from './types';
import { defaultDomainFor } from './types';
import { KO_WEBNOVEL } from './ko';
import { EN_FANTASY } from './en';
import { JA_LIGHTNOVEL } from './ja';
import { ZH_XIANXIA } from './zh';

// ============================================================
// PART 1 — Domain → Prompts 매핑
// ============================================================

const DOMAIN_PROMPTS: Record<CodexDomain, CodexDomainPrompts> = {
  'korean-webnovel': KO_WEBNOVEL,
  'western-fantasy': EN_FANTASY,
  'japanese-lightnovel': JA_LIGHTNOVEL,
  'chinese-xianxia': ZH_XIANXIA,
};

// ============================================================
// PART 2 — 진입점
// ============================================================

/**
 * 명시적 도메인으로 prompt 모듈 조회.
 * 작가가 언어와 다른 도메인 (예: 영어로 무협) 을 원할 때 사용.
 */
export function getDomainPromptsByDomain(domain: CodexDomain): CodexDomainPrompts {
  return DOMAIN_PROMPTS[domain];
}

/**
 * AppLanguage → 기본 도메인 → prompt 모듈.
 * override 인자로 사용자가 도메인을 명시적으로 지정 가능.
 */
export function getDomainPrompts(
  language: AppLanguage,
  override?: CodexDomain,
): CodexDomainPrompts {
  const domain = override ?? defaultDomainFor(language);
  return DOMAIN_PROMPTS[domain];
}

// ============================================================
// PART 3 — Re-export
// ============================================================

export type {
  CodexDomain,
  CodexDomainPrompts,
  CharactersPromptInput,
  ItemsPromptInput,
  SkillsPromptInput,
  MagicSystemsPromptInput,
  WorldDesignPromptInput,
  WorldSimPromptInput,
  SceneDirectionPromptInput,
} from './types';

export { defaultDomainFor } from './types';
