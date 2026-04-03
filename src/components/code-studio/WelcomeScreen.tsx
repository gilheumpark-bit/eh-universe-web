"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useEffect, useState } from "react";
import { Code2, Play, FolderOpen, ChevronDown, Shield } from "lucide-react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { TRANSLATIONS } from "@/lib/studio-translations";
import { listProjects } from "@/lib/code-studio/core/store";
import type { AppLanguage } from "@/lib/studio-types";

interface WelcomeScreenProps {
  onNewFile: () => void;
  onOpenDemo: () => void;
  onBlankProject?: () => void;
  onImportProject?: () => void;
  onResumeProject?: () => void;
  onQuickVerify?: () => void;
}

// IDENTITY_SEAL: PART-1 | role=Imports | inputs=none | outputs=types

// ============================================================
// PART 2 — Main WelcomeScreen (simplified 2-CTA + collapsible extras)
// ============================================================

export default function WelcomeScreen({ onNewFile, onOpenDemo, onBlankProject, onImportProject, onResumeProject, onQuickVerify }: WelcomeScreenProps) {
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
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-bg-primary">
      {/* Premium Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        {/* Main glow */}
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.08]" style={{ background: "radial-gradient(circle, #2f9b83 0%, transparent 70%)" }} />
        <div className="absolute left-1/4 top-2/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #8d7bc3 0%, transparent 70%)" }} />
        <div className="absolute right-1/4 top-1/4 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #5c8fd6 0%, transparent 70%)" }} />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      <div
        className={`relative z-10 flex flex-col items-center gap-10 px-6 py-12 transition-all duration-700 ease-out ${
          visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        {/* Title with Premium Typography */}
        <div className="text-center">
          <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-green/10 border border-accent-green/20">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-green">
              {L4(lang, { ko: "코드 스튜디오", en: "Code Studio" })}
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-linear-to-b from-text-primary to-text-secondary bg-clip-text text-transparent" style={{ fontFamily: "var(--font-display, var(--font-mono))" }}>
            {t.title}
          </h1>
          <p className="mt-4 font-mono text-sm text-text-tertiary max-w-md leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        {/* 2 Main CTAs — Premium Card Style */}
        <div className="flex flex-col items-center gap-5 w-full max-w-md">
          {/* Primary CTA */}
          <button
            onClick={primaryAction}
            className="group relative flex w-full items-center gap-5 rounded-2xl border border-border bg-linear-to-b from-bg-secondary/80 to-bg-secondary/30 px-8 py-6 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:border-accent-green/30 hover:shadow-[0_16px_48px_rgba(0,0,0,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green/50"
          >
            <div className={`rounded-2xl border border-border p-4 ${primaryAccent} group-hover:scale-110 transition-transform duration-300`}>
              {primaryIcon}
            </div>
            <div className="text-left flex-1">
              <div className="font-mono text-lg font-bold text-text-primary">
                {primaryLabel}
              </div>
              <div className="mt-1 font-mono text-xs text-text-tertiary">
                {primaryDesc}
              </div>
            </div>
            <span className="text-text-tertiary group-hover:text-accent-green group-hover:translate-x-1 transition-all duration-300">
              &rarr;
            </span>
          </button>

          {/* Secondary CTA */}
          <button
            onClick={onNewFile}
            className="group flex w-full items-center justify-center gap-4 rounded-xl border border-border bg-bg-secondary/30 px-6 py-4 backdrop-blur-md transition-all duration-300 hover:border-accent-green/30 hover:bg-accent-green/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green/30"
          >
            <div className="p-2 rounded-xl bg-accent-green/10 group-hover:bg-accent-green/20 transition-colors">
              <Code2 className="h-5 w-5 text-accent-green" />
            </div>
            <div className="text-left">
              <div className="font-mono text-sm font-bold text-text-primary">{t.newFile}</div>
              <div className="font-mono text-[10px] text-text-tertiary">{t.newFileDesc}</div>
            </div>
          </button>

          {/* Quick Verify CTA */}
          {onQuickVerify && (
            <button
              onClick={onQuickVerify}
              className="group flex w-full items-center justify-center gap-4 rounded-xl border border-accent-green/20 bg-accent-green/5 px-6 py-4 backdrop-blur-md transition-all duration-300 hover:border-accent-green/40 hover:bg-accent-green/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green/30"
            >
              <div className="p-2 rounded-xl bg-accent-green/15 group-hover:bg-accent-green/25 transition-colors">
                <Shield className="h-5 w-5 text-accent-green" />
              </div>
              <div className="text-left">
                <div className="font-mono text-sm font-bold text-accent-green">
                  {L4(lang, { ko: "AI 코드 검증", en: "AI Code Verify" })}
                </div>
                <div className="font-mono text-[10px] text-text-tertiary">
                  {L4(lang, { ko: "붙여넣기 → 검증 / 생성 → 검증", en: "Paste → Verify / Generate → Verify" })}
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Collapsible extras */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => setShowExtras(!showExtras)}
            className="flex items-center gap-1 font-mono text-[11px] text-text-tertiary/60 transition-colors hover:text-text-tertiary"
          >
            <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showExtras ? "rotate-180" : ""}`} />
            {showExtras
              ? L4(lang, { ko: "접기", en: "Less" })
              : L4(lang, { ko: "더 보기", en: "More options" })}
          </button>

          {showExtras && (
            <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Tertiary links */}
              <div className="flex items-center gap-4 font-mono text-[11px]">
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
              <div className="font-mono text-[10px] text-text-tertiary/50">
                <span className="rounded border border-white/6 bg-white/3 px-1.5 py-0.5">Ctrl+N</span>
                <span className="mx-1.5">{L4(lang, { ko: "새 파일", en: "New File" })}</span>
                <span className="mx-2 text-white/10">|</span>
                <span className="rounded border border-white/6 bg-white/3 px-1.5 py-0.5">Ctrl+Shift+P</span>
                <span className="mx-1.5">{L4(lang, { ko: "명령 팔레트", en: "Commands" })}</span>
                <span className="mx-2 text-white/10">|</span>
                <span className="rounded border border-white/6 bg-white/3 px-1.5 py-0.5">Ctrl+`</span>
                <span className="mx-1.5">{L4(lang, { ko: "터미널", en: "Terminal" })}</span>
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
