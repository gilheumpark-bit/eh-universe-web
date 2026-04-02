/** Primary entry points for authoring tools — used by Header and home hub. */

export const STYLE_STUDIO_PATH = "/tools/style-studio";

/**
 * EH Translator 배포 URL이 있으면 그쪽으로, 없으면 NOA 스튜디오 원고 탭(번역 패널).
 */
export function getTranslatorStudioHref(): string {
  const raw = process.env.NEXT_PUBLIC_EH_TRANSLATOR_ORIGIN?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "/studio?tab=manuscript";
}
