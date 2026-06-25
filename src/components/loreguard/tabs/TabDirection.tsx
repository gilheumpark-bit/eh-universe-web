"use client";

import { useCallback, useMemo, useState } from "react";
import { Film, Layers, Plus } from "@/components/loreguard/icons";
import { DirectionNav } from "./TabDirectionNav";
import { useStudio } from "@/app/studio/StudioContext";
import CandidateDecisionCard from "@/components/loreguard/CandidateDecisionCard";
import { useLoreguardTab } from "@/components/loreguard/LoreguardTabContext";
import ChatCanvasDock from "@/components/loreguard/ChatCanvasDock";
import { useLongArcVerifier } from "@/hooks/useLongArcVerifier";
import type { EpisodeManuscript, StoryConfig } from "@/lib/studio-types";
import { findSheet, listSheetsSorted } from "@/lib/scene-sheet/helpers";
import { DirectionPanel } from "./TabDirection.panel";
import { DirectionCenter, ProductionDirectionCard } from "./TabDirection.sections";
import {
  DIRECTION_NAV_KEY,
  DIRECTION_PANEL_KEY,
  DOCK_PROPOSAL_GUIDE,
  buildSceneSheetBlock,
  candidateMeta,
  candidateNotices,
  candidateSubtitle,
  cleanImportedDirectionTitle,
  readDirectionPanelOpen,
  useDirectionPanelSheet,
  writeDirectionPanelOpen,
} from "./TabDirection.shared";
import { useTabDirectionActions } from "./useTabDirectionActions";
export default function TabDirection() {
  const {
    currentSession,
    currentProjectId,
    setConfig,
    createNewSession,
    isKO,
    language,
    hasAiAccess,
    setShowApiKeyModal,
  } = useStudio();
  const { activeTab } = useLoreguardTab();
  const activeSurface = String(activeTab);
  const isSceneSurface = activeSurface === "scene" || activeSurface === "scenesheet";
  const config = currentSession?.config ?? null;
  const [sel, setSel] = useState<string>("");
  const [query, setQuery] = useState("");
  const [toneFilter, setToneFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [navEpisode, setNavEpisode] = useState<number | null>(null);
  const [navOpen, setNavOpen] = useState(() => readDirectionPanelOpen(DIRECTION_NAV_KEY));
  const [panelOpen, setPanelOpen] = useState(() => readDirectionPanelOpen(DIRECTION_PANEL_KEY));
  const isPanelSheet = useDirectionPanelSheet();

  const toggleNav = useCallback(() => {
    setNavOpen((prev) => {
      const next = !prev;
      writeDirectionPanelOpen(DIRECTION_NAV_KEY, next);
      return next;
    });
  }, []);

  const togglePanel = useCallback(() => {
    setPanelOpen((prev) => {
      const next = !prev;
      writeDirectionPanelOpen(DIRECTION_PANEL_KEY, next);
      return next;
    });
  }, []);

  const closeNavIfSheet = useCallback(() => {
    if (!isPanelSheet) return;
    setNavOpen(false);
    writeDirectionPanelOpen(DIRECTION_NAV_KEY, false);
  }, [isPanelSheet]);

  const episodesForArc = useMemo<EpisodeManuscript[]>(
    () => config?.manuscripts ?? [],
    [config],
  );
  const longArc = useLongArcVerifier({
    projectId: currentProjectId ?? currentSession?.id ?? "local",
    config,
    episodes: episodesForArc,
    autoTrigger: false,
  });

  const sheets = config ? listSheetsSorted(config) : [];
  const episode = navEpisode ?? config?.episode ?? 1;
  const sheet = config ? findSheet(config, episode) : undefined;
  const episodeTitle = sheet?.title ?? "";
  const scenes = sheet?.scenes ?? [];
  const selected = scenes.find((s) => s.sceneId === sel) ?? scenes[0];
  const showSceneImportCandidates = isSceneSurface;
  const showDirectionImportCandidates = activeSurface === "direction";
  const panelTitle = isSceneSurface
    ? isKO
      ? "씬시트 보조 패널"
      : "Scene sheet panel"
    : isKO
      ? "연출 보조 패널"
      : "Direction panel";
  const pendingSceneImportCandidates = (config?.acceptedImportCandidates ?? []).filter(
    (candidate) => candidate.bucket === "scenes" && !candidate.routedAt,
  );
  const pendingDirectionImportCandidates = (config?.acceptedImportCandidates ?? []).filter(
    (candidate) => candidate.bucket === "direction" && !candidate.routedAt,
  );

  const {
    aiLoading,
    aiError,
    aiSuggestions,
    blankEntry,
    markImportCandidate,
    routeSceneImportCandidate,
    routeDirectionImportCandidate,
    updateProductionDirection,
    handleConfirm,
    handleDelete,
    handlePickEpisode,
    handleAiSuggest,
    adoptSuggestion,
    dismissAi,
    dockExtract,
    dockQuickExtract,
  } = useTabDirectionActions({
    isSceneSurface,
    config: config ?? ({} as StoryConfig),
    sheet,
    scenes,
    episode,
    episodeTitle,
    sel,
    editingId,
    setSel,
    setEditingId,
    setNavEpisode,
    setConfig,
    closeNavIfSheet,
    hasAiAccess,
    setShowApiKeyModal,
  });

  // ---- 빈 상태: 세션 없음 ----
  if (!config) {
    return (
      <div className="dr-grid">
        <section className="dr-center dr-empty-center-fill">
          <div className="dr-start-empty">
            <Film size={40} className="dr-start-icon" />
            <div className="dr-start-title">
              {isSceneSurface
                ? isKO
                  ? "씬시트를 작성할 작품이 없습니다"
                  : "No project for a scene sheet"
                : isKO
                  ? "연출할 작품이 없습니다"
                  : "No project to direct"}
            </div>
            <div className="dr-start-copy">
              {isSceneSurface
                ? isKO
                  ? "먼저 새 작품을 만들면 회차별 씬시트를 작성할 수 있습니다."
                  : "Create a project first to build per-episode scene sheets."
                : isKO
                  ? "먼저 새 작품을 만들면 회차별 씬 연출 시트를 작성할 수 있습니다."
                  : "Create a project first to build per-episode scene direction sheets."}
            </div>
            <div className="dr-start-grid">
              {[
                isKO ? ["장면 목적", "각 씬이 공개할 정보와 감정 변화를 남깁니다."] : ["Scene purpose", "Track what each scene reveals and changes."],
                isKO ? ["연출 기준", "시점, 리듬, 분위기를 회차별로 정리합니다."] : ["Direction guide", "Organize POV, rhythm, and mood by episode."],
                isKO ? ["장편 점검", "누락된 복선과 긴 호흡의 균열을 확인합니다."] : ["Long-form check", "Review missing setup and long-arc cracks."],
              ].map(([title, body]) => (
                <article key={title} className="pcard dr-start-card">
                  <div className="dr-start-card-title">{title}</div>
                  <div className="dr-start-card-copy">{body}</div>
                </article>
              ))}
            </div>
            <button className="btn" type="button" onClick={() => createNewSession()}>
              <Plus size={15} />
              {isKO ? "새 작품 만들기" : "Create project"}
            </button>
          </div>
        </section>
      </div>
    );
  }

  // 캔버스 현황 — 실데이터만 (buildSceneSheetBlock 재사용·sheet 없으면 회차만)
  const dockContext =
    buildSceneSheetBlock(sheet) ?? `${episode}화 — 등록된 씬 없음`;
  const dockRoleMode = isSceneSurface ? "씬시트 설계자" : "씬 연출 디자이너(콘티 제안가)";
  const dockPlaceholder = isSceneSurface
    ? "이 장면의 목적을 정해주세요"
    : "장면의 온도와 리듬을 정해주세요";

  const productionDirection =
    config.sceneDirection?.productionDirection ?? sheet?.directionSnapshot?.productionDirection;
  const directionModelCard = showDirectionImportCandidates ? (
    <ProductionDirectionCard value={productionDirection} onChange={updateProductionDirection} />
  ) : null;

  const importCandidateCards =
    (showSceneImportCandidates && pendingSceneImportCandidates.length > 0) ||
    (showDirectionImportCandidates && pendingDirectionImportCandidates.length > 0) ? (
      <div className="dr-import-stack">
        {showSceneImportCandidates && pendingSceneImportCandidates.length > 0 ? (
          <section className="pcard" aria-label="씬시트 읽은 자료 검토">
            <div className="pcard-h">
              <Layers size={15} />
              씬시트 읽은 자료 검토 {pendingSceneImportCandidates.length}건
            </div>
            <div className="dr-import-cards">
              {pendingSceneImportCandidates.map((candidate) => (
                <CandidateDecisionCard
                  key={candidate.id}
                  title={candidate.title}
                  subtitle={candidateSubtitle(candidate)}
                  body={candidate.excerpt || candidate.text}
                  meta={candidateMeta(candidate)}
                  notices={candidateNotices(candidate)}
                  acceptLabel="씬으로 반영"
                  onAccept={() => routeSceneImportCandidate(candidate)}
                  onHold={() =>
                    markImportCandidate(candidate.id, "scene-sheet-held", `episode:${episode}:scenes:held`)
                  }
                  onDiscard={() =>
                    markImportCandidate(candidate.id, "scene-sheet-discarded", `episode:${episode}:scenes:discarded`)
                  }
                />
              ))}
            </div>
          </section>
        ) : null}

        {showDirectionImportCandidates && pendingDirectionImportCandidates.length > 0 ? (
          <section className="pcard" aria-label="연출 읽은 자료 검토">
            <div className="pcard-h">
              <Film size={15} />
              연출 읽은 자료 검토 {pendingDirectionImportCandidates.length}건
            </div>
            <div className="dr-import-cards">
              {pendingDirectionImportCandidates.map((candidate) => (
                <CandidateDecisionCard
                  key={candidate.id}
                  title={cleanImportedDirectionTitle(candidate.title)}
                  subtitle={candidateSubtitle(candidate)}
                  body={candidate.excerpt || candidate.text}
                  meta={candidateMeta(candidate)}
                  notices={candidateNotices(candidate)}
                  acceptLabel="연출 노트로 반영"
                  onAccept={() => routeDirectionImportCandidate(candidate)}
                  onHold={() =>
                    markImportCandidate(candidate.id, "direction-held", `episode:${episode}:direction:held`)
                  }
                  onDiscard={() =>
                    markImportCandidate(candidate.id, "direction-discarded", `episode:${episode}:direction:discarded`)
                  }
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    ) : null;

  return (
    // [Z2a-chatcanvas] 접이식 노아 채팅 도크 — 기본 접힘 (씬 테이블 작업 무방해),
    // 열면 좌측 1/3 채팅 + 캔버스 축소. 접힘 상태 noa-lg-chatdock 영속.
    <ChatCanvasDock
      tabKey={isSceneSurface ? "scene" : "direction"}
      roleMode={dockRoleMode}
      proposalGuide={DOCK_PROPOSAL_GUIDE}
      contextBlock={dockContext}
      extractSuggestions={dockExtract}
      extractQuickSuggestions={dockQuickExtract}
      quickSuggestionTitle={isSceneSurface ? "씬시트 대화 메모 후보" : "연출 대화 메모 후보"}
      placeholder={dockPlaceholder}
    >
    <div className="dr-grid dr-main-grid">
      <DirectionNav
        sheets={sheets}
        currentEpisode={episode}
        onPick={handlePickEpisode}
        open={navOpen}
        isSheet={isPanelSheet}
        onToggle={toggleNav}
      />
      <DirectionCenter
        episode={episode}
        episodeTitle={episodeTitle}
        scenes={scenes}
        sel={sel}
        onSelect={setSel}
        query={query}
        setQuery={setQuery}
        toneFilter={toneFilter}
        setToneFilter={setToneFilter}
        editingId={editingId}
        setEditingId={setEditingId}
        onAddNew={() => setEditingId("__new__")}
        onConfirm={handleConfirm}
        onDelete={handleDelete}
        blankEntry={blankEntry}
        aiLoading={aiLoading}
        aiError={aiError}
        aiSuggestions={aiSuggestions}
        onAiSuggest={() => {
          void handleAiSuggest();
        }}
        onAdoptSuggestion={adoptSuggestion}
        onDismissAi={dismissAi}
        directionModelCard={directionModelCard}
        importCandidateCards={importCandidateCards}
        isSceneSurface={isSceneSurface}
      />
      <DirectionPanel
        episode={episode}
        episodeTitle={episodeTitle}
        scenes={scenes}
        selected={selected}
        panelTitle={panelTitle}
        panelAriaLabel={panelTitle}
        open={panelOpen}
        isSheet={isPanelSheet}
        onToggle={togglePanel}
        longArc={longArc}
        episodes={episodesForArc}
        language={language}
        isKO={isKO}
      />
    </div>
    </ChatCanvasDock>
  );
}
