// ============================================================
// PART 1 — Module Header
// ============================================================
//
// lang-utils.ts — 언어 코드 정규화 유틸 (DRY).
//
// 이전: TranslatorStudioApp / AuditPanel / TripleEditor / dual-pipeline 등
//        4개 이상 모듈에서 inline 으로 동일 normalizeLang 정의 — 중복.
// 수정: 단일 함수 export — 중복 제거 + 일관성 보장.
//
// [K] 단일 책임 — 언어 코드 정규화만
// [G] 정적 매핑 — O(1)
// ============================================================

export type SupportedLang = 'ko' | 'en' | 'ja' | 'zh';

/**
 * 다양한 입력 (KO/KR/JP/JA/CN/ZH 등) → 4 표준 코드 (ko/en/ja/zh).
 *
 * ko: Korean (KO/KR)
 * ja: Japanese (JP/JA)
 * zh: Chinese (CN/ZH)
 * en: 그 외 fallback
 */
export function normalizeLang(code: string | null | undefined): SupportedLang {
  const u = (code ?? '').toUpperCase();
  if (u === 'KO' || u === 'KR') return 'ko';
  if (u === 'JP' || u === 'JA' || u === 'JAPANESE') return 'ja';
  if (u === 'CN' || u === 'ZH' || u === 'CHINESE') return 'zh';
  return 'en';
}
