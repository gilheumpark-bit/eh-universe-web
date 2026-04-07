"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, Play, FolderOpen, ChevronDown, Shield } from "lucide-react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { TRANSLATIONS } from "@/lib/studio-translations";
import { listProjects } from "@/lib/code-studio/core/store";
import type { AppLanguage } from "@/lib/studio-types";
import "./welcome-screen.css";


interface WelcomeScreenProps {
  onNewFile: () => void;
  onOpenDemo: () => void;
  onBlankProject?: () => void;
  onImportProject?: () => void;
  onResumeProject?: () => void;
  onQuickVerify?: () => void;
  onOpenLocalFolder?: () => void;
}

// ============================================================
// PART 2 — Main WelcomeScreen
// ============================================================

export default function WelcomeScreen({ 
  onNewFile, 
  onOpenDemo, 
  onBlankProject, 
  onImportProject, 
  onResumeProject, 
  onQuickVerify,
  onOpenLocalFolder
}: WelcomeScreenProps) {
  const { lang } = useLang();
  const t = TRANSLATIONS[lang.toUpperCase() as AppLanguage]?.codeStudio ?? TRANSLATIONS.KO.codeStudio;
  const [visible, setVisible] = useState(false);
  const [hasProjects, setHasProjects] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const isElectron = typeof window !== 'undefined' && !!(window as { electron?: unknown }).electron;

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    listProjects().then((projects) => setHasProjects(projects.length > 0)).catch(() => {});
  }, []);

  // Primary CTA selection logic
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
        <div className="welcome-bg-glow-1 absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.08]" />
        <div className="welcome-bg-glow-2 absolute left-1/4 top-2/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.05]" />
        <div className="welcome-bg-glow-3 absolute right-1/4 top-1/4 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.04]" />
        <div className="welcome-bg-grid absolute inset-0 opacity-[0.02]" />
      </div>

      <div
        className={`relative z-10 flex flex-col items-center gap-6 px-6 py-12 transition-all duration-700 ease-out ${
          visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        {/* Mascot: Quill */}
        <AnimatePresence>
          {visible && (
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-2 group"
            >
              <div className="absolute -inset-4 rounded-full bg-accent-green/10 blur-2xl group-hover:bg-accent-green/20 transition-all duration-700" />
              <motion.img
                src="/images/quill.png"
                alt="Quill"
                className="relative h-28 w-28 object-contain drop-shadow-[0_12px_48px_rgba(47,155,131,0.5)]"
                animate={{ 
                  y: [0, -12, 0],
                  rotate: [0, 3, -3, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 1.2, duration: 0.6 }}
                className="absolute -right-24 top-2 rounded-2xl bg-linear-to-br from-bg-secondary/95 to-bg-secondary/80 border border-border/50 px-5 py-3 backdrop-blur-xl shadow-2xl"
              >
                <div className="font-mono text-[11px] font-bold text-accent-green whitespace-nowrap leading-tight">
                  <div className="text-[10px] text-text-tertiary font-normal mb-1 opacity-60">EH-Code Studio AI</div>
                  {L4(lang, { ko: "좋은 하루예요!", en: "Hi there!" })}<br/>
                  {L4(lang, { ko: "무엇을 도와드릴까요?", en: "How can I help?" })}
                </div>
                <div className="absolute -left-2 top-6 h-3 w-3 rotate-45 border-b border-l border-border/50 bg-bg-secondary/95" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title Section */}
        <div className="text-center">
          <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-green/10 border border-accent-green/20 shadow-[0_0_20px_rgba(47,155,131,0.1)]">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-green">
              {L4(lang, { ko: "코드 스튜디오", en: "Code Studio" })}
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-linear-to-b from-text-primary to-text-secondary bg-clip-text text-transparent font-display">
            {t.title}
          </h1>
          <p className="mt-2 font-mono text-xs text-text-tertiary max-w-sm leading-relaxed opacity-80">
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

          {/* Electron: Open Local Folder */}
          {isElectron && onOpenLocalFolder && (
            <button
              onClick={onOpenLocalFolder}
              className="group flex w-full items-center justify-center gap-4 rounded-xl border border-accent-amber/20 bg-accent-amber/5 px-6 py-4 backdrop-blur-md transition-all duration-300 hover:border-accent-amber/40 hover:bg-accent-amber/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber/30"
            >
              <div className="p-2 rounded-xl bg-accent-amber/15 group-hover:bg-accent-amber/25 transition-colors">
                <FolderOpen className="h-5 w-5 text-accent-amber" />
              </div>
              <div className="text-left">
                <div className="font-mono text-sm font-bold text-accent-amber">
                  {L4(lang, { ko: "로컬 폴더 열기", en: "Open Local Folder" })}
                </div>
                <div className="font-mono text-[10px] text-text-tertiary">
                   {L4(lang, { ko: "시스템의 폴더를 선택하여 편집", en: "Select a folder from your system" })}
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
