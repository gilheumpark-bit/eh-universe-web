"use client";

/* ===========================================================
   TabWorld — 세계관 (Worldbuilding) tab — Phase 3 (real wiring)
   Source: /tmp/design2_handoff/2/project/tab_world.jsx (window.TabWorld)

   3-pane (.wd-grid):
     좌 96px 레일(.wd-rail)  — 새 세계관 / 버전 비교 도구 (real handlers)
     중앙 노아 설정 가이드(.wd-center) — filteredMessages 실시간 + handleSend 입력바
     우 408px 보드(.wd-board) — 17개 3-tier 세계관 필드 카드 (StoryConfig)
       [G3-world-structure-fields] 구 셸 AdvancedPlanningSection 의 3-tier 구조 필드
       전체 복원 (economy·survivalEnvironment·education·dailyLife·travelComm·
       truthVsBeliefs 6개 추가 — config 키 동일 = 기존 사용자 데이터 호환).
       tier 별 접이식 섹션 — 접힘 상태 localStorage `noa-lg-world-sections` 영속.

   배선:
     - 세계관 카드 → StoryConfig 17 필드 (corePremise … truthVsBeliefs). 채움/미채움
       상태 + 완성도 %는 실제 config 값에서 계산 (가짜 "항목 23개" 제거).
     - 채팅 입력 → setInput + handleSend (실 엔진 스트리밍).
     - 채택 → setConfig 로 해당 필드에 노아 메시지 본문 병합 (IndexedDB+Firestore 저장).
     - 새 세계관 → createNewSession('world').
     - 버전 비교 → versionedBackups / doRestoreVersionedBackup.
     - currentSession 없음 → 빈 상태(프로젝트 생성) 렌더, 크래시 X.

   CSS: 전부 src/app/loreguard.css 에 .eh-app 스코프로 포팅됨 (신규 CSS 금지).
   아이콘: @/components/loreguard/icons (lucide re-export, strokeWidth prop).

   [Z2b-world-sim-timeline 2026-06-11] 좌 레일에 시뮬레이션/타임라인/지도
   3 도구 추가 — WorldOpsPanel slide-over 오픈 (MemoPanel 패턴·dynamic
   ssr:false — 진입 시에만 번들 로드). (a) 시뮬레이션 = 기존 structured
   world-sim 경로(generateWorldSim → task:'worldSim') 재사용·판단용 라벨,
   (b) 타임라인 = config.worldTimeline additive CRUD + 구 셸 WorldTimeline
   (worldSimData 시대 기반) 이식 마운트, (c) 지도 = 구 셸 WorldMap 실존
   확인 → 이식 (territories/territoryLinks 키 호환). 세션 없으면 도구
   미노출 (빈 상태 레일은 '새 세계관'만 유지).
   =========================================================== */

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Globe,
  Clock,
  Plus,
  Scale,
  Play,
  Check,
  X,
  Send,
  Chevron,
  ChevronR,
  ChevronL,
  Sync,
  Map,
} from "@/components/loreguard/icons";
import { useStudio } from "@/app/studio/StudioContext";
import type {
  AcceptedImportCandidateRecord,
  StoryConfig,
} from "@/lib/studio-types";
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";
import { L4 } from "@/lib/i18n";
import type { WorldOpsView } from "@/components/loreguard/WorldOpsPanel";
import {
  BoardCard,
  TIER_LABEL,
  TIER_TONE,
  WORLD_BOARD_KEY,
  WORLD_FIELDS,
  WORLD_RAIL_KEY,
  WORLD_SECTIONS_KEY,
  WORLD_TIERS,
  WorldEmptyState,
  WorldImportCandidateCard,
  fieldValue,
  makeCandidateEvidence,
  makeNoaEvidence,
  readCollapsedTiers,
  readWorldNarrowLayout,
  readWorldPanelOpen,
  useWorldPanelSheet,
  worldImportCandidates,
  writeWorldPanelOpen,
  type CollapsedTiers,
  type WorldFieldKey,
} from "./TabWorld.parts";

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
          afterContent: mergedForLog,
          stage: "world",
        }),
      );
      markExplicitCreativeLog("world");
    },
    [cfg, pickedField, setConfig],
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

  const handleNewWorld = useCallback(() => createNewSession("world"), [createNewSession]);

  const openVersions = useCallback(() => {
    refreshBackupList?.();
    setShowVersions((s) => !s);
  }, [refreshBackupList]);

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
      <div className="wd-grid wd-world-grid">
        {!railOpen ? (
          <aside className="wd-rail collapsed" id="lg-world-rail" aria-label="세계관 도구 레일 (접힘)">
            <button
              type="button"
              className="wd-panel-toggle"
              aria-expanded={false}
              aria-controls="lg-world-rail"
              aria-label="세계관 도구 레일 펼치기"
              title="세계관 도구 레일 펼치기"
              onClick={toggleRail}
            >
              <ChevronR size={16} strokeWidth={1.6} aria-hidden="true" />
            </button>
            <span className="wd-vlabel" aria-hidden="true">세계관 도구</span>
          </aside>
        ) : (
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
              onClick={toggleRail}
            >
              <ChevronL size={16} strokeWidth={1.6} aria-hidden="true" />
            </button>
            <button type="button" className="wd-tool" onClick={handleNewWorld}>
              <span className="wd-tool-ic"><Plus size={20} /></span>
              <span>새 세계관</span>
            </button>
          </aside>
        )}
        <WorldEmptyState onCreate={handleNewWorld} />
        {!boardOpen ? (
          <aside className="wd-board collapsed" id="lg-world-board" aria-label="세계관 보드 (접힘)">
            <button
              type="button"
              className="wd-panel-toggle"
              aria-expanded={false}
              aria-controls="lg-world-board"
              aria-label="세계관 보드 펼치기"
              title="세계관 보드 펼치기"
              onClick={toggleBoard}
            >
              <ChevronL size={16} strokeWidth={1.6} aria-hidden="true" />
            </button>
            <span className="wd-vlabel" aria-hidden="true">세계관 보드</span>
          </aside>
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
                onClick={toggleBoard}
              >
                <ChevronR size={16} strokeWidth={1.6} aria-hidden="true" />
              </button>
            </div>
          </aside>
        )}
      </div>
    );
  }

  const backups = versionedBackups ?? [];

  return (
    <div className="wd-grid wd-world-grid">
      {/* 좌 96px 레일 — 실 동작 도구만 (세팅동기화 dead 버튼 제거) */}
      {!railOpen ? (
        <aside className="wd-rail collapsed" id="lg-world-rail" aria-label="세계관 도구 레일 (접힘)">
          <button
            type="button"
            className="wd-panel-toggle"
            aria-expanded={false}
            aria-controls="lg-world-rail"
            aria-label="세계관 도구 레일 펼치기"
            title="세계관 도구 레일 펼치기"
            onClick={toggleRail}
          >
            <ChevronR size={16} strokeWidth={1.6} aria-hidden="true" />
          </button>
          <span className="wd-vlabel" aria-hidden="true">세계관 도구</span>
        </aside>
      ) : (
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
          onClick={toggleRail}
        >
          <ChevronL size={16} strokeWidth={1.6} aria-hidden="true" />
        </button>
        <button type="button" className="wd-tool" onClick={handleNewWorld}>
          <span className="wd-tool-ic"><Plus size={20} /></span>
          <span>새 세계관</span>
        </button>
        {doRestoreVersionedBackup ? (
          <button
            type="button"
            className="wd-tool"
            onClick={() => {
              openVersions();
              closeRailIfSheet();
            }}
            aria-pressed={showVersions}
          >
            <span className="wd-tool-ic"><Scale size={20} /></span>
            <span>버전 비교</span>
          </button>
        ) : null}
        {/* [Z2b] 세계관 도구 — 시뮬레이션/타임라인/지도 slide-over */}
        <button
          type="button"
          className="wd-tool"
          aria-haspopup="dialog"
          onClick={() => {
            setOpsView("sim");
            closeRailIfSheet();
          }}
        >
          <span className="wd-tool-ic"><Play size={20} /></span>
          <span>{L4(language, { ko: "시뮬레이션", en: "Simulate", ja: "シミュレーション", zh: "模拟" })}</span>
        </button>
        <button
          type="button"
          className="wd-tool"
          aria-haspopup="dialog"
          onClick={() => {
            setOpsView("timeline");
            closeRailIfSheet();
          }}
        >
          <span className="wd-tool-ic"><Clock size={20} /></span>
          <span>{L4(language, { ko: "타임라인", en: "Timeline", ja: "タイムライン", zh: "时间线" })}</span>
        </button>
        <button
          type="button"
          className="wd-tool"
          aria-haspopup="dialog"
          onClick={() => {
            setOpsView("map");
            closeRailIfSheet();
          }}
        >
          <span className="wd-tool-ic"><Map size={20} /></span>
          <span>{L4(language, { ko: "지도", en: "Map", ja: "マップ", zh: "地图" })}</span>
        </button>
      </aside>
      )}

      {/* 중앙 노아 설정 가이드 — filteredMessages 실시간 + handleSend 입력 */}
      <section className="wd-center">
        <div className="wd-chat card">
          <div className="wd-chat-head">
            <div className="wd-chat-title">
              <Globe size={17} />
              세계관 모드
              <span className="wd-online">
                <span className={`rdot ${isGenerating ? "amber" : "green"}`} />
                {isGenerating ? "제안 준비 중…" : "노아 어시스턴트"}
              </span>
            </div>
            <button type="button" className="btn ghost" onClick={openVersions}>
              <Clock size={15} />
              버전 기록
            </button>
          </div>

          {showVersions ? (
            <div className="wd-chat-body">
              {backups.length === 0 ? (
                <p className="wd-p" style={{ color: "var(--ink-3)" }}>저장된 버전 백업이 없습니다.</p>
              ) : (
                backups.map((b) => (
                  <div key={b.timestamp} className="wd-card" style={{ marginBottom: 8 }}>
                    <div className="wd-card-ic" style={{ color: "var(--c-green)", background: "color-mix(in srgb, var(--c-green) 13%, transparent)" }}>
                      <Clock size={18} />
                    </div>
                    <div className="wd-card-body">
                      <div className="wd-card-top">
                        <span className="wd-card-title">{b.label}</span>
                      </div>
                      <div className="wd-card-meta">
                        <span>{new Date(b.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    {doRestoreVersionedBackup ? (
                      <button
                        type="button"
                        className="btn"
                        style={{ alignSelf: "center" }}
                        onClick={() => restoreVersion(b.timestamp)}
                      >
                        <Sync size={14} />복원
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="wd-chat-body">
              {filteredMessages.length === 0 ? (
                <div className="wd-msg ai">
                  <div className="wd-ai-av">EH</div>
                  <div className="wd-ai-body">
                    <div className="wd-bubble ai">
                      <p className="wd-p">
                        세계관을 함께 설계해 봅시다. 마법 체계의 제약, 권력 구조, 역사 등
                        궁금한 것을 입력하면 제안을 드립니다. 마음에 드는 답변은
                        오른쪽 보드의 항목을 고른 뒤 <b>채택</b>으로 저장할 수 있어요.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                filteredMessages.map((msg) =>
                  msg.role === "user" ? (
                    <div key={msg.id} className="wd-msg user">
                      <div className="wd-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="wd-bubble user">{msg.content}</div>
                    </div>
                  ) : (
                    <div key={msg.id} className="wd-msg ai">
                      <div className="wd-ai-av">EH</div>
                      <div className="wd-ai-body">
                        <div className="wd-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="wd-bubble ai">
                          <p className="wd-p" style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
                          <div className="wd-msg-actions">
                            <button
                              type="button"
                              className="wd-mact"
                              aria-label={`'${pickedDef.title}' 항목에 채택`}
                              title={`'${pickedDef.title}' 항목에 채택`}
                              onClick={() => adopt(msg.content)}
                            >
                              <Check size={15} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          )}

          {/* 입력바 — setInput + handleSend (dead 첨부/음성/AI보강 버튼 제거) */}
          <div className="wd-input">
            <input
              className="wd-in-field"
              placeholder={`'${pickedDef.title}' 항목을 설계할 지시를 입력하세요…`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              disabled={isGenerating}
            />
            {isGenerating ? (
              <button
                type="button"
                className="wd-in-send"
                aria-label="생성 중지"
                title="생성 중지"
                onClick={handleCancel}
              >
                <X size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="wd-in-send"
                aria-label="전송"
                onClick={submit}
                disabled={!input.trim()}
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 우 408px 보드 — 17개 세계관 필드 (tier 접이식 섹션) + 실제 완성도 */}
      {!boardOpen ? (
        <aside className="wd-board collapsed" id="lg-world-board" aria-label="세계관 보드 (접힘)">
          <button
            type="button"
            className="wd-panel-toggle"
            aria-expanded={false}
            aria-controls="lg-world-board"
            aria-label="세계관 보드 펼치기"
            title="세계관 보드 펼치기"
            onClick={toggleBoard}
          >
            <ChevronL size={16} strokeWidth={1.6} aria-hidden="true" />
          </button>
          <span className="wd-vlabel" aria-hidden="true">세계관 보드</span>
        </aside>
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
            onClick={toggleBoard}
          >
            <ChevronR size={16} strokeWidth={1.6} aria-hidden="true" />
          </button>
        </div>
        <div className="wd-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
          <div className="wd-card-top">
            <span className="wd-card-title">세계관 완성도</span>
            <span className="pill blue" style={{ marginLeft: "auto" }}>
              {filledCount} / {WORLD_FIELDS.length} 작성됨
            </span>
          </div>
          <div className="tbar">
            <span style={{ width: `${completeness}%` }} />
          </div>
          <div className="wd-card-meta">
            <span>완성도 {completeness}%</span>
          </div>
        </div>
        {pendingImportCandidates.length > 0 ? (
          <section aria-label="세계관 읽은 자료 검토" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="wd-board-head" style={{ minHeight: 0 }}>
              <span>읽은 자료 검토</span>
              <span className="pill blue">{pendingImportCandidates.length}</span>
            </div>
            {pendingImportCandidates.map((candidate) => (
              <WorldImportCandidateCard
                key={candidate.id}
                candidate={candidate}
                pickedDef={pickedDef}
                onApply={applyImportCandidate}
              />
            ))}
          </section>
        ) : null}
        {/* [G3-world-structure-fields] tier 별 접이식 섹션 — noa-lg-world-sections 영속 */}
        {WORLD_TIERS.map((tier) => {
          const fields = WORLD_FIELDS.filter((f) => f.tier === tier);
          const tierFilled = fields.filter((f) => fieldValue(cfg, f.key).length > 0).length;
          const collapsed = collapsedTiers[tier];
          const sectionId = `wd-tier-section-${tier}`;
          return (
            <section
              key={tier}
              aria-label={TIER_LABEL[tier]}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <button
                type="button"
                className="wd-card"
                style={{ padding: "10px 15px", alignItems: "center", textAlign: "left" }}
                aria-expanded={!collapsed}
                aria-controls={sectionId}
                onClick={() => toggleTier(tier)}
                title={collapsed ? `${TIER_LABEL[tier]} 섹션 펼치기` : `${TIER_LABEL[tier]} 섹션 접기`}
              >
                <span className={`pill ${TIER_TONE[tier]}`}>{TIER_LABEL[tier]}</span>
                <span className="wd-card-meta" style={{ marginLeft: "auto" }}>
                  {tierFilled} / {fields.length} 작성됨
                </span>
                <Chevron
                  size={16}
                  aria-hidden="true"
                  style={{
                    color: "var(--ink-3)",
                    transition: "transform .16s var(--ease)",
                    transform: collapsed ? "rotate(-90deg)" : "none",
                  }}
                />
              </button>
              {!collapsed && (
                <div id={sectionId} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {fields.map((def) => (
                    <BoardCard
                      key={def.key}
                      def={def}
                      value={fieldValue(cfg, def.key)}
                      evidence={cfg?.worldFieldEvidence?.[def.key]}
                      picked={pickedField === def.key}
                      onPick={(key) => {
                        setPickedField(key);
                        closeBoardIfSheet();
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </aside>
      )}

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
