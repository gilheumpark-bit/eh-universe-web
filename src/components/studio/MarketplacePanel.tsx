"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3, Clock, Hash, Package, Palette, Paintbrush,
  Search, Shield, Sparkles, Wrench, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import {
  pluginRegistry,
  registerBundledPlugins,
  verifyPluginIntegrity,
  type NovelPluginCategory,
  type NovelPluginManifest,
  type NovelPluginPermission,
  type PluginContext,
} from "@/lib/novel-plugin-registry";

// ============================================================
// PART 1 — Types & Constants (category labels, icon map)
// ============================================================

export interface MarketplacePanelProps {
  language: AppLanguage;
  onClose?: () => void;
  className?: string;
}

type CategoryFilter = NovelPluginCategory | "all";

const CATEGORY_LABELS: Record<CategoryFilter, { ko: string; en: string; ja: string; zh: string }> = {
  all:             { ko: "전체",        en: "All",             ja: "すべて",        zh: "全部" },
  analysis:        { ko: "분석",        en: "Analysis",        ja: "分析",          zh: "分析" },
  visualization:   { ko: "시각화",      en: "Visualization",   ja: "可視化",        zh: "可视化" },
  export:          { ko: "내보내기",    en: "Export",          ja: "エクスポート",  zh: "导出" },
  "ai-enhancer":   { ko: "AI 보조",     en: "AI Enhancer",     ja: "AI補助",        zh: "AI辅助" },
  "ui-theme":      { ko: "UI 테마",     en: "UI Theme",        ja: "UIテーマ",      zh: "UI主题" },
  utility:         { ko: "유틸리티",    en: "Utility",         ja: "ユーティリティ", zh: "实用工具" },
};

const PERMISSION_LABELS: Record<NovelPluginPermission, { ko: string; en: string; ja: string; zh: string }> = {
  "read-manuscript":  { ko: "원고 읽기",       en: "Read manuscript",  ja: "原稿の読取",  zh: "读取稿件" },
  "write-manuscript": { ko: "원고 수정",       en: "Write manuscript", ja: "原稿の編集",  zh: "修改稿件" },
  "read-characters":  { ko: "캐릭터 읽기",     en: "Read characters",  ja: "キャラ読取",  zh: "读取角色" },
  "write-characters": { ko: "캐릭터 수정",     en: "Write characters", ja: "キャラ編集",  zh: "修改角色" },
  "read-storage":     { ko: "저장소 읽기",     en: "Read storage",     ja: "ストレージ読取", zh: "读取存储" },
  "write-storage":    { ko: "저장소 쓰기",     en: "Write storage",    ja: "ストレージ書込", zh: "写入存储" },
  storage:            { ko: "로컬 저장소 사용", en: "Local storage",    ja: "ローカル保存", zh: "本地存储" },
  network:            { ko: "네트워크 접근",    en: "Network access",   ja: "ネットワーク", zh: "网络访问" },
  "show-ui":          { ko: "패널 UI 표시",     en: "Show panel UI",    ja: "UI表示",       zh: "显示UI" },
};

/** Icon lookup for manifest.iconLucide — add entries as new plugins ship. */
const ICON_MAP: Record<string, LucideIcon> = {
  Hash,
  Clock,
  Palette,
  Paintbrush,
  BarChart3,
  Sparkles,
  Wrench,
  Shield,
  Package,
};

function iconFor(name?: string): LucideIcon {
  if (!name) return Package;
  return ICON_MAP[name] ?? Package;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=MarketplacePanelProps,labels

// ============================================================
// PART 2 — Manifest loader (bundled plugin bootstrap)
// ============================================================

let bundledBootstrapped = false;
function ensureBundled(): void {
  if (bundledBootstrapped) return;
  try {
    registerBundledPlugins();
    bundledBootstrapped = true;
  } catch (err) {
    logger.error("MarketplacePanel", "registerBundledPlugins failed", err);
  }
}

/** Minimal context for skeleton enable() — manuscript capabilities come later. */
function createSkeletonContext(language: AppLanguage): PluginContext {
  return {
    language,
    currentSession: null,
    emit: (event, data) => {
      try {
        if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
          window.dispatchEvent(new CustomEvent(event, { detail: data }));
        }
      } catch (err) {
        logger.warn("MarketplacePanel", "emit failed", err);
      }
    },
    // TODO: wire real manuscript getters when the marketplace moves out of skeleton.
    readManuscript: () => "",
    writeManuscript: undefined,
  };
}

