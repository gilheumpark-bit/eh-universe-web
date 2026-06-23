"use client";

/* TabCharacter — 캐릭터·아이템 탭 조립부. 세션 저장과 관계도 배선을 소유한다. */

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import LoadingSkeleton from "@/components/studio/LoadingSkeleton";
import { useStudio } from "@/app/studio/StudioContext";
import ChatCanvasDock from "@/components/loreguard/ChatCanvasDock";
import ItemStudioView from "@/components/studio/ItemStudioView";
import { generateCharacters } from "@/services/geminiService";
import { activeSupportsStructured } from "@/lib/ai-providers";
import { logger } from "@/lib/logger";
import type { Character, CharRelation, Item } from "@/lib/studio-types";
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";
import { fireCpLog, getCreativeLogger } from "./TabCharacter.creative-log";
import {
  DOCK_PROPOSAL_GUIDE,
  REL_LABELS,
  pendingCharacterImportCandidates,
  pendingItemImportCandidates,
} from "./TabCharacter.shared";
import { useCharacterDock } from "./TabCharacter.dock";
import { useCharacterGraph } from "./TabCharacter.graph";
import { useCharacterImportRouting } from "./TabCharacter.imports";
import { CharacterProfileView } from "./TabCharacter.profile";
import { CharacterRail, EmptyProjectState, ImportCandidatesSection } from "./TabCharacter.sections";
import {
  readCharacterPanelOpen,
  useCharacterPanelSheet,
  writeCharacterPanelOpen,
} from "./TabCharacter.rail-state";

const RelationGraph = dynamic(() => import("@/components/loreguard/RelationGraph"), {
  ssr: false,
  loading: () => <LoadingSkeleton height={480} />,
});

