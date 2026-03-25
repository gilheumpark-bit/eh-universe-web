"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Sparkles, Pen, BookOpen } from "lucide-react";
import type { AppLanguage } from "@/lib/studio-types";
import { createT } from "@/lib/i18n";

// ============================================================
// PART 1 — Types
// ============================================================

interface OnboardingGuideProps {
  lang: string;
  onComplete: () => void;
  onNavigate?: (tab: string) => void;
  onQuickStart?: () => void;
  onDemo?: () => void;
  showQuickStartLock?: boolean;
}

// ============================================================
// PART 2 — Labels (inline, 4 languages)
// ============================================================

const LABELS: Record<AppLanguage, {
  eyebrow: string;
  title: string;
  subtitle: string;
  quickStart: string;
  quickStartDesc: string;
  manual: string;
  manualDesc: string;
  demo: string;
  demoDesc: string;
  byok: string;
  skip: string;
}> = {
  KO: {
    eyebrow: "NOA STUDIO",
    title: "어떻게 시작할까요?",
    subtitle: "세계관 설계부터 집필까지, 원하는 방식으로 시작하세요.",
    quickStart: "쾌속 시작",
    quickStartDesc: "장르와 한 줄 프롬프트만 입력하면 세계관·캐릭터·첫 장면이 자동 생성됩니다.",
    manual: "직접 설정",
    manualDesc: "세계관, 캐릭터, 연출을 하나씩 설정하고 싶을 때.",
    demo: "데모 체험",
    demoDesc: "미리 만들어진 소설을 열어서 기능을 탐색해보세요.",
    byok: "API 키 필요",
    skip: "건너뛰기",
  },
  EN: {
    eyebrow: "NOA STUDIO",
    title: "How would you like to start?",
    subtitle: "From world design to writing — choose your path.",
    quickStart: "Quick Start",
    quickStartDesc: "Enter a genre and one-line prompt. World, characters, and first scene are auto-generated.",
    manual: "Manual Setup",
    manualDesc: "Configure world, characters, and direction step by step.",
    demo: "Try Demo",
    demoDesc: "Open a pre-built story to explore all features.",
    byok: "API key required",
    skip: "Skip",
  },
  JP: {
    eyebrow: "NOA STUDIO",
    title: "どのように始めますか？",
    subtitle: "世界観設計から執筆まで、お好みの方法で始めましょう。",
    quickStart: "クイックスタート",
    quickStartDesc: "ジャンルとプロンプトを入力するだけ。世界観・キャラ・冒頭が自動生成されます。",
    manual: "手動設定",
    manualDesc: "世界観、キャラクター、演出を一つずつ設定したい時に。",
    demo: "デモ体験",
    demoDesc: "サンプル小説を開いて機能を探索しましょう。",
    byok: "APIキーが必要",
    skip: "スキップ",
  },
  CN: {
    eyebrow: "NOA STUDIO",
    title: "您想如何开始？",
    subtitle: "从世界观设计到写作，选择您的方式。",
    quickStart: "快速开始",
    quickStartDesc: "输入类型和一句提示，世界观、角色和开场将自动生成。",
    manual: "手动设置",
    manualDesc: "逐步配置世界观、角色和演出。",
    demo: "体验演示",
    demoDesc: "打开预制故事，探索所有功能。",
    byok: "需要API密钥",
    skip: "跳过",
  },
};

// ============================================================
// PART 3 — Component
// ============================================================

function markOnboardingDone() {
  localStorage.setItem("noa_onboarding_done", "1");
}

export default function OnboardingGuide({
  lang,
  onComplete,
  onNavigate,
  onQuickStart,
  onDemo,
  showQuickStartLock,
}: OnboardingGuideProps) {
  const language = (lang === "ko" || lang === "KO" ? "KO" : lang === "JP" ? "JP" : lang === "CN" ? "CN" : "EN") as AppLanguage;
  const L = LABELS[language];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 100);
    return () => window.clearTimeout(timer);
  }, []);

  const handleAction = useCallback((action: "quickstart" | "manual" | "demo") => {
    markOnboardingDone();
    if (action === "quickstart" && onQuickStart) {
      onQuickStart();
    } else if (action === "manual" && onNavigate) {
      onNavigate("world");
    } else if (action === "demo" && onDemo) {
      onDemo();
    }
    onComplete();
  }, [onComplete, onQuickStart, onNavigate, onDemo]);

  const skip = useCallback(() => {
    markOnboardingDone();
    onComplete();
  }, [onComplete]);

  const cards: { key: "quickstart" | "manual" | "demo"; icon: React.ReactNode; title: string; desc: string; accent: boolean; badge?: string }[] = [
    { key: "quickstart", icon: <Sparkles className="h-5 w-5" />, title: L.quickStart, desc: L.quickStartDesc, accent: true, badge: showQuickStartLock ? L.byok : undefined },
    { key: "manual", icon: <Pen className="h-5 w-5" />, title: L.manual, desc: L.manualDesc, accent: false },
    { key: "demo", icon: <BookOpen className="h-5 w-5" />, title: L.demo, desc: L.demoDesc, accent: false },
  ];

  return (
    <div className={`mx-auto w-full max-w-2xl transition-all duration-500 ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
      <div className="relative rounded-[1.75rem] border border-border/50 bg-bg-secondary/80 p-6 shadow-2xl shadow-black/20 backdrop-blur md:p-8">
        {/* Skip */}
        <button type="button" onClick={skip}
          className="absolute right-4 top-4 text-text-tertiary transition-colors hover:text-text-primary"
          aria-label={L.skip}>
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <p className="text-center font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-accent-purple">
          {L.eyebrow}
        </p>
        <h3 className="mt-4 text-center text-xl font-black tracking-tight md:text-2xl">
          {L.title}
        </h3>
        <p className="mt-2 text-center text-sm text-text-secondary">
          {L.subtitle}
        </p>

        {/* 3 Cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {cards.map(({ key, icon, title, desc, accent, badge }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleAction(key)}
              className={`group relative flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all hover:scale-[1.02] active:scale-[0.98] ${
                accent
                  ? "border-accent-purple/30 bg-accent-purple/8 hover:border-accent-purple/50 hover:bg-accent-purple/12"
                  : "border-border/50 bg-bg-primary/50 hover:border-border hover:bg-bg-primary"
              }`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                accent ? "bg-accent-purple/15 text-accent-purple" : "bg-white/5 text-text-tertiary group-hover:text-text-primary"
              }`}>
                {icon}
              </div>
              <span className={`text-sm font-black uppercase tracking-wider font-[family-name:var(--font-mono)] ${
                accent ? "text-accent-purple" : "text-text-primary"
              }`}>
                {title}
              </span>
              <span className="text-[11px] leading-5 text-text-tertiary">
                {desc}
              </span>
              {badge && (
                <span className="absolute right-2 top-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-400">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
// IDENTITY_SEAL: PART-3 | role=onboarding 1-panel 3-card selector | inputs=lang,callbacks | outputs=UI