// IDENTITY_SEAL: PART-2 | role=Bootstrap | inputs=language | outputs=PluginContext

// ============================================================
// PART 3 — Filtered catalog hook
// ============================================================

function useFilteredCatalog(
  search: string,
  category: CategoryFilter,
  language: AppLanguage,
): NovelPluginManifest[] {
  const manifests = useMemo(() => pluginRegistry.list(), []);
  const needle = search.trim().toLowerCase();
  return useMemo(() => {
    return manifests.filter((m) => {
      if (category !== "all" && m.category !== category) return false;
      if (!needle) return true;
      const name = L4(language, m.name).toLowerCase();
      const desc = L4(language, m.description).toLowerCase();
      return name.includes(needle) || desc.includes(needle) || m.id.includes(needle);
    });
  }, [manifests, needle, category, language]);
}

// IDENTITY_SEAL: PART-3 | role=Hook | inputs=search,category,language | outputs=NovelPluginManifest[]

// ============================================================
// PART 4 — Component (search bar + grid + detail dialog)
// ============================================================

/** Dev-only feature flag — Install from URL UI is gated to NODE_ENV !== 'production'. */
function isInstallFromUrlEnabled(): boolean {
  // Prod disables the whole flow by default — sandbox hardening is ongoing.
  const env = typeof process !== 'undefined' ? process.env?.NODE_ENV : 'production';
  return env !== 'production';
}

