"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
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
  icon: ReactNode;
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
    icon: <Sparkles className="h-6 w-6" />,
    eyebrowKo: "STEP 01 · 첫 감탄",
    eyebrowEn: "STEP 01 · FIRST WIN",
    titleKo: "한 줄 아이디어로 바로 첫 장면까지",
    titleEn: "Go from one line to your first scene",
    descKo: "장르와 한 줄 아이디어만 넣으면 제목, 핵심 인물, 첫 장면 초안까지 한 번에 이어집니다.",
    descEn: "Pick a genre and enter one line. We turn it into a title, key cast, and your first scene draft.",
    highlightsKo: ["세계관 씨앗 자동 생성", "핵심 인물 초안 세팅", "바로 글쓰기 탭으로 이동"],
    highlightsEn: ["Instant world seed", "Starter cast draft", "Jump straight into Writing"],
    ctaKo: "쾌속 시작 열기",
    ctaEn: "Open Quick Start",
    kind: "quickstart",
  },
  {
    icon: <Pen className="h-6 w-6" />,
    eyebrowKo: "STEP 02 · 문장 다듬기",
    eyebrowEn: "STEP 02 · SHAPE THE DRAFT",
    titleKo: "AI 초안에서 내 문장으로 이어 쓰기",
    titleEn: "Turn the draft into your own voice",
    descKo: "AI 초안, 캔버스, 직접 수정 모드를 같은 화면에서 오가며 원하는 결로 문장을 다듬을 수 있습니다.",
    descEn: "Move between AI draft, canvas flow, and manual editing without leaving the same workspace.",
    highlightsKo: ["AI와 수동 집필을 자연스럽게 병행", "캔버스와 리라이트 도구 포함", "작업 흐름이 한 화면에서 연결"],
    highlightsEn: ["AI and manual writing side by side", "Canvas and rewrite tools included", "One continuous workspace"],
    ctaKo: "글쓰기 탭 열기",
    ctaEn: "Open Writing",
    tab: "writing",
    kind: "tab",
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    eyebrowKo: "STEP 03 · 원고로 키우기",
    eyebrowEn: "STEP 03 · GROW THE MANUSCRIPT",
    titleKo: "저장, 비교, 원고 관리까지 한 흐름",
    titleEn: "Save, compare, and grow the manuscript",
    descKo: "에피소드 저장, 버전 비교, 원고 관리 흐름이 이미 이어져 있어서 초안이 자연스럽게 원고로 발전합니다.",
    descEn: "Episode saves, version compare, and manuscript management are already connected in one loop.",
    highlightsKo: ["에피소드 저장과 버전 비교", "원고 관리 탭으로 즉시 이동", "초안에서 원고까지 흐름 유지"],
    highlightsEn: ["Episode saves and version compare", "Jump into Manuscript right away", "Keep the draft-to-manuscript flow"],
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

export default function OnboardingGuide({
  lang,
  onComplete,
  onNavigate,
  onQuickStart,
}: OnboardingGuideProps) {
  const isKO = lang === "ko" || lang === "KO";
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
  const highlights = isKO ? current.highlightsKo : current.highlightsEn;

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
          aria-label={isKO ? "온보딩 닫기" : "Close onboarding"}
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-center font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-accent-purple">
          {isKO ? "3분 안에 첫 장면" : "First scene in minutes"}
        </p>

        <div className="mt-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-purple/10 text-accent-purple">
            {current.icon}
          </div>
        </div>

        <div className="mt-5 text-center">
          <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
            {isKO ? current.eyebrowKo : current.eyebrowEn}
          </p>
          <h3 className="mt-3 text-xl font-black tracking-tight md:text-2xl">
            {isKO ? current.titleKo : current.titleEn}
          </h3>
          <p className="mt-4 text-sm leading-7 text-text-secondary md:text-[15px]">
            {isKO ? current.descKo : current.descEn}
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
            {isKO ? "이전" : "Prev"}
          </button>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={runPrimaryAction}
              className="flex items-center gap-2 rounded-xl bg-accent-purple px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-accent-purple/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isKO ? current.ctaKo : current.ctaEn}
            </button>
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1 rounded-xl border border-border px-4 py-2.5 font-[family-name:var(--font-mono)] text-xs font-bold text-text-secondary transition-colors hover:bg-bg-primary"
            >
              {step === STEPS.length - 1 ? (isKO ? "스튜디오 열기" : "Open Studio") : isKO ? "다음" : "Next"}
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
