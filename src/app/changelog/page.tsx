"use client";

// ============================================================
// PART 1: Imports
// ============================================================

import { useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import {
  CHANGELOG,
  type ChangelogEntry,
  type ChangelogType,
  getLatestVersion,
  pickLocalized,
} from "@/lib/changelog-data";
import { getNovelStudioHref } from "@/lib/studio-entry-links";
import type { AppLanguage } from "@/lib/studio-types";

const LAST_SEEN_KEY = "noa_last_seen_version";

// ============================================================
// PART 2: Helpers (pure: type to badge class / label)
// ============================================================

function typeBadgeClass(type: ChangelogType): string {
  switch (type) {
    case "feature":
      return "bg-accent-blue/10 text-accent-blue border border-accent-blue/20";
    case "fix":
      return "bg-accent-green/10 text-accent-green border border-accent-green/20";
    case "security":
      return "bg-accent-red/10 text-accent-red border border-accent-red/20";
    case "improvement":
    default:
      return "bg-accent-amber/10 text-accent-amber border border-accent-amber/20";
  }
}

function typeLabel(type: ChangelogType, lang: AppLanguage): string {
  const LABELS: Record<ChangelogType, Record<AppLanguage, string>> = {
    feature: { KO: "신규", EN: "Feature", JP: "新機能", CN: "新功能" },
    improvement: { KO: "개선", EN: "Improve", JP: "改善", CN: "改进" },
    fix: { KO: "수정", EN: "Fix", JP: "修正", CN: "修复" },
    security: { KO: "보안", EN: "Security", JP: "セキュリティ", CN: "安全" },
  };
  return LABELS[type]?.[lang] ?? LABELS[type]?.KO ?? type;
}

function langToAppLang(lang: string): AppLanguage {
  const l = String(lang).toLowerCase();
  if (l === "en") return "EN";
  if (l === "ja" || l === "jp") return "JP";
  if (l === "zh" || l === "cn") return "CN";
  return "KO";
}

function publicChangelogText(value: string): string {
  return value
    .replace(/—|–/g, ":")
    .replace(/Cross-border Novel IDE/g, "Cross-border Creative IDE")
    .replace(/Novel IDE/g, "Creative IDE")
    .replace(/알파/g, "출시 준비")
    .replace(/Alpha/g, "Launch prep")
    .replace(/alpha/g, "prep")
    .replace(/출시 준비 출시 감사/g, "출시 준비 점검")
    .replace(/출시 준비 직전 종합 감사/g, "출시 준비 종합 점검")
    .replace(/ATTESTATION 디스클레이머 강도 \(v1\.0\.0 → v1\.1\.0, ko\/ja 사법 절차 증거 부정 명시\)/g, "확인서 문구 정리")
    .replace(/ATTESTATION 문서 안내 강도 \(v1\.0\.0 → v1\.1\.0, ko\/ja 사법 절차 증거 부정 명시\)/g, "확인서 문구 정리")
    .replace(/사법 절차 증거 부정 명시/g, "제출용 문구 정리")
    .replace(/디스클레이머/g, "문서 안내")
    .replace(/면책/g, "문서 안내")
    .replace(/AI 가드/g, "노아 운영 가드")
    .replace(/AI 사용/g, "노아 활용")
    .replace(/AI 라벨/g, "노아 활용 라벨")
    .replace(/AI 시대/g, "창작 도구 시대")
    .replace(/AI/g, "노아");
}

function publicVersionLabel(value: string): string {
  return value.replace(/-alpha\./g, " 준비 ");
}

// ============================================================
// PART 3: Page Component
// ============================================================

export default function ChangelogPage() {
  const { lang } = useLang();
  const appLang = langToAppLang(lang);
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);
  const studioHref = getNovelStudioHref("create");

  // 페이지 진입 = 사용자가 최신 내역을 본 것으로 간주. 배지 숨김 플래그 갱신.
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(LAST_SEEN_KEY, getLatestVersion());
      }
    } catch {
      /* private browsing */
    }
  }, []);

  return (
    <>
      <Header />
      <main className="pt-24">
        <div className="site-shell py-12 md:py-16">
          <div className="mx-auto max-w-3xl px-4">
            {/* Heading */}
            <header className="mb-10">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
                {T({
                  ko: "변경 이력",
                  en: "Changelog",
                  ja: "変更履歴",
                  zh: "更新日志",
                })}
              </h1>
              <p className="mt-2 text-text-secondary">
                {T({
                  ko: "Loreguard가 어떻게 발전하고 있는지 추적하세요.",
                  en: "Track how Loreguard is evolving.",
                  ja: "Loreguardの進化を追いかけましょう。",
                  zh: "关注 Loreguard 的进化。",
                })}
              </p>
            </header>

            {/* Timeline */}
            <ol className="space-y-8">
              {CHANGELOG.map((entry: ChangelogEntry) => (
                <li
                  key={entry.version}
                  className="border-l-2 border-accent-blue/30 pl-5 relative"
                >
                  <span className="absolute -left-[7px] top-2 w-3 h-3 rounded-full bg-accent-blue ring-4 ring-bg-primary" />

                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-text-tertiary">
                      {publicVersionLabel(entry.version)}
                    </span>
                    <span className="text-xs text-text-tertiary">·</span>
                    <time className="text-xs text-text-tertiary">{entry.date}</time>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${typeBadgeClass(
                        entry.type,
                      )}`}
                    >
                      {typeLabel(entry.type, appLang)}
                    </span>
                    {entry.scope && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-bg-secondary text-text-tertiary border border-border">
                        {entry.scope}
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg md:text-xl font-semibold text-text-primary leading-snug">
                    {publicChangelogText(pickLocalized(entry, appLang, "title"))}
                  </h2>
                  <p className="text-text-secondary mt-2 leading-relaxed">
                    {publicChangelogText(pickLocalized(entry, appLang, "description"))}
                  </p>
                </li>
              ))}
            </ol>

            {/* Footer navigation */}
            <div className="mt-16 pt-8 border-t border-border flex flex-wrap items-center justify-between gap-4 text-sm">
              <Link
                href={studioHref}
                className="inline-flex min-h-11 items-center rounded px-1 text-accent-blue underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              >
                {T({
                  ko: "← 스튜디오로 돌아가기",
                  en: "← Back to Studio",
                  ja: "← スタジオに戻る",
                  zh: "← 返回工作室",
                })}
              </Link>
              <Link
                href="/about"
                className="inline-flex min-h-11 items-center rounded px-1 text-text-tertiary underline-offset-4 hover:text-text-primary hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              >
                {T({
                  ko: "소개 페이지",
                  en: "About Page",
                  ja: "紹介ページ",
                  zh: "关于页面",
                })}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// IDENTITY_SEAL: ChangelogPage | role=release-notes | inputs=lang | outputs=changelog-timeline
