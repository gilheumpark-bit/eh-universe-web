"use client";

import { useEffect, useRef, useState } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { L4 } from "@/lib/i18n";
import { Clock, Map as MapIcon, Play, X } from "@/components/loreguard/icons";
import type { WorldOpsView } from "./WorldOpsPanel.helpers";
import { WorldOpsMapView } from "./WorldOpsPanel.map-view";
import { WorldOpsSimView } from "./WorldOpsPanel.sim-view";
import { WorldOpsTimelineView } from "./WorldOpsPanel.timeline-view";

export type { WorldOpsView } from "./WorldOpsPanel.helpers";

interface WorldOpsPanelProps {
  initialView: WorldOpsView;
  onClose: () => void;
}

const VIEW_LABELS: Record<WorldOpsView, { ko: string; en: string; ja: string; zh: string }> = {
  sim: { ko: "시뮬레이션", en: "Simulation", ja: "シミュレーション", zh: "模拟" },
  timeline: { ko: "타임라인", en: "Timeline", ja: "タイムライン", zh: "时间线" },
  map: { ko: "지도", en: "Map", ja: "マップ", zh: "地图" },
};

const VIEW_ORDER: WorldOpsView[] = ["sim", "timeline", "map"];
const VIEW_ICONS: Record<WorldOpsView, typeof Play> = {
  sim: Play,
  timeline: Clock,
  map: MapIcon,
};

export default function WorldOpsPanel({ initialView, onClose }: WorldOpsPanelProps) {
  const { currentSession, setConfig, language } = useStudio();
  const [view, setView] = useState<WorldOpsView>(initialView);
  const config = currentSession?.config ?? null;
  const dialogRef = useRef<HTMLElement>(null);

  useFocusTrap(dialogRef, true);
  useBodyScrollLock(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const HeadIcon = VIEW_ICONS[view];

  return (
    <div
      role="presentation"
      className="eh-app wops-overlay"
      onClick={onClose}
    >
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, VIEW_LABELS[view])}
        onClick={(e) => e.stopPropagation()}
        className="wops-panel"
      >
        <div className="pcard-h wops-head">
          <HeadIcon size={16} />
          {L4(language, VIEW_LABELS[view])}
          <div className="seg wops-seg">
            {VIEW_ORDER.map((v) => (
              <button
                key={v}
                type="button"
                className={view === v ? "on" : ""}
                aria-pressed={view === v}
                onClick={() => setView(v)}
              >
                {L4(language, VIEW_LABELS[v])}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="eh-icbtn wops-close"
            aria-label={L4(language, { ko: "패널 닫기", en: "Close panel", ja: "パネルを閉じる", zh: "关闭面板" })}
            autoFocus
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {!config ? (
          <p className="wops-empty">
            {L4(language, {
              ko: "아직 프로젝트가 없습니다. 먼저 '새 세계관'으로 프로젝트를 만들어주세요.",
              en: "No project yet. Create one with 'New World' first.",
              ja: "まだプロジェクトがありません。先に「新しい世界観」を作成してください。",
              zh: "还没有项目。请先用「新世界观」创建项目。",
            })}
          </p>
        ) : view === "sim" ? (
          <WorldOpsSimView config={config} language={language} />
        ) : view === "timeline" ? (
          <WorldOpsTimelineView config={config} language={language} setConfig={setConfig} />
        ) : (
          <WorldOpsMapView config={config} language={language} setConfig={setConfig} />
        )}
      </aside>
    </div>
  );
}
