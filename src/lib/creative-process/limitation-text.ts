// ============================================================
// Limitation Text — 4언어 디스클레이머 byte-level 고정 + 금지어 검증
// ============================================================
//
// 본 파일은 변경 추적의 핵심. 디스클레이머·금지어 변경 시
// `limitationTextVersion` 도 동시 갱신하고 PR 리뷰 필수.
//
// 사상 정합:
//   - 9차 §10 "Loreguard가 해야 할 말 = 정보 자료, 판정 X"
//   - 14차 §3 엄밀성 시장 게이트키퍼 = 책임 회피 단어 명시 부정
//   - 미국 변호사 감수 대비 (Authorship Disclosure 단어 위험 회피)
// ============================================================

import type { CertificateLanguage } from './types';

// ============================================================
// PART 1 — 4언어 디스클레이머 (byte-level 고정)
// ============================================================
//
// 변경 시 반드시:
//   1. PR 리뷰 + 변호사 1회 재감수
//   2. limitationTextVersion 갱신 (Major bump)
//   3. 단위 테스트의 fixture 업데이트
//   4. 빌드 dist 까지 grep 검증
//
// 영문은 "does not constitute legal certification, attestation,
// or evidence in any judicial proceeding" 3대 위험 단어를
// 첫 줄에서 명시 부정. 미국 변호사가 봐도 깐깐하게 짠 디스클레이머.

export const LIMITATION_TEXT_4LANG: Record<CertificateLanguage, string> = {
  // [M-06 — 2026-05-10] ko/ja 보강 — en/zh 와 동일 강도 (사법 절차 증거 부정 명시).
  ko: '이 문서는 법적 효력을 가지지 않으며, 사법 절차의 증거로 사용될 수 없습니다. 작가가 Loreguard에서 작업한 과정을 기록한 정보 자료입니다.',
  en: 'This is an automatically maintained journal of authorship activities performed in Loreguard. It is not a legal certification, attestation, or evidence of authorship in any judicial proceeding.',
  ja: '本書は法的効力を持たず、いかなる司法手続きにおいても証拠として用いることはできません。Loreguard において作家が行った作業過程を記録した情報資料です。',
  zh: '本文件仅为信息记录,不具有法律效力,亦不构成任何司法程序中的证据。',
} as const;

/** 디스클레이머 텍스트 버전 (변경 추적). [M-06 — 2026-05-10] 1.0.0 → 1.1.0 (ko/ja 보강) */
export const LIMITATION_TEXT_VERSION = '1.1.0' as const;

// ============================================================
// PART 2 — 4언어 금지어 사전
// ============================================================
//
// 본 사전 위반 시 report-builder가 throw → 외부 출력 0건 차단.
// LIMITATION_TEXT_4LANG 자체는 검사 skip (이미 byte-level 고정).
//
// 한국어: 보증·인증·증명·효력·판정 — 14차 §2 "보증 사기" 카테고리
// 영문: certified·verified·attested·judicial·evidence — 미국 법무 위험
// 일본: 保証·認証·証明·判定 — 일본 거래법 위험
// 중국: 保证·认证·证明·判定 — 중국 PIPL·계약법 위험

export const FORBIDDEN_WORDS_4LANG: Record<CertificateLanguage, readonly string[]> = {
  ko: ['보증', '인증', '증명', '효력', '판정'],
  en: ['certified', 'verified', 'attested', 'judicial', 'evidence'],
  ja: ['保証', '認証', '証明', '判定'],
  zh: ['保证', '认证', '证明', '判定'],
} as const;

// ============================================================
// PART 3 — 검사 함수
// ============================================================

/**
 * 텍스트에 금지어 포함 시 throw.
 *
 * @param text 검사 대상
 * @param language 언어 (사전 분기)
 * @throws Error('FORBIDDEN_WORD: <word> in <language>') 위반 시
 *
 * 예외: LIMITATION_TEXT_4LANG[language] 와 정확히 일치하면 skip
 *      (디스클레이머 자체에 들어간 단어는 검증 통과 의도).
 */
export function assertNoForbiddenWords(
  text: string,
  language: CertificateLanguage,
): void {
  // [C] 빈 문자열·null 가드
  if (!text) return;

  // [K] 디스클레이머 본문은 검사 skip
  if (text === LIMITATION_TEXT_4LANG[language]) return;

  const forbidden = FORBIDDEN_WORDS_4LANG[language];
  for (const word of forbidden) {
    // [G] 영문은 case-insensitive, CJK 는 그대로
    const found = language === 'en'
      ? text.toLowerCase().includes(word.toLowerCase())
      : text.includes(word);
    if (found) {
      throw new Error(`FORBIDDEN_WORD: ${word} in ${language}`);
    }
  }
}

/**
 * 디스클레이머 첫 줄 (HTML/Markdown 렌더러 공통 사용).
 *
 * @param language 언어
 * @returns byte-level 고정 디스클레이머
 */
export function getDisclaimer(language: CertificateLanguage): string {
  return LIMITATION_TEXT_4LANG[language];
}
