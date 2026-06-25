"use client";

/* ===========================================================
   TabWorld — 세계관 3-pane 조립.
   레일/중앙 채팅/보드는 별도 컴포넌트로 분리하고, 이 파일은 상태 배선,
   창작 과정 기록, 17개 세계관 필드 저장 연결만 담당한다.
   =========================================================== */

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useStudio } from "@/app/studio/StudioContext";
import type {
  AcceptedImportCandidateRecord,
  StoryConfig,
} from "@/lib/studio-types";
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";
import { L4 } from "@/lib/i18n";
import type { WorldOpsView } from "@/components/loreguard/WorldOpsPanel";
import {
  WORLD_BOARD_KEY,
  WORLD_FIELDS,
  WORLD_RAIL_KEY,
  WORLD_SECTIONS_KEY,
  buildWorldChatDrafts,
  fieldValue,
  makeChatDraftEvidence,
  makeCandidateEvidence,
  makeNoaEvidence,
  readCollapsedTiers,
  readWorldNarrowLayout,
  readWorldPanelOpen,
  useWorldPanelSheet,
  worldImportCandidates,
  writeWorldPanelOpen,
  type CollapsedTiers,
  type WorldChatDraft,
  type WorldChatDraftSource,
  type WorldFieldKey,
} from "./TabWorld.parts";
import TabWorldBoardStage from "./TabWorldBoardStage";
import TabWorldChatPanel from "./TabWorldChatPanel";
import TabWorldEmptyLayout from "./TabWorldEmptyLayout";
import TabWorldRailPanel from "./TabWorldRailPanel";

// [Z2b] 세계관 도구 slide-over — 진입 시에만 번들 로드 (WorldMap/WorldTimeline 포함).
const WorldOpsPanel = dynamic(() => import("@/components/loreguard/WorldOpsPanel"), {
  ssr: false,
});

// ============================================================
// PART 0.5 — [s82-stage-coverage] 창작 과정 기록 (TabWriting S2 패턴 축약)
// ============================================================
// window.__creativeLogger (StudioShell mount·creative-logger-global.d.ts typed).
// fire-and-forget — adopt 경로를 await/gate 하지 않음. 실패(부재·reject·null
// resolve = 기록 미수행) → noa:alert 1회·60s 쿨다운 (silent failure 금지).

let cpAlertAt = 0;
function surfaceCpLogFailure(): void {
  const now = Date.now();
  if (now - cpAlertAt < 60_000) return;
  cpAlertAt = now;
  try {
    window.dispatchEvent(
      new CustomEvent("noa:alert", {
        detail: { message: "창작 과정 기록 실패 — 확인서 정확도에 영향", variant: "warning" },
      }),
    );
  } catch { /* noop */ }
}
function fireCpLog(p: Promise<string | null> | null | undefined): void {
  if (!p) { surfaceCpLogFailure(); return; }
  p.then((id) => { if (id === null) surfaceCpLogFailure(); }).catch(() => surfaceCpLogFailure());
}
const getCreativeLogger = () =>
  typeof window !== "undefined" ? window.__creativeLogger ?? null : null;

// ============================================================
// PART 4 — 셸 (3-pane 조립 + 실 엔진 배선)
// ============================================================

