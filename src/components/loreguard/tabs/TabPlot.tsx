"use client";

/* ===========================================================
   TabPlot — 플롯 (Plot) tab
   Source: /tmp/design2_handoff/2/project/tab_plot.jsx (window.TabPlot)
   Pixel-faithful port: pl-grid (232px 개요 레일 / 비트 보드+페이즈 리본+
   타임라인 센터). 모든 className 은 loreguard.css 의 .eh-app .pl-* 스코프와
   일치. 아이콘은 @/components/loreguard/icons.

   [WIRED 2026-06-10] 프로토타입 mock(COLS/CHECK/STATS) 제거. 비트 보드는
   실제 스토어 `config.episodeSceneSheets[]` 에 연결. 추가/이름변경/삭제는
   setConfig 로 IndexedDB+Firestore 영속. 리스트/그리드·확장은 로컬 UI 상태.
   엔진이 없는 수치(긴장도 %·모순 N건·일관성 점수·진행률 85%·플롯/점검
   리포트)는 날조 금지 원칙에 따라 제거.

   [NOA 2026-06-10] 노아 비트 제안 — 기존 범용 구조화 라우트
   /api/structured-generate 재사용 (useTranslation.ts 채점과 동일 패턴:
   provider/apiKey = @/lib/ai-providers, BYOK 없으면 Firebase Bearer =
   ai-providers.ts streamViaProxy 패턴). 채택 시 addBeat 와 동일한
   setConfig append 경로로 episodeSceneSheets upsert (동일 제목 = 갱신).
   contract: default export, props 없음, CSS prefix `pl-`.

   [X1-xyflow 2026-06-11] "비트 흐름" 토글 — episodeSceneSheets 비트를
   좌→우(에피소드 오름차순) xyflow 그래프로 표시. 에피소드 컬럼 아래에 해당
   장면(scenes) 노드 그룹. 레이아웃은 단순 columnar 자동 계산(dagre 미사용·
   드래그 영속 없음), 노드 클릭 = 흐름 뷰 종료 + 해당 비트 펼침(포커스).
   그래프는 보조 뷰 — 기본 비트 보드 유지, RelationGraph 는 dynamic(ssr:false).
   =========================================================== */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import LoadingSkeleton from "@/components/studio/LoadingSkeleton";
import {
  Layers,
  List,
  Branch,
  Chevron,
  Grid,
  Expand,
  Wand,
  Plus,
} from "@/components/loreguard/icons";
import { useStudio } from "@/app/studio/StudioContext";
// [Z2a-chatcanvas 2026-06-11] 접이식 노아 채팅 도크 — 기본 접힘, 채택은 기존
// adoptSuggestion(BEAT_SUGGEST 파서) 경로 재사용 (기존 AI 제안 버튼과 트리거 분리).
import ChatCanvasDock, {
  extractJsonBlocks,
  type DockSuggestion,
} from "@/components/loreguard/ChatCanvasDock";
import CandidateDecisionCard from "@/components/loreguard/CandidateDecisionCard";
import { getActiveProvider, getApiKey } from "@/lib/ai-providers";
import { getCachedResponse, cacheResponse } from "@/lib/browser/ai-cache";
// [N4 — 2026-06-11] 서버 게이트 차단 응답 고지 (noa:toast + 인라인 에러) — 사일런트 차단 금지
import { checkBlockedJson } from "@/lib/noa/block-notice";
import { checkPaywallJson } from "@/lib/noa/paywall-notice";
import type {
  AcceptedImportCandidateRecord,
  EpisodeSceneSheet,
  MainScenarioStructure,
  StoryConfig,
} from "@/lib/studio-types";
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";
import { BeatCard, ScenarioStructurePanel } from "./TabPlot.cards";
import { fireCpLog, getCreativeLogger } from "./TabPlot.creative-log";
import { readPlotPanelOpen, usePlotPanelSheet, writePlotPanelOpen } from "./TabPlot.rail-state";
import { PlotEmptyState, PlotRail } from "./TabPlot.sections";
import { usePlotFlowGraph } from "./TabPlot.flow";
import {
  BEAT_CACHE_MODEL,
  BEAT_SUGGEST_SCHEMA,
  type BeatSuggestion,
  DOCK_PROPOSAL_GUIDE,
  PHASES,
  TL_BARS,
  beatCacheMessages,
  buildAiHeaders,
  buildBeatPrompt,
  buildScenarioStructureFromImport,
  candidateMeta,
  candidateNotices,
  candidateSubtitle,
  cleanImportedMainScenarioTitle,
  genSheetId,
  mainScenarioImportCandidates,
  normalizeMainScenarioStructure,
  parseBeatSuggestions,
  parseImportedMainScenarioRows,
} from "./TabPlot.shared";

