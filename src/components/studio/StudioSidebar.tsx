"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { ProjectManuscriptFormat } from "@/hooks/useStudioExport";
import type { AppLanguage, AppTab, ChatSession, Project } from "@/lib/studio-types";
import { StudioSidebarHeader } from "./StudioSidebar.header";
import { StudioSidebarNavigation } from "./StudioSidebar.navigation";
import StudioSidebarFooter, { type StudioSidebarConfirmOpts } from "./StudioSidebarFooter";

type ConfirmOpts = StudioSidebarConfirmOpts;

interface StudioSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  focusMode: boolean;
  projects: Project[];
  createNewProject: () => void;
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  currentProject: Project | null;
  sessions: ChatSession[];
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  createNewSession: () => void;
  activeTab: AppTab;
  handleTabChange: (tab: AppTab) => void;
  studioMode: "guided" | "free";
  setStudioMode: (mode: "guided" | "free") => void;
  exportTXT: () => void;
  exportJSON: () => void;
  handleImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportAllJSON: () => void;
  handleExportEPUB: () => void;
  handleExportDOCX: () => void;
  handleExportHWPX: () => void;
  handleImportTextFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportProjectJSON?: () => void;
  /** 현재 프로젝트 전 회차 원고 — 번역 스튜디오와 동일 5형식 */
  exportProjectManuscripts?: (format: ProjectManuscriptFormat) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  user: { displayName: string | null; email: string | null; photoURL: string | null } | null;
  signInWithGoogle: () => void;
  signOut: () => void;
  authConfigured: boolean;
  handleSync: () => void;
  syncStatus: string;
  lastSyncTime: number | null;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  showConfirm: (opts: ConfirmOpts) => void;
  closeConfirm: () => void;
  onReorderSessions?: (fromIndex: number, toIndex: number) => void;
}

const StudioSidebar: React.FC<StudioSidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  focusMode,
  projects,
  createNewProject,
  currentProjectId,
  setCurrentProjectId,
  currentSessionId,
  setCurrentSessionId,
  currentProject,
  sessions,
  renameProject,
  deleteProject,
  createNewSession,
  activeTab,
  handleTabChange,
  studioMode,
  setStudioMode,
  exportTXT,
  exportJSON,
  handleImportJSON,
  handleImportTextFiles,
  exportAllJSON,
  handleExportEPUB,
  handleExportDOCX,
  handleExportHWPX,
  exportProjectJSON,
  exportProjectManuscripts,
  fileInputRef,
  user,
  signInWithGoogle,
  signOut,
  authConfigured,
  handleSync,
  syncStatus,
  lastSyncTime,
  language,
  setLanguage,
  showConfirm,
  closeConfirm,
  onReorderSessions,
}) => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHydrated(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const orderedSessions = useMemo(
    () => [...sessions].sort((a, b) => a.lastUpdate - b.lastUpdate),
    [sessions],
  );

  const projectManuscriptExportEnabled = (currentProject?.sessions?.length ?? 0) > 0;
  const lastSyncLabel = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <aside
      className={`fixed md:relative inset-y-0 left-0 z-50 transition-transform duration-300 md:transition-[transform,width] ${
        focusMode
          ? "-translate-x-full md:translate-x-0 md:w-0"
          : isSidebarOpen
            ? "translate-x-0 w-80"
            : "-translate-x-full md:translate-x-0 md:w-0"
      }`}
    >
      <div className="flex h-dvh flex-col py-3 pl-3 pr-2 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[24px] bg-bg-primary/95 backdrop-blur-[32px] border border-border shadow-panel">
          <StudioSidebarHeader
            createNewProject={createNewProject}
            createNewSession={createNewSession}
            currentProject={currentProject}
            currentProjectId={currentProjectId}
            deleteProject={deleteProject}
            language={language}
            projects={projects}
            renameProject={renameProject}
            setCurrentProjectId={setCurrentProjectId}
            setCurrentSessionId={setCurrentSessionId}
            setIsSidebarOpen={setIsSidebarOpen}
          />

          <StudioSidebarNavigation
            activeTab={activeTab}
            closeConfirm={closeConfirm}
            currentSessionId={currentSessionId}
            handleTabChange={handleTabChange}
            hydrated={hydrated}
            language={language}
            onReorderSessions={onReorderSessions}
            orderedSessions={orderedSessions}
            setCurrentSessionId={setCurrentSessionId}
            setStudioMode={setStudioMode}
            showConfirm={showConfirm}
            studioMode={studioMode}
          />

          <StudioSidebarFooter
            activeTab={activeTab}
            authConfigured={authConfigured}
            closeConfirm={closeConfirm}
            currentSessionId={currentSessionId}
            exportAllJSON={exportAllJSON}
            exportJSON={exportJSON}
            exportProjectJSON={exportProjectJSON}
            exportProjectManuscripts={exportProjectManuscripts}
            exportTXT={exportTXT}
            fileInputRef={fileInputRef}
            handleExportDOCX={handleExportDOCX}
            handleExportEPUB={handleExportEPUB}
            handleExportHWPX={handleExportHWPX}
            handleImportJSON={handleImportJSON}
            handleImportTextFiles={handleImportTextFiles}
            handleSync={handleSync}
            handleTabChange={handleTabChange}
            hydrated={hydrated}
            language={language}
            lastSyncLabel={lastSyncLabel}
            projectManuscriptExportEnabled={projectManuscriptExportEnabled}
            setLanguage={setLanguage}
            showConfirm={showConfirm}
            signInWithGoogle={signInWithGoogle}
            signOut={signOut}
            syncStatus={syncStatus}
            user={user}
          />
        </div>
      </div>
    </aside>
  );
};

export default StudioSidebar;
