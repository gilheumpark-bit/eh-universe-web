"use client";

import type { AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";
import type { WorldOpsView } from "@/components/loreguard/WorldOpsPanel";
import {
  ChevronL,
  Clock,
  Map as MapIcon,
  Play,
  Plus,
  Scale,
} from "@/components/loreguard/icons";
import {
  WorldCollapsedPanel,
  type WorldCollapsedSummaryItem,
} from "./TabWorld.parts";

interface TabWorldRailPanelProps {
  open: boolean;
  isSheet: boolean;
  summary: readonly WorldCollapsedSummaryItem[];
  language: AppLanguage;
  showVersions: boolean;
  canRestoreVersion: boolean;
  showAdvancedTools: boolean;
  onToggle: () => void;
  onNewWorld: () => void;
  onOpenVersions: () => void;
  onOpenOps: (view: WorldOpsView) => void;
}

export default function TabWorldRailPanel({
  open,
  isSheet,
  summary,
  language,
  showVersions,
  canRestoreVersion,
  showAdvancedTools,
  onToggle,
  onNewWorld,
  onOpenVersions,
  onOpenOps,
}: TabWorldRailPanelProps) {
  if (!open) {
    return (
      <WorldCollapsedPanel
        side="rail"
        id="lg-world-rail"
        label="세계관 도구"
        expandLabel="세계관 도구 레일 펼치기"
        summary={summary}
        onExpand={onToggle}
      />
    );
  }

  return (
    <aside
      className="wd-rail"
      id="lg-world-rail"
      aria-label="세계관 도구 레일"
      role={isSheet ? "dialog" : undefined}
      aria-modal={isSheet ? "true" : undefined}
    >
      <button
        type="button"
        className="wd-panel-toggle"
        aria-expanded={true}
        aria-controls="lg-world-rail"
        aria-label="세계관 도구 레일 접기"
        title="세계관 도구 레일 접기"
        onClick={onToggle}
      >
        <ChevronL size={16} strokeWidth={1.6} aria-hidden="true" />
      </button>
      <button type="button" className="wd-tool" onClick={onNewWorld}>
        <span className="wd-tool-ic"><Plus size={20} /></span>
        <span>새 세계관</span>
      </button>
      {showAdvancedTools && canRestoreVersion ? (
        <button
          type="button"
          className="wd-tool"
          onClick={onOpenVersions}
          aria-pressed={showVersions}
        >
          <span className="wd-tool-ic"><Scale size={20} /></span>
          <span>버전 비교</span>
        </button>
      ) : null}
      {showAdvancedTools ? (
        <>
          <button
            type="button"
            className="wd-tool"
            aria-haspopup="dialog"
            onClick={() => onOpenOps("sim")}
          >
            <span className="wd-tool-ic"><Play size={20} /></span>
            <span>{L4(language, { ko: "시뮬레이션", en: "Simulate", ja: "シミュレーション", zh: "模拟" })}</span>
          </button>
          <button
            type="button"
            className="wd-tool"
            aria-haspopup="dialog"
            onClick={() => onOpenOps("timeline")}
          >
            <span className="wd-tool-ic"><Clock size={20} /></span>
            <span>{L4(language, { ko: "타임라인", en: "Timeline", ja: "タイムライン", zh: "时间线" })}</span>
          </button>
          <button
            type="button"
            className="wd-tool"
            aria-haspopup="dialog"
            onClick={() => onOpenOps("map")}
          >
            <span className="wd-tool-ic"><MapIcon size={20} /></span>
            <span>{L4(language, { ko: "지도", en: "Map", ja: "マップ", zh: "地图" })}</span>
          </button>
        </>
      ) : null}
    </aside>
  );
}
