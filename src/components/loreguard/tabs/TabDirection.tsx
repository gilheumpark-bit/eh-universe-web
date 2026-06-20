"use client";

/* ===========================================================
   TabDirection — 연출 (Direction) tab — Phase 3 (REAL WIRING)
   Source DOM: /tmp/design2_handoff/2/project/tab_direction.jsx

   3-pane (dr-grid): 92px 좌측 내비(에피소드 선택) /
   샷(=씬) 테이블 + 프레임 스트립 센터 / 336px 우측 검수 패널.
   프로토타입 DOM·클래스·픽셀 그대로 유지 (loreguard.css dr-* 스코프).

   데이터 (REAL): config.episodeSceneSheets[현재 화].scenes (EpisodeSceneEntry[]).
   각 "샷" = 1 scene. 모든 쓰기는 setConfig → upsertSheet/removeSheet 헬퍼를
   거쳐 IndexedDB + Firestore 에 영속화된다 (로컬 useState 데이터 보관 금지).

   제거됨 (엔진 부재 → 날조 금지): 검수상태(rev)·길이(len)·star·하단 카운트·
   진행률 도넛·statpills·각본 완성도%·카메라 감정 분포(EMO)·SFX/BGM 오디오·
   위험 슬라이더. 해당 필드/엔진이 코드베이스에 없으므로 정직하게 삭제.

   노아 연출 제안 (direction-ai): 기존 /api/structured-generate 라우트 재사용
   (useTranslation.scoreTranslation·publish-audit.runAIAudit 와 동일 패턴 —
   신규 엔진 X). hasAiAccess 게이트 → 미보유 시 setShowApiKeyModal(true).
   제안 채택은 기존 writeScenes/handleConfirm 경로 + blankEntry suffix 로직.

   [direction-registry] system prompt 는 writing-agent-registry 의 선등록
   'studio-direction' 에이전트 경유 (no-yap-json·ip-brand-guard 가드 자동 주입).
   /api/structured-generate 는 순수 passthrough (서버측 가드 X) — 가드·맥락은
   클라이언트에서 prompt = system + user 합성으로만 주입된다 (complete/route.ts 의
   레지스트리 호출 패턴과 동일). 응답 스키마·파서는 기존 그대로 (무회귀).

   아이콘: @/components/loreguard/icons (lucide re-export). CSS 미추가.
   default export, props 없음.
   =========================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Film, Layers, Plus } from "@/components/loreguard/icons";
import { DirectionNav } from "./TabDirectionNav";
import { useStudio } from "@/app/studio/StudioContext";
import CandidateDecisionCard from "@/components/loreguard/CandidateDecisionCard";
import { useLoreguardTab } from "@/components/loreguard/LoreguardTabContext";
import ChatCanvasDock, {
  extractJsonBlocks,
  type DockSuggestion,
} from "@/components/loreguard/ChatCanvasDock";
import { useLongArcVerifier } from "@/hooks/useLongArcVerifier";
import { getActiveProvider, getApiKey } from "@/lib/ai-providers";
import { lazyFirebaseAuth } from "@/lib/firebase";
import type {
  AcceptedImportCandidateRecord,
  EpisodeManuscript,
  EpisodeSceneEntry,
  EpisodeSceneSheet,
  SceneProductionDirection,
  StoryConfig,
} from "@/lib/studio-types";
import { buildAgentSystemPrompt } from "@/lib/ai/writing-agent-registry";
import { buildNoaSystemHeader } from "@/lib/ai/noa-identity";
import { checkBlockedJson } from "@/lib/noa/block-notice";
import { checkPaywallJson } from "@/lib/noa/paywall-notice";
import {
  findSheet,
  listSheetsSorted,
  upsertSheet,
} from "@/lib/scene-sheet/helpers";
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";
import {
  DirectionCenter,
  DirectionPanel,
  ProductionDirectionCard,
} from "./TabDirection.sections";
import {
  DIRECTION_AI_SCHEMA,
  DIRECTION_NAV_KEY,
  DIRECTION_PANEL_KEY,
  DIRECTION_SCHEMA_OVERRIDE,
  DOCK_PROPOSAL_GUIDE,
  type DirectionAiSuggestion,
  type ProductionDirectionFieldKey,
  appendImportedNotes,
  buildCharacterDnaBlock,
  buildDirectionPrompt,
  buildProductionDirectionFromCandidate,
  buildSceneSheetBlock,
  buildStorySummaryBlock,
  candidateMeta,
  candidateNotices,
  candidateSubtitle,
  cleanImportedDirectionTitle,
  fireCpLog,
  getCreativeLogger,
  parseDirectionSuggestions,
  parseImportedSceneRows,
  readDirectionPanelOpen,
  useDirectionPanelSheet,
  writeDirectionPanelOpen,
} from "./TabDirection.shared";
// ============================================================
// PART 6 — 루트 (세션/씬시트 read + setConfig 영속 CRUD)
// ============================================================
// IDENTITY_SEAL: PART-6 | role=root | inputs=useStudio | outputs=JSX

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
  // 좌측 내비로 선택한 에피소드 (없으면 config.episode).
  const [navEpisode, setNavEpisode] = useState<number | null>(null);
  const [navOpen, setNavOpen] = useState(() => readDirectionPanelOpen(DIRECTION_NAV_KEY));
  const [panelOpen, setPanelOpen] = useState(() => readDirectionPanelOpen(DIRECTION_PANEL_KEY));
  const isPanelSheet = useDirectionPanelSheet();

  // ---- 노아 연출 제안 상태 (PART 1.5) — 실 로딩/에러, 채택 전 제안은 영속 X ----
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<DirectionAiSuggestion[]>([]);
  const aiAbortRef = useRef<AbortController | null>(null);

  // 언마운트 시 진행 중 요청 중단 (fetch cleanup).
  useEffect(() => {
    return () => {
      aiAbortRef.current?.abort();
    };
  }, []);

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

  // ---- [Z1c-mid-ports] 장편 아크 점검 — 기존 useLongArcVerifier 재사용 ----
  // autoTrigger:false = 검수 패널 버튼으로만 실행 (탭 진입만으로 5축 계산 X).
  // config null 이면 hook 내부 [C] 가드로 refresh no-op (빈 입력 안전).
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

  // ---- 빈 상태: 세션 없음 ----
  if (!config) {
    return (
      <div className="dr-grid">
        <section className="dr-center" style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", color: "var(--ink-2)" }}>
            <Film size={40} style={{ color: "var(--ink-3)", marginBottom: "14px" }} />
            <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "6px" }}>
              {isSceneSurface
                ? isKO
                  ? "씬시트를 작성할 작품이 없습니다"
                  : "No project for a scene sheet"
                : isKO
                  ? "연출할 작품이 없습니다"
                  : "No project to direct"}
            </div>
            <div style={{ fontSize: "13px", color: "var(--ink-3)", marginBottom: "18px" }}>
              {isSceneSurface
                ? isKO
                  ? "먼저 새 작품을 만들면 회차별 씬시트를 작성할 수 있습니다."
                  : "Create a project first to build per-episode scene sheets."
                : isKO
                  ? "먼저 새 작품을 만들면 회차별 씬 연출 시트를 작성할 수 있습니다."
                  : "Create a project first to build per-episode scene direction sheets."}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, width: "min(560px, 100%)", margin: "0 auto 18px", textAlign: "left" }}>
              {[
                isKO ? ["장면 목적", "각 씬이 공개할 정보와 감정 변화를 남깁니다."] : ["Scene purpose", "Track what each scene reveals and changes."],
                isKO ? ["연출 기준", "시점, 리듬, 분위기를 회차별로 정리합니다."] : ["Direction guide", "Organize POV, rhythm, and mood by episode."],
                isKO ? ["장편 점검", "누락된 복선과 긴 호흡의 균열을 확인합니다."] : ["Long-form check", "Review missing setup and long-arc cracks."],
              ].map(([title, body]) => (
                <article key={title} className="pcard" style={{ padding: 12 }}>
                  <div style={{ color: "var(--ink-1)", fontSize: 12.5, fontWeight: 800 }}>{title}</div>
                  <div style={{ color: "var(--ink-3)", fontSize: 11.5, lineHeight: 1.5, marginTop: 4 }}>{body}</div>
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

  const sheets = listSheetsSorted(config);
  const episode = navEpisode ?? config.episode ?? 1;
  const sheet = findSheet(config, episode);
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
  const pendingSceneImportCandidates = (config.acceptedImportCandidates ?? []).filter(
    (candidate) => candidate.bucket === "scenes" && !candidate.routedAt,
  );
  const pendingDirectionImportCandidates = (config.acceptedImportCandidates ?? []).filter(
    (candidate) => candidate.bucket === "direction" && !candidate.routedAt,
  );

  const blankEntry = (): EpisodeSceneEntry => {
    // 충돌 없는 sceneId — 현재 회차 씬들의 최대 suffix + 1 (중간 삭제 후에도 재사용 없음).
    let maxSuffix = 0;
    for (const s of scenes) {
      const m = /-(\d+)$/.exec(s.sceneId);
      if (m) maxSuffix = Math.max(maxSuffix, parseInt(m[1], 10));
    }
    return {
      sceneId: `${episode}-${maxSuffix + 1}`,
      sceneName: "",
      characters: "",
      tone: "긴장",
      summary: "",
      purpose: "",
      conflict: "",
      publicInfo: "",
      hiddenInfo: "",
      emotionCurve: "",
      rewardBeat: "",
      hookPoint: "",
      keyDialogue: "",
      emotionPoint: "",
      nextScene: "",
    };
  };

  // ---- 영속 CRUD: 모든 변경은 setConfig → upsertSheet (IndexedDB + Firestore) ----
  const writeScenes = (next: EpisodeSceneEntry[]) => {
    setConfig((prev: StoryConfig) => {
      const existing = findSheet(prev, episode);
      const merged: EpisodeSceneSheet = {
        episode,
        title: existing?.title ?? prev.title ?? `${episode}화`,
        arc: existing?.arc,
        characters: existing?.characters,
        scenes: next,
        directionSnapshot: existing?.directionSnapshot,
        presetUsed: existing?.presetUsed,
        lastUpdate: Date.now(),
      };
      return upsertSheet(prev, merged);
    });
  };

  const markImportCandidate = (
    id: string,
    routedToStage: string,
    routedTargetKey: string,
  ) => {
    setConfig((prev: StoryConfig) => ({
      ...prev,
      acceptedImportCandidates: (prev.acceptedImportCandidates ?? []).map((candidate) =>
        candidate.id === id
          ? {
              ...candidate,
              routedToStage,
              routedTargetKey,
              routedAt: new Date().toISOString(),
            }
          : candidate,
      ),
    }));
  };

  const routeSceneImportCandidate = (candidate: AcceptedImportCandidateRecord) => {
    setConfig((prev: StoryConfig) => {
      const existing = findSheet(prev, episode);
      const existingScenes = existing?.scenes ?? [];
      const importedScenes = parseImportedSceneRows(candidate, episode, existingScenes.length);
      const mergedSheet: EpisodeSceneSheet = {
        episode,
        title: existing?.title ?? prev.title ?? `${episode}화`,
        arc: existing?.arc,
        characters: existing?.characters,
        scenes: [...existingScenes, ...importedScenes],
        directionSnapshot: existing?.directionSnapshot,
        presetUsed: existing?.presetUsed,
        lastUpdate: Date.now(),
      };
      const routedTargetKey = `episode:${episode}:scenes:${importedScenes
        .map((scene) => scene.sceneId)
        .join(",")}`;
      return {
        ...upsertSheet(prev, mergedSheet),
        acceptedImportCandidates: (prev.acceptedImportCandidates ?? []).map((entry) =>
          entry.id === candidate.id
            ? {
                ...entry,
                routedToStage: "scene-sheet",
                routedTargetKey,
                routedAt: new Date().toISOString(),
              }
            : entry,
        ),
      };
    });
  };

  const routeDirectionImportCandidate = (candidate: AcceptedImportCandidateRecord) => {
    setConfig((prev: StoryConfig) => {
      const existing = findSheet(prev, episode);
      const writerNotes = appendImportedNotes(prev.sceneDirection?.writerNotes, candidate);
      const snapshotWriterNotes = appendImportedNotes(existing?.directionSnapshot?.writerNotes, candidate);
      const productionDirection = buildProductionDirectionFromCandidate(
        candidate,
        prev.sceneDirection?.productionDirection ?? existing?.directionSnapshot?.productionDirection,
      );
      const mergedSheet: EpisodeSceneSheet = {
        episode,
        title: existing?.title ?? prev.title ?? `${episode}화`,
        arc: existing?.arc,
        characters: existing?.characters,
        scenes: existing?.scenes ?? [],
        directionSnapshot: {
          ...(existing?.directionSnapshot ?? {}),
          productionDirection,
          writerNotes: snapshotWriterNotes,
        },
        presetUsed: existing?.presetUsed,
        lastUpdate: Date.now(),
      };
      return {
        ...upsertSheet(
          {
            ...prev,
            sceneDirection: {
              ...(prev.sceneDirection ?? {}),
              productionDirection,
              writerNotes,
            },
          },
          mergedSheet,
        ),
        acceptedImportCandidates: (prev.acceptedImportCandidates ?? []).map((entry) =>
          entry.id === candidate.id
            ? {
                ...entry,
                routedToStage: "direction",
                routedTargetKey: `episode:${episode}:directionSnapshot:writerNotes`,
                routedAt: new Date().toISOString(),
              }
            : entry,
        ),
      };
    });
  };

  const updateProductionDirection = (key: ProductionDirectionFieldKey, value: string) => {
    setConfig((prev: StoryConfig) => {
      const existing = findSheet(prev, episode);
      const productionDirection: SceneProductionDirection = {
        ...(prev.sceneDirection?.productionDirection ?? existing?.directionSnapshot?.productionDirection ?? {}),
        [key]: value,
        updatedAt: Date.now(),
      };
      const mergedSheet: EpisodeSceneSheet = {
        episode,
        title: existing?.title ?? prev.title ?? `${episode}화`,
        arc: existing?.arc,
        characters: existing?.characters,
        scenes: existing?.scenes ?? [],
        directionSnapshot: {
          ...(existing?.directionSnapshot ?? {}),
          productionDirection,
        },
        presetUsed: existing?.presetUsed,
        lastUpdate: Date.now(),
      };
      return upsertSheet(
        {
          ...prev,
          sceneDirection: {
            ...(prev.sceneDirection ?? {}),
            productionDirection,
          },
        },
        mergedSheet,
      );
    });
  };

  // [s82] opts.suppressLog — AI 채택 경로(adoptSuggestion)가 동일 confirm 을 재사용하므로
  // 그 경로에서는 작가 기록을 막고 logAcceptAI 만 찍는다 (이중 카운트·오귀속 동시 차단).
  const handleConfirm = (entry: EpisodeSceneEntry, opts?: { suppressLog?: boolean }) => {
    const before = scenes.find((s) => s.sceneId === entry.sceneId);
    const next = before
      ? scenes.map((s) => (s.sceneId === entry.sceneId ? entry : s))
      : [...scenes, entry];
    writeScenes(next);
    setEditingId(null);
    setSel(entry.sceneId);
    if (!opts?.suppressLog) {
      fireCpLog(
        getCreativeLogger()?.logHumanEdit({
          targetType: "scene",
          targetId: entry.sceneId,
          episodeId: episode,
          beforeContent: before ? JSON.stringify(before) : undefined,
          afterContent: JSON.stringify(entry),
          note: "scene-direction confirm (TabDirection)",
          stage: "direction",
        }),
      );
      markExplicitCreativeLog("scene");
    }
  };

  const handleDelete = (id: string) => {
    writeScenes(scenes.filter((s) => s.sceneId !== id));
    if (sel === id) setSel("");
    if (editingId === id) setEditingId(null);
  };

  const handlePickEpisode = (ep: number) => {
    setNavEpisode(ep);
    setSel("");
    setEditingId(null);
    closeNavIfSheet();
    // 제안은 화 단위 컨텍스트 — 화 전환 시 폐기 + 진행 중 요청 중단.
    aiAbortRef.current?.abort();
    setAiSuggestions([]);
    setAiError(null);
    setAiLoading(false);
  };

  // ---- 노아 연출 제안 — 기존 /api/structured-generate 엔진 재사용 (신규 엔진 X) ----
  const handleAiSuggest = async () => {
    if (aiLoading) return;
    if (!hasAiAccess) {
      setShowApiKeyModal(true);
      return;
    }
    aiAbortRef.current?.abort();
    const ctrl = new AbortController();
    aiAbortRef.current = ctrl;
    setAiLoading(true);
    setAiError(null);
    try {
      const provider = getActiveProvider();
      const apiKey = getApiKey(provider);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      // 호스팅 크레딧 사용자 (직접 연결 키 없음) — Firebase JWT 첨부 (ai-providers streamViaProxy 와 동일 패턴).
      try {
        const auth = await lazyFirebaseAuth();
        const u = auth?.currentUser;
        if (u) headers.Authorization = `Bearer ${await u.getIdToken()}`;
      } catch {
        /* 직접 연결 키 흐름은 토큰 없이도 동작 */
      }
      // [direction-registry] system = 선등록 studio-direction 에이전트 (가드
      // no-yap-json·ip-brand-guard 자동 주입). 라우트는 passthrough 이므로 가드는
      // 여기(클라이언트)서 prompt 에 합성하는 것이 유일한 주입 지점.
      // contextBlocks 는 실데이터 보유분만 — 빈 블록은 빌더가 조용히 스킵.
      const system = buildAgentSystemPrompt(
        "studio-direction",
        {
          "scene-sheet": buildSceneSheetBlock(sheet),
          "character-dna": buildCharacterDnaBlock(config.characters),
          "story-summary": buildStorySummaryBlock(config),
          extraDirectives: DIRECTION_SCHEMA_OVERRIDE,
        },
        { autoTrim: true },
      );
      const res = await fetch("/api/structured-generate", {
        method: "POST",
        headers,
        signal: ctrl.signal,
        body: JSON.stringify({
          provider,
          // [N1-noa-identity] 노아 헤더 → registry system → user 블록 순 (additive — 기존 합성 유지).
          prompt: `${buildNoaSystemHeader(isSceneSurface ? "씬시트 설계자" : "씬 연출 디자이너(콘티 제안가)")}\n\n${system}\n\n${buildDirectionPrompt(config, episode, episodeTitle, scenes)}`,
          schema: DIRECTION_AI_SCHEMA,
          apiKey: apiKey || undefined,
          fallback: { suggestions: [] },
        }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const paywallMsg = checkPaywallJson(data);
        if (paywallMsg) throw new Error(paywallMsg);
        const serverError = (data as { error?: unknown } | null)?.error;
        throw new Error(
          typeof serverError === "string" ? serverError : `요청 실패 (HTTP ${res.status})`,
        );
      }
      // [N4] 차단 계약 {blocked, reason, gradeRequired} → toast 고지 + 인라인 에러 표시
      const blockedMsg = checkBlockedJson(data, "direction-ai");
      if (blockedMsg) throw new Error(blockedMsg);
      const items = parseDirectionSuggestions(data);
      if (items.length === 0) {
        throw new Error("유효한 연출 제안이 반환되지 않았습니다. 다시 시도해 주세요.");
      }
      setAiSuggestions(items);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setAiError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (aiAbortRef.current === ctrl) setAiLoading(false);
    }
  };

  /** 채택 — blankEntry 의 충돌 없는 sceneId + 기존 handleConfirm(writeScenes) 경로로 영속. */
  const adoptSuggestion = (sugg: DirectionAiSuggestion) => {
    const entry: EpisodeSceneEntry = {
      ...blankEntry(),
      sceneName: sugg.sceneName,
      tone: sugg.tone,
      summary: sugg.summary,
      purpose: sugg.summary,
      conflict: "",
      publicInfo: sugg.sceneName,
      hiddenInfo: "",
      emotionCurve: sugg.emotionPoint,
      rewardBeat: "",
      hookPoint: sugg.keyDialogue || sugg.emotionPoint,
      keyDialogue: sugg.keyDialogue,
      emotionPoint: sugg.emotionPoint,
    };
    handleConfirm(entry, { suppressLog: true });
    setAiSuggestions((prev) => prev.filter((x) => x !== sugg));
    // [s82] 노아 연출 채택 = AI_SUGGESTION 귀속 (suppressLog 로 작가 기록 차단 후 단독 기록)
    fireCpLog(
      getCreativeLogger()?.logAcceptAI({
        targetType: "scene",
        targetId: entry.sceneId,
        episodeId: episode,
        afterContent: JSON.stringify(entry),
        stage: "direction",
      }),
    );
    markExplicitCreativeLog("scene");
  };

  const dismissAi = () => {
    aiAbortRef.current?.abort();
    setAiSuggestions([]);
    setAiError(null);
    setAiLoading(false);
  };

  // ---- [Z2a-chatcanvas] 채팅 도크 배선 (감지 = parseDirectionSuggestions 재사용 /
  // 적용 = adoptSuggestion 기존 blankEntry+handleConfirm+cpLog 경로 — 신규 엔진 0).
  // 주: 본 컴포넌트는 early return 뒤 plain const 패턴 (hook 추가 없이 동일 유지).
  const dockExtract = (content: string): DockSuggestion[] => {
    const out: DockSuggestion[] = [];
    for (const block of extractJsonBlocks(content)) {
      for (const sugg of parseDirectionSuggestions(block)) {
        const key = `shot-${sugg.sceneName}`;
        if (out.some((o) => o.key === key)) continue;
        out.push({ key, label: `씬 채택: ${sugg.sceneName}`, apply: () => adoptSuggestion(sugg) });
        if (out.length >= 6) return out;
      }
    }
    return out;
  };

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
      <div style={{ display: "grid", gap: 10, margin: "0 0 12px" }}>
        {showSceneImportCandidates && pendingSceneImportCandidates.length > 0 ? (
          <section className="pcard" aria-label="씬시트 읽은 자료 검토">
            <div className="pcard-h">
              <Layers size={15} />
              씬시트 읽은 자료 검토 {pendingSceneImportCandidates.length}건
            </div>
            <div style={{ display: "grid", gap: 8 }}>
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
            <div style={{ display: "grid", gap: 8 }}>
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
