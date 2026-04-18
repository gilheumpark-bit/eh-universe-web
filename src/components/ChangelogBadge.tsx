"use client";

// ============================================================
// ChangelogBadge — "새 업데이트" 점 표시기.
// localStorage `noa_last_seen_version` vs CHANGELOG[0].version 비교.
// 다르면 점+라벨 렌더, 클릭 시 /changelog 이동.
// ============================================================

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { getLatestVersion, hasUnseenEntries } from "@/lib/changelog-data";

interface Props {
  className?: string;
  /** 컴팩트 버전 — 점만 표시 (헤더 아이콘 옆) */
  dotOnly?: boolean;
}

const LAST_SEEN_KEY = "noa_last_seen_version";

export default function ChangelogBadge({ className = "", dotOnly = false }: Props) {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);
  const [unseen, setUnseen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
      setUnseen(hasUnseenEntries(lastSeen));
    } catch {
      // SSR / private browsing — default false
      setUnseen(false);
    }
  }, []);

  if (!unseen) return null;

  const latest = getLatestVersion();

  if (dotOnly) {
    return (
      <Link
        href="/changelog"
        aria-label={T({
          ko: `새 업데이트 ${latest}`,
          en: `New update ${latest}`,
          ja: `新しい更新 ${latest}`,
          zh: `新更新 ${latest}`,
        })}
        className={`relative inline-flex w-2 h-2 rounded-full bg-accent-red animate-pulse ${className}`}
      />
    );
  }

  return (
    <Link
      href="/changelog"
      className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md bg-accent-blue/10 text-accent-blue border border-accent-blue/20 hover:bg-accent-blue/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
      {T({
        ko: `새 업데이트 · ${latest}`,
        en: `New update · ${latest}`,
        ja: `新しい更新 · ${latest}`,
        zh: `新更新 · ${latest}`,
      })}
    </Link>
  );
}
