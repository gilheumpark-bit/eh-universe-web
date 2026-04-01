"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { TOOL_LINKS } from "@/lib/tool-links";

export default function ToolsIndexPage() {
  const { lang } = useLang();
  const isKO = lang === "ko";

  return (
    <>
      <Header />
      <main className="pt-24 pb-20">
        <div className="site-shell py-10 md:py-14">
          <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-text-tertiary mb-2">
            {L4(lang, { ko: "도구", en: "Tools", jp: "ツール", cn: "工具" })}
          </p>
          <h1 className="site-title text-3xl font-bold tracking-tight mb-3">
            {L4(lang, {
              ko: "EH Universe 도구",
              en: "EH Universe Tools",
              jp: "EH Universe ツール",
              cn: "EH Universe 工具",
            })}
          </h1>
          <p className="text-text-secondary text-sm max-w-2xl mb-10 leading-relaxed">
            {L4(lang, {
              ko: "세계관·함선·오디오 등 독립 도구로 바로 열 수 있습니다. 스튜디오 전체는 NOA 스튜디오에서 이용하세요.",
              en: "Open standalone tools for lore, vessels, audio, and more. Use NOA Studio for the full authoring workspace.",
              jp: "ロア、艦船、オーディオなどの独立ツールを開けます。フル作成はNOAスタジオから。",
              cn: "可打开世界观、舰船、音频等独立工具。完整创作请使用 NOA 工作室。",
            })}
          </p>

          <ul className="grid gap-3 sm:grid-cols-2">
            {TOOL_LINKS.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className="group premium-panel-soft flex items-center justify-between rounded-2xl border border-border/50 px-5 py-4 text-sm text-text-primary transition hover:border-accent-amber/30 hover:bg-white/[0.03]"
                >
                  <span className="font-medium">{isKO ? t.ko : t.en}</span>
                  <span className="font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary group-hover:text-accent-amber transition-colors">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-10 pt-8 border-t border-border/50">
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 text-sm font-bold text-accent-purple hover:text-accent-amber transition-colors"
            >
              {L4(lang, {
                ko: "NOA 스튜디오로 이동",
                en: "Open NOA Studio",
                jp: "NOAスタジオへ",
                cn: "打开 NOA 工作室",
              })}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
