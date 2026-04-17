"use client";

import type { ReactNode } from "react";
import type { Lang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import type { PlanetRecord } from "@/lib/network-types";
import {
  PLANET_GOAL_LABELS,
  VISIBILITY_LABELS,
  pickNetworkLabel,
} from "@/lib/network-labels";
import { SettlementBadge } from "@/components/network/SettlementBadge";

interface PlanetHeaderCardProps {
  planet: PlanetRecord;
  lang: Lang;
  ownerName?: string | null;
  actions?: ReactNode;
}

export function PlanetHeaderCard({ planet, lang, ownerName, actions }: PlanetHeaderCardProps) {
  const summaryItems = [
    {
      label: L4(lang, { ko: "운영자", en: "Owner", ja: "Owner", zh: "Owner" }),
      value: ownerName ?? L4(lang, { ko: "미확인", en: "Unknown", ja: "未確認", zh: "未确认" }),
    },
    {
      label: L4(lang, { ko: "장르", en: "Genre", ja: "ジャンル", zh: "类型" }),
      value: planet.genre,
    },
    {
      label: L4(lang, { ko: "문명 단계", en: "Civilization", ja: "文明段階", zh: "文明阶段" }),
      value: planet.civilizationLevel,
    },
    {
      label: L4(lang, { ko: "운영 목표", en: "Goal", ja: "Goal", zh: "Goal" }),
      value: pickNetworkLabel(PLANET_GOAL_LABELS[planet.goal], lang),
    },
    {
      label: L4(lang, { ko: "공개 범위", en: "Visibility", ja: "公開範囲", zh: "公开范围" }),
      value: pickNetworkLabel(VISIBILITY_LABELS[planet.visibility], lang),
    },
  ];

  const statItems = [
    {
      label: L4(lang, { ko: "최근 로그 수", en: "Log Count", ja: "最近のログ数", zh: "最近日志数" }),
      value: `${planet.stats.logCount}`,
    },
    {
      label: L4(lang, { ko: "정산 수", en: "Settlement Count", ja: "Settlement Count", zh: "Settlement Count" }),
      value: `${planet.stats.settlementCount}`,
    },
    {
      label: L4(lang, { ko: "EH 위험도", en: "EH Risk", ja: "EH Risk", zh: "EH Risk" }),
      value: planet.ehRisk != null ? `${planet.ehRisk}` : L4(lang, { ko: "미기재", en: "Not Set", ja: "Not Set", zh: "Not Set" }),
    },
  ];

  return (
    <section className="premium-panel p-6 md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="site-kicker">{L4(lang, { ko: "행성 상세", en: "Planet Overview", ja: "惑星の詳細", zh: "星球详情" })}</span>
            <SettlementBadge status={planet.status} lang={lang} />
          </div>
          <div>
            <h1 className="site-title text-3xl font-semibold md:text-4xl">{planet.name}</h1>
            <p className="site-lede mt-3 max-w-3xl text-sm md:text-base">{planet.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {planet.representativeTags.map((tag) => (
              <span key={tag} className="badge badge-blue">
                {tag}
              </span>
            ))}
            {planet.code ? <span className="badge badge-redacted">{planet.code}</span> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="premium-panel-soft p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                  {item.label}
                </div>
                <div className="mt-2 text-sm text-text-primary">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="premium-panel-soft p-5">
          <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
            {L4(lang, { ko: "상태 지표", en: "Status Metrics", ja: "状態指標", zh: "状态指标" })}
          </div>
          <div className="mt-4 space-y-4">
            {statItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="text-sm text-text-secondary">{item.label}</span>
                <span className="font-[family-name:var(--font-mono)] text-sm text-text-primary">{item.value}</span>
              </div>
            ))}
          </div>
          {planet.coreRules.length > 0 ? (
            <div className="mt-5 border-t border-white/6 pt-5">
              <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                {L4(lang, { ko: "핵심 규칙", en: "Core Rules", ja: "Core Rules", zh: "Core Rules" })}
              </div>
              <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                {planet.coreRules.map((rule) => (
                  <li key={rule} className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Share buttons */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-white/8">
          <button
            onClick={() => {
              const url = typeof window !== 'undefined' ? window.location.href : '';
              const text = `${planet.name} — EH Universe`;
              window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
            }}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-text-secondary hover:bg-white/10 transition-colors"
          >
            𝕏 {L4(lang, { ko: '공유', en: 'Share', ja: '共有', zh: '分享' })}
          </button>
          <button
            onClick={() => {
              const url = typeof window !== 'undefined' ? window.location.href : '';
              navigator.clipboard.writeText(url);
            }}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-text-secondary hover:bg-white/10 transition-colors"
          >
            🔗 {L4(lang, { ko: '링크 복사', en: 'Copy Link', ja: 'リンクコピー', zh: '复制链接' })}
          </button>
        </div>
      </div>
    </section>
  );
}
