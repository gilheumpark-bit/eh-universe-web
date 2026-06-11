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

   [AI 2026-06-10] AI 비트 제안 — 기존 범용 구조화 라우트
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
import type { GraphNodeSpec, GraphEdgeSpec } from "@/components/loreguard/RelationGraph";
import {
  Map,
  Settings,
  Flag,
  Layers,
  List,
  Branch,
  Chevron,
  Grid,
  Expand,
  Wand,
  Plus,
  Edit,
  X,
  Dots,
} from "@/components/loreguard/icons";
import { useStudio } from "@/app/studio/StudioContext";
// [Z2a-chatcanvas 2026-06-11] 접이식 노아 채팅 도크 — 기본 접힘, 채택은 기존
// adoptSuggestion(BEAT_SUGGEST 파서) 경로 재사용 (기존 AI 제안 버튼과 트리거 분리).
import ChatCanvasDock, {
  extractJsonBlocks,
  type DockSuggestion,
} from "@/components/loreguard/ChatCanvasDock";
import { getActiveProvider, getApiKey } from "@/lib/ai-providers";
import { getCachedResponse, cacheResponse } from "@/lib/browser/ai-cache";
import { GUARDS } from "@/lib/ai/writing-agent-registry";
// [N1-noa-identity — 2026-06-11] 단일 노아 화자 헤더 — 비트 제안 프롬프트 최상단 주입.
import { buildNoaSystemHeader } from "@/lib/ai/noa-identity";
// [N4 — 2026-06-11] 서버 게이트 차단 응답 고지 (noa:toast + 인라인 에러) — 사일런트 차단 금지
import { checkBlockedJson } from "@/lib/noa/block-notice";
import { lazyFirebaseAuth } from "@/lib/firebase";
import type { EpisodeSceneSheet, StoryConfig } from "@/lib/studio-types";
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";

// ============================================================
// PART 0.5 — [s82-stage-coverage] 창작 과정 기록 (TabWriting S2 패턴 축약)
// ============================================================
// 비트(episodeSceneSheet) = 씬시트 → targetType 'scene' (타입 union 내 최근접·발명 금지).
// fire-and-forget·실패 noa:alert 1회/60s (silent failure 금지).

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
// PART 1 — 정적 구조 템플릿 (측정값 아님 — 서사 구조 프레임)
// ============================================================
//
// PHASES / TL_BARS 는 프로젝트에서 "측정된" 데이터가 아니라 3막 구조의
// 고정 레퍼런스 라벨이다. 따라서 유지한다. 반대로 비트별 "긴장도 %",
// "모순 N건", 일관성 점수 등은 실제 산출 엔진이 없으므로 제거했다.

interface Phase {
  name: string;
  range: string;
  g: string; // 그라데이션 토큰 (인라인 style 허용)
}

const PHASES: Phase[] = [
  { name: "도입", range: "0 – 25%", g: "var(--phase-1)" },
  { name: "전개", range: "25 – 60%", g: "var(--phase-2)" },
  { name: "절정", range: "60 – 85%", g: "var(--phase-3)" },
  { name: "결말", range: "85 – 100%", g: "var(--phase-4)" },
];

// 타임라인 막대: [라벨, flex 가중치, 그라데이션 토큰] — 구조 템플릿
const TL_BARS: [string, number, string][] = [
  ["도입", 25, "var(--phase-1)"],
  ["전개", 35, "var(--phase-2)"],
  ["절정", 25, "var(--phase-3)"],
  ["결말", 15, "var(--phase-4)"],
];

const PH_COLORS = ["var(--c-blue)", "var(--c-teal)", "var(--c-purple)", "var(--c-blue)"];
// 위치 기반 장식 액센트 (측정값 아님 — 보드 가독성용 색상만)
const accentFor = (i: number): string => PH_COLORS[i % PH_COLORS.length] ?? "var(--c-blue)";

// [X1-xyflow] 비트 흐름 그래프 — xyflow 래퍼는 토글 진입 시에만 로드 (ssr:false).
const RelationGraph = dynamic(() => import("@/components/loreguard/RelationGraph"), {
  ssr: false,
  loading: () => <LoadingSkeleton height={440} />,
});

// [X1-xyflow] columnar 자동 레이아웃 상수 (dagre 미사용)
const FLOW_COL_W = 260;
const FLOW_SCENE_Y0 = 120;
const FLOW_SCENE_GAP = 86;

