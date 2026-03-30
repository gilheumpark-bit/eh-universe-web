"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useEffect, useState } from "react";
import { Code2, Play, FolderOpen, ChevronDown } from "lucide-react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { TRANSLATIONS } from "@/lib/studio-translations";
import { listProjects } from "@/lib/code-studio-store";
import type { AppLanguage } from "@/lib/studio-types";

interface WelcomeScreenProps {
  onNewFile: () => void;
  onOpenDemo: () => void;
  onBlankProject?: () => void;
  onImportProject?: () => void;
  onResumeProject?: () => void;
}

// IDENTITY_SEAL: PART-1 | role=Imports | inputs=none | outputs=types

// ============================================================
// PART 2 — Main WelcomeScreen (simplified 2-CTA + collapsible extras)
// ============================================================

export default function WelcomeScreen({ onNewFile, onOpenDemo, onBlankProject, onImportProject, onResumeProject }: WelcomeScreenProps) {
  const { lang } = useLang();
  const t = TRANSLATIONS[lang.toUpperCase() as AppLanguage]?.codeStudio ?? TRANSLATIONS.KO.codeStudio;
  const [visible, setVisible] = useState(false);
  const [hasProjects, setHasProjects] = useState(false);
  const [showExtras, setShowExtras] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    listProjects().then((projects) => setHasProjects(projects.length > 0)).catch(() => {});
  }, []);

  // Primary CTA: Resume (returning user) or Open Demo (new user)
  const primaryLabel = hasProjects
    ? (t as Record<string, string>).resumeProject ?? "Resume Last Project"
    : t.openDemo;
  const primaryDesc = hasProjects
    ? (t as Record<string, string>).resumeProjectDesc ?? "Continue where you left off"
    : t.openDemoDesc;
  const primaryAction = hasProjects ? (onResumeProject ?? onOpenDemo) : onOpenDemo;
  const primaryIcon = hasProjects
    ? <FolderOpen className="h-6 w-6 text-accent-amber" />
    : <Play className="h-6 w-6 text-accent-purple" />;
  const primaryAccent = hasProjects ? "bg-accent-amber/10" : "bg-accent-purple/10";

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07]" style={{ background: "radial-gradient(circle, #2f9b83 0%, transparent 70%)" }} />
        <div className="absolute left-1/4 top-2/3 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #8d7bc3 0%, transparent 70%)" }} />
      </div>

      <div
        className={`relative z-10 flex flex-col items-center gap-8 px-6 py-12 transition-all duration-700 ${
          visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
        }`}
      >
        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-display, var(--font-mono))" }}>
            {t.title}
          </h1>
          <p className="mt-3 font-[family-name:var(--font-mono)] text-sm text-text-tertiary">
            {t.subtitle}
          </p>
        </div>

        {/* 2 Main CTAs */}
        <div className="flex flex-col items-center gap-4">
          {/* Primary CTA */}
          <button
            onClick={primaryAction}
            className="group relative flex w-full max-w-md items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-8 py-5 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:border-white/[0.15] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            <div className={`rounded-xl border border-white/[0.08] p-3 ${primaryAccent}`}>
              {primaryIcon}
            </div>
            <div className="text-left">
              <div className="font-[family-name:var(--font-mono)] text-base font-semibold text-text-primary">
                {primaryLabel}
              </div>
              <div className="mt-0.5 font-[family-name:var(--font-mono)] text-[11px] text-text-tertiary">
                {primaryDesc}
              </div>
            </div>
          </button>

          {/* Secondary CTA */}
          <button
            onClick={onNewFile}
            className="group flex w-full max-w-xs items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-6 py-3.5 backdrop-blur-md transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            <Code2 className="h-5 w-5 text-accent-green" />
            <div className="text-left">
              <div className="font-[family-name:var(--font-mono)] text-sm font-semibold text-text-primary">{t.newFile}</div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary">{t.newFileDesc}</div>
            </div>
          </button>
        </div>

        {/* Collapsible extras */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => setShowExtras(!showExtras)}
            className="flex items-center gap-1 font-[family-name:var(--font-mono)] text-[11px] text-text-tertiary/60 transition-colors hover:text-text-tertiary"
          >
            <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showExtras ? "rotate-180" : ""}`} />
            {showExtras
              ? L4(lang, { ko: "접기", en: "Less" })
              : L4(lang, { ko: "더 보기", en: "More options" })}
          </button>

          {showExtras && (
            <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Tertiary links */}
              <div className="flex items-center gap-4 font-[family-name:var(--font-mono)] text-[11px]">
                {onBlankProject && (
                  <button onClick={onBlankProject} className="text-text-tertiary underline decoration-white/10 underline-offset-2 transition-colors hover:text-text-secondary">
                    {t.blankProject}
                  </button>
                )}
                {onBlankProject && <span className="text-white/10">|</span>}
                <button onClick={onImportProject ?? onNewFile} className="text-text-tertiary underline decoration-white/10 underline-offset-2 transition-colors hover:text-text-secondary">
                  {t.importFiles}
                </button>
                {hasProjects && (
                  <>
                    <span className="text-white/10">|</span>
                    <button onClick={onOpenDemo} className="text-text-tertiary underline decoration-white/10 underline-offset-2 transition-colors hover:text-text-secondary">
                      {t.openDemo}
                    </button>
                  </>
                )}
              </div>

              {/* Keyboard shortcuts */}
              <div className="font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary/50">
                <span className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5">Ctrl+N</span>
                <span className="mx-1.5">New File</span>
                <span className="mx-2 text-white/10">|</span>
                <span className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5">Ctrl+Shift+P</span>
                <span className="mx-1.5">Commands</span>
                <span className="mx-2 text-white/10">|</span>
                <span className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5">Ctrl+`</span>
                <span className="mx-1.5">Terminal</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-1 | role=Imports | inputs=none | outputs=types
// IDENTITY_SEAL: PART-2 | role=WelcomeScreen | inputs=callbacks,hasProjects | outputs=2-CTA onboarding UI
