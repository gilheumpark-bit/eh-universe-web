"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { Code2, Sparkles } from "lucide-react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { TOOL_LINKS, type ToolLinkEntry } from "@/lib/tool-links";

// ============================================================
// PART 1 — 도구 카테고리별 분리 + 렌더 유틸
// 2026-04-21: Code Studio(소프트웨어) vs 세계관 도구 시각 구분.
// ============================================================

function toolLabel(tool: ToolLinkEntry, isKO: boolean): string {
  return isKO ? tool.ko : tool.en;
}

// ============================================================
// PART 2 — 메인 페이지
// ============================================================

export default function ToolsIndexPage() {
  const { lang } = useLang();
  const isKO = lang === "ko";

  const studioTools = TOOL_LINKS.filter((t) => t.category === 'studio');
  const loreTools = TOOL_LINKS.filter((t) => t.category === 'lore' || !t.category);

  return (
    <>
      <Header />
      <main className="pt-24 pb-20">
        <div className="site-shell py-10 md:py-14">
          <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-text-tertiary mb-2">
            {L4(lang, { ko: "도구", en: "Tools", ja: "ツール", zh: "工具" })}
          </p>
          <h1 className="site-title text-3xl font-bold tracking-tight mb-3">
            {L4(lang, {
              ko: "창작 도구",
              en: "Creator Tools",
              ja: "創作ツール",
              zh: "创作工具",
            })}
          </h1>
          <p className="text-text-secondary text-sm max-w-2xl mb-10 leading-relaxed">
            {L4(lang, {
              ko: "소프트웨어 스튜디오와 세계관 참조 도구를 카테고리별로 정리했습니다. 집필 전체 흐름은 NOA 스튜디오에서 이용하세요.",
              en: "Software studios and worldbuilding references are grouped by category. Use NOA Studio for the full authoring workflow.",
              ja: "ソフトウェアスタジオと世界観リファレンスをカテゴリ別に整理しました。フル作成フローはNOAスタジオから。",
              zh: "软件工作室与世界观参考工具按类别整理。完整创作流程请使用 NOA 工作室。",
            })}
          </p>

          {/* ========== 소프트웨어 스튜디오 그룹 ========== */}
          {studioTools.length > 0 && (
            <section className="mb-10" aria-labelledby="studio-tools-heading">
              <div className="flex items-center gap-2 mb-4">
                <Code2 className="w-4 h-4 text-accent-purple" aria-hidden="true" />
                <h2
                  id="studio-tools-heading"
                  className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-accent-purple"
                >
                  {L4(lang, {
                    ko: "소프트웨어 스튜디오",
                    en: "Software Studios",
                    ja: "ソフトウェアスタジオ",
                    zh: "软件工作室",
                  })}
                </h2>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {studioTools.map((t) => (
                  <li key={t.href}>
                    <Link
                      href={t.href}
                      className="group premium-panel-soft flex items-center justify-between rounded-2xl border border-accent-purple/30 bg-accent-purple/5 px-5 py-4 text-sm text-text-primary transition hover:border-accent-purple/50 hover:bg-accent-purple/10"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Code2 className="w-4 h-4 text-accent-purple" aria-hidden="true" />
                        {toolLabel(t, isKO)}
                      </span>
                      <span className="font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary group-hover:text-accent-purple transition-colors">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ========== 세계관 참조 도구 그룹 ========== */}
          {loreTools.length > 0 && (
            <section aria-labelledby="lore-tools-heading">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-accent-amber" aria-hidden="true" />
                <h2
                  id="lore-tools-heading"
                  className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-accent-amber"
                >
                  {L4(lang, {
                    ko: "세계관 참조",
                    en: "Worldbuilding References",
                    ja: "世界観リファレンス",
                    zh: "世界观参考",
                  })}
                </h2>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {loreTools.map((t) => (
                  <li key={t.href}>
                    <Link
                      href={t.href}
                      className="group premium-panel-soft flex items-center justify-between rounded-2xl border border-border/50 px-5 py-4 text-sm text-text-primary transition hover:border-accent-amber/30 hover:bg-white/[0.03]"
                    >
                      <span className="font-medium">{toolLabel(t, isKO)}</span>
                      <span className="font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary group-hover:text-accent-amber transition-colors">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-10 pt-8 border-t border-border/50">
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 text-sm font-bold text-accent-purple hover:text-accent-amber transition-colors"
            >
              {L4(lang, {
                ko: "NOA 스튜디오로 이동",
                en: "Open NOA Studio",
                ja: "NOAスタジオへ",
                zh: "打开 NOA 工作室",
              })}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
