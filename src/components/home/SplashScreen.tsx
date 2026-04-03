"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { Globe, PenTool, Code2, Languages, ArrowRight, Sparkles } from "lucide-react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import UnifiedSettingsBar from "@/components/home/UnifiedSettingsBar";

export default function SplashScreen({
  onUniverse,
  onStudio,
  onCodeStudio,
  onTranslationStudio,
}: {
  onUniverse: () => void;
  onStudio: () => void;
  onCodeStudio: () => void;
  /** 전문 번역(EH Translator) 진입 */
  onTranslationStudio: () => void;
}) {
  const { lang } = useLang();
  const flags = useFeatureFlags();
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const allCards = [
    {
      id: "universe",
      onClick: onUniverse,
      color: "amber",
      Icon: Globe,
      kicker: { ko: "세계관 탐색", en: "Explore", jp: "世界観探索", cn: "探索世界观" },
      title: "UNIVERSE",
      desc: { ko: "아카이브, 네트워크, 세계관 문서를 탐색합니다.", en: "Browse the archive, network, and worldbuilding docs.", jp: "アーカイブ、ネットワーク、世界観文書を探索します。", cn: "探索档案库、网络和世界观文档。" },
      cta: { ko: "탐색 시작", en: "Enter", jp: "探索開始", cn: "开始探索" },
      badge: null,
    },
    {
      id: "studio",
      onClick: onStudio,
      color: "purple",
      Icon: PenTool,
      kicker: { ko: "집필 시작", en: "Write", jp: "執筆開始", cn: "开始写作" },
      title: "STUDIO",
      desc: { ko: "AI와 함께 세계관 기반 소설을 집필합니다.", en: "Write stories with AI in this universe.", jp: "AIと共に世界観ベースの小説を執筆します。", cn: "与AI一起在这个世界观中写作。" },
      cta: { ko: "스튜디오 열기", en: "Open Studio", jp: "スタジオを開く", cn: "打开工作室" },
      badge: { ko: "AI 집필", en: "AI Writing", jp: "AI執筆", cn: "AI写作" },
    },
    {
      id: "code",
      onClick: onCodeStudio,
      color: "green",
      Icon: Code2,
      kicker: { ko: "코드 편집", en: "Code", jp: "コード編集", cn: "代码编辑" },
      title: "CODE",
      desc: { ko: "Monaco 에디터 기반 코드 작업 환경.", en: "Monaco-based coding environment with AI.", jp: "Monacoエディタベースのコーディング環境。", cn: "基于Monaco编辑器的编码环境。" },
      cta: { ko: "코드 스튜디오", en: "Open Code", jp: "コードスタジオ", cn: "代码工作室" },
      badge: "NEW",
    },
    {
      id: "translate",
      onClick: onTranslationStudio,
      color: "blue",
      Icon: Languages,
      kicker: { ko: "전문 번역", en: "Translate", jp: "翻訳", cn: "翻译" },
      title: "TRANSLATE",
      desc: {
        ko: "장편·챕터·용어 중심 EH Translator 워크스페이스입니다.",
        en: "EH Translator — long-form, chapter, and glossary workflow.",
        jp: "EH Translator — 長編・チャプター・用語を中心としたワークスペース。",
        cn: "EH Translator 长篇、章节与术语工作空间。",
      },
      cta: { ko: "번역 스튜디오", en: "Open Translator", jp: "翻訳へ", cn: "打开翻译" },
      badge: { ko: "전문", en: "Pro", jp: "専門", cn: "专业" },
    },
  ];

  const cards = flags.CODE_STUDIO ? allCards : allCards.filter((c) => c.id !== "code");

  const colorMap: Record<string, { border: string; bg: string; text: string; glow: string; shadow: string }> = {
    amber: { 
      border: "border-accent-amber/50", 
      bg: "bg-accent-amber", 
      text: "text-accent-amber",
      glow: "bg-accent-amber/20",
      shadow: "shadow-[0_0_60px_rgba(202,161,92,0.3)]"
    },
    purple: { 
      border: "border-accent-purple/50", 
      bg: "bg-accent-purple", 
      text: "text-accent-purple",
      glow: "bg-accent-purple/20",
      shadow: "shadow-[0_0_60px_rgba(141,123,195,0.3)]"
    },
    green: { 
      border: "border-accent-green/50", 
      bg: "bg-accent-green", 
      text: "text-accent-green",
      glow: "bg-accent-green/20",
      shadow: "shadow-[0_0_60px_rgba(47,155,131,0.3)]"
    },
    blue: {
      border: "border-accent-blue/50",
      bg: "bg-accent-blue",
      text: "text-accent-blue",
      glow: "bg-accent-blue/20",
      shadow: "shadow-[0_0_60px_rgba(59,130,246,0.28)]",
    },
  };

  return (
    <div className="relative min-h-dvh flex w-full items-center justify-center overflow-hidden eh-page-canvas">

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center gap-10 sm:gap-14">
        {/* Header */}
        <div 
          className={`text-center transition-all duration-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-bg-secondary/60 backdrop-blur-sm mb-6">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-amber/20 font-mono text-[8px] font-bold tracking-wider text-accent-amber">
              EH
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-tertiary">
              UNIVERSE
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary leading-tight">
            {L4(lang, { ko: "어디로 향할까요?", en: "Where are you headed?", jp: "どこへ向かいますか？", cn: "您要去哪里？" })}
          </h1>
          <p className="mt-4 text-sm sm:text-base text-text-secondary max-w-md mx-auto">
            {L4(lang, {
              ko: "세계관을 탐색하거나, 직접 이야기를 써보세요.",
              en: "Explore the universe or write your own story.",
              jp: "世界観を探索するか、自分の物語を書いてみてください。",
              cn: "探索这个世界观，或者写下你自己的故事。"
            })}
          </p>

          {/* Unified Settings Bar */}
          <div className="mt-6">
            <UnifiedSettingsBar />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-6xl mx-auto">
          {cards.map((card, index) => {
            const c = colorMap[card.color];
            const isHovered = hovered === card.id;
            
            return (
              <button
                key={card.id}
                onClick={card.onClick}
                onMouseEnter={() => setHovered(card.id)}
                onMouseLeave={() => setHovered(null)}
                className={`
                  group relative overflow-hidden rounded-xl sm:rounded-[28px]
                  border bg-bg-secondary/95
                  backdrop-blur-xl px-5 py-7 sm:px-7 sm:py-9 text-left
                  transition-all duration-200 ease-out
                  ${isHovered ? `${c.border} shadow-panel scale-[1.02] -translate-y-1` : 'border-border/50'}
                  active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary
                  ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                `}
                style={{ 
                  transitionDelay: mounted ? `${150 + index * 100}ms` : '0ms',
                }}
              >
                {/* Content */}
                <div className="relative z-10">
                  {/* Kicker with badge */}
                  <div className="flex items-center gap-2 mb-4">
                    <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${c.text}`}>
                      {L4(lang, card.kicker)}
                    </p>
                    {card.badge && (
                      <span className={`
                        inline-flex items-center gap-1 rounded-full px-2 py-0.5
                        font-mono text-[9px] font-bold uppercase
                        ${card.badge === 'NEW' 
                          ? 'bg-accent-green/20 text-accent-green animate-pulse' 
                          : `${c.bg}/15 ${c.text}`
                        }
                      `}>
                        {typeof card.badge === 'string' ? card.badge : L4(lang, card.badge)}
                      </span>
                    )}
                  </div>

                  {/* Title with icon */}
                  <h2 className="font-display text-2xl sm:text-[1.75rem] font-bold text-text-primary mb-3 flex items-center gap-3">
                    <span className={`
                      flex h-10 w-10 items-center justify-center rounded-xl
                      ${c.bg}/15 border border-current/20 ${c.text}
                      transition-all duration-300
                      ${isHovered ? 'scale-110' : 'scale-100'}
                    `}>
                      <card.Icon className="w-5 h-5" />
                    </span>
                    {card.title}
                  </h2>

                  {/* Description */}
                  <p className="text-sm leading-7 text-text-secondary mb-6 min-h-14">
                    {L4(lang, card.desc)}
                  </p>

                  {/* CTA */}
                  <div className={`
                    flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em]
                    transition-all duration-300
                    ${isHovered ? c.text : 'text-text-tertiary'}
                  `}>
                    {L4(lang, card.cta)}
                    <ArrowRight className={`
                      w-4 h-4 transition-transform duration-300
                      ${isHovered ? 'translate-x-1' : 'translate-x-0'}
                    `} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div 
          className={`
            flex items-center gap-2 text-text-tertiary text-xs
            transition-all duration-700 delay-500
            ${mounted ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="font-mono tracking-wide">
            {L4(lang, { 
              ko: "CC-BY-NC-4.0 라이선스로 자유롭게 활용하세요", 
              en: "Free to use under CC-BY-NC-4.0 license", 
              jp: "CC-BY-NC-4.0ライセンスで自由にご利用ください", 
              cn: "根据CC-BY-NC-4.0许可证自由使用" 
            })}
          </span>
        </div>
      </div>

    </div>
  );
}
