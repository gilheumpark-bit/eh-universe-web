"use client";

// ============================================================
// PART 1 — Imports, Types
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, Puzzle, ExternalLink } from "lucide-react";
import type { AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import {
  pluginRegistry,
  registerBundledPlugins,
} from "@/lib/novel-plugin-registry";

const MarketplaceModal = dynamic(() => import("@/components/studio/MarketplaceModal"), {
  ssr: false,
});

export interface PluginsSectionProps {
  language: AppLanguage;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=PluginsSectionProps

// ============================================================
// PART 2 — Active count subscription (localStorage events + toggle hooks)
// ============================================================

/**
 * Subscribe to plugin enable/disable so the active-count badge stays fresh.
 *
 * The registry persists enabled ids via localStorage, but the panel/modal
 * mutates the singleton directly — so we listen on a custom event namespace
 * and also refresh on focus / storage. Fallback polling avoided.
 */
function useActivePluginCount(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    // Ensure bundled plugins are registered so `.list()` returns non-empty.
    try { registerBundledPlugins(); } catch (err) {
      logger.warn("PluginsSection", "registerBundledPlugins failed", err);
    }
    const bump = () => setTick((t) => t + 1);
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "noa_enabled_plugins") bump();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("noa:plugin-toggled", bump);
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("noa:plugin-toggled", bump);
      window.removeEventListener("focus", bump);
    };
  }, []);
  return useMemo(() => {
    try {
      return pluginRegistry.getEnabledIds().length;
    } catch (err) {
      logger.warn("PluginsSection", "getEnabledIds failed", err);
      return 0;
    }
    // tick is the intentional re-compute trigger; id list read is cheap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
}

// IDENTITY_SEAL: PART-2 | role=Hook | inputs=none | outputs=activeCount

// ============================================================
// PART 3 — Component (accordion section + Marketplace CTA + modal)
// ============================================================

const PluginsSection: React.FC<PluginsSectionProps> = ({ language }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const activeCount = useActivePluginCount();

  // Listen for command-palette driven 'open-marketplace' dispatch.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { actionId?: string } | undefined;
      if (detail?.actionId === "open-marketplace") setModalOpen(true);
    };
    window.addEventListener("noa:open-marketplace", handler);
    return () => window.removeEventListener("noa:open-marketplace", handler);
  }, []);

  const handleClose = useCallback(() => {
    setModalOpen(false);
    // Notify badges so they refresh immediately.
    try {
      window.dispatchEvent(new CustomEvent("noa:plugin-toggled"));
    } catch (err) {
      logger.warn("PluginsSection", "plugin-toggled dispatch failed", err);
    }
  }, []);

  const labels = useMemo(() => ({
    title:     L4(language, { ko: "플러그인 (베타)", en: "Plugins (Beta)", ja: "プラグイン (ベータ)", zh: "插件 (测试)" }),
    subtitle:  L4(language, {
      ko: "글자수 배지, 읽기 시간, 감정 색상 힌트 등 추가 기능을 선택적으로 활성화할 수 있습니다.",
      en: "Optionally enable extras like word-count badge, reading time, or emotion color hints.",
      ja: "文字数バッジ、読書時間、感情色ヒントなどの追加機能を選択的に有効化できます。",
      zh: "可选择启用字数徽章、阅读时间、情感色提示等附加功能。",
    }),
    openCta:   L4(language, { ko: "마켓플레이스 열기", en: "Open Marketplace", ja: "マーケットプレイスを開く", zh: "打开插件市场" }),
    activeN:   (n: number) => L4(language, {
      ko: `${n}개 활성`,
      en: `${n} active`,
      ja: `${n}件アクティブ`,
      zh: `${n} 个已启用`,
    }),
  }), [language]);

  return (
    <details
      className="ds-accordion rounded-2xl bg-bg-secondary/20 border border-border overflow-hidden group"
    >
      <summary className="cursor-pointer select-none list-none flex items-center gap-3 px-5 py-4 hover:bg-bg-secondary/40 transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue">
        <Puzzle className="w-4 h-4 text-accent-purple shrink-0" />
        <span className="text-sm font-black text-text-primary flex-1">
          {labels.title}
        </span>
        {activeCount > 0 ? (
          <span
            data-testid="plugins-active-badge"
            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent-green/20 text-accent-green border border-accent-green/30 font-mono"
          >
            {labels.activeN(activeCount)}
          </span>
        ) : null}
        <ChevronDown className="w-4 h-4 text-text-tertiary transition-transform group-open:rotate-180" />
      </summary>
      <div className="p-4 md:p-6">
        <p className="text-[13px] text-text-tertiary mb-4">{labels.subtitle}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="open-marketplace-btn"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-accent-purple/15 text-accent-purple border border-accent-purple/40 hover:bg-accent-purple/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue text-xs font-black uppercase tracking-widest transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            {labels.openCta}
          </button>
        </div>
      </div>

      {modalOpen ? (
        <MarketplaceModal language={language} onClose={handleClose} />
      ) : null}
    </details>
  );
};

export default PluginsSection;

// IDENTITY_SEAL: PART-3 | role=Component | inputs=PluginsSectionProps | outputs=PluginsSection
