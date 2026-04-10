"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { Feather, ArrowRight } from "lucide-react";
import UnifiedSettingsBar from "@/components/home/UnifiedSettingsBar";

export default function SplashScreen({
  onStudio,
}: {
  onUniverse: () => void;
  onStudio: () => void;
  onCodeStudio: () => void;
  onTranslationStudio: () => void;
}) {
  const { lang } = useLang();
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-dvh flex w-full items-center justify-center overflow-hidden eh-page-canvas">
      <div className="relative z-10 w-full max-w-lg mx-auto px-6 flex flex-col items-center gap-10">

        {/* Badge */}
        <div
          className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-bg-secondary/60 backdrop-blur-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-amber/20 font-mono text-[8px] font-bold tracking-wider text-accent-amber">
              EH
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-tertiary">
              Universe · Writing Studio
            </span>
          </div>
        </div>

        {/* Headline */}
        <div
          className={`text-center transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-text-primary leading-snug">
            {L4(lang, {
              ko: "오늘도 쓰러 오셨군요.",
              en: "Ready to write today?",
              ja: "今日も書きに来ましたね。",
              zh: "今天也来写作了。",
            })}
          </h1>
          <p className="mt-4 text-base text-text-secondary leading-relaxed max-w-sm mx-auto">
            {L4(lang, {
              ko: "NOA와 함께 이 세계관 위에 이야기를 씁니다.",
              en: "Write your story with NOA, inside this universe.",
              ja: "NOAと共に、この世界観の上に物語を書きます。",
              zh: "与NOA一起，在这个世界观中创作故事。",
            })}
          </p>
        </div>

        {/* Settings Bar */}
        <div
          className={`w-full transition-all duration-700 delay-150 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          <UnifiedSettingsBar />
        </div>

        {/* CTA Card */}
        <div
          className={`w-full transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <button
            onClick={onStudio}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`
              w-full group relative overflow-hidden rounded-2xl
              border bg-bg-secondary/95 backdrop-blur-xl
              px-7 py-8 text-left
              hover-lift
              ${hovered ? 'border-accent-amber/40 shadow-[0_0_32px_rgba(202,161,92,0.12)]' : 'border-border/50'}
              active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber/50
            `}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {/* Kicker */}
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-amber/80 mb-3">
                  {L4(lang, { ko: "집필 워크스페이스", en: "Writing Workspace", ja: "執筆ワークスペース", zh: "写作工作台" })}
                </p>

                {/* Title */}
                <h2 className="font-serif text-2xl font-bold text-text-primary mb-2 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-amber/10 border border-accent-amber/20 text-accent-amber">
                    <Feather className="w-4 h-4" />
                  </span>
                  {L4(lang, { ko: "NOA 스튜디오", en: "NOA Studio", ja: "NOA スタジオ", zh: "NOA 工作室" })}
                </h2>

                {/* Desc */}
                <p className="text-sm leading-7 text-text-secondary">
                  {L4(lang, {
                    ko: "세계관 · 인물 · 원고를 한 화면에서 관리합니다.",
                    en: "Manage world, characters, and manuscript in one place.",
                    ja: "世界観・人物・原稿をひとつの画面で管理します。",
                    zh: "在一个界面中管理世界观、人物和原稿。",
                  })}
                </p>

                {/* Hint */}
                <p className="mt-2 text-xs text-text-tertiary">
                  {L4(lang, {
                    ko: "유니버스 · 코드 · 번역은 하단 독에서 바로 이동할 수 있어요.",
                    en: "Access Universe, Code & Translate from the bottom dock.",
                    ja: "ユニバース・コード・翻訳は下部ドックからすぐ移動できます。",
                    zh: "可从底部Dock直接访问宇宙、代码和翻译。",
                  })}
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className={`mt-6 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-200 ${hovered ? 'text-accent-amber' : 'text-text-tertiary'}`}>
              {L4(lang, { ko: "집필 시작하기", en: "Start Writing", ja: "執筆を始める", zh: "开始写作" })}
              <ArrowRight className={`w-4 h-4 transition-transform duration-200 ${hovered ? 'translate-x-1' : ''}`} />
            </div>
          </button>
        </div>

        {/* Footer */}
        <p
          className={`text-xs text-text-tertiary font-mono tracking-wide transition-all duration-700 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          CC-BY-NC-4.0 · EH Universe
        </p>
      </div>
    </div>
  );
}
