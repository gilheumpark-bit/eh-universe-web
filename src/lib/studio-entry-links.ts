/** Primary entry points for authoring tools — used by Header and home hub. */

/** 창작 스튜디오 — 문체 등은 `?tab=` (문체 = `style`) */
export const NOVEL_STUDIO_PATH = "/studio";

/** 번역·현지화 작업실 */
export const TRANSLATION_STUDIO_PATH = "/translation-studio";

export const STUDIO_ENTRY_PARAM = "entry";

export const STUDIO_TAB_PARAM = "tab";

export const STUDIO_PROJECT_TAB = "project";

export const STUDIO_ENTRY_MODES = ["create", "manage", "import"] as const;

export type StudioEntryMode = (typeof STUDIO_ENTRY_MODES)[number];

export function getStudioEntryMode(value: string | null | undefined): StudioEntryMode {
  return STUDIO_ENTRY_MODES.includes(value as StudioEntryMode)
    ? (value as StudioEntryMode)
    : "create";
}

export function getNovelStudioHref(entry: StudioEntryMode = "create"): string {
  const searchParams = new URLSearchParams();
  searchParams.set(STUDIO_TAB_PARAM, STUDIO_PROJECT_TAB);
  if (entry !== "create") searchParams.set(STUDIO_ENTRY_PARAM, entry);
  return `${NOVEL_STUDIO_PATH}?${searchParams.toString()}`;
}

/**
 * 별도 배포 URL이 있으면 그쪽으로, 없으면 동일 사이트의 번역 스튜디오 페이지.
 */
export function getTranslatorStudioHref(): string {
  const raw = process.env.NEXT_PUBLIC_EH_TRANSLATOR_ORIGIN?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return TRANSLATION_STUDIO_PATH;
}