export default function TabWorld() {
  const {
    currentSession,
    setConfig,
    filteredMessages,
    isGenerating,
    handleSend,
    handleCancel,
    input,
    setInput,
    createNewSession,
    versionedBackups,
    doRestoreVersionedBackup,
    refreshBackupList,
    language,
  } = useStudio();

  // 채택 대상 필드 (보드에서 클릭하여 선택) — 채택 시 이 필드에 병합.
  const [pickedField, setPickedField] = useState<WorldFieldKey>("corePremise");
  const [showVersions, setShowVersions] = useState(false);
  const [railOpen, setRailOpen] = useState(() => readWorldPanelOpen(WORLD_RAIL_KEY));
  const [boardOpen, setBoardOpen] = useState(() => readWorldPanelOpen(WORLD_BOARD_KEY));
  const [pinnedDrafts, setPinnedDrafts] = useState<WorldChatDraft[]>([]);
  const isSheet = useWorldPanelSheet();

  // [Z2b] 세계관 도구 slide-over — null = 닫힘. key 로 재오픈 시 초기 뷰 재시드.
  const [opsView, setOpsView] = useState<WorldOpsView | null>(null);

  // [G3-world-structure-fields] tier 섹션 접힘 상태 — noa-lg-world-sections 영속.
  const [collapsedTiers, setCollapsedTiers] = useState<CollapsedTiers>(readCollapsedTiers);
  useEffect(() => {
    try {
      window.localStorage.setItem(WORLD_SECTIONS_KEY, JSON.stringify(collapsedTiers));
    } catch { /* noop — 저장 불가(프라이빗 모드 등) 시 세션 내 상태만 유지 */ }
  }, [collapsedTiers]);
  const toggleTier = useCallback((tier: 1 | 2 | 3) => {
    setCollapsedTiers((prev) => ({ ...prev, [tier]: !prev[tier] }));
  }, []);

  const toggleRail = useCallback(() => {
    setRailOpen((prev) => {
      const next = !prev;
      writeWorldPanelOpen(WORLD_RAIL_KEY, next);
      if (next && readWorldNarrowLayout()) {
        setBoardOpen(false);
        writeWorldPanelOpen(WORLD_BOARD_KEY, false);
      }
      return next;
    });
  }, []);

  const toggleBoard = useCallback(() => {
    setBoardOpen((prev) => {
      const next = !prev;
      writeWorldPanelOpen(WORLD_BOARD_KEY, next);
      if (next && readWorldNarrowLayout()) {
        setRailOpen(false);
        writeWorldPanelOpen(WORLD_RAIL_KEY, false);
      }
      return next;
    });
  }, []);

  const closeRailIfSheet = useCallback(() => {
    if (!isSheet) return;
    setRailOpen(false);
    writeWorldPanelOpen(WORLD_RAIL_KEY, false);
  }, [isSheet]);

  const closeBoardIfSheet = useCallback(() => {
    if (!isSheet) return;
    setBoardOpen(false);
    writeWorldPanelOpen(WORLD_BOARD_KEY, false);
  }, [isSheet]);

  // config 는 currentSession?.config (StudioContext 직접 필드 아님).
  const cfg: StoryConfig | null = currentSession?.config ?? null;

  // 완성도 — 실제 채워진 필드 수 / WORLD_FIELDS.length(17) (가짜 메트릭 제거).
  const filledCount = useMemo(
    () => WORLD_FIELDS.filter((f) => fieldValue(cfg, f.key).length > 0).length,
    [cfg],
  );
  const completeness = Math.round((filledCount / WORLD_FIELDS.length) * 100);

  const pickedDef = WORLD_FIELDS.find((f) => f.key === pickedField) ?? WORLD_FIELDS[0];
  const pendingImportCandidates = useMemo(() => worldImportCandidates(cfg), [cfg]);
  const liveDraftSources = useMemo<WorldChatDraftSource[]>(() => {
    const messageSources = filteredMessages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
    }));
    const liveInput = input.trim();
    return liveInput
      ? [...messageSources, { id: "live-input", role: "user", content: liveInput, live: true }]
      : messageSources;
  }, [filteredMessages, input]);
  const chatDrafts = useMemo(() => {
    const liveDrafts = buildWorldChatDrafts(liveDraftSources, pickedField);
    const byId = new Map<string, WorldChatDraft>();
    for (const draft of [...liveDrafts, ...pinnedDrafts]) {
      byId.set(draft.id, draft);
    }
    return Array.from(byId.values()).filter((draft) => {
      const existing = fieldValue(cfg, draft.fieldKey);
      return !existing.includes(draft.excerpt);
    });
  }, [cfg, liveDraftSources, pickedField, pinnedDrafts]);
  const worldMissingCount = Math.max(0, WORLD_FIELDS.length - filledCount);
  const worldRailSummary = [
    {
      label: L4(language, { ko: "도구", en: "Tools", ja: "道具", zh: "工具" }),
      value: String(doRestoreVersionedBackup ? 5 : 4),
      tone: "blue",
    },
    {
      label: L4(language, { ko: "자료", en: "Files", ja: "資料", zh: "资料" }),
      value: String(pendingImportCandidates.length),
      tone: pendingImportCandidates.length > 0 ? "blue" : "gray",
    },
  ] as const;
  const worldBoardSummary = [
    {
      label: L4(language, { ko: "완성", en: "Done", ja: "完成", zh: "完成" }),
      value: `${completeness}%`,
      tone: completeness >= 70 ? "green" : completeness > 0 ? "blue" : "gray",
    },
    {
      label: L4(language, { ko: "미입력", en: "Open", ja: "未入力", zh: "待填" }),
      value: String(worldMissingCount),
      tone: worldMissingCount === 0 ? "green" : "amber",
    },
  ] as const;

  const submit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    // 세계관 디렉티브 — 실 엔진 스트리밍. handleSend 가 input 을 읽고 비운다.
    handleSend(`[세계관 설계] ${trimmed}`);
  }, [input, isGenerating, handleSend]);

  // 채택 — 노아 메시지 본문을 선택된 세계관 필드에 병합 후 영구 저장.
  const adopt = useCallback(
    (content: string) => {
      if (!cfg) return;
      const clean = content.trim();
      if (!clean) return;
      const evidence = makeNoaEvidence(pickedField);
      setConfig((prev) => {
        const existing = typeof prev[pickedField] === "string" ? (prev[pickedField] as string).trim() : "";
        const merged = existing ? `${existing}\n\n${clean}` : clean;
        return {
          ...prev,
          [pickedField]: merged,
          worldFieldEvidence: {
            ...(prev.worldFieldEvidence ?? {}),
            [pickedField]: evidence,
          },
        };
      });
      // [s82] 노아 채택 = ENGINE_SUGGEST 귀속 (작가 1.0 오귀속 금지). merged 값은
      // cfg 스냅샷 기준 재계산 (updater 의 prev 와 미세 race 가능 — hash 기록용 best-effort).
      // stage 정보는 logAcceptAI 시그니처에 extra 필드가 없어 targetType 'world' +
      // targetId(필드 key)로 전달 (note 는 logger 가 자체 생성 — 정직 한계).
      const existingCfg = fieldValue(cfg, pickedField);
      const mergedForLog = existingCfg ? `${existingCfg}\n\n${clean}` : clean;
      fireCpLog(
        getCreativeLogger()?.logAcceptAI({
          targetType: "world",
          targetId: pickedField,
          beforeContent: existingCfg,
          afterContent: mergedForLog,
          decisionContext: {
            selectedAlternativeId: `world:${pickedField}`,
            selectedLabel: pickedDef.title,
            selectedContent: clean,
            reason: "작가가 선택한 세계관 항목에 맞는 제안으로 판단해 반영함",
          },
          stage: "world",
        }),
      );
      markExplicitCreativeLog("world");
    },
    [cfg, pickedDef.title, pickedField, setConfig],
  );

  const applyImportCandidate = useCallback(
    (candidate: AcceptedImportCandidateRecord) => {
      const clean = (candidate.text || candidate.excerpt || "").trim();
      if (!clean) return;
      const evidence = makeCandidateEvidence(candidate, pickedField);
      setConfig((prev) => {
        const existing = typeof prev[pickedField] === "string" ? (prev[pickedField] as string).trim() : "";
        const merged = existing ? `${existing}\n\n${clean}` : clean;
        return {
          ...prev,
          [pickedField]: merged,
          acceptedImportCandidates: (prev.acceptedImportCandidates ?? []).map((entry) =>
            entry.id === candidate.id
              ? {
                  ...entry,
                  routedToStage: "world",
                  routedTargetKey: pickedField,
                  routedAt: new Date().toISOString(),
                }
              : entry,
          ),
          worldFieldEvidence: {
            ...(prev.worldFieldEvidence ?? {}),
            [pickedField]: evidence,
          },
        };
      });
      markExplicitCreativeLog("world");
      closeBoardIfSheet();
    },
    [closeBoardIfSheet, pickedField, setConfig],
  );

  const pinChatDraft = useCallback((draft: WorldChatDraft) => {
    setPinnedDrafts((prev) => {
      if (prev.some((item) => item.id === draft.id)) return prev;
      return [{ ...draft, pinned: true }, ...prev].slice(0, 8);
    });
  }, []);

  const applyChatDraft = useCallback(
    (draft: WorldChatDraft) => {
      const clean = draft.excerpt.trim();
      if (!clean) return;
      const evidence = makeChatDraftEvidence(draft);
      setConfig((prev) => {
        const existing = typeof prev[draft.fieldKey] === "string" ? (prev[draft.fieldKey] as string).trim() : "";
        const merged = existing ? `${existing}\n\n${clean}` : clean;
        return {
          ...prev,
          [draft.fieldKey]: merged,
          worldFieldEvidence: {
            ...(prev.worldFieldEvidence ?? {}),
            [draft.fieldKey]: evidence,
          },
        };
      });
      setPinnedDrafts((prev) => prev.filter((item) => item.id !== draft.id));
      markExplicitCreativeLog("world");
      closeBoardIfSheet();
    },
    [closeBoardIfSheet, setConfig],
  );

  const handleNewWorld = useCallback(() => createNewSession("world"), [createNewSession]);

  const openVersions = useCallback(() => {
    refreshBackupList?.();
    setShowVersions((s) => !s);
  }, [refreshBackupList]);
  const openVersionsFromRail = useCallback(() => {
    openVersions();
    closeRailIfSheet();
  }, [closeRailIfSheet, openVersions]);
  const openWorldOps = useCallback((view: WorldOpsView) => {
    setOpsView(view);
    closeRailIfSheet();
  }, [closeRailIfSheet]);

  // [F2] 버전 복원 — 기존 fire-and-forget(무피드백)을 비차단 noa:toast 피드백으로.
  // ToastHost(LoreguardStudio 마운트)가 수신. 실패·reject 모두 비침묵 (silent failure 금지).
  const restoreVersion = useCallback(
    (timestamp: number) => {
      if (!doRestoreVersionedBackup) return;
      const toast = (ok: boolean) => {
        window.dispatchEvent(
          new CustomEvent("noa:toast", {
            detail: ok
              ? {
                  message: L4(language, {
                    ko: "백업이 복원되었습니다",
                    en: "Backup restored",
                    ja: "バックアップを復元しました",
                    zh: "已恢复备份",
                  }),
                  variant: "success",
                }
              : {
                  message: L4(language, {
                    ko: "백업 복원에 실패했습니다",
                    en: "Backup restore failed",
                    ja: "バックアップの復元に失敗しました",
                    zh: "备份恢复失败",
                  }),
                  variant: "error",
                },
          }),
        );
      };
      doRestoreVersionedBackup(timestamp)
        .then((ok) => toast(ok !== false))
        .catch(() => toast(false));
    },
    [doRestoreVersionedBackup, language],
  );

  // 빈 상태 — currentSession 없음.
  if (!currentSession) {
    return (
      <TabWorldEmptyLayout
        railOpen={railOpen}
        boardOpen={boardOpen}
        isSheet={isSheet}
        worldRailSummary={worldRailSummary}
        worldBoardSummary={worldBoardSummary}
        language={language}
        showVersions={showVersions}
        canRestoreVersion={Boolean(doRestoreVersionedBackup)}
        onToggleRail={toggleRail}
        onToggleBoard={toggleBoard}
        onNewWorld={handleNewWorld}
        onOpenVersions={openVersionsFromRail}
        onOpenOps={openWorldOps}
      />
    );
  }

  const backups = versionedBackups ?? [];

  return (
    <div className="wd-grid wd-world-grid">
      {/* 좌 96px 레일 — 실 동작 도구만 (세팅동기화 dead 버튼 제거) */}
      <TabWorldRailPanel
        open={railOpen}
        isSheet={isSheet}
        summary={worldRailSummary}
        language={language}
        showVersions={showVersions}
        canRestoreVersion={Boolean(doRestoreVersionedBackup)}
        showAdvancedTools={true}
        onToggle={toggleRail}
        onNewWorld={handleNewWorld}
        onOpenVersions={openVersionsFromRail}
        onOpenOps={openWorldOps}
      />

      <TabWorldChatPanel
        isGenerating={isGenerating}
        showVersions={showVersions}
        backups={backups}
        canRestoreVersion={Boolean(doRestoreVersionedBackup)}
        completeness={completeness}
        filledCount={filledCount}
        worldMissingCount={worldMissingCount}
        pickedFieldTitle={pickedDef.title}
        filteredMessages={filteredMessages}
        input={input}
        setInput={setInput}
        openVersions={openVersions}
        restoreVersion={restoreVersion}
        adopt={adopt}
        submit={submit}
        handleCancel={handleCancel}
      />

      <TabWorldBoardStage
        open={boardOpen}
        isSheet={isSheet}
        cfg={cfg}
        pickedField={pickedField}
        pickedDef={pickedDef}
        filledCount={filledCount}
        completeness={completeness}
        collapsedTiers={collapsedTiers}
        pendingImportCandidates={pendingImportCandidates}
        chatDrafts={chatDrafts}
        summary={worldBoardSummary}
        onCollapse={toggleBoard}
        onToggleTier={toggleTier}
        onPickField={(key) => {
          setPickedField(key);
          closeBoardIfSheet();
        }}
        onApplyImportCandidate={applyImportCandidate}
        onPinChatDraft={pinChatDraft}
        onApplyChatDraft={applyChatDraft}
      />

      {/* [Z2b] 세계관 도구 slide-over — fixed overlay (wd-grid 레이아웃 비간섭) */}
      {opsView !== null && (
        <WorldOpsPanel
          key={opsView}
          initialView={opsView}
          onClose={() => setOpsView(null)}
        />
      )}
    </div>
  );
}
