"use client";

import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { Globe, PenTool, Code2 } from "lucide-react";
import StarField from "@/components/StarField";

export default function SplashScreen({
  onUniverse,
  onStudio,
  onCodeStudio,
}: {
  onUniverse: () => void;
  onStudio: () => void;
  onCodeStudio: () => void;
}) {
  const { lang } = useLang();

  const cardBase = "group relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(14,18,27,0.95),rgba(7,9,13,0.8))] backdrop-blur-xl px-6 py-8 sm:px-8 sm:py-10 text-left transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] active:scale-[0.98]";

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-bg-primary">
      <StarField />
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 flex flex-col items-center gap-12">
        <div className="text-center">
          <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.22em] text-text-tertiary mb-4">
            EH UNIVERSE
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold bg-gradient-to-r from-accent-amber via-accent-purple to-accent-green bg-clip-text text-transparent">
            {L4(lang, { ko: "어디로 향할까요?", en: "Where are you headed?", jp: "どこへ向かいますか？", cn: "您要去哪里？" })}
          </h1>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* UNIVERSE */}
          <button onClick={onUniverse} className={`${cardBase} hover:border-accent-amber/40 cs-animate-fade-in`}>
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-amber/10 blur-3xl transition-opacity duration-300 group-hover:opacity-150" />
            </div>
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-accent-amber mb-4">
              {L4(lang, { ko: "세계관 탐색", en: "Explore", jp: "世界観探索", cn: "探索世界观" })}
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-text-primary mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-accent-amber" />
              UNIVERSE
            </h2>
            <p className="text-sm leading-7 text-text-secondary">
              {L4(lang, { ko: "아카이브, 네트워크, 세계관 문서를 탐색합니다.", en: "Browse the archive, network, and worldbuilding docs.", jp: "アーカイブ、ネットワーク、世界観文書を探索します。", cn: "探索档案库、网络和世界观文档。" })}
            </p>
            <div className="mt-6 flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-text-tertiary group-hover:text-accent-amber transition-colors">
              {L4(lang, { ko: "탐색 시작", en: "Enter", jp: "探索開始", cn: "开始探索" })} →
            </div>
          </button>

          {/* STUDIO */}
          <button onClick={onStudio} className={`${cardBase} hover:border-accent-purple/40 cs-animate-fade-in cs-delay-1`}>
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-purple/10 blur-3xl transition-opacity duration-300 group-hover:opacity-150" />
            </div>
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-accent-purple mb-4">
              {L4(lang, { ko: "집필 시작", en: "Write", jp: "執筆開始", cn: "开始写作" })}
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-text-primary mb-3 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-accent-purple" />
              STUDIO
            </h2>
            <p className="text-sm leading-7 text-text-secondary">
              {L4(lang, { ko: "세계관 설계 작업실로 진입합니다.", en: "Enter the world design and writing workspace.", jp: "世界観設計ワークスペースに入ります。", cn: "进入世界观设计工作室。" })}
            </p>
            <div className="mt-6 flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-text-tertiary group-hover:text-accent-purple transition-colors">
              {L4(lang, { ko: "스튜디오 열기", en: "Open Studio", jp: "スタジオを開く", cn: "打开工作室" })} →
            </div>
          </button>

          {/* CODE STUDIO */}
          <button onClick={onCodeStudio} className={`${cardBase} hover:border-accent-green/40 cs-animate-fade-in cs-delay-2`}>
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-green/10 blur-3xl transition-opacity duration-300 group-hover:opacity-150" />
            </div>
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-accent-green mb-4">
              {L4(lang, { ko: "코드 편집", en: "Code", jp: "コード編集", cn: "代码编辑" })}
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-text-primary mb-3 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-accent-green" />
              CODE
              <span className="rounded-full bg-accent-green/20 text-accent-green text-[9px] px-2 py-0.5 font-bold animate-pulse">NEW</span>
            </h2>
            <p className="text-sm leading-7 text-text-secondary">
              {L4(lang, { ko: "Monaco 에디터 기반 코드 작업 환경.", en: "Monaco-based coding environment with AI.", jp: "Monacoエディタベースのコーディング環境。", cn: "基于Monaco编辑器的编码环境。" })}
            </p>
            <div className="mt-6 flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-text-tertiary group-hover:text-accent-green transition-colors">
              {L4(lang, { ko: "코드 스튜디오", en: "Open Code", jp: "コードスタジオ", cn: "代码工作室" })} →
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
