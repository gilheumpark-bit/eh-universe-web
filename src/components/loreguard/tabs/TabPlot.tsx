"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import LoadingSkeleton from "@/components/studio/LoadingSkeleton";
import { Layers, List, Branch, Chevron, Grid, Expand, Wand, Plus } from "@/components/loreguard/icons";
import { useStudio } from "@/app/studio/StudioContext";
import ChatCanvasDock from "@/components/loreguard/ChatCanvasDock";
import CandidateDecisionCard from "@/components/loreguard/CandidateDecisionCard";
import type { EpisodeSceneSheet, MainScenarioStructure, StoryConfig } from "@/lib/studio-types";
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";
import { BeatCard, ScenarioStructurePanel } from "./TabPlot.cards";
import { readPlotPanelOpen, usePlotPanelSheet, writePlotPanelOpen } from "./TabPlot.rail-state";
import { PlotEmptyState, PlotRail } from "./TabPlot.sections";
import { useTabPlotBoardActions } from "./useTabPlotBoardActions";
import TabPlotSceneBoard from "./TabPlotSceneBoard";
import {
  DOCK_PROPOSAL_GUIDE,
  PHASES,
  TL_BARS,
  candidateMeta,
  candidateNotices,
  candidateSubtitle,
  cleanImportedMainScenarioTitle,
  mainScenarioImportCandidates,
  normalizeMainScenarioStructure,
  phaseToneClass,
  timelineToneClass,
} from "./TabPlot.shared";

