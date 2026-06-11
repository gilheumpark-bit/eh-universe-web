"use client";

import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
// [Codex UI domain — 2026-05-10] 4 도메인 (KO 웹소설 / EN fantasy / JA 라노벨 / ZH 선협) 선택 dropdown
import { normalizeToAgentLang, toAppLang } from "@/lib/ai/lang-normalize";
// [Codex auto-select — 2026-06-07 / rank 15] override 없으면 작품 언어 기반 자동 선택
import { defaultDomainForLanguage } from "@/components/codex/CodexDomainSelector";
import { getStoredCodexDomain, setStoredCodexDomain } from "@/lib/ai/codex-domain-storage";

// 2026-06-08 루프 2/3 — GlobalShortcuts 가 ?lang=KO|EN|JP|CN query 로 작품 언어 전달.
// useLang() (브라우저 UI 언어) 와 다를 수 있으므로 query 가 있으면 우선.
const VALID_APP_LANGS = new Set(["KO", "EN", "JP", "CN"]);
const CodexDomainSelector = dynamic(() => import("@/components/codex/CodexDomainSelector"), { ssr: false });
// [Codex Completion Dashboard — 2026-06-07 / rank 18] 우측 사이드바: 객체 채움 진척률 + work-note
const CodexCompletionDashboard = dynamic(
  () => import("@/components/codex/CodexCompletionDashboard"),
  { ssr: false }
);

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
  const searchParams = useSearchParams();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);
  const [tab, setTab] = useState<TabId>("rulebook");

  // [Codex auto-select — 2026-06-07 / rank 15 + 2026-06-08 루프 2/3]
  // 우선순위: query ?lang= (GlobalShortcuts 가 전달한 작품 언어)
  //         → useLang() (브라우저 UI 언어 fallback)
  // 진입 시 localStorage 명시 override 가 없으면 위 우선순위로 도메인 자동 선택.
  // 이미 사용자가 한 번이라도 명시 선택했다면 (key 존재) override 우선.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (getStoredCodexDomain() !== null) return; // override 존재 — 건드리지 않음
    // 1순위: query param (Studio 작품 언어가 정확히 전달된 경우)
    const queryLang = searchParams?.get("lang");
    const appLang = queryLang && VALID_APP_LANGS.has(queryLang)
      ? (queryLang as 'KO' | 'EN' | 'JP' | 'CN')
      : toAppLang(lang); // 2순위: 브라우저 UI 언어
    const auto = defaultDomainForLanguage(appLang);
    setStoredCodexDomain(auto);
    // 같은 탭 내 다른 마운트(Settings 등)도 즉시 갱신되도록 broadcast
    window.dispatchEvent(new CustomEvent("codex-domain-changed", { detail: { domain: auto } }));
    // lang / searchParams 의존 — 작품 언어 전환 시 (override 없을 때만) 재매핑
  }, [lang, searchParams]);

  return (
    <>
      <Header />
      {/* [P23 루프2 — 2026-06-08] WCAG 2.1 landmark 정합화 — 본 페이지의 1st landmark 는 main.
          내부 RulebookContent/ReferenceContent/GuideContent 는 이미 <article> 로 감싸서
          embedded <main> 의 outline 영향을 격리. axe 다중 main 경고는 article 격리로 완화. */}
      <main className="pt-20 md:pt-24" aria-label="Codex 지식 허브">
        <div className="mx-auto max-w-7xl px-4 py-12">
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

          {/* [rank 18 — 2026-06-07] 본문 + 우측 진척률 사이드바 — lg 부터 2열 */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 lg:gap-8">
            <div className="min-w-0">
              {/* Tab Bar — 모바일 가로 스크롤 지원
                  [루프 4 P10 — 2026-06-08] WCAG 2.1 SC 4.1.2 Name/Role/Value:
                  role="tablist"/"tab" + aria-selected + aria-controls 적용. 스크린리더가
                  탭 상태와 콘텐츠 영역을 정확히 안내. */}
              <div
                role="tablist"
                aria-label={T({
                  ko: 'Codex 콘텐츠 탭',
                  en: 'Codex content tabs',
                  ja: 'Codex コンテンツタブ',
                  zh: 'Codex 内容选项卡',
                })}
                className="flex gap-1 mb-8 border-b border-border pb-0 overflow-x-auto flex-nowrap scrollbar-thin"
              >
                {TABS.map(t => {
                  const active = tab === t.id;
                  const tabName = L4(lang, t);
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      role="tab"
                      id={`codex-tab-${t.id}`}
                      aria-selected={active}
                      aria-controls={`codex-panel-${t.id}`}
                      aria-label={`${tabName}, ${active ? T({ ko: '선택됨', en: 'selected', ja: '選択中', zh: '已选中' }) : T({ ko: '선택 안 됨', en: 'not selected', ja: '未選択', zh: '未选中' })}`}
                      tabIndex={active ? 0 : -1}
                      className={`shrink-0 px-4 sm:px-5 py-3 min-h-[44px] font-mono text-xs font-bold tracking-widest uppercase transition-[transform,opacity,background-color,border-color,color] border-b-2 -mb-[1px] ${
                        active
                          ? "border-accent-purple text-accent-purple"
                          : "border-transparent text-text-tertiary hover:text-text-secondary"
                      }`}
                    >
                      {tabName}
                    </button>
                  );
                })}
              </div>

              {/* Tab description */}
              <p className="text-text-tertiary text-xs font-mono mb-6 tracking-wider">
                {(() => { const d = TABS.find(t => t.id === tab)?.desc; return d ? T(d) : ""; })()}
              </p>

              {/* Tab Content — render without Header (embedded mode)
                  [루프 4 P10 — 2026-06-08] role="tabpanel" + aria-labelledby 로 탭과 연결. */}
              <div
                className="codex-embedded"
                role="tabpanel"
                id={`codex-panel-${tab}`}
                aria-labelledby={`codex-tab-${tab}`}
                tabIndex={0}
              >
                {tab === "rulebook" && <RulebookContent />}
                {tab === "reference" && <ReferenceContent />}
                {tab === "guide" && <GuideContent />}
              </div>
            </div>

            {/* 우측 사이드바: Codex 진척률 + work-note */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <CodexCompletionDashboard />
            </div>
          </div>
        </div>
      </main>
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