// EpisodeSceneSheet → 비트 카드 표시용 1줄 설명
function beatDesc(sheet: EpisodeSceneSheet): string {
  const parts: string[] = [];
  if (sheet.arc) parts.push(sheet.arc);
  if (sheet.characters) parts.push(sheet.characters);
  if (sheet.scenes && sheet.scenes.length > 0) {
    parts.push(`장면 ${sheet.scenes.length}개`);
  }
  return parts.join(" · ");
}

// ============================================================
// PART 2 — Beat 카드 (실제 episodeSceneSheet 1건)
// ============================================================

interface BeatCardProps {
  sheet: EpisodeSceneSheet;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onRename: (title: string) => void;
  onRemove: () => void;
}

function BeatCard({ sheet, index, expanded, onToggle, onRename, onRemove }: BeatCardProps) {
  const accent = accentFor(index);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sheet.title);
  const desc = beatDesc(sheet);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== sheet.title) onRename(next);
    else setDraft(sheet.title);
    setEditing(false);
  };

  return (
    <div className="pl-beat">
      <div className="pl-beat-top">
        <span className="pl-beat-n" style={{ background: accent }}>
          {sheet.episode}
        </span>
        {editing ? (
          <input
            className="pl-beat-t"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(sheet.title);
                setEditing(false);
              }
            }}
            style={{ flex: 1, minWidth: 0, font: "inherit", background: "transparent", color: "inherit", border: "1px solid var(--line)", borderRadius: 4, padding: "2px 4px" }}
            aria-label="비트 제목 편집"
          />
        ) : (
          <span className="pl-beat-t">{sheet.title || `${sheet.episode}화`}</span>
        )}
        <button
          type="button"
          className="eh-icbtn"
          onClick={() => setEditing(true)}
          aria-label="비트 이름 편집"
          title="비트 이름 편집"
          style={{ marginLeft: "auto" }}
        >
          <Edit size={13} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="eh-icbtn"
          onClick={onRemove}
          aria-label="비트 삭제"
          title="비트 삭제"
        >
          <X size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="eh-icbtn"
          onClick={onToggle}
          aria-label={expanded ? "접기" : "펼치기"}
          aria-expanded={expanded}
          title={expanded ? "접기" : "펼치기"}
        >
          <Dots size={14} aria-hidden="true" />
        </button>
      </div>
      {desc && <div className="pl-beat-d">{desc}</div>}
      {expanded && sheet.scenes && sheet.scenes.length > 0 && (
        <div className="pl-beat-foot" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
          {sheet.scenes.map((sc) => (
            <span key={sc.sceneId} className="pl-ten-label">
              {sc.sceneId} {sc.sceneName || sc.summary || ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PART 2.5 — AI 비트 제안 (기존 /api/structured-generate 재사용)
// ============================================================
//
// 신규 엔드포인트 발명 X. useTranslation.ts 의 채점 호출과 동일하게
// 범용 JSON 라우트 /api/structured-generate 에 provider+prompt+schema 를
// POST 한다. BYOK 키가 없는 호스팅 크레딧 사용자는 라우트가 Firebase JWT
// 를 요구하므로 ai-providers.ts streamViaProxy 와 동일하게 Bearer 첨부.

interface BeatSuggestion {
  title: string;
  summary: string;
}

/** structured-generate 에 전달할 JSON schema — beats 3-6개 {title, summary} */
const BEAT_SUGGEST_SCHEMA = {
  type: "object" as const,
  properties: {
    beats: {
      type: "array" as const,
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object" as const,
        properties: {
          title: { type: "string" as const },
          summary: { type: "string" as const },
        },
        required: ["title", "summary"],
      },
    },
  },
  required: ["beats"],
};

/** 세션 config + 현재 비트 보드에서 제안 프롬프트 구성 (실데이터만 사용) */
function buildBeatPrompt(config: StoryConfig | null, sheets: EpisodeSceneSheet[]): string {
  const lines: string[] = [
    // [N1-noa-identity] 단일 노아 화자 헤더 — 프롬프트 최상단 (additive).
    buildNoaSystemHeader("한국 웹소설 플롯 설계 어시스턴트"),
    "",
    // [plot-guard] /api/structured-generate 는 순수 passthrough(서버측 가드 X) → 클라이언트 가드 주입 필수.
    // registry GUARDS 재사용: ip-brand-guard + no-yap-json (korean-novel 산문 가드는 JSON 스키마와 충돌 → 미적용).
    GUARDS["ip-brand-guard"],
    GUARDS["no-yap-json"],
    "",
    "당신은 한국 웹소설 플롯 설계 어시스턴트입니다.",
    "아래 작품 정보를 바탕으로, 이야기를 진전시키는 다음 비트(beat) 후보를 3~6개 제안하십시오.",
    "각 비트는 title(짧은 제목, 20자 이내)과 summary(1~2문장 요약)로 작성합니다.",
    "이미 있는 비트와 중복되지 않게, 기존 흐름에 자연스럽게 이어지도록 제안하십시오.",
    'JSON 객체 {"beats":[{"title":"...","summary":"..."}]} 형식으로만 응답하십시오.',
    "",
  ];
  if (config?.title) lines.push(`[작품 제목] ${config.title}`);
  if (config?.genre) lines.push(`[장르] ${String(config.genre)}`);
  if (config?.corePremise) lines.push(`[핵심 전제] ${config.corePremise}`);
  const names = (config?.characters ?? [])
    .map((c) => c.name)
    .filter(Boolean)
    .slice(0, 20);
  if (names.length > 0) lines.push(`[등장인물] ${names.join(", ")}`);
  if (sheets.length > 0) {
    lines.push("[현재 비트 보드]");
    for (const s of sheets) {
      lines.push(`- ${s.episode}화: ${s.title}${s.arc ? ` — ${s.arc}` : ""}`);
    }
  } else {
    lines.push("[현재 비트 보드] 아직 비트가 없습니다. 도입부 비트부터 제안하십시오.");
  }
  return lines.join("\n");
}

/** 응답 JSON → BeatSuggestion[] (런타임 검증·최대 6개) */
function parseBeatSuggestions(data: unknown): BeatSuggestion[] {
  if (!data || typeof data !== "object") return [];
  const beats = (data as { beats?: unknown }).beats;
  if (!Array.isArray(beats)) return [];
  const out: BeatSuggestion[] = [];
  for (const b of beats) {
    if (!b || typeof b !== "object") continue;
    const rec = b as { title?: unknown; summary?: unknown };
    const title = typeof rec.title === "string" ? rec.title.trim() : "";
    const summary = typeof rec.summary === "string" ? rec.summary.trim() : "";
    if (title) out.push({ title, summary });
    if (out.length >= 6) break;
  }
  return out;
}

// [Z2a-chatcanvas] 채팅 도크 — 노아에게 비트 제안 JSON 블록 형식 지시.
// 스키마는 BEAT_SUGGEST_SCHEMA 와 동일 shape → parseBeatSuggestions 그대로 재사용.
const DOCK_PROPOSAL_GUIDE = `[캔버스 제안 형식] 대화 중 구체적인 비트(beat) 제안에 도달하면, 응답 끝에 아래 형식의 \`\`\`json 코드 블록을 1개 포함하십시오 (제안이 없으면 블록 생략):
\`\`\`json
{"beats":[{"title":"20자 이내 제목","summary":"1~2문장 요약"}]}
\`\`\`
캔버스 반영은 작가가 채택 버튼으로 확정합니다 — 이미 반영했다고 단정하지 마십시오.`;

// [D-ai-cache] 캐시 키용 모델 라벨 — 클라이언트는 model 미지정(라우트가 provider별
// 기본 모델 선택) → 안정 라벨 1개로 고정. 키 재료 = provider+라벨+prompt+schema 만
// (apiKey/Bearer 시크릿 미포함 — ai-cache.hashKey 시그니처가 구조적으로 차단).
const BEAT_CACHE_MODEL = "structured-generate/default";

/** prompt+schema → ai-cache hashKey 의 messages 슬롯 (schema 변경 = 키 변경) */
function beatCacheMessages(prompt: string): Array<{ role: string; content: string }> {
  return [
    { role: "user", content: prompt },
    { role: "system", content: JSON.stringify(BEAT_SUGGEST_SCHEMA) },
  ];
}

/** BYOK 없을 때 호스팅 크레딧용 Firebase Bearer — streamViaProxy 와 동일 패턴 */
async function buildAiHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const auth = await lazyFirebaseAuth();
    const user = auth?.currentUser;
    if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
  } catch {
    /* ignore — BYOK-only flow still works */
  }
  return headers;
}

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

  // ----- AI 비트 제안 상태 -----
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

  const config = currentSession?.config ?? null;
  const sheets: EpisodeSceneSheet[] = useMemo(
    () => config?.episodeSceneSheets ?? [],
    [config?.episodeSceneSheets],
  );

  const toggleExpand = useCallback((episode: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(episode)) next.delete(episode);
      else next.add(episode);
      return next;
    });
  }, []);

  // 비트 추가 — episodeSceneSheets 에 새 시트 append (영속)
  const addBeat = useCallback(() => {
    setConfig((prev) => {
      const list = prev.episodeSceneSheets ?? [];
      const nextEp = list.reduce((max, s) => Math.max(max, s.episode), 0) + 1;
      const sheet: EpisodeSceneSheet = {
        episode: nextEp,
        title: `새 비트 ${nextEp}`,
        lastUpdate: Date.now(),
      };
      return { ...prev, episodeSceneSheets: [...list, sheet] };
    });
    // [s82] 비트 추가 = 인간 신규 생성. nextEp 는 sheets 스냅샷 기준 재계산 (best-effort).
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

  // ----- AI 비트 제안 요청 (/api/structured-generate — 기존 범용 JSON 라우트) -----
  const suggestBeats = useCallback(async () => {
    if (aiBusy) return;
    // 접근 게이트 — 키/크레딧 없으면 silent failure 대신 API 키 모달
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
        throw new Error("제안을 생성하지 못했습니다. 다시 시도해주세요.");
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
          ? "요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요."
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
        const nextEp = list.reduce((max, s) => Math.max(max, s.episode), 0) + 1;
        const sheet: EpisodeSceneSheet = {
          episode: nextEp,
          title,
          arc: sg.summary || undefined,
          lastUpdate: Date.now(),
        };
        return { ...prev, episodeSceneSheets: [...list, sheet] };
      });
      setAiSuggestions((prev) => prev.filter((s) => s !== sg));
      // [s82] AI 비트 채택 = AI_SUGGESTION 귀속 (인간 1.0 오귀속 금지)
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

  // ---- [X1-xyflow] 비트 흐름 그래프 데이터 (실데이터만 — 날조 금지) ----
  // 에피소드 오름차순 columnar: 비트 노드 1열 좌→우, 각 비트의 장면은 컬럼 아래.
  const flowNodes = useMemo<GraphNodeSpec[]>(() => {
    const ordered = [...sheets].sort((a, b) => a.episode - b.episode);
    const out: GraphNodeSpec[] = [];
    ordered.forEach((s, i) => {
      out.push({
        id: `ep-${s.episode}`,
        label: s.title || `${s.episode}화`,
        sublabel: `${s.episode}화${s.arc ? ` · ${s.arc}` : ""}`,
        x: i * FLOW_COL_W,
        y: 0,
        accent: accentFor(i),
        sourceSide: "right",
        targetSide: "left",
      });
      (s.scenes ?? []).forEach((sc, j) => {
        const summary = (sc.summary || "").trim();
        out.push({
          id: `ep-${s.episode}-sc-${j}`,
          label: sc.sceneName || sc.sceneId || `장면 ${j + 1}`,
          sublabel: summary ? (summary.length > 48 ? `${summary.slice(0, 48)}…` : summary) : undefined,
          x: i * FLOW_COL_W + 18,
          y: FLOW_SCENE_Y0 + j * FLOW_SCENE_GAP,
          accent: "var(--line)",
          minor: true,
          targetSide: "top",
        });
      });
    });
    return out;
  }, [sheets]);

  const flowEdges = useMemo<GraphEdgeSpec[]>(() => {
    const ordered = [...sheets].sort((a, b) => a.episode - b.episode);
    const out: GraphEdgeSpec[] = [];
    for (let i = 0; i < ordered.length - 1; i++) {
      out.push({
        id: `flow-${ordered[i].episode}-${ordered[i + 1].episode}`,
        source: `ep-${ordered[i].episode}`,
        target: `ep-${ordered[i + 1].episode}`,
        animated: true,
        color: "var(--primary)",
      });
    }
    for (const s of ordered) {
      (s.scenes ?? []).forEach((_sc, j) => {
        out.push({
          id: `ep-${s.episode}-scedge-${j}`,
          source: `ep-${s.episode}`,
          target: `ep-${s.episode}-sc-${j}`,
          color: "var(--line)",
        });
      });
    }
    return out;
  }, [sheets]);

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
      <div className="pl-grid">
        <section className="pl-center" style={{ gridColumn: "1 / -1" }}>
          <div className="pl-top">
            <div>
              <div className="pl-title">
                <Branch size={19} style={{ color: "var(--primary)" }} />
                플롯 모드
              </div>
              <div className="pl-sub">아직 작업할 프로젝트가 없습니다. 새 프로젝트를 시작하세요.</div>
            </div>
          </div>
          <div className="pl-board" style={{ display: "flex", gap: 12 }}>
            <button type="button" className="btn" onClick={() => createNewSession()}>
              <Plus size={15} />
              새 프로젝트 시작
            </button>
            <button type="button" className="btn ghost" onClick={openQuickStart}>
              <Wand size={15} />
              퀵스타트
            </button>
          </div>
        </section>
      </div>
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
      placeholder="플롯·비트에 대해 노아와 대화…"
    >
    <div className="pl-grid">
      {/* ---- 좌측 개요 레일 ---- */}
      {/* [A-01 priority-high 2026-06-09] 동일 페이지 2개 aside 구분 — unique aria-label (axe "landmark must be distinguishable"). */}
      <aside className="pl-rail" aria-label="플롯 개요">
        <div className="pl-rail-head">
          <Map size={17} />
          플롯 개요
        </div>
        <div className="pl-proj">
          <div className="pl-proj-k">프로젝트</div>
          <div className="pl-proj-v">{projectName}</div>
          <button
            type="button"
            className="btn"
            style={{ width: "100%", justifyContent: "center", marginTop: "10px" }}
            onClick={() => handleTabChange("settings")}
          >
            <Settings size={14} />
            설정
          </button>
        </div>
        {/* 실제 파생 통계만 표시 (날조 수치 제거) */}
        <div className="pl-stat purple">
          <span className="pl-stat-ic">
            <Flag size={16} />
          </span>
          <div>
            <div className="pl-stat-k">현재 화</div>
            <div className="pl-stat-v">{config?.episode ?? 1}화</div>
          </div>
        </div>
        <div className="pl-stat blue">
          <span className="pl-stat-ic">
            <Layers size={16} />
          </span>
          <div>
            <div className="pl-stat-k">비트 수</div>
            <div className="pl-stat-v">{sheets.length}개</div>
          </div>
        </div>
        <button
          type="button"
          className="btn ghost"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={addBeat}
        >
          <Plus size={15} />
          비트 추가
        </button>

        {/* ---- AI 비트 제안 (/api/structured-generate 재사용) ---- */}
        <button
          type="button"
          className="btn"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={suggestBeats}
          disabled={aiBusy}
          aria-busy={aiBusy}
        >
          <Wand size={15} />
          {aiBusy ? "제안 생성 중…" : "AI 비트 제안"}
        </button>

        {aiError && (
          <div className="pl-citem" role="alert">
            <div className="pl-citem-q" style={{ color: "var(--c-amber)" }}>
              {aiError}
            </div>
          </div>
        )}

        {aiSuggestions.length > 0 && (
          <>
            <div className="pl-proj-k" style={{ marginTop: 2 }}>
              AI 제안 ({aiSuggestions.length})
              {aiFromCache && (
                <span style={{ opacity: 0.6, marginLeft: 4 }} title="로컬 캐시에서 즉시 불러옴 (24시간 보관)">
                  · 캐시
                </span>
              )}
            </div>
            {aiSuggestions.map((sg, i) => (
              <div key={`${i}-${sg.title}`} className="pl-citem">
                <div className="pl-citem-top">
                  <span className="pl-citem-t">{sg.title}</span>
                </div>
                {sg.summary && <div className="pl-citem-q">{sg.summary}</div>}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ flex: 1, justifyContent: "center", fontSize: 12, padding: "5px 10px" }}
                    onClick={() => adoptSuggestion(sg)}
                  >
                    채택
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ flex: 1, justifyContent: "center", fontSize: 12, padding: "5px 10px" }}
                    onClick={() => ignoreSuggestion(sg)}
                  >
                    무시
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </aside>

      {/* ---- 센터: 페이즈 리본 + 비트 보드 + 타임라인 ---- */}
      <section className="pl-center" style={{ gridColumn: "2 / -1" }}>
        <div className="pl-top">
          <div>
            <div className="pl-title">
              <Branch size={19} style={{ color: "var(--primary)" }} />
              플롯 모드
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
              <div key={sheet.episode} className="pl-col">
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
