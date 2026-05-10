/**
 * lang-normalize.ts (2026-05-10 신설 — I-01 수리)
 *
 * AgentLanguage ('ko'|'en'|'ja'|'zh') ↔ AppLanguage ('KO'|'EN'|'JP'|'CN')
 * 양방향 정규화 layer.
 *
 * 배경:
 *   - writing-agent-registry.ts 는 ISO 639-1 소문자 (ko/en/ja/zh) 표기.
 *   - studio-types.ts (격리 §1 — 0byte 금지) 의 AppLanguage 는 대문자 + 표기 다름:
 *     KO/EN/JP/CN. CN ≠ zh, JP ≠ ja 매핑에 특히 주의.
 *   - 두 시스템이 만나는 마이그레이션 경로에서 매핑 버그 방지가 목적.
 *
 * 결정:
 *   - studio-types.ts AppLanguage 는 절대 금지 → 변경 X.
 *   - 이 파일이 양방향 변환 wrapper. 호출 측이 명시적 변환.
 *   - 알 수 없는 입력 → ko/KO fallback (Loreguard 주력 언어).
 *   - 'kr'/'CN'/'jp' 등 비표준 별칭도 흡수 (normalizeToAgentLang).
 *
 * [C] 안전성: 미지 입력 fallback, undefined/null 안전.
 * [G] 성능: 단순 const map lookup O(1), 분기 최소.
 * [K] 간결성: 변환 2 + type guard 2 + normalizer 1.
 */

import type { AppLanguage } from '@/lib/studio-types';
import type { AgentLanguage } from './writing-agent-registry';

// ============================================================
// PART 1 — 매핑 상수
// ============================================================

const APP_TO_AGENT: Record<AppLanguage, AgentLanguage> = {
  KO: 'ko',
  EN: 'en',
  JP: 'ja',
  CN: 'zh',
};

const AGENT_TO_APP: Record<AgentLanguage, AppLanguage> = {
  ko: 'KO',
  en: 'EN',
  ja: 'JP',
  zh: 'CN',
};

const APP_LANGS: readonly AppLanguage[] = ['KO', 'EN', 'JP', 'CN'] as const;
const AGENT_LANGS: readonly AgentLanguage[] = ['ko', 'en', 'ja', 'zh'] as const;

// ============================================================
// PART 2 — 명시적 변환 (정상 입력 가정)
// ============================================================

/**
 * AppLanguage → AgentLanguage. 미지 입력은 'ko' fallback.
 * 일반적으로 AppLanguage 가 이미 정상이라 가정하나, 외부 입력에서
 * 잘못된 값이 흘러들 수 있으므로 안전 wrapper.
 */
export function toAgentLang(app: AppLanguage | string | undefined | null): AgentLanguage {
  if (!app) return 'ko';
  const upper = String(app).toUpperCase() as AppLanguage;
  return APP_TO_AGENT[upper] ?? 'ko';
}

/**
 * AgentLanguage → AppLanguage. 미지 입력은 'KO' fallback.
 */
export function toAppLang(agent: AgentLanguage | string | undefined | null): AppLanguage {
  if (!agent) return 'KO';
  const lower = String(agent).toLowerCase() as AgentLanguage;
  return AGENT_TO_APP[lower] ?? 'KO';
}

// ============================================================
// PART 3 — Type guards
// ============================================================

export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && APP_LANGS.includes(value as AppLanguage);
}

export function isAgentLanguage(value: unknown): value is AgentLanguage {
  return typeof value === 'string' && AGENT_LANGS.includes(value as AgentLanguage);
}

// ============================================================
// PART 4 — 관대 정규화 (외부 API·body·query 처리용)
// ============================================================

/**
 * 어떤 표기든 안전하게 AgentLanguage 로 정규화.
 * 'KR'/'kr'/'JP'/'jp'/'CN'/'cn'/'KOR'/'JPN'/'CHN' 등 비표준 별칭 흡수.
 *
 * 사용처: HTTP body·query string·DB 레거시 데이터 등 표기 보장이
 * 어려운 외부 입력. 내부 통신에서는 toAgentLang/toAppLang 권장.
 */
export function normalizeToAgentLang(value: unknown): AgentLanguage {
  if (typeof value !== 'string') return 'ko';
  const lower = value.toLowerCase().slice(0, 2);
  switch (lower) {
    case 'ko': return 'ko';
    case 'kr': return 'ko'; // 비표준이지만 빈번
    case 'en': return 'en';
    case 'us': return 'en'; // 'us-en' 변형
    case 'gb': return 'en';
    case 'ja': return 'ja';
    case 'jp': return 'ja';
    case 'zh': return 'zh';
    case 'cn': return 'zh';
    case 'tw': return 'zh'; // 번체도 일단 zh 로 (별도 분기 필요시 확장)
    default: return 'ko';
  }
}

/**
 * normalizeToAgentLang 의 AppLanguage 버전. UI·studio-types 경로에서 사용.
 */
export function normalizeToAppLang(value: unknown): AppLanguage {
  return toAppLang(normalizeToAgentLang(value));
}
