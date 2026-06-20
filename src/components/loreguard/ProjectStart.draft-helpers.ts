import {
  PublishPlatform,
  type ProjectReleasePurpose,
  type ProjectRightsStatus,
  type ProjectTargetMarket,
  type StoryConfig,
} from "@/lib/studio-types";
import {
  DEFAULT_MARKET_BY_LANGUAGE,
  EMPTY_DRAFT,
  FORMAT_LABEL,
  PROJECT_FORMAT_VALUES,
  PUBLISH_PLATFORM_OPTIONS,
  RELEASE_PURPOSE_LABEL,
  RELEASE_PURPOSE_VALUES,
  RIGHTS_STATUS_LABEL,
  RIGHTS_STATUS_VALUES,
  TARGET_LANGUAGE_LABEL,
  TARGET_LANGUAGE_VALUES,
  TARGET_MARKET_LABEL,
  TARGET_MARKET_VALUES,
  type ProjectDraft,
} from "@/components/loreguard/ProjectStart.shared";

export function buildNoaInterviewPrompt(draft: ProjectDraft): string {
  const titleLine = draft.title.trim() ? `작품명: ${draft.title.trim()}` : "작품명: 미정";
  const premiseLine = draft.premise.trim() ? `핵심 전제: ${draft.premise.trim()}` : "핵심 전제: 미정";
  const rightsLine = draft.rightsNote.trim() ? `권리 메모: ${draft.rightsNote.trim()}` : "권리 메모: 작성 전";
  const rightsStatusLine = `권리 상태: ${RIGHTS_STATUS_LABEL[draft.rightsStatus]}`;
  const platformLine = draft.publishPlatform !== PublishPlatform.NONE ? `출고 플랫폼: ${draft.publishPlatform}` : "출고 플랫폼: 미정";
  const purposeLine = `출고 목적: ${RELEASE_PURPOSE_LABEL[draft.releasePurpose]}`;
  const marketLine = `국가·언어권 기준: ${TARGET_MARKET_LABEL[draft.targetMarket]}`;
  const episodeLine = [
    draft.totalEpisodes.trim() ? `목표 회차 ${draft.totalEpisodes.trim()}` : "목표 회차 미정",
    draft.episodeLength.trim() ? `회차당 ${draft.episodeLength.trim()}` : "회차당 분량 미정",
    draft.releaseCadence.trim() ? `연재 주기 ${draft.releaseCadence.trim()}` : "연재 주기 미정",
  ].join(" / ");
  return [
    "[새 작품 시작]",
    titleLine,
    `형태: ${FORMAT_LABEL[draft.format]}`,
    `대상 언어권: ${TARGET_LANGUAGE_LABEL[draft.targetLanguage]}`,
    marketLine,
    purposeLine,
    platformLine,
    episodeLine,
    premiseLine,
    rightsStatusLine,
    rightsLine,
    "세계관 기준안과 작가가 고를 선택지 5개를 짧게 제안해줘.",
  ].join("\n");
}

export function buildProjectMetaMemo(draft: ProjectDraft): string {
  return [
    "[작품 기준점]",
    `형태: ${FORMAT_LABEL[draft.format]}`,
    `대상 언어권: ${TARGET_LANGUAGE_LABEL[draft.targetLanguage]}`,
    `국가·언어권 기준: ${TARGET_MARKET_LABEL[draft.targetMarket]}`,
    `출고 목적: ${RELEASE_PURPOSE_LABEL[draft.releasePurpose]}`,
    `권리 상태: ${RIGHTS_STATUS_LABEL[draft.rightsStatus]}`,
    `출고 플랫폼: ${draft.publishPlatform === PublishPlatform.NONE ? "미정" : draft.publishPlatform}`,
    `목표 회차: ${draft.totalEpisodes.trim() || "미정"}`,
    `회차당 목표 분량: ${draft.episodeLength.trim() || "미정"}`,
    `연재 주기: ${draft.releaseCadence.trim() || "미정"}`,
    "",
    "[권리/IP 메모]",
    draft.rightsNote.trim(),
  ].join("\n");
}

export function isProjectFormat(value: unknown): value is ProjectDraft["format"] {
  return typeof value === "string" && PROJECT_FORMAT_VALUES.includes(value as ProjectDraft["format"]);
}