const RelationGraph = dynamic(() => import("@/components/loreguard/RelationGraph"), {
  ssr: false,
  loading: () => <LoadingSkeleton height={440} />,
});
export default function TabPlot() {
  const {
    currentSession,
    currentProject,
    setConfig,
    handleTabChange,
    createNewSession,
    openQuickStart,
    hasAiAccess,
    setShowApiKeyModal,
  } = useStudio();

  const [view, setView] = useState<"list" | "grid" | "scene">("list");
  const [flowView, setFlowView] = useState(false);
  const [railOpen, setRailOpen] = useState(readPlotPanelOpen);
  const isRailSheet = usePlotPanelSheet();

  const toggleRail = useCallback(() => {
    setRailOpen((prev) => {
      const next = !prev;
      writePlotPanelOpen(next);
      return next;
    });
  }, []);

  const closeRailIfSheet = useCallback(() => {
    if (!isRailSheet) return;
    setRailOpen(false);
    writePlotPanelOpen(false);
  }, [isRailSheet]);

  const config = currentSession?.config ?? null;
  const sheets: EpisodeSceneSheet[] = useMemo(
    () => config?.episodeSceneSheets ?? [],
    [config?.episodeSceneSheets],
  );
  const pendingMainScenarioCandidates = useMemo(
    () => mainScenarioImportCandidates(config),
    [config],
  );
  const mainScenarioStructure = useMemo(
    () => normalizeMainScenarioStructure(config, sheets),
    [config, sheets],
  );
  const updateMainScenarioStructure = useCallback(
    (next: MainScenarioStructure) => {
      setConfig((prev: StoryConfig) => ({
        ...prev,
        mainScenarioStructure: next,
      }));
      markExplicitCreativeLog("scene");
    },
    [setConfig],
  );

  // 안정 key: 구 데이터(id 없음)와 중복 episode 모두 방어.
  const sheetKeys = useMemo<string[]>(() => {
    const used = new Set<string>();
    return sheets.map((sheet, index) => {
      let key: string;
      if (sheet.id) {
        key = sheet.id;
      } else {
        key = `legacy-${sheet.episode}-${sheet.lastUpdate ?? "no-update"}-${index}`;
      }
      // 고유성 보강 — 동일 key 재출현 시(중복 id/중복 episode) suffix 부여.
      if (used.has(key)) {
        let n = 2;
        while (used.has(`${key}#${n}`)) n += 1;
        key = `${key}#${n}`;
      }
      used.add(key);
      return key;
    });
  }, [sheets]);

  const {
    expanded,
    aiBusy,
    aiError,
    aiSuggestions,
    aiFromCache,
    toggleExpand,
    focusEpisodeCard,
    expandAll,
    markImportCandidate,
    routeMainScenarioImportCandidate,
    addBeat,
    renameBeat,
    removeBeat,
    suggestBeats,
    adoptSuggestion,
    ignoreSuggestion,
    dockExtract,
    dockQuickExtract,
    dockContext,
    flowNodes,
    flowEdges,
    focusBeat,
  } = useTabPlotBoardActions({
    config,
    sheets,
    setConfig,
    setView,
    setFlowView,
    closeRailIfSheet,
    hasAiAccess,
    setShowApiKeyModal,
  });

  // ---- 빈 상태: 세션 없음 ----
  if (!currentSession) {
    return (
      <PlotEmptyState
        createNewSession={createNewSession}
        openQuickStart={openQuickStart}
      />
    );
  }

  const projectName = currentProject?.name || config?.title || "제목 없음";

  return (
    // [Z2a-chatcanvas] 접이식 노아 채팅 도크 — 기본 접힘 (보드 작업 무방해),
    // 열면 좌측 1/3 채팅 + 보드 축소. 접힘 상태 noa-lg-chatdock 영속.
    <ChatCanvasDock
      tabKey="plot"
      roleMode="한국 웹소설 플롯 설계 어시스턴트"
      proposalGuide={DOCK_PROPOSAL_GUIDE}
      contextBlock={dockContext}
      extractSuggestions={dockExtract}
      extractQuickSuggestions={dockQuickExtract}
      quickSuggestionTitle="메인 시나리오 대화 메모 후보"
      placeholder="사건 흐름을 지시하세요"
    >
    <div className="pl-grid pl-main-grid">
      {/* ---- 좌측 개요 레일 ---- */}
      {/* [A-01 priority-high 2026-06-09] 동일 페이지 2개 aside 구분 — unique aria-label (axe "landmark must be distinguishable"). */}
      <PlotRail
        railOpen={railOpen}
        isRailSheet={isRailSheet}
        projectName={projectName}
        currentEpisode={config?.episode ?? 1}
        beatCount={sheets.length}
        aiBusy={aiBusy}
        aiError={aiError}
        aiSuggestions={aiSuggestions}
        aiFromCache={aiFromCache}
        toggleRail={toggleRail}
        closeRailIfSheet={closeRailIfSheet}
        openSettings={() => handleTabChange("settings")}
        addBeat={addBeat}
        suggestBeats={suggestBeats}
        adoptSuggestion={adoptSuggestion}
        ignoreSuggestion={ignoreSuggestion}
      />

      {/* ---- 센터: 페이즈 리본 + 비트 보드 + 타임라인 ---- */}
      <section className="pl-center pl-center-span">
        <div className="pl-top">
          <div>
            <div className="pl-title">
              <Branch size={19} className="pl-title-icon" />
              메인 시나리오 모드
            </div>
            <div className="pl-sub">이야기의 흐름과 구조를 시각적으로 설계하고 관리합니다.</div>
          </div>
          <div className="pl-top-r">
            <button type="button" className="btn" onClick={addBeat}>
              <Plus size={15} />
              비트 추가
            </button>
            {/* [X1-xyflow] 비트 흐름 그래프 토글 — 보조 뷰 (기본 보드 유지) */}
            <button
              type="button"
              className={flowView ? "btn primary" : "btn"}
              aria-pressed={flowView}
              title="비트 흐름 그래프 보기"
              onClick={() => setFlowView((v) => !v)}
            >
              <Branch size={15} aria-hidden="true" />
              비트 흐름
            </button>
            <div className="seg">
              {/* [A-01 priority-high 2026-06-09] 아이콘 전용 버튼 — aria-label+title 부여 (axe "no accessible name"). */}
              <button
                type="button"
                className={view === "list" ? "on" : ""}
                aria-label="리스트 보기"
                aria-pressed={view === "list"}
                title="리스트 보기"
                onClick={() => setView("list")}
              >
                <List size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={view === "grid" ? "on" : ""}
                aria-label="그리드 보기"
                aria-pressed={view === "grid"}
                title="그리드 보기"
                onClick={() => setView("grid")}
              >
                <Grid size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={view === "scene" ? "on" : ""}
                aria-label="씬 보드 보기"
                aria-pressed={view === "scene"}
                title="씬 보드 보기"
                onClick={() => setView("scene")}
              >
                <Layers size={15} aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              className="eh-icbtn"
              aria-label={expanded.size === sheets.length && sheets.length > 0 ? "모두 접기" : "모두 펼치기"}
              title={expanded.size === sheets.length && sheets.length > 0 ? "모두 접기" : "모두 펼치기"}
              onClick={expandAll}
            >
              <Expand size={17} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="pl-ribbon">
          {PHASES.map((p) => (
            <div key={p.name} className={`pl-phase ${phaseToneClass(p.name)}`}>
              <span className="pl-phase-n">{p.name}</span>
              <span className="pl-phase-r">{p.range}</span>
            </div>
          ))}
        </div>

        <ScenarioStructurePanel
          structure={mainScenarioStructure}
          sheets={sheets}
          onChange={updateMainScenarioStructure}
        />

        {pendingMainScenarioCandidates.length > 0 ? (
          <section className="pcard pl-import-review" aria-label="메인 시나리오 읽은 자료 검토">
            <div className="pcard-h">
              <Layers size={15} />
              읽은 자료 검토 ({pendingMainScenarioCandidates.length})
            </div>
            <div className="pl-import-grid">
              {pendingMainScenarioCandidates.map((candidate) => (
                <CandidateDecisionCard
                  key={candidate.id}
                  title={cleanImportedMainScenarioTitle(candidate.title)}
                  subtitle={candidateSubtitle(candidate)}
                  body={candidate.excerpt || candidate.text}
                  meta={candidateMeta(candidate)}
                  notices={candidateNotices(candidate)}
                  acceptLabel="비트로 반영"
                  onAccept={() => routeMainScenarioImportCandidate(candidate)}
                  onHold={() => markImportCandidate(candidate.id, "plot-held", "episodeSceneSheets:held")}
                  onDiscard={() => markImportCandidate(candidate.id, "plot-discarded", "episodeSceneSheets:discarded")}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* [X1-xyflow] 흐름 뷰 — 비트가 있을 때만 그래프, 없으면 기존 빈 보드로 폴백 */}
        {flowView && sheets.length > 0 ? (
          <div className="pl-flow-block">
            <div className="pl-sub pl-flow-copy">
              비트 흐름 — 에피소드 순서 좌→우, 컬럼 아래는 해당 비트의 장면. 노드 클릭 시 해당
              비트로 이동합니다 (레이아웃 자동).
            </div>
            <RelationGraph
              nodes={flowNodes}
              edges={flowEdges}
              ariaLabel="비트 흐름 그래프"
              height={440}
              onNodeClick={focusBeat}
            />
          </div>
        ) : view === "scene" ? (
          <TabPlotSceneBoard sheets={sheets} onFocusEpisode={focusEpisodeCard} />
        ) : (
        <div
          className={`pl-board ${view === "grid" ? "pl-board-grid" : ""}`}
        >
          {sheets.length === 0 ? (
            <div className="pl-branch">
              <div className="pl-diamond">
                <Wand size={18} />
              </div>
              <div className="pl-branch-t">비트가 없습니다</div>
              <div className="pl-branch-d">
                <button type="button" className="btn pl-branch-action" onClick={addBeat}>
                  <Plus size={14} />첫 비트 추가
                </button>
              </div>
            </div>
          ) : (
            sheets.map((sheet, i) => (
              <div key={sheetKeys[i]} className="pl-col">
                <BeatCard
                  sheet={sheet}
                  index={i}
                  expanded={expanded.has(sheet.episode)}
                  onToggle={() => toggleExpand(sheet.episode)}
                  onRename={(title) => renameBeat(sheet.episode, title)}
                  onRemove={() => removeBeat(sheet.episode)}
                />
              </div>
            ))
          )}
        </div>
        )}

        <div className="pl-timeline">
          <div className="pl-tl-head">
            <Chevron size={15} />
            타임라인 개요
          </div>
          <div className="pl-tl-bars">
            {TL_BARS.map(([n]) => (
              <div key={n} className={`pl-tl-bar ${timelineToneClass(n)}`}>
                {n}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
    </ChatCanvasDock>
  );
}
