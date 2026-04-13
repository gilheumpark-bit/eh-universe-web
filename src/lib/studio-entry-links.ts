/** Primary entry points for authoring tools — used by Header and home hub. */

/** 소설 스튜디오(NO A) — 문체 등은 `?tab=` (문체 = `style`) */
export const NOVEL_STUDIO_PATH = "/studio";

/** 이 레포에 포함된 EH Translator 전체 UI (eh-translator 앱 이식) */
export const TRANSLATION_STUDIO_PATH = "/translation-studio";

/**
 * 별도 배포 URL이 있으면 그쪽으로, 없으면 동일 사이트의 번역 스튜디오 페이지.
 */
export function getTranslatorStudioHref(): string {
  const raw = process.env.NEXT_PUBLIC_EH_TRANSLATOR_ORIGIN?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return TRANSLATION_STUDIO_PATH;
}
