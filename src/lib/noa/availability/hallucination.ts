// ============================================================
// NOA Availability — Hallucination Detection
// Source: NOA v401 Sovereign Genesis (HallucinationAdvisor)
// ============================================================

import type { HallucinationCheck } from "../types";

/**
 * 프롬프트 대비 응답 길이 비율로 할루시네이션을 감지한다.
 * 짧은 질문에 지나치게 긴 응답 → 할루 의심
 *
 * ratio > 3.0 → suspicious
 *
 * @param promptLength - 사용자 입력 길이 (문자 수)
 * @param responseLength - AI 응답 길이 (문자 수)
 * @returns 할루시네이션 체크 결과
 *
 * Phase 2: v32.0 확신 어미/가짜 권위 감지 추가 완료
 */
export function checkHallucination(
  promptLength: number,
  responseLength: number,
  responseText?: string
): HallucinationCheck {
  if (responseLength === 0 || promptLength === 0) {
    return { ratio: 0, suspicious: false };
  }

  const ratio = responseLength / Math.max(promptLength, 1);
  const reasons: string[] = [];

  // 1. 과잉 응답 비율 체크 (기존 로직)
  if (ratio > 3.0) {
    reasons.push(`응답/질문 비율 ${ratio.toFixed(1)}x — 과잉 응답 의심`);
  }

  // 2. v32.0 확신 어미 감지 (Korean certainty endings)
  if (responseText) {
    const certaintyScore = detectCertaintyEndings(responseText);
    if (certaintyScore > 0) {
      reasons.push(`확신 어미 ${certaintyScore}건 감지`);
    }

    // 3. v32.0 가짜 전문가 인용 감지
    const fakeAuthorityCount = detectFakeAuthority(responseText);
    if (fakeAuthorityCount > 0) {
      reasons.push(`가짜 권위 인용 ${fakeAuthorityCount}건 감지`);
    }
  }

  return {
    ratio: Math.round(ratio * 100) / 100,
    suspicious: reasons.length > 0,
    reason: reasons.length > 0 ? reasons.join("; ") : undefined,
  };
}

// ── v32.0 확신 어미 감지 ──

/** 한국어 확신 어미 패턴 (과도한 확신 표현은 할루시네이션 지표) */
const CERTAINTY_ENDINGS: readonly RegExp[] = [
  /확실합니다/g,
  /틀림없습니다/g,
  /분명합니다/g,
  /반드시\s.{0,10}입니다/g,
  /100%\s*.{0,10}입니다/g,
  /절대[로]?\s.{0,15}입니다/g,
  /의심[의\s]?여지[가\s]?없/g,
  /과학적으로\s*증명/g,
  /명백[히한]\s/g,
  /단언/g,
];

function detectCertaintyEndings(text: string): number {
  let count = 0;
  for (const pattern of CERTAINTY_ENDINGS) {
    const re = new RegExp(pattern.source, pattern.flags);
    const matches = text.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

// ── v32.0 가짜 전문가 인용 감지 ──

/** 검증 불가능한 전문가 인용 패턴 */
const FAKE_AUTHORITY_PATTERNS: readonly RegExp[] = [
  /전문가[들에의]?\s*(따르면|의하면|말에|견해)/g,
  /연구[에서결과]?\s*(밝혀|증명|확인)/g,
  /하버드|스탠포드|MIT|옥스포드/g, // 검증 없는 유명 대학 인용
  /세계적[인으로]?\s*(석학|전문가|권위자)/g,
  /논문[에서]?\s*(발표|게재|증명)/g,
  /(?:Dr\.|Prof\.|교수|박사)\s*[A-Z가-힣]{1,10}\s*(에\s*따르면|의\s*연구)/g,
  /최신\s*연구[에서는]?\s/g,
  /임상\s*(실험|시험)[에서]?\s*(입증|확인|증명)/g,
];

function detectFakeAuthority(text: string): number {
  let count = 0;
  for (const pattern of FAKE_AUTHORITY_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    const matches = text.match(re);
    if (matches) count += matches.length;
  }
  return count;
}
