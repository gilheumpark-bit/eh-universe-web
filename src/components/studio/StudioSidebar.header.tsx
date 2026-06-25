"use client";

import Link from "next/link";
import { Plus, X, Zap } from "lucide-react";
import { showAlert } from "@/lib/show-alert";
import { createT, L4 } from "@/lib/i18n";
import type { AppLanguage, Project } from "@/lib/studio-types";

function latestProjectSessionId(project: Project | null | undefined): string | null {
  if (!project?.sessions.length) return null;
  let latest = project.sessions[0];
  for (const session of project.sessions) {
    if ((session.lastUpdate || 0) > (latest.lastUpdate || 0)) latest = session;
  }
  return latest.id;
}

export function StudioSidebarHeader({
  createNewProject,
  createNewSession,
  currentProject,
  currentProjectId,
  projects,
  renameProject,
  deleteProject,
  setCurrentProjectId,
  setCurrentSessionId,
  setIsSidebarOpen,
  language,
}: {
  createNewProject: () => void;
  createNewSession: () => void;
  currentProject: Project | null;
  currentProjectId: string | null;
  projects: Project[];
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  setCurrentProjectId: (id: string | null) => void;
  setCurrentSessionId: (id: string | null) => void;
  setIsSidebarOpen: (open: boolean) => void;
  language: AppLanguage;
}) {
  const t = createT(language);

  function selectProject(projectId: string) {
    const nextProjectId = projectId || null;
    const nextProject = projects.find((project) => project.id === nextProjectId) ?? null;
    setCurrentProjectId(nextProjectId);
    setCurrentSessionId(latestProjectSessionId(nextProject));
  }

  function handleRenameProject() {
    if (!currentProject) return;
    const name = window.prompt(t("project.renameProject"), currentProject.name);
    if (name === null) return;
    const cleanedName = name.replace(/\s+/g, " ").trim();
    if (!cleanedName) {
      showAlert(L4(language, {
        ko: "작품명을 입력해 주세요.",
        en: "Enter a work name.",
        ja: "作品名を入力してください。",
        zh: "请输入作品名。",
      }));
      return;
    }
    renameProject(currentProject.id, cleanedName);
  }

  return (
    <>
      <button
        onClick={() => setIsSidebarOpen(false)}
        aria-label={L4(language, { ko: "사이드바 접기", en: "Collapse sidebar", ja: "サイドバーを折りたたむ", zh: "收起侧边栏" })}
        className="hidden md:flex items-center justify-center gap-1 py-1.5 border-b border-white/8 text-[9px] font-mono text-text-tertiary hover:text-text-primary transition-colors uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
      >
        ◀ {L4(language, { ko: "접기", en: "Collapse", ja: "折りたたむ", zh: "收起" })}
      </button>

      <div className="border-b border-white/8 px-4 py-3">
        <div className="mb-3 flex items-start justify-between gap-2">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-85">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(202,161,92,0.22)] bg-[linear-gradient(135deg,rgba(202,161,92,0.2),rgba(92,143,214,0.14))] text-text-primary shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <div className="site-kicker text-[0.62rem]">Writing Workbench</div>
              <h1 className="font-display text-lg font-semibold tracking-[-0.04em] text-text-primary">
                Loreguard 스튜디오
              </h1>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
                {language === "KO" ? "Loreguard" : "Loreguard"}
              </span>
            </div>
          </Link>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/4 text-text-secondary transition-[border-color,color] hover:border-[rgba(202,161,92,0.26)] hover:text-text-primary md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="rounded-[1.25rem] border border-white/8 bg-black/20 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="site-kicker text-[0.58rem]">{t("sidebar.activeProject")}</span>
            <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              {projects.length} projects
            </span>
          </div>

          {projects.length === 0 ? (
            <button
              onClick={createNewProject}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(202,161,92,0.28)] bg-[rgba(202,161,92,0.08)] py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-text-primary transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-[rgba(202,161,92,0.12)]"
            >
              <Plus className="h-4 w-4" /> {t("project.newProject")}
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <select
                  value={currentProjectId || ""}
                  onChange={(e) => selectProject(e.target.value)}
                  className="min-w-0 flex-1 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 font-mono text-[12px] font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-colors hover:border-[rgba(202,161,92,0.2)]"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name} ({project.sessions.length})</option>
                  ))}
                </select>
                <button
                  onClick={createNewProject}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/4 text-text-secondary transition-[transform,border-color,color] hover:-translate-y-0.5 hover:border-[rgba(202,161,92,0.26)] hover:text-text-primary"
                  title={t("project.newProject")}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {currentProject && (
                <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[11px] font-semibold">
                  <button
                    onClick={handleRenameProject}
                    className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-text-secondary transition-[border-color,color] hover:border-[rgba(92,143,214,0.28)] hover:text-text-primary"
                  >
                    {t("project.renameProject")}
                  </button>
                  {projects.length > 1 && (
                    <button
                      onClick={() => deleteProject(currentProject.id)}
                      className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-text-secondary transition-[border-color,color] hover:border-accent-red/30 hover:text-accent-red"
                    >
                      {t("project.deleteProject")}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <button
          onClick={() => createNewSession()}
          className="premium-button mt-3 flex w-full justify-center rounded-[1.1rem] px-4 py-3 text-[11px]"
        >
          <Plus className="h-4 w-4" /> {language === "KO" ? "새 에피소드" : language === "JP" ? "新しいエピソード" : language === "CN" ? "新剧集" : "New Episode"}
        </button>
      </div>
    </>
  );
}
