import { L4 } from "@/lib/i18n";
import type { AppLanguage, Project } from "@/lib/studio-types";
import type { LoreguardTabId } from "./LoreguardShell";

export function localeForLanguage(language: AppLanguage): string {
  if (language === "EN") return "en-US";
  if (language === "JP") return "ja-JP";
  if (language === "CN") return "zh-CN";
  return "ko-KR";
}

export function deleteConfirmationToken(language: AppLanguage): string {
  if (language === "EN") return "DELETE";
  if (language === "JP") return "削除";
  if (language === "CN") return "删除";
  return "삭제";
}

export function projectDisplayName(project: Project, language: AppLanguage): string {
  return project.name?.trim() || L4(language, {
    ko: "제목 없는 작품",
    en: "Untitled work",
    ja: "無題の作品",
    zh: "未命名作品",
  });
}

export function projectEpisodeLabel(project: Project, language: AppLanguage): string {
  const count = project.sessions.length;
  return L4(language, {
    ko: `${count}개 회차`,
    en: `${count} episode${count === 1 ? "" : "s"}`,
    ja: `${count}話`,
    zh: `${count}章`,
  });
}

export function projectUpdatedLabel(project: Project, language: AppLanguage): string {
  const timestamp = project.lastUpdate || project.createdAt;
  if (!timestamp) {
    return L4(language, { ko: "수정 기록 없음", en: "No update record", ja: "更新記録なし", zh: "没有更新记录" });
  }
  const date = new Date(timestamp);
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
  if (isToday) {
    return `${new Intl.DateTimeFormat(localeForLanguage(language), { hour: "2-digit", minute: "2-digit" }).format(date)} ${L4(language, {
      ko: "수정",
      en: "updated",
      ja: "更新",
      zh: "更新",
    })}`;
  }
  return `${new Intl.DateTimeFormat(localeForLanguage(language), { month: "2-digit", day: "2-digit" }).format(date)} ${L4(language, {
    ko: "수정",
    en: "updated",
    ja: "更新",
    zh: "更新",
  })}`;
}

export function latestProjectSession(project: Project): Project["sessions"][number] | null {
  if (!project.sessions.length) return null;
  let latest = project.sessions[0];
  for (const session of project.sessions) {
    if ((session.lastUpdate || 0) > (latest.lastUpdate || 0)) latest = session;
  }
  return latest;
}

export function latestProjectSessionId(project: Project | null): string | null {
  return project ? latestProjectSession(project)?.id ?? null : null;
}

export function projectPrimaryStage(project: Project): LoreguardTabId {
  const config = latestProjectSession(project)?.config;
  if (config?.manuscripts?.length) return "writing";
  if (config?.sceneDirection) return "direction";
  if (config?.episodeSceneSheets?.length) return "scene";
  if (config?.mainScenarioStructure) return "plot";
  if (config?.characters?.length || config?.items?.length) return "character";
  if (config?.corePremise || config?.synopsis || config?.setting) return "world";
  return "project";
}
