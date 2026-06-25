"use client";

import Link from "next/link";
import { Cloud, Feather, Plus } from "lucide-react";
import type { AppLanguage, ChatSession, Project } from "@/lib/studio-types";
import { createT, L4 } from "@/lib/i18n";

function latestProjectSessionId(project: Project | null | undefined): string | null {
  if (!project?.sessions.length) return null;
  let latest = project.sessions[0];
  for (const session of project.sessions) {
    if ((session.lastUpdate || 0) > (latest.lastUpdate || 0)) latest = session;
  }
  return latest.id;
}

export function OSDesktopTopBar({
  createNewProject,
  createNewSession,
  currentProjectId,
  currentSessionId,
  language,
  projects,
  sessions,
  setCurrentProjectId,
  setCurrentSessionId,
  setLanguage,
  syncStatus,
  user,
}: {
  createNewProject: () => void;
  createNewSession: () => void;
  currentProjectId: string | null;
  currentSessionId: string | null;
  language: AppLanguage;
  projects: Project[];
  sessions: ChatSession[];
  setCurrentProjectId: (id: string | null) => void;
  setCurrentSessionId: (id: string | null) => void;
  setLanguage: (lang: AppLanguage) => void;
  syncStatus: string;
  user: { displayName: string | null; email: string | null; photoURL: string | null } | null;
}) {
  const t = createT(language);

  const selectProject = (projectId: string) => {
    const nextProjectId = projectId || null;
    const nextProject = projects.find((project) => project.id === nextProjectId) ?? null;
    setCurrentProjectId(nextProjectId);
    setCurrentSessionId(latestProjectSessionId(nextProject));
  };

  return (
    <div data-zen-hide className="fixed top-0 left-0 w-full h-10 bg-bg-secondary/90 backdrop-blur-xl border-b border-border z-[var(--z-tooltip)] flex items-center justify-between px-4 text-xs font-mono text-text-secondary">
      <div className="flex items-center gap-4">
        <Link href="/studio" className="flex items-center gap-2 text-text-primary hover:text-accent-amber transition-colors shrink-0">
          <Feather className="h-4 w-4 text-accent-amber shrink-0" />
          <span className="font-serif font-semibold tracking-wider whitespace-nowrap">
            {language === "KO" ? "Loreguard 스튜디오" : language === "JP" ? "Loreguard スタジオ" : language === "CN" ? "Loreguard 工作室" : "Loreguard Studio"}
          </span>
          <span
            className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-[0.2em] bg-accent-purple/15 text-accent-purple border border-accent-purple/25"
            aria-label={language === "KO" ? "창작 전문 IDE 카테고리" : "Creative IDE category"}
          >
            {language === "KO" ? "창작 IDE" : language === "JP" ? "創作 IDE" : language === "CN" ? "创作 IDE" : "Creative IDE"}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <select
            value={currentProjectId || ""}
            onChange={(event) => selectProject(event.target.value)}
            aria-label={L4(language, { ko: "활성 작품 선택", en: "Active project", ja: "アクティブ作品", zh: "活动作品" })}
            className="bg-transparent border-none text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 hover:text-text-primary cursor-pointer font-serif"
          >
            <option value="" disabled>{t("sidebar.activeProject")}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id} className="bg-bg-primary">{project.name}</option>
            ))}
          </select>
          <button
            onClick={createNewProject}
            aria-label={t("project.newProject")}
            className="text-text-tertiary hover:text-accent-amber transition-colors"
            title={t("project.newProject")}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <div className="h-4 w-px bg-border mx-1" />

        <div className="flex items-center gap-2">
          <select
            value={currentSessionId || ""}
            onChange={(event) => setCurrentSessionId(event.target.value)}
            aria-label={L4(language, { ko: "챕터 선택", en: "Select chapter", ja: "チャプター選択", zh: "选择章节" })}
            className="bg-transparent border-none text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 hover:text-text-primary cursor-pointer max-w-[200px] font-serif"
          >
            <option value="" disabled>{L4(language, { ko: "챕터 선택", en: "Select Chapter", ja: "チャプター選択", zh: "选择章节" })}</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id} className="bg-bg-primary">{session.title}</option>
            ))}
          </select>
          <button
            onClick={createNewSession}
            aria-label={L4(language, { ko: "새 챕터", en: "New chapter", ja: "新規チャプター", zh: "新章节" })}
            className="text-text-tertiary hover:text-accent-amber transition-colors"
            title={L4(language, { ko: "새 챕터", en: "New chapter", ja: "新規チャプター", zh: "新章节" })}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2 text-amber-600/60">
            <Cloud className="w-3.5 h-3.5" />
            <span className="text-[10px]">{syncStatus}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 bg-bg-tertiary/50 rounded-full px-2 py-0.5 border border-border">
          {(["KO", "EN", "JP", "CN"] as AppLanguage[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`text-[9px] font-bold px-1.5 rounded transition ${language === lang ? "text-accent-amber bg-accent-amber/15" : "text-text-tertiary hover:text-accent-amber"}`}
            >
              {lang}
            </button>
          ))}
        </div>
        <span className="text-text-tertiary font-serif">
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
