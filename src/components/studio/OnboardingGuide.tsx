"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Pen, BookOpen } from "lucide-react";
import type { AppLanguage } from "@/lib/studio-types";
import { createT } from "@/lib/i18n";

// ============================================================
// PART 1 — Types & activation steps
// ============================================================

interface OnboardingGuideProps {
  lang: string;
  onComplete: () => void;
  onNavigate?: (tab: string) => void;
  onQuickStart?: () => void;
}

interface ActivationStep {
  icon: ReactNode;
  eyebrowKey: string;
  titleKey: string;
  descKey: string;
  highlightKeys: string[];
  ctaKey: string;
  tab?: string;
  kind: "quickstart" | "tab" | "finish";
}

const STEPS: ActivationStep[] = [
  {
    icon: <Sparkles className="h-6 w-6" />,
    eyebrowKey: "onboarding.step01Eyebrow",
    titleKey: "onboarding.step01Title",
    descKey: "onboarding.step01Desc",
    highlightKeys: ["onboarding.step01H1", "onboarding.step01H2", "onboarding.step01H3"],
    ctaKey: "onboarding.step01Cta",
    kind: "quickstart",
  },
  {
    icon: <Pen className="h-6 w-6" />,
    eyebrowKey: "onboarding.step02Eyebrow",
    titleKey: "onboarding.step02Title",
    descKey: "onboarding.step02Desc",
    highlightKeys: ["onboarding.step02H1", "onboarding.step02H2", "onboarding.step02H3"],
    ctaKey: "onboarding.step02Cta",
    tab: "writing",
    kind: "tab",
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    eyebrowKey: "onboarding.step03Eyebrow",
    titleKey: "onboarding.step03Title",
    descKey: "onboarding.step03Desc",
    highlightKeys: ["onboarding.step03H1", "onboarding.step03H2", "onboarding.step03H3"],
    ctaKey: "onboarding.step03Cta",
    tab: "manuscript",
    kind: "tab",
  },
];

// ============================================================
// PART 2 — Helpers
// ============================================================

function markOnboardingDone() {
  localStorage.setItem("noa_onboarding_done", "1");
}

// ============================================================
// PART 3 — Component
// ============================================================

export default function OnboardingGuide({
  lang,
  onComplete,
  onNavigate,
  onQuickStart,
}: OnboardingGuideProps) {
  const language = (lang === "ko" || lang === "KO" ? "KO" : lang === "JP" ? "JP" : lang === "CN" ? "CN" : "EN") as AppLanguage;
  const t = createT(language);
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 100);
    return () => window.clearTimeout(timer);
  }, []);

  const complete = useCallback(() => {
    markOnboardingDone();
    onComplete();
  }, [onComplete]);

  const skip = useCallback(() => {
    complete();
  }, [complete]);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    complete();
  }, [complete, step]);

  const prev = useCallback(() => {
    if (step > 0) {
      setStep((current) => current - 1);
    }
  }, [step]);

  const runPrimaryAction = useCallback(() => {
    const current = STEPS[step];

    if (current.kind === "quickstart" && onQuickStart) {
      markOnboardingDone();
      onQuickStart();
      onComplete();
      return;
    }

    if (current.tab && onNavigate) {
      markOnboardingDone();
      onNavigate(current.tab);
      onComplete();
      return;
    }

    complete();
  }, [complete, onComplete, onNavigate, onQuickStart, step]);

  const current = STEPS[step];
  const highlights = current.highlightKeys.map((k) => t(k));

  return (
    <div
      className={`mx-auto w-full max-w-xl transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="mb-5 flex justify-center gap-2">
        {STEPS.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setStep(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === step ? "w-12 bg-accent-purple" : index < step ? "w-6 bg-accent-purple/50" : "w-6 bg-border"
            }`}
            aria-label={`Step ${index + 1}`}
          />
        ))}
      </div>

      <div className="relative rounded-[1.75rem] border border-border/50 bg-bg-secondary/80 p-6 shadow-2xl shadow-black/20 backdrop-blur md:p-8">
        <button
          type="button"
          onClick={skip}
          className="absolute right-4 top-4 text-text-tertiary transition-colors hover:text-text-primary"
          aria-label={t('onboarding.closeOnboarding')}
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-center font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-accent-purple">
          {t('onboarding.firstSceneInMinutes')}
        </p>

        <div className="mt-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-purple/10 text-accent-purple">
            {current.icon}
          </div>
        </div>

        <div className="mt-5 text-center">
          <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
            {t(current.eyebrowKey)}
          </p>
          <h3 className="mt-3 text-xl font-black tracking-tight md:text-2xl">
            {t(current.titleKey)}
          </h3>
          <p className="mt-4 text-sm leading-7 text-text-secondary md:text-[15px]">
            {t(current.descKey)}
          </p>
        </div>

        <div className="mt-6 grid gap-2.5">
          {highlights.map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-2xl border border-white/6 bg-bg-primary/50 px-4 py-3"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-purple/12 text-xs text-accent-purple">
                ✓
              </span>
              <span className="text-sm text-text-secondary">{item}</span>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className="inline-flex items-center gap-1 font-[family-name:var(--font-mono)] text-xs text-text-tertiary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {t('onboarding.prev')}
          </button>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={runPrimaryAction}
              className="flex items-center gap-2 rounded-xl bg-accent-purple px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-accent-purple/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t(current.ctaKey)}
            </button>
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1 rounded-xl border border-border px-4 py-2.5 font-[family-name:var(--font-mono)] text-xs font-bold text-text-secondary transition-colors hover:bg-bg-primary"
            >
              {step === STEPS.length - 1 ? t('onboarding.openStudio') : t('onboarding.next')}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary">
        {step + 1} / {STEPS.length}
      </p>
    </div>
  );
}