// [X1-xyflow] 비트 흐름 그래프 — xyflow 래퍼는 토글 진입 시에만 로드 (ssr:false).
const RelationGraph = dynamic(() => import("@/components/loreguard/RelationGraph"), {
  ssr: false,
  loading: () => <LoadingSkeleton height={440} />,
});

// ============================================================
// PART 3 — 본체: 개요 레일 / 비트 보드 센터
// ============================================================

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

  const [view, setView] = useState<"list" | "grid">("list");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  // [X1-xyflow] 비트 흐름 그래프 토글 — 보조 뷰 (기본 = 비트 보드)
  const [flowView, setFlowView] = useState(false);
  const [railOpen, setRailOpen] = useState(readPlotPanelOpen);
  const isRailSheet = usePlotPanelSheet();

  // ----- 노아 비트 제안 상태 -----
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<BeatSuggestion[]>([]);
  // [D-ai-cache] 직전 제안이 로컬 캐시 히트였는지 — 실제 히트 시에만 true (표기 날조 금지)
  const [aiFromCache, setAiFromCache] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // 언마운트 시 진행 중 요청 중단 (setState-after-unmount 방지)
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

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

  // [W2-plot #9] 비트별 안정 고유 React key 산출.
  //  1) sheet.id 존재 → 그대로 사용 (신규 비트·adopt·마이그레이션 완료분 — 항상 고유·안정).
  //  2) 구 데이터(id 없음) → episode 기준 fallback key. ref 캐시라 재렌더·확장 토글에도
  //     같은 비트는 동일 key 유지(React reconciliation 안정 → 편집/삭제 교차적용 차단).
  //  3) episode 가 (버그 #9 의 잔존 데이터처럼) 중복돼도 key 는 절대 충돌하지 않도록,
  //     동일 key 가 이미 쓰였으면 suffix 를 붙여 고유성을 보장한다 (correctness 우선).
  // 영속 write 는 렌더에서 강제하지 않는다(부수효과 금지). 신규 비트는 addBeat/adopt 가
  // 실제 id 를 영속하므로, 사용자가 만지는 비트는 자연히 stable id 로 수렴한다.
  // 주의: 이 파일은 icons 모듈의 `Map` 컴포넌트를 import 하므로 전역 Map 이 가려진다.
  // → 캐시는 plain object(Record) 로 둔다(전역 Map 생성자 미사용).
  const legacyKeyRef = useRef<Record<number, string>>({});
  const sheetKeys = useMemo<string[]>(() => {
    const cache = legacyKeyRef.current;
    const used = new Set<string>();
    return sheets.map((sheet) => {
      let key: string;
      if (sheet.id) {
        key = sheet.id;
      } else {
        let base = cache[sheet.episode];
        if (!base) {
          base = `legacy-${sheet.episode}-${genSheetId()}`;
          cache[sheet.episode] = base;
        }
        key = base;
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

  const toggleExpand = useCallback((episode: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(episode)) next.delete(episode);
      else next.add(episode);
      return next;
    });
  }, []);

  const markImportCandidate = useCallback(
    (id: string, routedToStage: string, routedTargetKey: string) => {
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
    },
    [setConfig],
  );

  const routeMainScenarioImportCandidate = useCallback(
    (candidate: AcceptedImportCandidateRecord) => {
      let routedTargetKey = "episodeSceneSheets:";
      setConfig((prev: StoryConfig) => {
        const list = prev.episodeSceneSheets ?? [];
        const rows = parseImportedMainScenarioRows(candidate, list);
        const byEpisode: Record<number, EpisodeSceneSheet> = {};
        for (const sheet of list) byEpisode[sheet.episode] = sheet;
        for (const row of rows) {
          const existing = byEpisode[row.episode];
          byEpisode[row.episode] = {
            ...existing,
            ...row,
            id: existing?.id ?? row.id,
            lastUpdate: Date.now(),
          };
        }
        const nextSheets = Object.values(byEpisode).sort((a, b) => a.episode - b.episode);
        routedTargetKey = `episodeSceneSheets:${rows.map((row) => row.episode).join(",")}`;
        return {
          ...prev,
          episodeSceneSheets: nextSheets,
          mainScenarioStructure: buildScenarioStructureFromImport(candidate, rows, prev.mainScenarioStructure),
          acceptedImportCandidates: (prev.acceptedImportCandidates ?? []).map((entry) =>
            entry.id === candidate.id
              ? {
                  ...entry,
                  routedToStage: "plot",
                  routedTargetKey,
                  routedAt: new Date().toISOString(),
                }
              : entry,
          ),
        };
      });
      fireCpLog(
        getCreativeLogger()?.logHumanEdit({
          targetType: "scene",
          targetId: routedTargetKey,
          afterContent: candidate.excerpt || candidate.text,
          note: "import-main-scenario-adopt (TabPlot)",
          stage: "plot",
        }),
      );
      markExplicitCreativeLog("scene");
      closeRailIfSheet();
    },
    [closeRailIfSheet, setConfig],
  );

  // 비트 추가 — episodeSceneSheets 에 새 시트 append (영속)
  // [W2-plot #9] 충돌 방어: nextEp 는 prev(최신 commit) 기준 단조 증가로 산출하되,
  // 동일 episode 가 이미 있으면(빠른 2회 클릭·stale 데이터) 빈 슬롯까지 bump 해
  // episode 중복 생성을 차단한다(upsert/skip). stable id 는 그와 독립적으로 항상 부여
  // → React key 충돌·편집/삭제 교차적용을 이중으로 막는다.
  const addBeat = useCallback(() => {
    setConfig((prev) => {
      const list = prev.episodeSceneSheets ?? [];
      const taken = new Set(list.map((s) => s.episode));
      let nextEp = list.reduce((max, s) => Math.max(max, s.episode), 0) + 1;
      // 단조 산출이 정상이라면 1회로 끝나지만, 중복 잔존 데이터 방어로 빈 슬롯 보장.
      while (taken.has(nextEp)) nextEp += 1;
      const sheet: EpisodeSceneSheet = {
        id: genSheetId(),
        episode: nextEp,
        title: `새 비트 ${nextEp}`,
        lastUpdate: Date.now(),
      };
      return { ...prev, episodeSceneSheets: [...list, sheet] };
    });
    // [s82] 비트 추가 = 작가 신규 생성. nextEp 는 sheets 스냅샷 기준 재계산 (best-effort).
    const nextEp = sheets.reduce((max, s) => Math.max(max, s.episode), 0) + 1;
    fireCpLog(
      getCreativeLogger()?.logHumanEdit({
        targetType: "scene",
        targetId: `beat-${nextEp}`,
        episodeId: nextEp,
        afterContent: `새 비트 ${nextEp}`,
        note: "beat-add (TabPlot)",
        stage: "plot",
      }),
    );
    markExplicitCreativeLog("scene");
  }, [setConfig, sheets]);

  // 비트 이름 변경 (영속)
  const renameBeat = useCallback(
    (episode: number, title: string) => {
      setConfig((prev) => {
        const list = prev.episodeSceneSheets ?? [];
        return {
          ...prev,
          episodeSceneSheets: list.map((s) =>
            s.episode === episode ? { ...s, title, lastUpdate: Date.now() } : s,
          ),
        };
      });
      // [s82] 이름 변경 = HUMAN_REVISION (before=구 제목)
      const old = sheets.find((s) => s.episode === episode);
      fireCpLog(
        getCreativeLogger()?.logHumanEdit({
          targetType: "scene",
          targetId: `beat-${episode}`,
          episodeId: episode,
          beforeContent: old?.title || "(unknown)",
          afterContent: title,
          note: "beat-rename (TabPlot)",
          stage: "plot",
        }),
      );
      markExplicitCreativeLog("scene");
    },
    [setConfig, sheets],
  );

  // 비트 삭제 (영속)
  const removeBeat = useCallback(
    (episode: number) => {
      setConfig((prev) => {
        const list = prev.episodeSceneSheets ?? [];
        return { ...prev, episodeSceneSheets: list.filter((s) => s.episode !== episode) };
      });
      // [s82] 삭제 — logger 에 delete 전용 메서드 없음 → HUMAN_REVISION + note 로 정직 기록
      const removed = sheets.find((s) => s.episode === episode);
      fireCpLog(
        getCreativeLogger()?.logHumanEdit({
          targetType: "scene",
          targetId: `beat-${episode}`,
          episodeId: episode,
          beforeContent: removed ? JSON.stringify(removed) : "(unknown)",
          afterContent: "",
          note: "beat-deleted (TabPlot)",
          stage: "plot",
        }),
      );
      markExplicitCreativeLog("scene");
    },
    [setConfig, sheets],
  );

  // ----- 노아 비트 제안 요청 (/api/structured-generate — 기존 범용 JSON 라우트) -----
  const suggestBeats = useCallback(async () => {
    if (aiBusy) return;
    // 접근 게이트 — 키/크레딧 없으면 silent failure 대신 연결 키 모달
    if (!hasAiAccess) {
      setShowApiKeyModal(true);
      return;
    }
    setAiBusy(true);
    setAiError(null);

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      const provider = getActiveProvider();
      const apiKey = getApiKey(provider);
      const prompt = buildBeatPrompt(config, sheets);

      // [D-ai-cache] 동일 prompt+schema 재요청 → 캐시 히트 시 네트워크 0회.
      // temperature=0 (구조화 JSON·ai-cache 캐시 조건 ≤0.5)·TTL 24h 은 ai-cache 설계 따름.
      // 비트/설정 변경 시 prompt 가 달라져 자연 무효화. 손상 캐시는 miss 취급.
      const cacheKey = beatCacheMessages(prompt);
      const cachedText = await getCachedResponse(provider, BEAT_CACHE_MODEL, cacheKey, 0);
      if (cachedText && abortRef.current === controller) {
        try {
          const cachedParsed = parseBeatSuggestions(JSON.parse(cachedText));
          if (cachedParsed.length > 0) {
            setAiSuggestions(cachedParsed);
            setAiFromCache(true);
            return; // finally 가 timeout/busy 정리
          }
        } catch {
          /* corrupt cache entry → 네트워크 경로로 진행 */
        }
      }

      const resp = await fetch("/api/structured-generate", {
        method: "POST",
        headers: await buildAiHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          provider,
          prompt,
          schema: BEAT_SUGGEST_SCHEMA,
          apiKey: apiKey || undefined,
          fallback: { beats: [] },
        }),
      });
      const data: unknown = await resp.json().catch(() => null);
      if (!resp.ok) {
        const paywallMsg = checkPaywallJson(data);
        if (paywallMsg) throw new Error(paywallMsg);
        const msg =
          data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : `요청 실패 (${resp.status})`;
        throw new Error(msg);
      }
      // [N4] 차단 계약 {blocked, reason, gradeRequired} → toast 고지 + 인라인 에러 표시
      const blockedMsg = checkBlockedJson(data, "plot-ai");
      if (blockedMsg) throw new Error(blockedMsg);
      const parsed = parseBeatSuggestions(data);
      if (parsed.length === 0) {
        throw new Error("제안을 준비하지 못했습니다. 다시 시도해 주세요.");
      }
      // [D-ai-cache] 파싱 검증을 통과한 응답만 저장 (실패/빈 응답 캐시 오염 방지).
      // fire-and-forget — 캐시 쓰기 실패는 비치명 (ai-cache 내부 try/catch).
      void cacheResponse(provider, BEAT_CACHE_MODEL, cacheKey, 0, JSON.stringify(data));
      if (abortRef.current === controller) {
        setAiSuggestions(parsed);
        setAiFromCache(false);
      }
    } catch (err: unknown) {
      // 언마운트로 인한 중단이면 상태 갱신 X
      if (abortRef.current !== controller) return;
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setAiError(
        aborted
          ? "요청 시간이 초과되었습니다. 잠시 뒤 다시 시도해 주세요."
          : err instanceof Error
            ? err.message
            : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      clearTimeout(timeout);
      if (abortRef.current === controller) {
        abortRef.current = null;
        setAiBusy(false);
      }
    }
  }, [aiBusy, hasAiAccess, setShowApiKeyModal, config, sheets]);

  // 제안 채택 — addBeat 와 동일한 setConfig 경로로 upsert (동일 제목 = 갱신)
  const adoptSuggestion = useCallback(
    (sg: BeatSuggestion) => {
      setConfig((prev) => {
        const list = prev.episodeSceneSheets ?? [];
        const title = sg.title.trim();
        const existing = list.find((s) => s.title.trim() === title);
        if (existing) {
          // upsert: 같은 제목 비트가 이미 있으면 요약(arc)만 갱신
          return {
            ...prev,
            episodeSceneSheets: list.map((s) =>
              s.episode === existing.episode
                ? { ...s, arc: sg.summary || s.arc, lastUpdate: Date.now() }
                : s,
            ),
          };
        }
        // [W2-plot #9] addBeat 와 동일 충돌 방어 — 빈 episode 슬롯 + stable id.
        const taken = new Set(list.map((s) => s.episode));
        let nextEp = list.reduce((max, s) => Math.max(max, s.episode), 0) + 1;
        while (taken.has(nextEp)) nextEp += 1;
        const sheet: EpisodeSceneSheet = {
          id: genSheetId(),
          episode: nextEp,
          title,
          arc: sg.summary || undefined,
          lastUpdate: Date.now(),
        };
        return { ...prev, episodeSceneSheets: [...list, sheet] };
      });
      setAiSuggestions((prev) => prev.filter((s) => s !== sg));
      // [s82] 노아 비트 채택 = AI_SUGGESTION 귀속 (작가 1.0 오귀속 금지)
      fireCpLog(
        getCreativeLogger()?.logAcceptAI({
          targetType: "scene",
          targetId: `beat-${sg.title.trim()}`,
          afterContent: `${sg.title}\n${sg.summary}`,
          stage: "plot",
        }),
      );
      markExplicitCreativeLog("scene");
    },
    [setConfig],
  );

  // 제안 무시 — 목록에서 제거 (로컬 UI 상태만)
  const ignoreSuggestion = useCallback((sg: BeatSuggestion) => {
    setAiSuggestions((prev) => prev.filter((s) => s !== sg));
  }, []);

  // ---- [Z2a-chatcanvas] 채팅 도크 배선 (감지 = parseBeatSuggestions 재사용 /
  // 적용 = adoptSuggestion 기존 upsert+cpLog 경로 — 신규 엔진 0) ----
  const dockExtract = useCallback(
    (content: string): DockSuggestion[] => {
      const out: DockSuggestion[] = [];
      for (const block of extractJsonBlocks(content)) {
        for (const sg of parseBeatSuggestions(block)) {
          const key = `beat-${sg.title}`;
          if (out.some((o) => o.key === key)) continue;
          out.push({ key, label: `비트 채택: ${sg.title}`, apply: () => adoptSuggestion(sg) });
          if (out.length >= 6) return out;
        }
      }
      return out;
    },
    [adoptSuggestion],
  );

  // 캔버스 현황 — 실데이터만 (buildBeatPrompt 의 보드 라인 압축판·상한 30)
  const dockContext = useMemo(() => {
    if (sheets.length === 0) return "현재 비트 보드: 비어 있음";
    const lines = sheets
      .slice(0, 30)
      .map((s) => `- ${s.episode}화: ${s.title}${s.arc ? ` — ${s.arc}` : ""}`);
    if (sheets.length > 30) lines.push(`(+${sheets.length - 30}개 생략)`);
    return `현재 비트 보드 (${sheets.length}개):\n${lines.join("\n")}`;
  }, [sheets]);

  const { flowNodes, flowEdges } = usePlotFlowGraph(sheets);

  // 노드 클릭 = 해당 비트 포커스 — 흐름 뷰 닫고 보드에서 그 비트 펼침.
  const focusBeat = useCallback((nodeId: string) => {
    const m = /^ep-(\d+)/.exec(nodeId);
    if (!m) return;
    const episode = Number(m[1]);
    setFlowView(false);
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(episode);
      return next;
    });
  }, []);

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
      <section className="pl-center" style={{ gridColumn: "2 / -1" }}>
        <div className="pl-top">
          <div>
            <div className="pl-title">
              <Branch size={19} style={{ color: "var(--primary)" }} />
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
            </div>
            <button
              type="button"
              className="eh-icbtn"
              aria-label={expanded.size === sheets.length && sheets.length > 0 ? "모두 접기" : "모두 펼치기"}
              title={expanded.size === sheets.length && sheets.length > 0 ? "모두 접기" : "모두 펼치기"}
              onClick={() =>
                setExpanded((prev) =>
                  prev.size === sheets.length ? new Set() : new Set(sheets.map((s) => s.episode)),
                )
              }
            >
              <Expand size={17} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="pl-ribbon">
          {PHASES.map((p) => (
            <div key={p.name} className="pl-phase" style={{ background: p.g }}>
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
          <section className="pcard" aria-label="메인 시나리오 읽은 자료 검토" style={{ marginBottom: 16 }}>
            <div className="pcard-h">
              <Layers size={15} />
              읽은 자료 검토 ({pendingMainScenarioCandidates.length})
            </div>
            <div style={{ display: "grid", gap: 8 }}>
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
          <div style={{ margin: "0 0 14px" }}>
            <div className="pl-sub" style={{ margin: "0 0 8px" }}>
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
        ) : (
        <div
          className="pl-board"
          style={view === "grid" ? { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" } : undefined}
        >
          {sheets.length === 0 ? (
            <div className="pl-branch">
              <div className="pl-diamond">
                <Wand size={18} />
              </div>
              <div className="pl-branch-t">비트가 없습니다</div>
              <div className="pl-branch-d">
                <button type="button" className="btn" onClick={addBeat} style={{ marginTop: 8 }}>
                  <Plus size={14} />첫 비트 추가
                </button>
              </div>
            </div>
          ) : (
            sheets.map((sheet, i) => (
              // [W2-plot #9] key = 안정 고유 id(sheetKeys[i]) — episode 변동/중복과
              // 무관하게 비트 정체성을 고정. 핸들러는 시스템 canonical 식별자인
              // episode 기준 유지(renameBeat/removeBeat/toggleExpand 호환).
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
            {TL_BARS.map(([n, w, g]) => (
              <div key={n} className="pl-tl-bar" style={{ flex: w, background: g }}>
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
