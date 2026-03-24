"use client";

import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";
import { useState } from "react";
import dynamic from "next/dynamic";

const RulebookPage = dynamic(() => import("../rulebook/page"), { ssr: false });
const ReferencePage = dynamic(() => import("../reference/page"), { ssr: false });
const DocsPage = dynamic(() => import("../docs/page"), { ssr: false });

const TABS = [
  { id: "rulebook", ko: "EH RULEBOOK", en: "EH RULEBOOK", jp: "EH RULEBOOK", cn: "EH RULEBOOK", desc: { ko: "서사 붕괴 방지 엔진", en: "Narrative Collapse Prevention Engine", jp: "物語崩壊防止エンジン", cn: "叙事崩溃防止引擎" } },
  { id: "reference", ko: "REFERENCE", en: "REFERENCE", jp: "REFERENCE", cn: "REFERENCE", desc: { ko: "세계관 참조 문서", en: "World Reference Document", jp: "世界観参照ドキュメント", cn: "世界观参考文档" } },
  { id: "guide", ko: "GUIDE", en: "GUIDE", jp: "GUIDE", cn: "GUIDE", desc: { ko: "NOA Studio 사용설명서", en: "NOA Studio User Guide", jp: "NOA Studio ユーザーガイド", cn: "NOA Studio 用户指南" } },
] as const;

type TabId = typeof TABS[number]["id"];

export default function CodexPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; jp?: string; cn?: string }) =>
    lang === "ko" ? v.ko : lang === "jp" && v.jp ? v.jp : lang === "cn" && v.cn ? v.cn : v.en;
  const [tab, setTab] = useState<TabId>("rulebook");

  return (
    <>
      <Header />
      <main className="pt-14">
        <div className="mx-auto max-w-6xl px-4 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-[family-name:var(--font-mono)] text-3xl font-black tracking-tight text-text-primary mb-2">
              CODEX
            </h1>
            <p className="text-text-tertiary text-sm font-[family-name:var(--font-mono)]">
              {T({ ko: "EH Universe 통합 지식 허브", en: "The complete knowledge base of EH Universe", jp: "EH Universe 統合ナレッジベース", cn: "EH Universe 综合知识库" })}
            </p>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-1 mb-8 border-b border-border pb-0">
            {TABS.map(t => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-5 py-3 font-[family-name:var(--font-mono)] text-xs font-bold tracking-widest uppercase transition-all border-b-2 -mb-[1px] ${
                    active
                      ? "border-accent-purple text-accent-purple"
                      : "border-transparent text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  {lang === "ko" ? t.ko : lang === "jp" ? t.jp : lang === "cn" ? t.cn : t.en}
                </button>
              );
            })}
          </div>

          {/* Tab description */}
          <p className="text-text-tertiary text-xs font-[family-name:var(--font-mono)] mb-6 tracking-wider">
            {(() => { const d = TABS.find(t => t.id === tab)?.desc; return d ? T(d) : ""; })()}
          </p>

          {/* Tab Content — render without Header (embedded mode) */}
          <div className="codex-embedded">
            {tab === "rulebook" && <RulebookContent />}
            {tab === "reference" && <ReferenceContent />}
            {tab === "guide" && <GuideContent />}
          </div>
        </div>
      </main>
    </>
  );
}

// Embedded versions that skip their own Header
function RulebookContent() {
  return (
    <div className="[&>header]:hidden [&>main]:pt-0 [&_.mx-auto]:max-w-none [&_.px-4]:px-0 [&_.py-16]:py-0">
      <RulebookPage />
    </div>
  );
}

function ReferenceContent() {
  return (
    <div className="[&>header]:hidden [&>main]:pt-0 [&_.mx-auto]:max-w-none [&_.px-4]:px-0 [&_.py-16]:py-0">
      <ReferencePage />
    </div>
  );
}

function GuideContent() {
  return (
    <div className="[&>header]:hidden [&>main]:pt-0 [&_.mx-auto]:max-w-none [&_.px-4]:px-0 [&_.py-16]:py-0">
      <DocsPage />
    </div>
  );
}
