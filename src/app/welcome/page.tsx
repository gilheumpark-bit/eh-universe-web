"use client";

// ============================================================
// PART 1 — Imports
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Feather, Brain, Users } from "lucide-react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { confirmAge } from "@/lib/content-rating";

// ============================================================
// PART 2 — Onboarding 3-Slide Component
// 브랜드 철학 Part 9 구현 — 해줘 vs 해라 철학을 첫 방문에 전달
// ============================================================

const STORAGE_KEY = "eh-onboarded";

interface Slide {
  icon: React.ReactNode;
  heading: { ko: string; en: string; ja?: string; zh?: string };
  body: { ko: string; en: string; ja?: string; zh?: string };
  accent: string;
}

const SLIDES: Slide[] = [
  {
    icon: <Feather className="w-10 h-10 md:w-12 md:h-12" />,
    heading: {
      ko: "AI가 쓰나요? 작가가 쓰나요?",
      en: "Does AI write? Or the author?",
      ja: "AIが書きますか? 作家が書きますか?",
      zh: "AI 写作? 作者写作?",
    },
    body: {
      ko: "여기서 쓰는 건 당신입니다.\n우리는 당신을 대신하지 않습니다.",
      en: "Here, you write.\nWe do not write for you.",
      ja: "ここでは、あなたが書きます。\n私たちはあなたの代わりに書きません。",
      zh: "这里由您来写。\n我们不代替您写作。",
    },
    accent: "text-accent-blue",
  },
  {
    icon: <Brain className="w-10 h-10 md:w-12 md:h-12" />,
    heading: {
      ko: "AI가 아닌, 당신을 훈련시킵니다",
      en: "We train you, not the AI",
      ja: "AIではなく、あなたを訓練します",
      zh: "我们训练您,而非 AI",
    },
    body: {
      ko: "질문하는 법, 문제를 쪼개는 법, 서사를 짜는 법.\nAI 시대의 새로운 문해력입니다.",
      en: "How to ask. How to break down problems. How to craft narrative.\nThis is literacy for the AI era.",
      ja: "質問の仕方、問題の分け方、物語の組み立て方。\nAI時代の新しいリテラシーです。",
      zh: "如何提问,如何拆解问题,如何构建叙事。\nAI 时代的新素养。",
    },
    accent: "text-accent-purple",
  },
  {
    icon: <Users className="w-10 h-10 md:w-12 md:h-12" />,
    heading: {
      ko: "같이 하세요.",
      en: "Let's do this together.",
      ja: "一緒にやりましょう。",
      zh: "一起来吧。",
    },
    body: {
      ko: "먼저 묻지 않습니다. 먼저 쓰지 않습니다.\n당신이 쓴 문장 옆에, 필요할 때만 있습니다.",
      en: "We don't ask first. We don't write first.\nWe stand beside your sentences — only when you need us.",
      ja: "先に尋ねません。先に書きません。\nあなたの文章のそばに、必要なときだけ。",
      zh: "不先提问。不先动笔。\n陪伴在您的文字旁,仅在您需要时。",
    },
    accent: "text-accent-green",
  },
];

// ============================================================
// PART 3 — Main Component
// ============================================================

