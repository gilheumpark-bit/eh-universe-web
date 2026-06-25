"use client";

import type { AppLanguage } from "@/lib/studio-types";
import type { WorldOpsView } from "@/components/loreguard/WorldOpsPanel";
import { ChevronR } from "@/components/loreguard/icons";
import {
  WorldCollapsedPanel,
  WorldEmptyState,
  type WorldCollapsedSummaryItem,
} from "./TabWorld.parts";
import TabWorldRailPanel from "./TabWorldRailPanel";

interface TabWorldEmptyLayoutProps {
  railOpen: boolean;
  boardOpen: boolean;
  isSheet: boolean;
  worldRailSummary: readonly WorldCollapsedSummaryItem[];
  worldBoardSummary: readonly WorldCollapsedSummaryItem[];
  language: AppLanguage;
  showVersions: boolean;
  canRestoreVersion: boolean;
  onToggleRail: () => void;
  onToggleBoard: () => void;
  onNewWorld: () => void;
  onOpenVersions: () => void;
  onOpenOps: (view: WorldOpsView) => void;
}

export default function TabWorldEmptyLayout({
  railOpen,
  boardOpen,
  isSheet,
  worldRailSummary,
  worldBoardSummary,
  language,
  showVersions,
  canRestoreVersion,
  onToggleRail,
  onToggleBoard,
  onNewWorld,
  onOpenVersions,
  onOpenOps,
}: TabWorldEmptyLayoutProps) {
  return (
    <div className="wd-grid wd-world-grid">
      <TabWorldRailPanel
        open={railOpen}
        isSheet={isSheet}
        summary={worldRailSummary}
        language={language}
        showVersions={showVersions}
        canRestoreVersion={canRestoreVersion}
        showAdvancedTools={false}
        onToggle={onToggleRail}
        onNewWorld={onNewWorld}
        onOpenVersions={onOpenVersions}
        onOpenOps={onOpenOps}
      />
      <WorldEmptyState onCreate={onNewWorld} />
      {!boardOpen ? (
        <WorldCollapsedPanel
          side="board"
          id="lg-world-board"
          label="세계관 보드"
          expandLabel="세계관 보드 펼치기"
          summary={worldBoardSummary}
          onExpand={onToggleBoard}
        />
      ) : (
        <aside
          className="wd-board"
          id="lg-world-board"
          aria-label="세계관 보드"
          role={isSheet ? "dialog" : undefined}
          aria-modal={isSheet ? "true" : undefined}
        >
          <div className="wd-board-head">
            <span>세계관 보드</span>
            <button
              type="button"
              className="wd-panel-toggle"
              aria-expanded={true}
              aria-controls="lg-world-board"
              aria-label="세계관 보드 접기"
              title="세계관 보드 접기"
              onClick={onToggleBoard}
            >
              <ChevronR size={16} strokeWidth={1.6} aria-hidden="true" />
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
