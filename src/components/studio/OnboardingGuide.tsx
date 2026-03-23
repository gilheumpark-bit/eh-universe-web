"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Globe, Pen, BookOpen, Download } from "lucide-react";

// ============================================================
// PART 1 — Types & Steps
// ============================================================

interface OnboardingGuideProps {
  lang: string;
  onComplete: () => void;
  onNavigate?: (tab: string) => void;
}

interface Step {
  icon: React.ReactNode;
  title_ko: string;
  title_en: string;
  desc_ko: string;
  desc_en: string;
  tab?: string;
}

const STEPS: Step[] = [
  {
    icon: <Globe className="w-6 h-6" />,
    title_ko: "1. 세계관 설계",
    title_en: "1. World Design",
    desc_ko: "장르, 시놉시스, 캐릭터를 설정합니다.\n세계관 시뮬레이터에서 문명과 세력 관계를 시각화할 수 있습니다.",
    desc_en: "Set genre, synopsis, and characters.\nVisualize civilizations and faction relations in the World Simulator.",
    tab: "world",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title_ko: "2. AI와 첫 에피소드 작성",
    title_en: "2. Write First Episode with AI",
    desc_ko: "집필 탭에서 AI가 소설을 생성합니다.\n초안 → 구조 검증 → 문체 수정의 3패스로 품질을 높입니다.",
    desc_en: "AI generates your novel in the Writing tab.\n3-pass pipeline: Draft → Structure → Style refinement.",
    tab: "writing",
  },
  {
    icon: <Pen className="w-6 h-6" />,
    title_ko: "3. 연출 & 검증",
    title_en: "3. Direction & Validation",
    desc_ko: "연출 스튜디오에서 텐션 커브, 떡밥, 씬 전환을 관리합니다.\nNOD 감독이 실시간으로 품질을 분석합니다.",
    desc_en: "Manage tension curves, foreshadowing, and scene transitions.\nNOD Director analyzes quality in real-time.",
    tab: "writing",
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title_ko: "4. 원고 관리",
    title_en: "4. Manuscript Management",
    desc_ko: "에피소드별 원고를 저장하고, 버전을 비교합니다.\n인라인 리라이터로 문장 단위 수정이 가능합니다.",
    desc_en: "Save manuscripts per episode and compare versions.\nInline rewriter lets you edit sentence by sentence.",
    tab: "manuscript",
  },
  {
    icon: <Download className="w-6 h-6" />,
    title_ko: "5. 내보내기",
    title_en: "5. Export",
    desc_ko: "완성된 원고를 EPUB, DOCX, TXT, JSON으로 내보냅니다.\n표지와 메타데이터가 자동 포함됩니다.",
    desc_en: "Export your manuscript as EPUB, DOCX, TXT, or JSON.\nCover and metadata are included automatically.",
  },
];

// ============================================================
// PART 2 — Component
// ============================================================

export default function OnboardingGuide({ lang, onComplete, onNavigate }: OnboardingGuideProps) {
  const isKO = lang === "ko" || lang === "KO";
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else {
      localStorage.setItem("noa_onboarding_done", "1");
      onComplete();
    }
  }, [step, onComplete]);

  const prev = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  const skip = useCallback(() => {
    localStorage.setItem("noa_onboarding_done", "1");
    onComplete();
  }, [onComplete]);

  const goToTab = useCallback(() => {
    const s = STEPS[step];
    if (s.tab && onNavigate) {
      localStorage.setItem("noa_onboarding_done", "1");
      onNavigate(s.tab);
      onComplete();
    }
  }, [step, onNavigate, onComplete]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className={`w-full max-w-md mx-auto transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-6">
        {STEPS.map((_, i) => (
          <button key={i} type="button" onClick={() => setStep(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === step ? "bg-accent-purple w-6" : i < step ? "bg-accent-purple/50" : "bg-border"
            }`}
            aria-label={`Step ${i + 1}`}
          />
        ))}
      </div>

      {/* Card */}
      <div className="relative bg-bg-secondary/80 backdrop-blur border border-border/50 rounded-2xl p-6 md:p-8">
        {/* Skip button */}
        <button type="button" onClick={skip}
          className="absolute top-3 right-3 text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Skip onboarding">
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 mx-auto transition-all duration-300 ${
          step === 0 ? "bg-blue-500/10 text-blue-400" :
          step === 1 ? "bg-purple-500/10 text-purple-400" :
          step === 2 ? "bg-amber-500/10 text-amber-400" :
          step === 3 ? "bg-green-500/10 text-green-400" :
          "bg-red-500/10 text-red-400"
        }`}>
          {current.icon}
        </div>

        {/* Title */}
        <h3 className="text-center font-black text-lg mb-3 tracking-tight font-[family-name:var(--font-mono)]">
          {isKO ? current.title_ko : current.title_en}
        </h3>

        {/* Description */}
        <p className="text-center text-text-secondary text-sm leading-relaxed whitespace-pre-line mb-6">
          {isKO ? current.desc_ko : current.desc_en}
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={prev}
            disabled={step === 0}
            className="flex items-center gap-1 px-3 py-2 text-xs text-text-tertiary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-[family-name:var(--font-mono)]">
            <ChevronLeft className="w-3.5 h-3.5" /> {isKO ? "이전" : "Prev"}
          </button>

          <div className="flex gap-2">
            {current.tab && onNavigate && (
              <button type="button" onClick={goToTab}
                className="px-4 py-2 border border-accent-purple/30 text-accent-purple rounded-xl text-xs font-bold hover:bg-accent-purple/10 transition-colors font-[family-name:var(--font-mono)]">
                {isKO ? "바로 시작" : "Start Now"}
              </button>
            )}
            <button type="button" onClick={next}
              className="flex items-center gap-1 px-5 py-2 bg-accent-purple text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity font-[family-name:var(--font-mono)]">
              {isLast ? (isKO ? "완료" : "Done") : (isKO ? "다음" : "Next")} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Step count */}
      <p className="text-center text-[10px] text-text-tertiary mt-3 font-[family-name:var(--font-mono)]">
        {step + 1} / {STEPS.length}
      </p>
    </div>
  );
}
