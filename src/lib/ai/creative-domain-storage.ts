/**
 * creative-domain-storage.ts (2026-05-10 신설 — 생성 도메인 선호값)
 *
 * 사용자가 창작 구조화 생성 시 사용할 도메인을 localStorage 에 저장·조회.
 * 기본은 언어 기반 자동 매핑 (KO→korean-webnovel 등). 사용자가 명시 선택 시 override.
 *
 * 사용 흐름:
 *   1) 생성 서비스가 사용자의 도메인 선호값을 참조
 *      → setStoredCreativeDomain(domain)
 *   2) /api/gemini-structured 호출 시 service 가 자동 첨부
 *      → getStoredCreativeDomain() 반환값을 body.domain 에 포함
 *   3) 서버 route.ts 의 validateDomain 통과 후 service handler 에 전달
 *   4) getDomainPrompts(language, domainOverride) 로 prompt 조립
 *
 * [C] 안전성: localStorage 미지원 환경 (SSR / private mode) 안전 fallback
 * [G] 성능: 단순 read/write — 추가 비용 0
 * [K] 간결성: 헬퍼 3개 + 1 storage key
 */

import type { CreativeDomain } from './creative-domain-prompts';

const STORAGE_KEY = 'loreguard.creative.domain';

/**
 * 다중 마운트 동기화용 storage key export.
 * 외부 구독자가 'storage' 이벤트 필터링 시 사용.
 */
export const CREATIVE_DOMAIN_STORAGE_KEY = STORAGE_KEY;

const VALID_DOMAINS: readonly CreativeDomain[] = [
  'korean-webnovel', 'western-fantasy', 'japanese-lightnovel', 'chinese-xianxia',
] as const;

/**
 * 사용자 명시 선택 도메인 조회. 없거나 invalid 시 null.
 * SSR/localStorage 사용 불가 시 안전하게 null.
 */
export function getStoredCreativeDomain(): CreativeDomain | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (!v) return null;
    return VALID_DOMAINS.includes(v as CreativeDomain) ? (v as CreativeDomain) : null;
  } catch {
    return null;
  }
}

/**
 * 사용자 선택 도메인 저장. null 전달 시 제거 (자동 매핑으로 복귀).
 */
export function setStoredCreativeDomain(domain: CreativeDomain | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (domain === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, domain);
    }
  } catch {
    // localStorage 사용 불가 — silent fail
  }
}

/** 클라이언트가 사용 가능한 모든 도메인 list. */
export const ALL_CREATIVE_DOMAINS: readonly CreativeDomain[] = VALID_DOMAINS;
