// ============================================================
// export-spec — 출고 자수 + 플랫폼 규격 (claude 06_퇴고출고 §4 흡수)
// 지침: 플랫폼별 자수 기준(§4.1) + 마크다운 잔여 제거(§1.3) + 자수 공백±.
// 순수 함수. 절대금지 8파일 import 0.
// ============================================================

export interface PlatformSpec {
  id: string;
  label: string;
  /** 1화 권장 자수(공백 포함) 하한~상한 */
  minChars: number;
  maxChars: number;
  note: string;
}

// 한국 웹소설 플랫폼 1화 자수 baseline (공백 포함 기준·업계 통념)
export const PLATFORM_SPECS: PlatformSpec[] = [
  { id: 'munpia', label: '문피아', minChars: 4500, maxChars: 6500, note: '5,500자 내외 표준' },
  { id: 'naver', label: '네이버', minChars: 4500, maxChars: 6000, note: '5,000자 내외' },
  { id: 'kakao', label: '카카오', minChars: 4000, maxChars: 5500, note: '모바일 호흡 짧게' },
  { id: 'novelpia', label: '노벨피아', minChars: 3000, maxChars: 6000, note: '편차 허용 넓음' },
  { id: 'ridi', label: '리디', minChars: 5000, maxChars: 8000, note: '단행본 호흡' },
  { id: 'free', label: '제한 없음', minChars: 0, maxChars: Number.MAX_SAFE_INTEGER, note: '규격 미적용' },
];

export function getPlatformSpec(id: string): PlatformSpec {
  return PLATFORM_SPECS.find((p) => p.id === id) ?? PLATFORM_SPECS[PLATFORM_SPECS.length - 1];
}

/** 자수 — 공백 포함/제외 선택. */
export function countChars(text: string, withSpaces = true): number {
  return withSpaces ? text.length : text.replace(/\s/g, '').length;
}

export interface PlatformFit {
  chars: number;
  charsNoSpace: number;
  withinRange: boolean;
  delta: number; // 범위 밖일 때 부족(-)/초과(+) 자수, 범위 내면 0
  note: string;
}

/** 본문 ↔ 플랫폼 규격 적합도. */
export function checkPlatformFit(text: string, platformId: string): PlatformFit {
  const spec = getPlatformSpec(platformId);
  const chars = countChars(text, true);
  let delta = 0;
  if (chars < spec.minChars) delta = chars - spec.minChars; // 음수 = 부족
  else if (chars > spec.maxChars) delta = chars - spec.maxChars; // 양수 = 초과
  const withinRange = delta === 0;
  const note = withinRange
    ? `적합 (${spec.label} ${spec.minChars.toLocaleString()}~${spec.maxChars.toLocaleString()}자)`
    : delta < 0
      ? `${Math.abs(delta).toLocaleString()}자 부족`
      : `${delta.toLocaleString()}자 초과`;
  return { chars, charsNoSpace: countChars(text, false), withinRange, delta, note };
}

/** 출고용 정제 — 마크다운/이모지 잔여 제거(§1.3). 본문 의미 보존. */
export function stripForExport(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1') // 볼드 마커 제거(내용 유지)
    .replace(/(^|\n)#{1,6}\s+/g, '$1') // 헤딩 마커 제거
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 링크 → 텍스트
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '') // 이모지 제거
    .replace(/[ \t]{2,}/g, ' ') // 중복 공백 정리
    .trimEnd();
}