export default function MarketplacePanel({
  language,
  onClose,
  className = "",
}: MarketplacePanelProps) {
  ensureBundled();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Install-from-URL state (beta, dev-only).
  const [installUrl, setInstallUrl] = useState("");
  const [installHashExpected, setInstallHashExpected] = useState("");
  const [installStatus, setInstallStatus] = useState<"idle" | "verifying" | "verified" | "failed" | "installed">("idle");
  const [installMessage, setInstallMessage] = useState<string>("");
  const installEnabled = isInstallFromUrlEnabled();

  const manifests = useFilteredCatalog(search, category, language);

  // Force a re-render whenever enabled state changes so cards reflect it.
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  const handleVerify = useCallback(async () => {
    if (!installEnabled) return;
    if (!installUrl.trim()) {
      setInstallStatus("failed");
      setInstallMessage("URL is empty.");
      return;
    }
    setInstallStatus("verifying");
    setInstallMessage("");
    try {
      const res = await fetch(installUrl, { method: "GET" });
      if (!res.ok) {
        setInstallStatus("failed");
        setInstallMessage(`HTTP ${res.status}`);
        return;
      }
      const content = await res.text();
      const stubManifest: NovelPluginManifest = {
        id: "external-preview",
        name: { ko: "외부", en: "External", ja: "外部", zh: "外部" },
        description: { ko: "", en: "", ja: "", zh: "" },
        version: "0.0.0",
        category: "utility",
        author: "external",
        entryPoint: installUrl,
        bundled: false,
        integrity: installHashExpected ? { sha256: installHashExpected } : undefined,
      };
      const result = await verifyPluginIntegrity(stubManifest, content);
      if (result.valid) {
        setInstallStatus("verified");
        setInstallMessage(`SHA-256 ${result.sha256.slice(0, 12)}...`);
      } else {
        setInstallStatus("failed");
        setInstallMessage(result.warnings.join("; ") || "verification failed");
      }
    } catch (err) {
      setInstallStatus("failed");
      setInstallMessage(String(err));
      logger.warn("MarketplacePanel", "verify failed", err);
    }
  }, [installEnabled, installUrl, installHashExpected]);

  const handleInstall = useCallback(async () => {
    if (!installEnabled) return;
    if (installStatus !== "verified") {
      setInstallMessage("Verify first.");
      return;
    }
    try {
      // Lazy load the registry async loader — Worker code only instantiated on demand.
      const registryMod = await import("@/lib/novel-plugin-registry");
      const plugin = await registryMod.loadExternalPlugin(installUrl, []);
      pluginRegistry.register(plugin);
      setInstallStatus("installed");
      setInstallMessage(`Installed as "${plugin.manifest.id}"`);
      setTick((t) => t + 1);
    } catch (err) {
      setInstallStatus("failed");
      setInstallMessage(`Install failed: ${String(err)}`);
      logger.warn("MarketplacePanel", "install failed", err);
    }
  }, [installEnabled, installStatus, installUrl]);

  const handleToggle = useCallback(
    async (id: string) => {
      try {
        if (pluginRegistry.isEnabled(id)) {
          await pluginRegistry.disable(id);
        } else {
          await pluginRegistry.enable(id, createSkeletonContext(language));
        }
        rerender();
      } catch (err) {
        logger.error("MarketplacePanel", `toggle(${id}) failed`, err);
      }
    },
    [language, rerender],
  );

  // ESC to close. Guard bound cleanup.
  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        try { onClose(); } catch (err) { logger.warn("MarketplacePanel", "onClose threw", err); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const labels = useMemo(() => ({
    title:       L4(language, { ko: "플러그인 마켓", en: "Plugin Marketplace", ja: "プラグインマーケット", zh: "插件市场" }),
    searchPh:    L4(language, { ko: "이름 또는 설명 검색...", en: "Search by name or description...", ja: "名前または説明で検索...", zh: "按名称或描述搜索..." }),
    enable:      L4(language, { ko: "활성화", en: "Enable", ja: "有効化", zh: "启用" }),
    disable:     L4(language, { ko: "비활성화", en: "Disable", ja: "無効化", zh: "禁用" }),
    enabled:     L4(language, { ko: "활성", en: "Enabled", ja: "有効", zh: "已启用" }),
    close:       L4(language, { ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" }),
    empty:       L4(language, { ko: "일치하는 플러그인이 없습니다.", en: "No matching plugins.", ja: "一致するプラグインがありません。", zh: "没有匹配的插件。" }),
    comingSoon:  L4(language, {
      ko: "외부 플러그인 지원은 곧 제공됩니다. 현재는 내장 플러그인만 사용 가능합니다.",
      en: "External plugin support is coming soon. Only bundled plugins are available today.",
      ja: "外部プラグインのサポートは近日公開。現在はバンドル版のみ利用可能です。",
      zh: "即将支持外部插件。目前仅提供内置插件。",
    }),
    installHeader: L4(language, {
      ko: "URL에서 설치 (베타)",
      en: "Install from URL (Beta)",
      ja: "URLからインストール (ベータ)",
      zh: "从URL安装 (测试)",
    }),
    installUrlPh: L4(language, {
      ko: "https://... 플러그인 URL",
      en: "https://... plugin URL",
      ja: "https://... プラグインURL",
      zh: "https://... 插件URL",
    }),
    installHashPh: L4(language, {
      ko: "예상 SHA-256 (선택)",
      en: "Expected SHA-256 (optional)",
      ja: "期待されるSHA-256 (任意)",
      zh: "期望的SHA-256 (可选)",
    }),
    verifyBtn: L4(language, { ko: "검증", en: "Verify", ja: "検証", zh: "验证" }),
    installBtn: L4(language, { ko: "설치", en: "Install", ja: "インストール", zh: "安装" }),
    permissionsTitle: L4(language, { ko: "요구 권한", en: "Required permissions", ja: "必要な権限", zh: "所需权限" }),
    author:       L4(language, { ko: "작성자", en: "Author", ja: "作者", zh: "作者" }),
    version:      L4(language, { ko: "버전", en: "Version", ja: "バージョン", zh: "版本" }),
    bundled:      L4(language, { ko: "내장", en: "Bundled", ja: "同梱", zh: "内置" }),
    detailTitle:  L4(language, { ko: "플러그인 상세", en: "Plugin Detail", ja: "プラグイン詳細", zh: "插件详情" }),
  }), [language]);

  const selected = selectedId ? pluginRegistry.get(selectedId)?.manifest ?? null : null;

  return (
    <div
      className={`flex flex-col bg-bg-secondary border border-border rounded-lg ${className}`}
      role="dialog"
      aria-label={labels.title}
      data-testid="marketplace-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-accent-purple" />
          <h2 className="text-sm font-black text-text-primary uppercase tracking-widest font-mono">
            {labels.title}
          </h2>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            data-testid="marketplace-close"
            className="min-h-[32px] min-w-[32px] p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {/* Filter bar */}
      <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row gap-2">
        <label className="relative flex-1" aria-label={labels.searchPh}>
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={labels.searchPh}
            data-testid="marketplace-search"
            className="w-full min-h-[32px] pl-7 pr-2 py-1 text-[12px] bg-bg-primary border border-border rounded text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus:border-accent-purple"
          />
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as CategoryFilter)}
          aria-label={CATEGORY_LABELS.all.en}
          data-testid="marketplace-category"
          className="min-h-[32px] px-2 py-1 text-[12px] bg-bg-primary border border-border rounded text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
        >
          {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map((k) => (
            <option key={k} value={k}>{L4(language, CATEGORY_LABELS[k])}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {manifests.length === 0 ? (
          <p className="text-[12px] text-text-tertiary italic text-center py-8" data-testid="marketplace-empty">
            {labels.empty}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="marketplace-grid">
            {manifests.map((m) => {
              const Icon = iconFor(m.iconLucide);
              const enabled = pluginRegistry.isEnabled(m.id);
              return (
                <article
                  key={m.id}
                  data-testid={`plugin-card-${m.id}`}
                  className="flex flex-col border border-border rounded-lg p-3 bg-bg-primary hover:border-accent-purple/40 transition-colors"
                >
                  <header className="flex items-start gap-2">
                    <span className="shrink-0 w-8 h-8 rounded flex items-center justify-center bg-bg-tertiary text-accent-purple">
                      <Icon size={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] font-semibold text-text-primary truncate">
                        {L4(language, m.name)}
                      </h3>
                      <p className="text-[10px] text-text-tertiary font-mono">v{m.version}</p>
                    </div>
                    {enabled ? (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent-green/20 text-accent-green border border-accent-green/30"
                        aria-label={labels.enabled}
                        data-testid={`plugin-enabled-badge-${m.id}`}
                      >
                        {labels.enabled}
                      </span>
                    ) : null}
                  </header>
                  <p className="mt-2 text-[11px] text-text-secondary line-clamp-3 flex-1">
                    {L4(language, m.description)}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggle(m.id)}
                      data-testid={`plugin-toggle-${m.id}`}
                      className={`flex-1 min-h-[32px] px-2 py-1 text-[11px] font-semibold rounded border focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
                        enabled
                          ? "bg-bg-tertiary text-text-primary border-border hover:bg-bg-secondary"
                          : "bg-accent-purple/15 text-accent-purple border-accent-purple/40 hover:bg-accent-purple/25"
                      }`}
                    >
                      {enabled ? labels.disable : labels.enable}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedId(m.id)}
                      aria-label={labels.detailTitle}
                      data-testid={`plugin-detail-${m.id}`}
                      className="min-h-[32px] min-w-[32px] px-2 py-1 text-[11px] text-text-tertiary hover:text-text-primary rounded border border-border hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                    >
                      ?
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Install-from-URL (Beta, dev-only) */}
      {installEnabled ? (
        <section
          data-testid="marketplace-install-section"
          className="px-4 py-3 border-t border-border bg-bg-primary/40"
        >
          <header className="flex items-center gap-2 mb-2">
            <Sparkles size={12} className="text-accent-purple" />
            <h4 className="text-[11px] font-black text-text-primary uppercase tracking-widest">
              {labels.installHeader}
            </h4>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-accent-amber/20 text-accent-amber border border-accent-amber/30">
              BETA
            </span>
          </header>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={installUrl}
              onChange={(e) => setInstallUrl(e.target.value)}
              placeholder={labels.installUrlPh}
              data-testid="marketplace-install-url"
              className="flex-1 min-h-[32px] px-2 py-1 text-[12px] bg-bg-primary border border-border rounded text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            />
            <input
              type="text"
              value={installHashExpected}
              onChange={(e) => setInstallHashExpected(e.target.value)}
              placeholder={labels.installHashPh}
              data-testid="marketplace-install-hash"
              className="sm:w-56 min-h-[32px] px-2 py-1 text-[11px] font-mono bg-bg-primary border border-border rounded text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            />
            <button
              type="button"
              onClick={handleVerify}
              data-testid="marketplace-install-verify"
              disabled={installStatus === "verifying"}
              className="min-h-[32px] px-3 py-1 text-[11px] font-semibold rounded border border-accent-blue/40 bg-accent-blue/15 text-accent-blue hover:bg-accent-blue/25 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              {labels.verifyBtn}
            </button>
            <button
              type="button"
              onClick={handleInstall}
              data-testid="marketplace-install-confirm"
              disabled={installStatus !== "verified"}
              className="min-h-[32px] px-3 py-1 text-[11px] font-semibold rounded border border-accent-purple/40 bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              {labels.installBtn}
            </button>
          </div>
          {installMessage ? (
            <p
              data-testid="marketplace-install-message"
              className={`mt-2 text-[11px] ${
                installStatus === "failed"
                  ? "text-accent-red"
                  : installStatus === "verified" || installStatus === "installed"
                  ? "text-accent-green"
                  : "text-text-tertiary"
              }`}
            >
              {installMessage}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Coming soon footer */}
      <footer className="px-4 py-2 border-t border-border text-[10px] text-text-tertiary italic flex items-center gap-2">
        <Sparkles size={11} />
        <span data-testid="marketplace-coming-soon">{labels.comingSoon}</span>
      </footer>

      {/* Detail dialog */}
      {selected ? (
        <div
          className="absolute inset-0 bg-black/60 flex items-stretch sm:items-center justify-center p-0 sm:p-4 z-[var(--z-modal)]"
          role="dialog"
          aria-modal="true"
          aria-label={labels.detailTitle}
          data-testid="marketplace-detail"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
        >
          <div className="bg-bg-secondary border border-border rounded-none sm:rounded-lg max-w-none sm:max-w-md w-full h-full sm:h-auto sm:max-h-[80vh] overflow-y-auto p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-text-primary">{L4(language, selected.name)}</h3>
                <p className="text-[10px] text-text-tertiary font-mono">
                  {labels.version} v{selected.version} · {labels.author} {selected.author}
                  {selected.bundled ? ` · ${labels.bundled}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label={labels.close}
                data-testid="marketplace-detail-close"
                className="min-h-[32px] min-w-[32px] p-1 rounded hover:bg-bg-tertiary text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-[12px] text-text-secondary mb-3">
              {L4(language, selected.description)}
            </p>
            {selected.permissions && selected.permissions.length > 0 ? (
              <div className="mb-3">
                <h4 className="text-[11px] font-semibold text-text-primary uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Shield size={11} />
                  {labels.permissionsTitle}
                </h4>
                <ul className="space-y-1">
                  {selected.permissions.map((perm) => (
                    <li
                      key={perm}
                      className="text-[11px] text-text-secondary flex items-center gap-1"
                      data-testid={`marketplace-permission-${perm}`}
                    >
                      <span className="w-1 h-1 rounded-full bg-accent-amber" />
                      {L4(language, PERMISSION_LABELS[perm])}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { handleToggle(selected.id); setSelectedId(null); }}
                data-testid="marketplace-detail-toggle"
                className={`min-h-[32px] px-3 py-1 text-[12px] font-semibold rounded border focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
                  pluginRegistry.isEnabled(selected.id)
                    ? "bg-bg-tertiary text-text-primary border-border"
                    : "bg-accent-purple/15 text-accent-purple border-accent-purple/40"
                }`}
              >
                {pluginRegistry.isEnabled(selected.id) ? labels.disable : labels.enable}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=Component | inputs=MarketplacePanelProps | outputs=MarketplacePanel