export default function TabCharacter() {
  const {
    currentSession,
    setConfig,
    createNewSession,
    isKO,
    language,
    charSubTab,
    setCharSubTab,
    hasAiAccess,
    setShowApiKeyModal,
  } = useStudio();
  const config = currentSession?.config ?? null;
  const characters = useMemo<Character[]>(() => config?.characters ?? [], [config]);
  const items = useMemo<Item[]>(() => config?.items ?? [], [config]);
  const relations = useMemo<CharRelation[]>(() => config?.charRelations ?? [], [config]);

  const isItems = charSubTab === "items";
  const characterCandidates = useMemo(() => pendingCharacterImportCandidates(config), [config]);
  const itemCandidates = useMemo(() => pendingItemImportCandidates(config), [config]);

  const [selId, setSelId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [charView, setCharView] = useState<"profile" | "graph">("profile");
  const [railOpen, setRailOpen] = useState(readCharacterPanelOpen);
  const isRailSheet = useCharacterPanelSheet();

  const toggleRail = useCallback(() => {
    setRailOpen((prev) => {
      const next = !prev;
      writeCharacterPanelOpen(next);
      return next;
    });
  }, []);

  const closeRailIfSheet = useCallback(() => {
    if (!isRailSheet) return;
    setRailOpen(false);
    writeCharacterPanelOpen(false);
  }, [isRailSheet]);

  const {
    markImportCandidate,
    routeCharacterImportCandidate,
    routeItemImportCandidate,
  } = useCharacterImportRouting({
    setConfig,
    setCharSubTab,
    closeRailIfSheet,
    onSelectCharacter: setSelId,
    onEditingChange: setEditing,
  });

  const {
    graphNodes,
    graphEdges,
    handleGraphNodeClick,
    handleGraphDragStop,
  } = useCharacterGraph({
    characters,
    relations,
    charGraphLayout: config?.charGraphLayout,
    setConfig,
    onSelectCharacter: setSelId,
    onEditingChange: setEditing,
    onSetCharView: setCharView,
  });

  // 노아 제안 상태 — 에러/안내는 인라인 표시 (silent fail 금지).
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ text: string; tone: "error" | "info" } | null>(null);

  // 선택 보정: 선택 id 가 사라졌으면 첫 인물로 폴백.
  const active = useMemo<Character | null>(() => {
    if (characters.length === 0) return null;
    return characters.find((c) => c.id === selId) ?? characters[0];
  }, [characters, selId]);

  const activeIndex = active ? characters.findIndex((c) => c.id === active.id) : -1;

  // ---- 쓰기 핸들러 (모두 setConfig 경유 → IndexedDB+Firestore 영속) ----

  const handleAdd = () => {
    const newChar: Character = {
      id: `char_${Date.now()}`,
      name: "새 인물",
      role: "",
      traits: "",
      appearance: "",
      dna: 0,
    };
    setConfig((prev) => ({ ...prev, characters: [...(prev.characters ?? []), newChar] }));
    setSelId(newChar.id);
    setEditing(true);
    closeRailIfSheet();
    // [s82] 새 인물 = 작가 신규 생성 (beforeContent 없음 → HUMAN_DRAFT/create)
    fireCpLog(
      getCreativeLogger()?.logHumanEdit({
        targetType: "character",
        targetId: newChar.id,
        afterContent: JSON.stringify(newChar),
        note: "character-add (TabCharacter)",
        stage: "character",
      }),
    );
    markExplicitCreativeLog("character");
  };

  const handleSave = (patch: Partial<Character>) => {
    if (!active) return;
    setConfig((prev) => ({
      ...prev,
      characters: (prev.characters ?? []).map((c) => (c.id === active.id ? { ...c, ...patch } : c)),
    }));
    setEditing(false);
    // [s82] 편집 저장 = HUMAN_REVISION (before/after 해시 체인 — active 스냅샷 기준)
    fireCpLog(
      getCreativeLogger()?.logHumanEdit({
        targetType: "character",
        targetId: active.id,
        beforeContent: JSON.stringify(active),
        afterContent: JSON.stringify({ ...active, ...patch }),
        note: "character-edit (TabCharacter)",
        stage: "character",
      }),
    );
    markExplicitCreativeLog("character");
  };

  const handleDelete = (id: string) => {
    setConfig((prev) => {
      const next = (prev.characters ?? []).filter((c) => c.id !== id);
      // [X1-xyflow] 그래프 좌표도 정리 — 고아 레이아웃 잔존 방지.
      let nextLayout = prev.charGraphLayout;
      if (nextLayout && id in nextLayout) {
        nextLayout = { ...nextLayout };
        delete nextLayout[id];
      }
      return {
        ...prev,
        characters: next,
        // 관계도 정리 — 삭제된 인물 참조 제거.
        charRelations: (prev.charRelations ?? []).filter((r) => r.from !== id && r.to !== id),
        charGraphLayout: nextLayout,
      };
    });
    if (selId === id) setSelId(null);
    setEditing(false);
    // [s82] 삭제 — logger 에 delete 전용 메서드 없음 → HUMAN_REVISION(edit) + note 로 정직 기록.
    const removed = characters.find((c) => c.id === id);
    fireCpLog(
      getCreativeLogger()?.logHumanEdit({
        targetType: "character",
        targetId: id,
        beforeContent: removed ? JSON.stringify(removed) : "(unknown)",
        afterContent: "",
        note: "character-deleted (TabCharacter)",
        stage: "character",
      }),
    );
    markExplicitCreativeLog("character");
  };

  // ---- AI 캐릭터 생성 (옛 CharacterTab 과 동일 엔진 경로 재사용) ----
  // generateCharacters → fetchStructuredGemini → /api/gemini-structured.
  // 결과는 기존 characters 에 APPEND — 이름 기준 dedupe, 덮어쓰기 X.
  const handleAiGenerate = async () => {
    if (aiBusy) return;
    if (!hasAiAccess) {
      setShowApiKeyModal(true);
      return;
    }
    if (!config) return;
    if (!activeSupportsStructured()) {
      setAiMsg({
        tone: "error",
        text: isKO
          ? "현재 설정에서는 구조화 제안을 사용할 수 없습니다. 연결 키나 실행 경로를 확인해 주세요."
          : "The current Noa mode does not support structured suggestions. Check a supported engine or connection key.",
      });
      return;
    }
    if (!config.synopsis?.trim()) {
      setAiMsg({
        tone: "error",
        text: isKO
          ? "먼저 세계관 탭에서 시놉시스를 적어 주세요."
          : "Please write the synopsis first (World tab).",
      });
      return;
    }

    setAiBusy(true);
    setAiMsg(null);
    try {
      const generated = await generateCharacters(config, language, 4);
      if (generated.length === 0) {
        setAiMsg({
          tone: "info",
          text: isKO
            ? "제안 결과가 비어 있습니다. 설정을 조금 더 채운 뒤 다시 시도해 주세요."
            : "Generation returned no characters. Please try again.",
        });
        return;
      }
      // 이름 기준 dedupe — 기존 인물 + 이번 배치 내부 중복 모두 제거.
      const seen = new Set(
        characters.map((c) => c.name.trim().toLowerCase()).filter(Boolean),
      );
      const fresh = generated.filter((c) => {
        const key = c.name.trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (fresh.length === 0) {
        setAiMsg({
          tone: "info",
          text: isKO
            ? "새 인물이 없습니다 — 생성 결과가 모두 기존 인물과 중복입니다."
            : "No new characters — all results duplicate existing names.",
        });
        return;
      }
      setConfig((prev) => {
        // updater 내부에서도 prev 기준 재검사 (저장 경합 방어).
        const existing = new Set(
          (prev.characters ?? []).map((c) => c.name.trim().toLowerCase()),
        );
        const toAdd = fresh.filter((c) => !existing.has(c.name.trim().toLowerCase()));
        return { ...prev, characters: [...(prev.characters ?? []), ...toAdd] };
      });
      setSelId(fresh[0].id);
      setEditing(false);
      closeRailIfSheet();
      // [s82] 노아 제안 결과 append = 작가가 버튼으로 트리거·결과 수용 → AI_SUGGESTION 귀속
      // (작가 1.0 오귀속 금지). updater 내부 재검사로 일부가 걸러질 수 있는 미세 race 는
      // best-effort 로 수용 (fresh 기준 기록 — 과대 기록 가능성 낮음·문서화).
      const cl = getCreativeLogger();
      for (const c of fresh) {
        fireCpLog(
          cl?.logAcceptAI({
            targetType: "character",
            targetId: c.id,
            afterContent: JSON.stringify(c),
            provider: "gemini",
            decisionContext: {
              selectedAlternativeId: c.id,
              selectedLabel: c.name || "캐릭터 제안",
              selectedContent: JSON.stringify(c),
              reason: "작가가 작품 캐릭터 후보로 적합하다고 판단해 추가함",
            },
            stage: "character",
          }),
        );
      }
      markExplicitCreativeLog("character");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      logger.warn("TabCharacter", "generateCharacters failed", detail);
      setAiMsg({
        tone: "error",
        text: `${isKO ? "캐릭터 생성 실패" : "Character generation failed"}${detail ? `: ${detail}` : ""}`,
      });
    } finally {
      setAiBusy(false);
    }
  };

  const { dockContext, dockExtract, dockQuickExtract } = useCharacterDock({
    active,
    characters,
    items,
    isItems,
    setConfig,
    onSelectCharacter: setSelId,
    onEditingChange: setEditing,
  });

  // ---- 빈 상태: 세션 없음 ----
  if (!currentSession) {
    return <EmptyProjectState isKO={isKO} onCreate={() => createNewSession("characters")} />;
  }

  // active 의 관계 — charRelations 에서 이 인물이 from 인 항목, 상대 이름 해석.
  const activeRels: Array<{ id: string; name: string; kind: string }> = active
    ? relations
        .filter((r) => r.from === active.id)
        .map((r) => {
          const other = characters.find((c) => c.id === r.to);
          return {
            id: r.to,
            name: other?.name ?? r.to,
            kind: r.desc?.trim() || REL_LABELS[r.type] || r.type,
          };
        })
    : [];
  const visibleImportCandidates = isItems ? itemCandidates : characterCandidates;

  return (
    // [Z2a-chatcanvas] 접이식 노아 채팅 도크 — 기본 접힘 (프로필 작업 무방해),
    // 열면 좌측 1/3 채팅 + 캔버스 축소. 접힘 상태 noa-lg-chatdock 영속.
    <ChatCanvasDock
      tabKey="character"
      roleMode="캐릭터 설계 어시스턴트"
      proposalGuide={DOCK_PROPOSAL_GUIDE}
      contextBlock={dockContext}
      extractSuggestions={dockExtract}
      extractQuickSuggestions={dockQuickExtract}
      quickSuggestionTitle={isItems ? "아이템 대화 메모 후보" : "캐릭터 대화 메모 후보"}
      placeholder="인물의 욕망과 결핍을 잡아볼까요"
    >
    <div className="ch-grid ch-main-grid">
      <CharacterRail
        railOpen={railOpen}
        isRailSheet={isRailSheet}
        isItems={isItems}
        charView={charView}
        characters={characters}
        activeId={active?.id ?? null}
        povCharacter={config?.povCharacter}
        relationCount={relations.length}
        itemCount={items.length}
        skillCount={config?.skills?.length ?? 0}
        magicSystemCount={config?.magicSystems?.length ?? 0}
        aiBusy={aiBusy}
        aiMsg={aiMsg}
        onToggleRail={toggleRail}
        onCloseRailIfSheet={closeRailIfSheet}
        onSetSubTab={setCharSubTab}
        onSetCharView={setCharView}
        onAdd={handleAdd}
        onAiGenerate={handleAiGenerate}
        onSelectCharacter={(id) => {
          setSelId(id);
          setEditing(false);
          closeRailIfSheet();
        }}
      />

      {/* ---- 중앙: 프로필 또는 아이템 스튜디오 ---- */}
      <section className="ch-center">
        <ImportCandidatesSection
          isItems={isItems}
          candidates={visibleImportCandidates}
          onAccept={(candidate) =>
            isItems
              ? routeItemImportCandidate(candidate)
              : routeCharacterImportCandidate(candidate)
          }
          onHold={(candidate) =>
            markImportCandidate(
              candidate.id,
              isItems ? "item-held" : "character-held",
              isItems ? "items:held" : "characters:held",
            )
          }
          onDiscard={(candidate) =>
            markImportCandidate(
              candidate.id,
              isItems ? "item-discarded" : "character-discarded",
              isItems ? "items:discarded" : "characters:discarded",
            )
          }
        />
        {isItems ? (
          // 기존 검증 컴포넌트 재사용 — 옛 CharacterTab 과 동일 props 경로
          // (language·currentSession.config·setConfig → IndexedDB+Firestore 영속).
          config ? (
            <ItemStudioView language={language} config={config} setConfig={setConfig} />
          ) : null
        ) : charView === "graph" ? (
          // [X1-xyflow] 관계도 서브뷰 — 보조 뷰 (기본 프로필 뷰는 그대로 유지)
          characters.length === 0 ? (
            <div className="ch-fill-center">
              <div className="ch-none">인물이 없습니다. “새 인물”을 추가하면 관계도가 표시됩니다.</div>
            </div>
          ) : (
            <div className="ch-graph-view">
              <div>
                <div className="ch-sec-h">관계도</div>
                <div className="ch-none ch-graph-note">
                  {graphEdges.length === 0
                    ? "등록된 관계가 없어 인물 노드만 표시합니다. 노드 드래그 위치는 자동 저장, 클릭 시 프로필로 이동합니다."
                    : "노드 드래그 위치는 자동 저장, 노드 클릭 시 해당 인물 프로필로 이동합니다."}
                </div>
              </div>
              <RelationGraph
                nodes={graphNodes}
                edges={graphEdges}
                ariaLabel="캐릭터 관계도 그래프"
                height={520}
                draggable
                onNodeClick={handleGraphNodeClick}
                onNodeDragStop={handleGraphDragStop}
              />
            </div>
          )
        ) : !active ? (
          <div className="ch-fill-center">
            <div className="ch-none">인물을 선택하거나 “새 인물”을 추가하세요.</div>
          </div>
        ) : (
          <CharacterProfileView
            active={active}
            activeIndex={activeIndex}
            povCharacter={config?.povCharacter}
            editing={editing}
            activeRels={activeRels}
            onEdit={() => setEditing(true)}
            onDelete={() => handleDelete(active.id)}
            onSave={handleSave}
            onCancelEdit={() => setEditing(false)}
          />
        )}
      </section>
    </div>
    </ChatCanvasDock>
  );
}