export function isProjectTargetLanguage(value: unknown): value is ProjectDraft["targetLanguage"] {
  return typeof value === "string" && TARGET_LANGUAGE_VALUES.includes(value as ProjectDraft["targetLanguage"]);
}

export function isProjectTargetMarket(value: unknown): value is ProjectTargetMarket {
  return typeof value === "string" && TARGET_MARKET_VALUES.includes(value as ProjectTargetMarket);
}

export function isProjectReleasePurpose(value: unknown): value is ProjectReleasePurpose {
  return typeof value === "string" && RELEASE_PURPOSE_VALUES.includes(value as ProjectReleasePurpose);
}

export function isProjectRightsStatus(value: unknown): value is ProjectRightsStatus {
  return typeof value === "string" && RIGHTS_STATUS_VALUES.includes(value as ProjectRightsStatus);
}

export function isPublishPlatform(value: unknown): value is PublishPlatform {
  return typeof value === "string" && (Object.values(PublishPlatform) as string[]).includes(value);
}

export function publishPlatformLabel(value: PublishPlatform): string {
  return PUBLISH_PLATFORM_OPTIONS.find((option) => option.value === value)?.label ?? String(value);
}

export function normalizeImportFileReportDetail(detail: string): string {
  return detail
    .replace(/(\d+)건 후보 생성/g, "$1건 분류됨")
    .replace(/후보 없음/g, "분류 항목 없음");
}

function isDefaultRightsNotePlaceholder(note: string): boolean {
  return (
    note === "작성 전" ||
    note === "권리 메모 작성 전" ||
    note === "원작자, 공동저작, 외부자료 사용 여부 확인 필요" ||
    note === "원작자, 공동기획, 외부자료, 상업 이용 예정 여부 확인 필요"
  );
}

export function normalizeRestoredRightsNote(value: string | undefined): string {
  const note = value?.trim() ?? "";
  return note && !isDefaultRightsNotePlaceholder(note) ? note : "";
}

function extractRightsNoteFromSetting(setting: string): string {
  const marker = "[권리/IP 메모]";
  const markerIndex = setting.indexOf(marker);
  if (markerIndex < 0) return "";
  const afterMarker = setting.slice(markerIndex + marker.length).trim();
  const nextSectionIndex = afterMarker.search(/\n\[[^\]]+\]/);
  const note = (nextSectionIndex >= 0 ? afterMarker.slice(0, nextSectionIndex) : afterMarker).trim();
  return normalizeRestoredRightsNote(note);
}

export function draftFromStoryConfig(config: StoryConfig, sessionTitle?: string, projectName?: string): ProjectDraft {
  const targetLanguage = isProjectTargetLanguage(config.projectTargetLanguage)
    ? config.projectTargetLanguage
    : EMPTY_DRAFT.targetLanguage;
  return {
    title: projectName?.trim() || sessionTitle?.trim() || config.title?.trim() || "",
    premise: config.corePremise?.trim() || config.synopsis?.trim() || "",
    format: isProjectFormat(config.genreMode) ? config.genreMode : EMPTY_DRAFT.format,
    targetLanguage,
    targetMarket: isProjectTargetMarket(config.targetMarket)
      ? config.targetMarket
      : DEFAULT_MARKET_BY_LANGUAGE[targetLanguage],
    releasePurpose: isProjectReleasePurpose(config.releasePurpose)
      ? config.releasePurpose
      : EMPTY_DRAFT.releasePurpose,
    rightsStatus: isProjectRightsStatus(config.rightsStatus)
      ? config.rightsStatus
      : EMPTY_DRAFT.rightsStatus,
    publishPlatform: isPublishPlatform(config.publishPlatform)
      ? config.publishPlatform
      : EMPTY_DRAFT.publishPlatform,
    totalEpisodes: config.totalEpisodes > 0 ? String(config.totalEpisodes) : "",
    episodeLength: config.targetEpisodeLength?.trim() || "",
    releaseCadence: config.releaseCadence?.trim() || "",
    rightsNote: normalizeRestoredRightsNote(config.rightsNote) || extractRightsNoteFromSetting(config.setting ?? ""),
  };
}

export function parseEpisodeGoal(value: string, fallback: number): number {
  const normalized = Number.parseInt(value.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
}
