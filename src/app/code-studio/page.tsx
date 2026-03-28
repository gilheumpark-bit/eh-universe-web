"use client";

import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import Header from "@/components/Header";
import StarField from "@/components/StarField";
import { Code2, Terminal, Cpu, ArrowLeft } from "lucide-react";

export default function CodeStudioPage() {
  const { lang } = useLang();

  const features = [
    {
      icon: Code2,
      title: L4(lang, { ko: "Monaco 에디터", en: "Monaco Editor", jp: "Monacoエディタ", cn: "Monaco编辑器" }),
      desc: L4(lang, {
        ko: "VS Code 엔진 기반 코드 편집기",
        en: "VS Code engine-based code editor",
        jp: "VS Codeエンジンベースのコードエディタ",
        cn: "基于VS Code引擎的代码编辑器",
      }),
    },
    {
      icon: Terminal,
      title: L4(lang, { ko: "내장 터미널", en: "Built-in Terminal", jp: "内蔵ターミナル", cn: "内置终端" }),
      desc: L4(lang, {
        ko: "브라우저 내 터미널 실행 환경",
        en: "In-browser terminal environment",
        jp: "ブラウザ内ターミナル環境",
        cn: "浏览器内终端环境",
      }),
    },
    {
      icon: Cpu,
      title: L4(lang, { ko: "AI 어시스턴트", en: "AI Assistant", jp: "AIアシスタント", cn: "AI助手" }),
      desc: L4(lang, {
        ko: "멀티 프로바이더 코드 생성 및 분석",
        en: "Multi-provider code generation & analysis",
        jp: "マルチプロバイダーコード生成と分析",
        cn: "多提供商代码生成与分析",
      }),
    },
  ];

  return (
    <>
      <Header />
      <main className="relative flex flex-1 flex-col items-center justify-center min-h-screen bg-bg-primary overflow-hidden">
        <StarField />

        <div className="relative z-10 mx-auto max-w-lg px-6 py-24 text-center">
          {/* Kicker */}
          <div className="mb-4 inline-block rounded-full border border-accent-green/20 bg-accent-green/8 px-4 py-1.5">
            <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-green">
              CODE STUDIO
            </span>
          </div>

          {/* Title */}
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            {L4(lang, {
              ko: "코드 스튜디오",
              en: "Code Studio",
              jp: "コードスタジオ",
              cn: "代码工作室",
            })}
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-text-secondary">
            {L4(lang, {
              ko: "Monaco 에디터 기반 코드 작업 환경을 준비하고 있습니다. 터미널, AI 어시스턴트, 8-Team 파이프라인이 통합됩니다.",
              en: "Preparing a Monaco-based coding environment. Terminal, AI assistant, and 8-Team pipeline will be integrated.",
              jp: "Monacoベースのコーディング環境を準備中です。ターミナル、AIアシスタント、8チームパイプラインが統合されます。",
              cn: "正在准备基于Monaco的编码环境。终端、AI助手和8团队管道将被集成。",
            })}
          </p>

          {/* Feature cards */}
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-left transition-all hover:border-accent-green/20 hover:bg-accent-green/[0.04]"
              >
                <f.icon className="mb-2 h-5 w-5 text-accent-green" />
                <div className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-wider text-text-primary">
                  {f.title}
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-text-tertiary">{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Phase indicator */}
          <div className="mt-8 rounded-lg border border-accent-green/15 bg-accent-green/[0.06] px-4 py-3">
            <span className="font-[family-name:var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-green">
              {L4(lang, { ko: "Phase 2 준비 중", en: "Phase 2 in progress", jp: "Phase 2 準備中", cn: "Phase 2 准备中" })}
            </span>
          </div>

          {/* Back link */}
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {L4(lang, { ko: "홈으로", en: "Back to Home", jp: "ホームへ", cn: "返回首页" })}
          </Link>
        </div>
      </main>
    </>
  );
}
