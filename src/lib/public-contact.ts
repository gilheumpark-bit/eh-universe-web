const configuredSupportEmail = process.env.NEXT_PUBLIC_LOREGUARD_SUPPORT_EMAIL?.trim();

// [2026-06-25] 공개 연락 이메일 미확정 — 일단 공백으로 둔다.
// 실제 주소 확정 시 NEXT_PUBLIC_LOREGUARD_SUPPORT_EMAIL 설정 → 전 페이지 자동 반영.
export const SUPPORT_EMAIL = configuredSupportEmail || "";

export const HAS_SUPPORT_EMAIL = SUPPORT_EMAIL.length > 0;

export const SUPPORT_EMAIL_DISPLAY = HAS_SUPPORT_EMAIL
  ? SUPPORT_EMAIL.replace("@", " [at] ").replace(/\./g, " [dot] ")
  : "";

// 미설정 시 빈 문자열 반환 → 호출부에서 링크/표시를 비운다(깨진 mailto 방지).
export function supportMailtoHref(subject?: string): string {
  if (!HAS_SUPPORT_EMAIL) return "";
  const base = `mailto:${SUPPORT_EMAIL}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}
