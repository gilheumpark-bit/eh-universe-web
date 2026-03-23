"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Pen, BookOpen } from "lucide-react";

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
  icon: React.ReactNode;
  eyebrowKo: string;
  eyebrowEn: string;
  titleKo: string;
  titleEn: string;
  descKo: string;
  descEn: string;
  highlightsKo: string[];
  highlightsEn: string[];
  ctaKo: string;
  ctaEn: string;
  tab?: string;
  kind: "quickstart" | "tab" | "finish";
}

const STEPS: ActivationStep[] = [
  {
    icon: <Sparkles className="w-6 h-6" />,
    eyebrowKo: "STEP 01 · 첫 감탄",
    eyebrowEn: "STEP 01 · FIRST WIN",
    titleKo: "한 줄 아이디어로 바로 첫 장면까지",
    titleEn: "From one line to your first scene",
    descKo: "장르와 아이디어 한 줄만 넣으면 제목, 핵심 인물, 첫 장면 초안까지 한 번에 이어집니다.",
    descEn: "Pick a genre, enter one line, and move straight into a title, key cast, and first scene draft.",
    highlightsKo: ["세계관 뼈대 자동 생성", "주요 인물 초안 자동 세팅", "바로 집필 탭으로 이동"],
    highlightsEn: ["Instant world seed", "Starter cast generated", "Jump straight into Writing"],
    ctaKo: "쾌속 시작 열기",
    ctaEn: "Open Quick Start",
    kind: "quickstart",
  },
  {
    icon: <Pen className="w-6 h-6" />,
    eyebrowKo: "STEP 02 · 내 문장 만들기",
    eyebrowEn: "STEP 02 · SHAPE THE DRAFT",
    titleKo: "AI 초안을 이어 쓰거나 직접 다듬기",
    titleEn: "Continue with AI or rewrite in your own voice",
    descKo: "초안 생성, 3단계 캔버스, 직접 편집 모드를 오가며 내 템포에 맞게 원고를 키울 수 있습니다.",
    descEn: "Move between draft generation, canvas flow, and manual editing without leaving the same workspace.",
    highlightsKo: ["AI 집필과 수동 집필 병행", "캔버스/리라이트로 문장 다듬기", "작업 흐름이 한 화면 안에서 연결"],
    highlightsEn: ["AI and manual writing side by side", "Canvas and rewrite tools included", "One continuous workspace"],
    ctaKo: "집필 탭 열기",
    ctaEn: "Open Writing",
    tab: "writing",
    kind: "tab",
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    eyebrowKo: "STEP 03 · 원고로 키우기",
    eyebrowEn: "STEP 03 · GROW THE MANUSCRIPT",
    titleKo: "저장, 비교, 내보내기까지 한 흐름",
    titleEn: "Save, compare, and export in one loop",
    descKo: "에피소드별 저장, 버전 비교, 내보내기까지 이어져서 초안이 곧 원고 관리 흐름으로 연결됩니다.",
    descEn: "Episode saves, version compare, and export are already in place, so drafts naturally turn into manuscripts.",
    highlightsKo: ["에피소드별 저장과 버전 비교", "원고 관리 화면으로 즉시 이동", "출판용 포맷까지 바로 연결"],
    highlightsEn: ["Episode saves and version compare", "Jump into Manuscript right away", "Export-ready output flow"],
    ctaKo: "원고 관리 열기",
    ctaEn: "Open Manuscript",
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

export default function OnboardingGuide({ lang, onComplete, onNavigate, onQuickStart }: OnboardingGuideProps) {
  const isKO = lang === "ko" || lang === "KO";
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
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
  const highlights = isKO ? current.highlightsKo : current.highlightsEn;

  return (
    <div className={`w-full max-w-xl mx-auto transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <div className="flex justify-center gap-2 mb-5">
        {STEPS.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setStep(index)}
            className={`h-2 rounded-full transition-all duration-300 ${index === step ? "w-12 bg-accent-purple" : index < step ? "w-6 bg-accent-purple/50" : "w-6 bg-border"}`}
            aria-label={`Step ${index + 1}`}
          />
        ))}
      </div>

      <div className="relative bg-bg-secondary/80 backdrop-blur border border-border/50 rounded-[1.75rem] p-6 md:p-8 shadow-2xl shadow-black/20">
        <button
          type="button"
          onClick={skip}
          className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="text-center font-[family-name:var(--font-mono)] text-[11px] tracking-[0.18em] text-accent-purple uppercase">
          {isKO ? "3분 안에 첫 장면" : "First scene in minutes"}
        </p>

        <div className="mt-5 flex justify-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-accent-purple/10 text-accent-purple">
            {current.icon}
          </div>
        </div>

        <div className="mt-5 text-center">
          <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.18em] text-text-tertiary uppercase">
            {isKO ? current.eyebrowKo : current.eyebrowEn}
          </p>
          <h3 className="mt-3 text-xl md:text-2xl font-black tracking-tight">
            {isKO ? current.titleKo : current.titleEn}
          </h3>
          <p className="mt-4 text-sm md:text-[15px] leading-7 text-text-secondary">
            {isKO ? current.descKo : current.descEn}
          </p>
        </div>

        <div className="mt-6 grid gap-2.5">
          {highlights.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/6 bg-bg-primary/50 px-4 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-purple/12 text-accent-purple text-xs">✓</span>
              <span className="text-sm text-text-secondary">{item}</span>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-[family-name:var(--font-mono)]"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {isKO ? "이전" : "Prev"}
          </button>

          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={runPrimaryAction}
              className="px-4 py-2.5 bg-accent-purple text-white rounded-xl text-xs font-black shadow-lg shadow-accent-purple/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isKO ? current.ctaKo : current.ctaEn}
            </button>
            <button
              type="button"
              onClick={next}
              className="px-4 py-2.5 border border-border text-text-secondary rounded-xl text-xs font-bold hover:bg-bg-primary transition-colors flex items-center gap-1 font-[family-name:var(--font-mono)]"
            >
              {step === STEPS.length - 1 ? (isKO ? "스튜디오 열기" : "Open Studio") : (isKO ? "다음" : "Next")}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-text-tertiary mt-3 font-[family-name:var(--font-mono)]">
        {step + 1} / {STEPS.length}
      </p>
    </div>
  );
}
