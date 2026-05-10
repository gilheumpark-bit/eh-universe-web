"use client";

import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { useState } from "react";
import dynamic from "next/dynamic";
// [Codex UI domain — 2026-05-10] 4 도메인 (KO 웹소설 / EN fantasy / JA 라노벨 / ZH 선협) 선택 dropdown
import { normalizeToAgentLang } from "@/lib/ai/lang-normalize";
const CodexDomainSelector = dynamic(() => import("@/components/codex/CodexDomainSelector"), { ssr: false });

const DynLoading = () => <div className="text-center py-12 text-text-tertiary text-xs animate-pulse">Loading...</div>;
const RulebookPage = dynamic(() => import("../rulebook/page"), { ssr: false, loading: DynLoading });
const ReferencePage = dynamic(() => import("../reference/page"), { ssr: false, loading: DynLoading });
const DocsPage = dynamic(() => import("../docs/page"), { ssr: false, loading: DynLoading });

const TABS = [
  { id: "rulebook", ko: "EH RULEBOOK", en: "EH RULEBOOK", ja: "EH RULEBOOK", zh: "EH RULEBOOK", desc: { ko: "서사 붕괴 방지 엔진", en: "Narrative Collapse Prevention Engine", ja: "物語崩壊防止エンジン", zh: "叙事崩溃防止引擎" } },
  { id: "reference", ko: "REFERENCE", en: "REFERENCE", ja: "REFERENCE", zh: "REFERENCE", desc: { ko: "세계관 참조 문서", en: "World Reference Document", ja: "世界観参照ドキュメント", zh: "世界观参考文档" } },
  { id: "guide", ko: "GUIDE", en: "GUIDE", ja: "GUIDE", zh: "GUIDE", desc: { ko: "Loreguard 사용설명서", en: "Loreguard User Guide", ja: "Loreguard ユーザーガイド", zh: "Loreguard 用户指南" } },
] as const;

type TabId = typeof TABS[number]["id"];

export default function CodexPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);
  const [tab, setTab] = useState<TabId>("rulebook");

  return (
    <>
      <Header />
      {/* [C] codex는 탭으로 rulebook/reference/docs 페이지를 임베드 — 내부 <main>이 존재하므로 외부는 <section>으로 중첩 main 회피 */}
      <section className="pt-20 md:pt-24" aria-label="Codex 지식 허브">
        <div className="mx-auto max-w-6xl px-4 py-12">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-mono text-3xl font-black tracking-tight text-text-primary mb-2">
                CODEX
              </h1>
              <p className="text-text-tertiary text-sm font-mono">
                {T({ ko: "EH Universe 통합 지식 허브", en: "The complete knowledge base of EH Universe", ja: "EH Universe 統合ナレッジベース", zh: "EH Universe 综合知识库" })}
              </p>
            </div>
            {/* [Codex UI domain — 2026-05-10] 도메인 선택 — 자동 (언어 기반) / 4 도메인 명시 */}
            <CodexDomainSelector language={normalizeToAgentLang(lang)} />
          </div>

          {/* Tab Bar — 모바일 가로 스크롤 지원 */}
          <div className="flex gap-1 mb-8 border-b border-border pb-0 overflow-x-auto flex-nowrap scrollbar-thin">
            {TABS.map(t => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 px-4 sm:px-5 py-3 min-h-[44px] font-mono text-xs font-bold tracking-widest uppercase transition-[transform,opacity,background-color,border-color,color] border-b-2 -mb-[1px] ${
                    active
                      ? "border-accent-purple text-accent-purple"
                      : "border-transparent text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  {L4(lang, t)}
                </button>
              );
            })}
          </div>

          {/* Tab description */}
          <p className="text-text-tertiary text-xs font-mono mb-6 tracking-wider">
            {(() => { const d = TABS.find(t => t.id === tab)?.desc; return d ? T(d) : ""; })()}
          </p>

          {/* Tab Content — render without Header (embedded mode) */}
          <div className="codex-embedded">
            {tab === "rulebook" && <RulebookContent />}
            {tab === "reference" && <ReferenceContent />}
            {tab === "guide" && <GuideContent />}
          </div>
        </div>
      </section>
    </>
  );
}

// Embedded versions that skip their own Header
// [C] <article> 래퍼 — 임베드된 h1 시맨틱을 sectioning content 내부로 격리.
//     HTML5: article 내 h1은 별도 outline. axe 다중 h1 경고 완화 + 시각 유지.
function RulebookContent() {
  return (
    <article className="[&>header]:hidden [&>main]:pt-0 [&_.mx-auto]:max-w-none [&_.px-4]:px-0 [&_.py-16]:py-0" aria-label="EH Rulebook v1.0">
      <RulebookPage />
    </article>
  );
}

function ReferenceContent() {
  return (
    <article className="[&>header]:hidden [&>main]:pt-0 [&_.mx-auto]:max-w-none [&_.px-4]:px-0 [&_.py-16]:py-0" aria-label="EH Open Reference">
      <ReferencePage />
    </article>
  );
}

function GuideContent() {
  return (
    <article className="[&>header]:hidden [&>main]:pt-0 [&_.mx-auto]:max-w-none [&_.px-4]:px-0 [&_.py-16]:py-0" aria-label="Loreguard User Guide">
      <DocsPage />
    </article>
  );
}
