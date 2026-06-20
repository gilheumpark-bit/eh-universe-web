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
  "ai-enhancer":   { ko: "집필 보조",   en: "Writing Enhancer", ja: "執筆補助",      zh: "写作辅助" },
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
  network:            { ko: "외부 연결 접근",   en: "External access",  ja: "外部接続", zh: "外部连接访问" },
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
    // TODO: wire real manuscript getters when bundled extensions need live document context.
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

  const manifests = useFilteredCatalog(search, category, language);

  // Force a re-render whenever enabled state changes so cards reflect it.
  const rerender = useCallback(() => setTick((t) => t + 1), []);

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
    title:       L4(language, { ko: "확장 기능", en: "Extensions", ja: "拡張機能", zh: "扩展功能" }),
    searchPh:    L4(language, { ko: "이름 또는 설명 검색...", en: "Search by name or description...", ja: "名前または説明で検索...", zh: "按名称或描述搜索..." }),
    enable:      L4(language, { ko: "활성화", en: "Enable", ja: "有効化", zh: "启用" }),
    disable:     L4(language, { ko: "비활성화", en: "Disable", ja: "無効化", zh: "禁用" }),
    enabled:     L4(language, { ko: "활성", en: "Enabled", ja: "有効", zh: "已启用" }),
    close:       L4(language, { ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" }),
    empty:       L4(language, { ko: "일치하는 확장 기능이 없습니다.", en: "No matching extensions.", ja: "一致する拡張機能がありません。", zh: "没有匹配的扩展功能。" }),
    comingSoon:  L4(language, {
      ko: "현재는 검수된 내장 보조 기능만 제공합니다.",
      en: "Only reviewed bundled extras are available now.",
      ja: "現在は確認済みの内蔵補助機能のみ利用できます。",
      zh: "目前仅提供已检查的内置辅助功能。",
    }),
    permissionsTitle: L4(language, { ko: "요구 권한", en: "Required permissions", ja: "必要な権限", zh: "所需权限" }),
    author:       L4(language, { ko: "작성자", en: "Author", ja: "作者", zh: "作者" }),
    version:      L4(language, { ko: "버전", en: "Version", ja: "バージョン", zh: "版本" }),
    bundled:      L4(language, { ko: "내장", en: "Bundled", ja: "同梱", zh: "内置" }),
    detailTitle:  L4(language, { ko: "확장 기능 상세", en: "Extension detail", ja: "拡張機能の詳細", zh: "扩展功能详情" }),
  }), [language]);

  const selected = selectedId ? pluginRegistry.get(selectedId)?.manifest ?? null : null;

  return (
    <div
      className={`flex flex-col bg-bg-secondary border border-border rounded-lg ${className}`}
      role="dialog"
      aria-labelledby="marketplace-panel-title"
      data-testid="marketplace-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-accent-purple" aria-hidden="true" />
          <h2 id="marketplace-panel-title" className="text-sm font-black text-text-primary uppercase tracking-widest font-mono">
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
            <X size={14} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* Filter bar */}
      <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={labels.searchPh}
            aria-label={labels.searchPh}
            data-testid="marketplace-search"
            className="w-full min-h-[32px] pl-7 pr-2 py-1 text-[12px] bg-bg-primary border border-border rounded text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus:border-accent-purple"
          />
        </div>
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
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            data-testid="marketplace-grid"
            role="list"
            aria-label={labels.title}
          >
            {manifests.map((m) => {
              const Icon = iconFor(m.iconLucide);
              const enabled = pluginRegistry.isEnabled(m.id);
              return (
                <article
                  key={m.id}
                  data-testid={`plugin-card-${m.id}`}
                  role="listitem"
                  className="flex flex-col border border-border rounded-lg p-3 bg-bg-primary hover:border-accent-purple/40 transition-colors"
                >
                  <header className="flex items-start gap-2">
                    <span className="shrink-0 w-8 h-8 rounded flex items-center justify-center bg-bg-tertiary text-accent-purple" aria-hidden="true">
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
                      role="switch"
                      aria-checked={enabled}
                      aria-label={`${L4(language, m.name)} — ${enabled ? labels.disable : labels.enable}`}
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
                      aria-haspopup="dialog"
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
          aria-labelledby="marketplace-detail-title"
          aria-describedby="marketplace-detail-desc"
          data-testid="marketplace-detail"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
        >
          <div className="bg-bg-secondary border border-border rounded-none sm:rounded-lg max-w-none sm:max-w-md w-full h-full sm:h-auto sm:max-h-[80vh] overflow-y-auto p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <h3 id="marketplace-detail-title" className="text-sm font-bold text-text-primary">{L4(language, selected.name)}</h3>
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
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            <p id="marketplace-detail-desc" className="text-[12px] text-text-secondary mb-3">
              {L4(language, selected.description)}
            </p>
            {selected.permissions && selected.permissions.length > 0 ? (
              <div className="mb-3">
                <h4 id="marketplace-permissions-title" className="text-[11px] font-semibold text-text-primary uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Shield size={11} aria-hidden="true" />
                  {labels.permissionsTitle}
                </h4>
                <ul className="space-y-1" aria-labelledby="marketplace-permissions-title">
                  {selected.permissions.map((perm) => (
                    <li
                      key={perm}
                      className="text-[11px] text-text-secondary flex items-center gap-1"
                      data-testid={`marketplace-permission-${perm}`}
                    >
                      <span className="w-1 h-1 rounded-full bg-accent-amber" aria-hidden="true" />
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
                role="switch"
                aria-checked={pluginRegistry.isEnabled(selected.id)}
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