export default function WelcomePage() {
  const router = useRouter();
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);
  const [slideIdx, setSlideIdx] = useState(0);
  // 만 14세 이상 자가 선언 — 기본 true로 기존 onboarding 플로우 유지.
  // 사용자가 uncheck 시 '시작하기' 비활성.
  const [ageConfirmed, setAgeConfirmed] = useState(true);

  // 이미 온보딩 마친 사용자는 스튜디오로 바로
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1") {
        router.replace("/studio");
      }
    } catch {
      /* private browsing */
    }
  }, [router]);

  const handleNext = () => {
    if (slideIdx < SLIDES.length - 1) {
      setSlideIdx(slideIdx + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
      if (ageConfirmed) confirmAge();
    } catch {
      /* private browsing — 다음 방문에 다시 표시될 수 있음 */
    }
    router.push("/studio");
  };

  const slide = SLIDES[slideIdx];
  const isLast = slideIdx === SLIDES.length - 1;

  return (
    <main className="min-h-screen flex flex-col bg-bg-primary text-text-primary">
      {/* Header — skip button */}
      <div className="flex justify-between items-center p-4 md:p-6">
        <div className="text-xs md:text-sm font-mono uppercase tracking-widest text-text-tertiary">
          Loreguard
        </div>
        <button
          onClick={handleSkip}
          className="text-xs md:text-sm text-text-tertiary hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded px-3 py-1 min-h-[44px]"
        >
          {T({ ko: "건너뛰기", en: "Skip", ja: "スキップ", zh: "跳过" })}
        </button>
      </div>

      {/* Main slide */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-8">
        <div className="max-w-xl w-full text-center">
          {/* Icon */}
          <div className={`flex justify-center mb-8 ${slide.accent}`}>
            {slide.icon}
          </div>

          {/* Heading */}
          <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-6 tracking-tight">
            {T(slide.heading)}
          </h1>

          {/* Body */}
          <p className="text-base md:text-lg text-text-secondary leading-relaxed whitespace-pre-line mb-10">
            {T(slide.body)}
          </p>

          {/* Slide indicators */}
          <div className="flex justify-center gap-2 mb-10">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideIdx(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === slideIdx ? "w-10 bg-accent-blue" : "w-2 bg-border"
                }`}
              />
            ))}
          </div>

          {/* 만 14세 이상 자가 선언 — 마지막 슬라이드에서만 노출 */}
          {isLast && (
            <label className="flex items-center justify-center gap-2 mb-6 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                className="w-4 h-4 rounded border-border text-accent-blue focus-visible:ring-2 focus-visible:ring-accent-blue"
                aria-describedby="age-confirm-desc"
              />
              <span id="age-confirm-desc" className="text-xs md:text-sm text-text-secondary">
                {T({
                  ko: "만 14세 이상입니다 (한국 청소년보호법 기준)",
                  en: "I am 14 or older (per Korea Youth Protection Act)",
                  ja: "満14歳以上です(韓国青少年保護法基準)",
                  zh: "年满 14 岁（依据韩国青少年保护法）",
                })}
              </span>
            </label>
          )}

          {/* Next / Start button */}
          <button
            onClick={handleNext}
            disabled={isLast && !ageConfirmed}
            className="bg-accent-blue text-white px-8 py-3 rounded-xl text-base font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[48px] inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLast
              ? T({ ko: "시작하기", en: "Start", ja: "はじめる", zh: "开始" })
              : T({ ko: "다음", en: "Next", ja: "次へ", zh: "下一步" })}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Footer — legal links */}
      <div className="p-4 md:p-6 text-center">
        <div className="text-[10px] md:text-xs text-text-tertiary space-x-3">
          <Link href="/privacy" className="hover:text-text-secondary hover:underline">
            {T({ ko: "개인정보처리방침", en: "Privacy", ja: "プライバシー", zh: "隐私政策" })}
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-text-secondary hover:underline">
            {T({ ko: "이용약관", en: "Terms", ja: "利用規約", zh: "服务条款" })}
          </Link>
          <span>·</span>
          <Link href="/about" className="hover:text-text-secondary hover:underline">
            {T({ ko: "소개", en: "About", ja: "紹介", zh: "关于" })}
          </Link>
          <span>·</span>
          <Link href="/changelog" className="hover:text-text-secondary hover:underline">
            {T({ ko: "변경 이력", en: "Changelog", ja: "変更履歴", zh: "更新日志" })}
          </Link>
        </div>
      </div>
    </main>
  );
}

// IDENTITY_SEAL: WelcomePage | role=onboarding-3slide | inputs=lang | outputs=welcome-ui
