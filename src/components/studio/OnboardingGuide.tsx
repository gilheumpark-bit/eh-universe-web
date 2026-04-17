"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Sparkles, Pen, BookOpen, Sword, RotateCcw } from "lucide-react";
import type { AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";

import { DEMO_PRESETS } from "@/lib/demo-presets";

// ============================================================
// PART 1 — Types
// ============================================================

interface OnboardingGuideProps {
  lang: string;
  onComplete: () => void;
  onNavigate?: (tab: string) => void;
  onQuickStart?: () => void;
  onDemo?: (presetId?: string) => void;
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
    quickStartDesc: "장르와 한 줄 프롬프트만 입력하면 세계관·캐릭터·첫 장면 초안이 생성됩니다.",
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
    quickStartDesc: "Enter a genre and one-line prompt. World, characters, and first scene drafts are generated.",
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
  try { localStorage.setItem("noa_onboarding_done", "1"); } catch { /* quota/private */ }
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
  const [showDemoList, setShowDemoList] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 100);
    return () => window.clearTimeout(timer);
  }, []);

  const handleAction = useCallback((action: "quickstart" | "manual" | "demo") => {
    if (action === "demo") {
      setShowDemoList(true);
      return;
    }
    markOnboardingDone();
    if (action === "quickstart" && onQuickStart) {
      onQuickStart();
    } else if (action === "manual" && onNavigate) {
      onNavigate("world");
    }
    onComplete();
  }, [onComplete, onQuickStart, onNavigate]);

  const handleDemoSelect = useCallback((presetId: string) => {
    markOnboardingDone();
    if (onDemo) onDemo(presetId);
    onComplete();
  }, [onComplete, onDemo]);

  const skip = useCallback(() => {
    markOnboardingDone();
    onComplete();
  }, [onComplete]);

  // All 3 cards share equal grid weight (sm:grid-cols-3) — "manual" is equally prominent.
  // Verified: no visibility or sizing difference vs other options.
  const cards: { key: "quickstart" | "manual" | "demo"; icon: React.ReactNode; title: string; desc: string; accent: boolean; badge?: string }[] = [
    { key: "quickstart", icon: <Sparkles className="h-5 w-5" />, title: L.quickStart, desc: L.quickStartDesc, accent: true, badge: showQuickStartLock ? L.byok : undefined },
    { key: "manual", icon: <Pen className="h-5 w-5" />, title: L.manual, desc: L.manualDesc, accent: false },
    { key: "demo", icon: <BookOpen className="h-5 w-5" />, title: L.demo, desc: L.demoDesc, accent: false },
  ];

  return (
    <div className={`mx-auto w-full max-w-2xl transition-opacity duration-700 ease-out ${visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
      {/* Premium Glass Container */}
      <div className="relative rounded-4xl border border-white/8 bg-linear-to-b from-bg-secondary/90 to-bg-primary/80 p-8 shadow-[0_32px_64px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-xl md:p-10">
        {/* Decorative Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-accent-purple/20 rounded-full blur-[80px] pointer-events-none" />
        
        {/* Skip */}
        <button type="button" onClick={skip}
          className="absolute right-5 top-5 p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-white/5 transition-colors"
          aria-label={L.skip}>
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="relative">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.25em] text-accent-purple font-bold">
            {L.eyebrow}
          </p>
          <h3 className="mt-5 text-center text-2xl font-black tracking-tight md:text-3xl bg-linear-to-b from-text-primary to-text-secondary bg-clip-text text-transparent">
            {L.title}
          </h3>
          <p className="mt-3 text-center text-sm text-text-tertiary max-w-md mx-auto leading-relaxed">
            {L.subtitle}
          </p>
        </div>

        {/* 3 Cards — Premium Style */}
        {!showDemoList ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {cards.map(({ key, icon, title, desc, accent, badge }, idx) => (
              <button
                key={key}
                type="button"
                onClick={() => handleAction(key)}
                style={{ animationDelay: `${idx * 100}ms` }}
              className={`group relative flex flex-col items-center gap-4 rounded-2xl border p-6 text-center transition-transform duration-300 hover:scale-[1.03] hover:-translate-y-1 active:scale-[0.98] animate-in fade-in slide-in-from-bottom-4 ${
                  accent
                    ? "border-accent-purple/40 bg-linear-to-b from-accent-purple/15 to-accent-purple/5 hover:border-accent-purple/60 hover:shadow-[0_8px_32px_rgba(141,123,195,0.2)]"
                    : "border-white/8 bg-linear-to-b from-white/4 to-transparent hover:border-white/15 hover:bg-white/6 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                }`}
              >
                {/* Icon Container */}
                <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl transition-[transform,opacity,background-color,border-color,color] duration-300 ${
                  accent 
                    ? "bg-accent-purple/20 text-accent-purple group-hover:bg-accent-purple/30 group-hover:shadow-[0_0_24px_rgba(141,123,195,0.3)]" 
                    : "bg-white/6 text-text-tertiary group-hover:text-text-primary group-hover:bg-white/10"
                }`}>
                  {icon}
                  {accent && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-purple rounded-full animate-pulse" />
                  )}
                </div>
                
                {/* Title */}
                <span className={`text-sm font-black uppercase tracking-wider font-mono ${
                  accent ? "text-accent-purple" : "text-text-primary"
                }`}>
                  {title}
                </span>
                
                {/* Description */}
                <span className="text-xs leading-relaxed text-text-tertiary group-hover:text-text-secondary transition-colors">
                  {desc}
                </span>
                
                {/* Badge */}
                {badge && (
                  <span className="absolute right-3 top-3 rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[9px] font-bold text-amber-400">
                    {badge}
                  </span>
                )}
                
                {/* Arrow indicator */}
                <span className={`mt-auto text-[10px] uppercase tracking-wider font-bold transition-[transform,opacity,background-color,border-color,color] duration-300 ${
                  accent 
                    ? "text-accent-purple/60 group-hover:text-accent-purple" 
                    : "text-text-tertiary/40 group-hover:text-text-tertiary"
                }`}>
                  {language === 'KO' ? '시작하기 →' : 'Start →'}
                </span>
              </button>
            ))}
          </div>
        ) : (
          /* Demo Preset Selection */
          <div className="mt-6 space-y-3">
            <button type="button" onClick={() => setShowDemoList(false)}
              className="text-[11px] text-text-tertiary hover:text-text-primary transition-colors min-h-[44px]">
              {L4(language, { ko: '← 돌아가기', en: '← Back', ja: '← 戻る', zh: '← 返回' })}
            </button>
            <p className="text-center text-sm font-bold text-text-primary">
              {language === 'KO' ? '체험할 장르를 선택하세요' : 'Choose a genre to explore'}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {DEMO_PRESETS.map((preset) => {
                const icons = [<Sword key="s" className="h-5 w-5" />, <BookOpen key="b" className="h-5 w-5" />, <RotateCcw key="r" className="h-5 w-5" />];
                const colors = ['border-red-500/30 hover:border-red-500/50', 'border-blue-500/30 hover:border-blue-500/50', 'border-amber-500/30 hover:border-amber-500/50'];
                const idx = DEMO_PRESETS.indexOf(preset);
                return (
                  <button key={preset.id} type="button" onClick={() => handleDemoSelect(preset.id)}
                    className={`group flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-transform hover:scale-[1.02] active:scale-[0.98] bg-bg-primary/50 ${colors[idx] || 'border-border/50'}`}>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-text-tertiary group-hover:text-text-primary">
                      {icons[idx]}
                    </div>
                    <span className="text-sm font-black font-mono text-text-primary">
                      {preset.name[language === 'KO' ? 'ko' : 'en']}
                    </span>
                    <span className="text-[11px] leading-5 text-text-tertiary line-clamp-3">
                      {preset.description[language === 'KO' ? 'ko' : 'en']}
                    </span>
                    <div className="flex flex-wrap justify-center gap-1 mt-1">
                      {preset.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] text-text-tertiary">{tag}</span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// IDENTITY_SEAL: PART-3 | role=onboarding 1-panel 3-card selector | inputs=lang,callbacks | outputs=UI
