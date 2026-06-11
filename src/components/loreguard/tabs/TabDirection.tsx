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

   AI 연출 제안 (direction-ai): 기존 /api/structured-generate 라우트 재사용
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

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Layers,
  Search,
  Chevron,
  Film,
  Flag,
  Plus,
  X,
  Edit,
  Check,
  Sparkle,
} from "@/components/loreguard/icons";
import { useStudio } from "@/app/studio/StudioContext";
// [Z2a-chatcanvas 2026-06-11] 접이식 노아 채팅 도크 — 기본 접힘, 콘티(씬) 제안
// 감지 = parseDirectionSuggestions 재사용·채택 = adoptSuggestion 기존 경로
// (기존 'AI 연출 제안' 버튼과 트리거 분리 — 채팅은 대화형 보완).
import ChatCanvasDock, {
  extractJsonBlocks,
  type DockSuggestion,
} from "@/components/loreguard/ChatCanvasDock";
// [Z1c-mid-ports] 장편 아크 점검 — 기존 5축 엔진(useLongArcVerifier orchestrator 래퍼) +
// 기존 리포트 카드(LongArcReportPanel — 구 NovelIDELauncher 검수 wiring 동일 컴포넌트) 재사용.
// autoTrigger:false (수동 버튼만 — 탭 진입만으로 5축 계산 X). 신규 엔진 0.
import {
  useLongArcVerifier,
  type UseLongArcVerifierResult,
} from "@/hooks/useLongArcVerifier";
const LongArcReportPanel = dynamic(
  () =>
    import("@/components/studio/long-arc/LongArcReportPanel").then(
      (m) => m.LongArcReportPanel,
    ),
  { ssr: false },
);
import { getActiveProvider, getApiKey } from "@/lib/ai-providers";
import { lazyFirebaseAuth } from "@/lib/firebase";
import type {
  StoryConfig,
  EpisodeSceneEntry,
  EpisodeSceneSheet,
  EpisodeManuscript,
  AppLanguage,
  Character,
} from "@/lib/studio-types";
import { buildAgentSystemPrompt } from "@/lib/ai/writing-agent-registry";
// [N1-noa-identity — 2026-06-11] 단일 노아 화자 헤더 — 연출 제안 프롬프트 최상단 주입.
import { buildNoaSystemHeader } from "@/lib/ai/noa-identity";
// [N4 — 2026-06-11] 서버 게이트 차단 응답 고지 (noa:toast + 인라인 에러) — 사일런트 차단 금지
import { checkBlockedJson } from "@/lib/noa/block-notice";
import {
  listSheetsSorted,
  findSheet,
  upsertSheet,
} from "@/lib/scene-sheet/helpers";
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";

// ============================================================
// PART 0.5 — [s82-stage-coverage] 창작 과정 기록 (TabWriting S2 패턴 축약)
// ============================================================
// 씬 연출 entry → targetType 'scene' (union 내 최근접 — 'scene-direction' 발명 금지,
// 연출 구분은 note 로 정직 전달). fire-and-forget·실패 noa:alert 1회/60s.

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
// PART 1 — 상수 · 톤 색상 · 프레임 그라데이션
// ============================================================
// IDENTITY_SEAL: PART-1 | role=constants | inputs=none | outputs=TONE_COLOR,GRADS,TABLE_HEADERS

/** 엔진 톤 문자열 → pill 색상 (없으면 회색). EpisodeScenePanel 의 톤 어휘와 동일 매핑. */
const TONE_COLOR: Record<string, string> = {
  감동: "green",
  긴장: "red",
  개그: "blue",
  액션: "amber",
  일상: "gray",
  반전: "purple",
  공포: "purple",
  서사: "blue",
  // 영어 톤 어휘 (EpisodeScenePanel EN preset)
  touching: "green",
  tension: "red",
  comedy: "blue",
  action: "amber",
  daily: "gray",
  twist: "purple",
  horror: "purple",
  epic: "blue",
};

function toneColor(tone: string): string {
  return TONE_COLOR[tone] ?? "gray";
}

/** 프레임 썸네일 — 정적 그라데이션 (이미지 생성 엔진 미연결, 장식용). */
const GRADS = [
  "linear-gradient(135deg,#3a4a6b,#1c2740)",
  "linear-gradient(135deg,#5a4b6b,#2a1f3a)",
  "linear-gradient(135deg,#2a3550,#10151f)",
  "linear-gradient(135deg,#3a3550,#1a1828)",
  "linear-gradient(135deg,#4a3550,#241a30)",
  "linear-gradient(135deg,#6b4030,#2a1810)",
];

const grad = (i: number): string => GRADS[i % GRADS.length];

// 6 컬럼 — loreguard.css .dr-trow grid (1.6 .7 1.7 1.7 .55 .9) 와 1:1.
// 실제 EpisodeSceneEntry 필드로 헤더 정정 (날조 "길이/검수" → "감정 포인트/다음 씬").
const TABLE_HEADERS = ["샷 (씬)", "감정 톤", "연출 의도", "핵심 대사", "감정 포인트", "다음 씬"];

const TONE_OPTIONS = ["감동", "긴장", "개그", "액션", "일상", "반전", "공포", "서사"];

// ============================================================
// PART 1.5 — AI 연출 제안 (기존 structured-generate 엔진 재사용)
// ============================================================
// IDENTITY_SEAL: PART-1.5 | role=ai-direction-suggest | inputs=config,scenes | outputs=DirectionAiSuggestion[]
// 엔진: /api/structured-generate (provider 무관 JSON 라우트 — useTranslation·
// publish-audit 와 동일 호출 패턴). 신규 라우트/엔진 생성 X.

interface DirectionAiSuggestion {
  sceneName: string;
  tone: string; // TONE_OPTIONS 중 하나 (파서에서 강제)
  summary: string; // 연출 의도
  keyDialogue: string;
  emotionPoint: string;
}

// ---- [world-context] 세계관 필드 → 연출 프롬프트 주입 ----
// TabWorld 의 WORLD_FIELDS(17) · pipeline.ts worldTierBlock 패턴 참조. corePremise 는
// buildStorySummaryBlock(system) 에 이미 실리므로 여기서 제외(중복 회피). synopsis 도
// buildDirectionPrompt user 블록에 이미 실림 → 여기 미포함. 나머지 16 worldField 만
// 라벨:값으로, 값 있는 필드만, 필드당 truncate 후 "세계관 컨텍스트" 섹션 1개로 합성.
const WORLD_CONTEXT_FIELDS: { key: keyof StoryConfig; label: string }[] = [
  { key: "powerStructure", label: "권력 구조" },
  { key: "currentConflict", label: "현재 갈등" },
  { key: "worldHistory", label: "역사" },
  { key: "socialSystem", label: "사회 시스템" },
  { key: "economy", label: "경제와 생활" },
  { key: "magicTechSystem", label: "마법 / 기술 체계" },
  { key: "factionRelations", label: "종족 / 세력 관계" },
  { key: "survivalEnvironment", label: "생존 환경" },
  { key: "culture", label: "문화" },
  { key: "religion", label: "종교와 신화" },
  { key: "education", label: "교육/지식 전달" },
  { key: "lawOrder", label: "법과 질서" },
  { key: "taboo", label: "금기와 규범" },
  { key: "dailyLife", label: "평범한 사람의 하루" },
  { key: "travelComm", label: "이동/통신 속도" },
  { key: "truthVsBeliefs", label: "믿음 vs 진실" },
];

const WORLD_FIELD_MAX = 400; // 필드당 토큰 상한 — 초과분 truncate (전체 프롬프트 비대 방지)

/** 값이 채워진 세계관 필드만 "라벨: 값" 줄로 (없으면 빈 문자열 — 호출부에서 섹션 자체 스킵). */
function buildWorldContextLines(config: StoryConfig): string {
  const lines: string[] = [];
  for (const { key, label } of WORLD_CONTEXT_FIELDS) {
    const raw = config[key];
    if (typeof raw !== "string") continue;
    const v = raw.trim();
    if (!v) continue;
    const truncated = v.length > WORLD_FIELD_MAX ? `${v.slice(0, WORLD_FIELD_MAX)}…` : v;
    lines.push(`- ${label}: ${truncated}`);
  }
  return lines.join("\n");
}

/** structured-generate 의 schema 파라미터 (JSON Schema — 라우트 기존 계약). */
const DIRECTION_AI_SCHEMA = {
  type: "object" as const,
  properties: {
    suggestions: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          sceneName: { type: "string" as const },
          tone: { type: "string" as const, enum: TONE_OPTIONS },
          summary: { type: "string" as const },
          keyDialogue: { type: "string" as const },
          emotionPoint: { type: "string" as const },
        },
        required: ["sceneName", "tone", "summary", "keyDialogue", "emotionPoint"],
      },
    },
  },
  required: ["suggestions"],
};

/** 선택 화 씬 + config 톤/장르 컨텍스트 → 연출 샷 제안 프롬프트 (KO 고정 — 탭 어휘와 동일). */
function buildDirectionPrompt(
  config: StoryConfig,
  episode: number,
  episodeTitle: string,
  scenes: EpisodeSceneEntry[],
): string {
  const sceneLines = scenes.length
    ? scenes
        .map(
          (s) =>
            `- [${s.sceneId}] ${s.sceneName || "(제목 없음)"} | 톤: ${s.tone || "-"} | 연출 의도: ${s.summary || "-"} | 핵심 대사: ${s.keyDialogue || "-"} | 감정 포인트: ${s.emotionPoint || "-"}`,
        )
        .join("\n")
    : "(아직 등록된 씬 없음 — 회차 도입부터 제안)";

  // 채워진 세계관 필드(corePremise·synopsis 제외 — 위에서 이미 주입) → 별도 섹션.
  const worldContext = buildWorldContextLines(config);

  return `당신은 웹소설/웹툰 연출 감독입니다. 아래 작품·회차 정보를 바탕으로 이 회차에 추가할 연출 샷(씬) 3개를 제안하십시오.

작품 정보:
- 제목: ${config.title || "(미정)"}
- 장르: ${String(config.genre) || "(미정)"}
- 주요 정서(톤): ${config.primaryEmotion || "(미정)"}
${config.synopsis ? `- 시놉시스: ${config.synopsis.slice(0, 1500)}` : ""}
${worldContext ? `\n세계관 컨텍스트 (연출은 이 설정과 모순되지 않아야 합니다):\n${worldContext}\n` : ""}
현재 회차: ${episode}화${episodeTitle ? ` · ${episodeTitle}` : ""}
기존 씬 목록:
${sceneLines}

규칙:
- 기존 씬과 중복되지 않는, 회차 흐름에 자연스럽게 이어지는 샷만 제안
- tone 은 반드시 다음 중 하나: ${TONE_OPTIONS.join(", ")}
- summary 는 연출 의도(카메라/감정/페이싱)를 1-2문장으로
- keyDialogue 는 그 씬을 대표하는 핵심 대사 1줄
- emotionPoint 는 독자가 느껴야 할 감정 한 구절
- JSON 외 다른 텍스트 출력 금지`;
}

// ---- [direction-registry] studio-direction contextBlocks 빌더 3종 ----
// 에이전트 선언 6 블록 (scene-sheet·character-dna·genre-rules·story-summary·
// beat-bank·tension-curve) 중 StoryConfig 에서 실데이터로 채울 수 있는 3종만 전달:
//   scene-sheet   ← config.episodeSceneSheets (현재 화 sheet 메타 + 씬 행 압축)
//   character-dna ← config.characters (이름·역할·특성·말투 — 보유 필드만)
//   story-summary ← config.corePremise + config.synopsis
// genre-rules·beat-bank·tension-curve 는 StoryConfig 에 해당 구조 데이터 없음 →
// 정직 미주입 (buildAgentSystemPrompt 가 빈 블록을 조용히 스킵 — 레지스트리 계약).

/** 현재 화 씬시트 → scene-sheet 블록. sheet 자체가 없으면 미주입(undefined). */
function buildSceneSheetBlock(sheet: EpisodeSceneSheet | undefined): string | undefined {
  if (!sheet) return undefined;
  const head = [
    `${sheet.episode}화${sheet.title ? ` · ${sheet.title}` : ""}`,
    sheet.arc ? `아크: ${sheet.arc}` : "",
    sheet.characters ? `회차 등장인물: ${sheet.characters}` : "",
  ].filter(Boolean);
  // 씬 행은 user 블록(buildDirectionPrompt)에 전체 필드가 이미 실리므로
  // 여기서는 이름·톤·의도만 압축 (중복 토큰 최소화).
  const rows = (sheet.scenes ?? []).map(
    (s) => `- ${s.sceneName || s.sceneId || "(제목 없음)"} [${s.tone || "-"}] ${s.summary || ""}`.trimEnd(),
  );
  const body = rows.length ? `씬 ${rows.length}개:\n${rows.join("\n")}` : "등록된 씬 없음";
  return `${head.join("\n")}\n${body}`;
}

/** config.characters → character-dna 블록. 이름 있는 캐릭터 없으면 미주입. */
function buildCharacterDnaBlock(characters: Character[]): string | undefined {
  const named = characters.filter((c) => c.name.trim());
  if (named.length === 0) return undefined;
  const MAX_CHARS = 12; // 토큰 상한 — 초과분은 명시적으로 생략 표기 (조용한 누락 X)
  const lines = named.slice(0, MAX_CHARS).map((c) => {
    const bits = [
      c.role.trim() ? `역할: ${c.role.trim()}` : "",
      c.traits.trim() ? `특성: ${c.traits.trim()}` : "",
      c.personality?.trim() ? `성격: ${c.personality.trim()}` : "",
      c.speechStyle?.trim() ? `말투: ${c.speechStyle.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    return `- ${c.name.trim()}${bits ? ` — ${bits}` : ""}`;
  });
  if (named.length > MAX_CHARS) lines.push(`(+${named.length - MAX_CHARS}명 생략)`);
  return lines.join("\n");
}

/** corePremise + synopsis → story-summary 블록. 둘 다 없으면 미주입. */
function buildStorySummaryBlock(config: StoryConfig): string | undefined {
  const parts: string[] = [];
  if (config.corePremise?.trim()) parts.push(`핵심 전제: ${config.corePremise.trim()}`);
  if (config.synopsis?.trim()) parts.push(`시놉시스: ${config.synopsis.trim().slice(0, 1500)}`);
  return parts.length ? parts.join("\n") : undefined;
}

/**
 * [direction-registry] 출력 스키마 오버라이드 (extraDirectives — system 말미 주입).
 * studio-direction 의 duty 는 { "shots": [...] } 스키마를 명시하지만, 이 호출의 실제
 * 계약은 DIRECTION_AI_SCHEMA ({ "suggestions": [...] }) — Gemini responseSchema /
 * Claude tool schema 는 구조적으로 강제되지만 OpenAI-호환 JSON 모드는 prompt 힌트만
 * 받으므로, duty 의 shots 스키마를 따라가면 Guillotine 422 KILL 회귀가 난다.
 * 따라서 본 호출 한정으로 suggestions 스키마를 명시 고정한다 (레지스트리 duty 미수정).
 */
const DIRECTION_SCHEMA_OVERRIDE = `[출력 스키마 — 본 호출 한정 오버라이드] 위 임무 설명의 "shots" 스키마는 이 호출에 적용하지 않습니다. 반드시 아래 형식의 JSON 만 출력하십시오: { "suggestions": [ { "sceneName": string, "tone": string, "summary": string, "keyDialogue": string, "emotionPoint": string } ] }`;

/** 응답 검증 — 필수 필드·톤 어휘 미충족 행은 정직하게 드롭 (날조 보정 X). */
function parseDirectionSuggestions(data: unknown): DirectionAiSuggestion[] {
  const arr = (data as { suggestions?: unknown } | null)?.suggestions;
  if (!Array.isArray(arr)) return [];
  const out: DirectionAiSuggestion[] = [];
  for (const x of arr) {
    if (typeof x !== "object" || x === null) continue;
    const r = x as Record<string, unknown>;
    const sceneName = typeof r.sceneName === "string" ? r.sceneName.trim() : "";
    const tone = typeof r.tone === "string" ? r.tone.trim() : "";
    const summary = typeof r.summary === "string" ? r.summary.trim() : "";
    const keyDialogue = typeof r.keyDialogue === "string" ? r.keyDialogue.trim() : "";
    const emotionPoint = typeof r.emotionPoint === "string" ? r.emotionPoint.trim() : "";
    if (!sceneName || !summary) continue;
    if (!TONE_OPTIONS.includes(tone)) continue; // 스키마 enum 위반 방어
    out.push({ sceneName, tone, summary, keyDialogue, emotionPoint });
    if (out.length >= 5) break;
  }
  return out;
}

// ---- [Z2a-chatcanvas] 채팅 도크 — 콘티 제안 JSON 블록 형식 지시 ----
// 스키마는 DIRECTION_AI_SCHEMA 와 동일 shape → parseDirectionSuggestions 그대로 재사용.
const DOCK_PROPOSAL_GUIDE = `[캔버스 제안 형식] 대화 중 구체적인 콘티(연출 샷) 제안에 도달하면, 응답 끝에 아래 형식의 \`\`\`json 코드 블록을 1개 포함하십시오 (제안이 없으면 블록 생략):
\`\`\`json
{"suggestions":[{"sceneName":"씬 제목","tone":"감정 톤","summary":"연출 의도 1~2문장","keyDialogue":"핵심 대사 1줄","emotionPoint":"독자 감정 한 구절"}]}
\`\`\`
tone 은 반드시 다음 중 하나: ${TONE_OPTIONS.join(", ")}. 캔버스 반영은 작가가 채택 버튼으로 확정합니다 — 이미 반영했다고 단정하지 마십시오.`;

// ============================================================
// PART 2 — 좌측 내비 (실제 에피소드 씬시트 선택)
// ============================================================
// IDENTITY_SEAL: PART-2 | role=episode-nav | inputs=sheets,episode | outputs=onPick

interface NavProps {
  sheets: EpisodeSceneSheet[];
  currentEpisode: number;
  onPick: (episode: number) => void;
}

function DirectionNav({ sheets, currentEpisode, onPick }: NavProps) {
  return (
    // [A-01 priority-high 2026-06-09] 2개 aside 구분 — unique aria-label.
    <aside className="dr-nav" aria-label="연출 에피소드 내비게이션">
      {sheets.length === 0 ? (
        <button className="dr-nav-btn on" type="button" onClick={() => onPick(currentEpisode)}>
          <Layers size={18} />
          <span>{currentEpisode}화</span>
        </button>
      ) : (
        sheets.map((s) => (
          <button
            key={s.episode}
            className={"dr-nav-btn" + (s.episode === currentEpisode ? " on" : "")}
            type="button"
            onClick={() => onPick(s.episode)}
            title={s.title || `${s.episode}화`}
          >
            <Layers size={18} />
            <span>{s.episode}화</span>
          </button>
        ))
      )}
    </aside>
  );
}

// ============================================================
// PART 3 — 샷(씬) 편집 행 (인라인 폼 — 추가/수정)
// ============================================================
// IDENTITY_SEAL: PART-3 | role=shot-editor | inputs=draft | outputs=EpisodeSceneEntry

interface ShotEditorProps {
  initial: EpisodeSceneEntry;
  onConfirm: (entry: EpisodeSceneEntry) => void;
  onCancel: () => void;
}

function ShotEditor({ initial, onConfirm, onCancel }: ShotEditorProps) {
  const [d, setD] = useState<EpisodeSceneEntry>(initial);
  const set = (k: keyof EpisodeSceneEntry, v: string) => setD((p) => ({ ...p, [k]: v }));
  const inp = {
    width: "100%",
    border: "1px solid var(--line)",
    background: "var(--card-2)",
    borderRadius: "7px",
    padding: "6px 9px",
    fontSize: "12px",
    color: "var(--ink-1)",
    fontFamily: "inherit",
  } as const;

  return (
    <div className="dr-trow" style={{ cursor: "default", alignItems: "start" }}>
      <div className="dr-shot">
        <div className="dr-thumb" style={{ background: grad(0) }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: 1 }}>
          <input
            style={inp}
            placeholder="씬 #"
            aria-label="씬 번호"
            value={d.sceneId}
            onChange={(e) => set("sceneId", e.target.value)}
          />
          <input
            style={inp}
            placeholder="씬명"
            aria-label="씬명"
            value={d.sceneName}
            onChange={(e) => set("sceneName", e.target.value)}
          />
          <input
            style={inp}
            placeholder="등장인물"
            aria-label="등장인물"
            value={d.characters}
            onChange={(e) => set("characters", e.target.value)}
          />
        </div>
      </div>
      <span>
        <select
          aria-label="감정 톤"
          value={d.tone}
          onChange={(e) => set("tone", e.target.value)}
          style={{ ...inp, padding: "5px 6px" }}
        >
          {TONE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </span>
      <span>
        <textarea
          style={{ ...inp, resize: "vertical", minHeight: "44px" }}
          placeholder="연출 의도 / 씬 요약"
          aria-label="연출 의도"
          value={d.summary}
          onChange={(e) => set("summary", e.target.value)}
        />
      </span>
      <span>
        <textarea
          style={{ ...inp, resize: "vertical", minHeight: "44px" }}
          placeholder="핵심 대사"
          aria-label="핵심 대사"
          value={d.keyDialogue}
          onChange={(e) => set("keyDialogue", e.target.value)}
        />
      </span>
      <span>
        <input
          style={inp}
          placeholder="감정 포인트"
          aria-label="감정 포인트"
          value={d.emotionPoint}
          onChange={(e) => set("emotionPoint", e.target.value)}
        />
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <input
          style={inp}
          placeholder="다음 씬"
          aria-label="다음 씬"
          value={d.nextScene}
          onChange={(e) => set("nextScene", e.target.value)}
        />
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            type="button"
            className="btn"
            style={{ padding: "5px 8px" }}
            onClick={() => onConfirm({ ...d, sceneId: d.sceneId.trim() || `${Date.now()}` })}
            aria-label="저장"
            title="저장"
          >
            <Check size={13} />
          </button>
          <button
            type="button"
            className="btn ghost"
            style={{ padding: "5px 8px" }}
            onClick={onCancel}
            aria-label="취소"
            title="취소"
          >
            <X size={13} />
          </button>
        </div>
      </span>
    </div>
  );
}

// ============================================================
// PART 4 — 센터 (필터 + 샷 테이블 + 프레임 스트립)
// ============================================================
// IDENTITY_SEAL: PART-4 | role=center | inputs=scenes,filters | outputs=CRUD callbacks

interface CenterProps {
  episode: number;
  episodeTitle: string;
  scenes: EpisodeSceneEntry[];
  sel: string;
  onSelect: (id: string) => void;
  query: string;
  setQuery: (q: string) => void;
  toneFilter: string;
  setToneFilter: (t: string) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  onAddNew: () => void;
  onConfirm: (entry: EpisodeSceneEntry) => void;
  onDelete: (id: string) => void;
  blankEntry: () => EpisodeSceneEntry;
  // AI 연출 제안 (PART 1.5)
  aiLoading: boolean;
  aiError: string | null;
  aiSuggestions: DirectionAiSuggestion[];
  onAiSuggest: () => void;
  onAdoptSuggestion: (s: DirectionAiSuggestion) => void;
  onDismissAi: () => void;
}

function DirectionCenter({
  episode,
  episodeTitle,
  scenes,
  sel,
  onSelect,
  query,
  setQuery,
  toneFilter,
  setToneFilter,
  editingId,
  setEditingId,
  onAddNew,
  onConfirm,
  onDelete,
  blankEntry,
  aiLoading,
  aiError,
  aiSuggestions,
  onAiSuggest,
  onAdoptSuggestion,
  onDismissAi,
}: CenterProps) {
  // 실제 클라이언트 필터 — 검색(씬명/요약/대사/등장인물) + 톤.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scenes.filter((s) => {
      if (toneFilter && s.tone !== toneFilter) return false;
      if (!q) return true;
      return (
        s.sceneId.toLowerCase().includes(q) ||
        s.sceneName.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.keyDialogue.toLowerCase().includes(q) ||
        s.characters.toLowerCase().includes(q)
      );
    });
  }, [scenes, query, toneFilter]);

  // 톤 필터 드롭다운에 실제 존재하는 톤만 노출.
  const presentTones = useMemo(
    () => Array.from(new Set(scenes.map((s) => s.tone).filter(Boolean))),
    [scenes],
  );

  return (
    <section className="dr-center">
      <div className="dr-top">
        <div>
          <div className="dr-title">
            연출 모드<span className="dr-sub">{episode}화 씬 연출 시트</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn"
            type="button"
            onClick={onAiSuggest}
            disabled={aiLoading}
            aria-busy={aiLoading}
            title="현재 화 씬 + 작품 톤/장르 기반 연출 샷 제안"
          >
            <Sparkle size={15} />
            {aiLoading ? "AI 제안 생성 중…" : "AI 연출 제안"}
          </button>
          <button className="btn" type="button" onClick={onAddNew}>
            <Plus size={15} />씬 추가
          </button>
        </div>
      </div>

      <div className="dr-filters">
        <span className="btn" style={{ cursor: "default" }}>
          에피소드 : {episode}화{episodeTitle ? ` · ${episodeTitle}` : ""}
        </span>
        <div className="dr-search">
          <Search size={15} />
          <input
            placeholder="씬, 내용, 의도 검색…"
            aria-label="씬 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label className="btn" style={{ cursor: "pointer" }}>
          감정 톤
          <select
            aria-label="감정 톤 필터"
            value={toneFilter}
            onChange={(e) => setToneFilter(e.target.value)}
            style={{ border: 0, background: "transparent", color: "inherit", font: "inherit", outline: "none" }}
          >
            <option value="">전체</option>
            {presentTones.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Chevron size={14} />
        </label>
      </div>

      {/* ---- AI 연출 제안 결과 (PART 1.5 — 실 로딩/에러/채택) ---- */}
      {aiLoading && (
        <div
          role="status"
          aria-live="polite"
          style={{ padding: "8px 12px", fontSize: "12.5px", color: "var(--ink-3)" }}
        >
          AI 연출 제안 생성 중… ({episode}화 씬 {scenes.length}개 + 작품 톤/장르 컨텍스트)
        </div>
      )}
      {aiError && !aiLoading && (
        <div
          role="alert"
          style={{
            margin: "0 0 10px",
            padding: "9px 12px",
            border: "1px solid var(--c-red)",
            borderRadius: "8px",
            color: "var(--c-red)",
            fontSize: "12.5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <span>AI 연출 제안 실패 — {aiError}</span>
          <button
            type="button"
            className="btn ghost"
            style={{ padding: "3px 6px" }}
            onClick={onDismissAi}
            aria-label="오류 닫기"
            title="닫기"
          >
            <X size={13} />
          </button>
        </div>
      )}
      {aiSuggestions.length > 0 && !aiLoading && (
        <div style={{ margin: "0 0 12px", border: "1px solid var(--line)", borderRadius: "10px", overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              borderBottom: "1px solid var(--line)",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--ink-2)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkle size={14} />
              AI 연출 제안 {aiSuggestions.length}건 — 채택 시 이 화의 씬으로 저장됩니다
            </span>
            <button
              type="button"
              className="btn ghost"
              style={{ padding: "3px 6px" }}
              onClick={onDismissAi}
              aria-label="AI 제안 모두 닫기"
              title="모두 닫기"
            >
              <X size={13} />
            </button>
          </div>
          {aiSuggestions.map((s, i) => (
            <div key={`${s.sceneName}-${i}`} className="dr-trow" style={{ cursor: "default" }}>
              <div className="dr-shot">
                <div className="dr-thumb" style={{ background: grad(i) }} />
                <div>
                  <div className="dr-shot-t">{s.sceneName}</div>
                  <div className="dr-shot-loc">AI 제안</div>
                </div>
              </div>
              <span>
                <span className={"pill " + toneColor(s.tone)}>{s.tone}</span>
              </span>
              <span className="dr-intent">{s.summary}</span>
              <span className="dr-cut">{s.keyDialogue}</span>
              <span className="dr-len">{s.emotionPoint}</span>
              <span>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: "5px 10px" }}
                  onClick={() => onAdoptSuggestion(s)}
                  aria-label={`${s.sceneName} 채택`}
                >
                  <Check size={13} />채택
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="dr-tablewrap">
        <div className="dr-trow dr-thead">
          {TABLE_HEADERS.map((header) => (
            <span key={header}>{header}</span>
          ))}
        </div>

        {scenes.length === 0 && editingId === null && (
          <div style={{ padding: "40px 18px", textAlign: "center", color: "var(--ink-3)", fontSize: "13px" }}>
            이 화에 등록된 씬이 없습니다. 상단 “씬 추가”로 첫 씬을 만들어 보세요.
          </div>
        )}

        {filtered.map((shot, idx) =>
          editingId === shot.sceneId ? (
            <ShotEditor
              key={shot.sceneId}
              initial={shot}
              onConfirm={onConfirm}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div
              key={shot.sceneId}
              className={"dr-trow" + (sel === shot.sceneId ? " sel" : "")}
              onClick={() => onSelect(shot.sceneId)}
            >
              <div className="dr-shot">
                <div className="dr-thumb" style={{ background: grad(idx) }} />
                <div>
                  <div className="dr-shot-id">{shot.sceneId}</div>
                  <div className="dr-shot-t">{shot.sceneName || "(제목 없음)"}</div>
                  <div className="dr-shot-loc">{shot.characters}</div>
                </div>
              </div>
              <span>
                {shot.tone ? <span className={"pill " + toneColor(shot.tone)}>{shot.tone}</span> : null}
              </span>
              <span className="dr-intent">{shot.summary}</span>
              <span className="dr-cut">{shot.keyDialogue}</span>
              <span className="dr-len">{shot.emotionPoint}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="dr-len" style={{ flex: 1 }}>
                  {shot.nextScene}
                </span>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: "4px 6px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(shot.sceneId);
                  }}
                  aria-label={`${shot.sceneId} 편집`}
                  title="편집"
                >
                  <Edit size={13} />
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: "4px 6px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(shot.sceneId);
                  }}
                  aria-label={`${shot.sceneId} 삭제`}
                  title="삭제"
                >
                  <X size={13} />
                </button>
              </span>
            </div>
          ),
        )}

        {editingId === "__new__" && (
          <ShotEditor initial={blankEntry()} onConfirm={onConfirm} onCancel={() => setEditingId(null)} />
        )}

        {scenes.length > 0 && filtered.length === 0 && editingId === null && (
          <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--ink-3)", fontSize: "12.5px" }}>
            검색·필터 조건에 맞는 씬이 없습니다.
          </div>
        )}
      </div>

      <div className="dr-strip">
        <div className="dr-frames">
          {filtered.map((shot, idx) => (
            <div
              key={shot.sceneId}
              className={"dr-frame" + (sel === shot.sceneId ? " sel" : "")}
              onClick={() => onSelect(shot.sceneId)}
            >
              <div className="dr-frame-id">{shot.sceneId}</div>
              <div className="dr-frame-thumb" style={{ background: grad(idx) }} />
              <div className="dr-frame-foot">{shot.sceneName || "—"}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// PART 5 — 우측 검수 패널 (실제 씬시트 집계만)
// ============================================================
// IDENTITY_SEAL: PART-5 | role=review-panel | inputs=scenes,sel | outputs=JSX

interface PanelProps {
  episode: number;
  episodeTitle: string;
  scenes: EpisodeSceneEntry[];
  selected: EpisodeSceneEntry | undefined;
  /** [Z1c-mid-ports] 장편 아크 점검 — 루트 단일 인스턴스 주입 (패널 내 훅 재호출 금지) */
  longArc: UseLongArcVerifierResult;
  episodes: EpisodeManuscript[];
  language: AppLanguage;
  isKO: boolean;
}

function DirectionPanel({
  episode,
  episodeTitle,
  scenes,
  selected,
  longArc,
  episodes,
  language,
  isKO,
}: PanelProps) {
  // 톤 분포 — 실제 씬 데이터 집계 (날조 EMO % 아님).
  const toneCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of scenes) {
      if (!s.tone) continue;
      m.set(s.tone, (m.get(s.tone) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [scenes]);

  return (
    <aside className="dr-panel" aria-label="연출 검수 패널">
      <div className="tpanel-head">검수 패널</div>

      <div className="pcard">
        <div className="pcard-h">
          <Film size={15} />
          씬시트 상태
        </div>
        <div className="stat-row">
          <span>현재 에피소드</span>
          <b>
            {episode}화{episodeTitle ? ` · ${episodeTitle}` : ""}
          </b>
        </div>
        <div className="stat-row">
          <span>등록된 씬</span>
          <b>{scenes.length}개</b>
        </div>
      </div>

      {toneCounts.length > 0 && (
        <div className="pcard">
          <div className="pcard-h">
            <Layers size={15} />
            감정 톤 분포
          </div>
          <div className="dr-emo">
            {toneCounts.map(([tone, n]) => (
              <span key={tone} className={"pill " + toneColor(tone)}>
                {tone} {n}
              </span>
            ))}
          </div>
          <div className="dr-emobar">
            {toneCounts.map(([tone, n]) => {
              const c = toneColor(tone);
              return (
                <span key={tone} style={{ flex: n, background: c === "gray" ? "var(--ink-3)" : "var(--c-" + c + ")" }} />
              );
            })}
          </div>
        </div>
      )}

      {/* [Z1c-mid-ports] 장편 아크 점검 — 기존 5축 long-arc-verifier 재사용 (수동 실행·판단용).
          데이터 부족(저장 원고 0) 시 정직 빈 상태 — 버튼 미노출 (가짜 실행 금지). */}
      <div className="pcard">
        <div className="pcard-h">
          <Flag size={15} />
          {isKO ? "장편 아크 점검" : "Long-arc check"}
          <span className="pill gray">{isKO ? "판단용" : "for judgment"}</span>
        </div>
        {episodes.length === 0 ? (
          <div className="stat-foot">
            {isKO
              ? "저장된 회차 원고가 없습니다 — 집필 탭에서 원고를 저장하면 5축(시놉시스·캐릭터·룰·떡밥·텐션) 점검이 가능합니다."
              : "No saved episode manuscripts — save drafts in the Writing tab to run the 5-axis check (synopsis, character, rules, foreshadow, tension)."}
          </div>
        ) : (
          <>
            <button
              type="button"
              className="btn"
              style={{ width: "100%", justifyContent: "center" }}
              disabled={longArc.loading}
              onClick={longArc.refresh}
              aria-label={
                isKO
                  ? "장편 아크 5축 점검 실행 — 결과는 판단용 카드로 표시"
                  : "Run the 5-axis long-arc check — results shown as a judgment card"
              }
            >
              <Flag size={14} />
              {longArc.loading
                ? isKO ? "점검 중…" : "Checking…"
                : longArc.report
                  ? isKO ? "다시 점검" : "Re-run check"
                  : isKO
                    ? `장편 아크 점검 (${episodes.length}화)`
                    : `Run long-arc check (${episodes.length} eps)`}
            </button>
            {longArc.error && (
              <div className="stat-foot" role="alert" style={{ color: "var(--c-amber)", marginTop: 6 }}>
                {isKO ? "점검 실패: " : "Check failed: "}
                {longArc.error}
              </div>
            )}
            {(longArc.report || longArc.loading) && (
              <div style={{ marginTop: 8 }}>
                <LongArcReportPanel
                  report={longArc.report}
                  loading={longArc.loading}
                  language={language}
                  episodes={episodes}
                  onRefresh={longArc.refresh}
                />
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <div className="pcard">
          <div className="pcard-h">
            <Check size={15} />
            선택 씬
          </div>
          <div className="stat-row">
            <span>씬 #</span>
            <b>{selected.sceneId}</b>
          </div>
          <div className="stat-foot" style={{ marginTop: "8px" }}>
            {selected.sceneName || "(제목 없음)"}
          </div>
          {selected.emotionPoint && (
            <div className="stat-foot" style={{ marginTop: "6px" }}>
              감정 포인트 · {selected.emotionPoint}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

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
  const config = currentSession?.config ?? null;

  const [sel, setSel] = useState<string>("");
  const [query, setQuery] = useState("");
  const [toneFilter, setToneFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  // 좌측 내비로 선택한 에피소드 (없으면 config.episode).
  const [navEpisode, setNavEpisode] = useState<number | null>(null);

  // ---- AI 연출 제안 상태 (PART 1.5) — 실 로딩/에러, 채택 전 제안은 영속 X ----
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
              {isKO ? "연출할 작품이 없습니다" : "No project to direct"}
            </div>
            <div style={{ fontSize: "13px", color: "var(--ink-3)", marginBottom: "18px" }}>
              {isKO
                ? "먼저 새 작품을 만들면 회차별 씬 연출 시트를 작성할 수 있습니다."
                : "Create a project first to build per-episode scene direction sheets."}
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
  const selected = scenes.find((s) => s.sceneId === sel);

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

  // [s82] opts.suppressLog — AI 채택 경로(adoptSuggestion)가 동일 confirm 을 재사용하므로
  // 그 경로에서는 인간 기록을 막고 logAcceptAI 만 찍는다 (이중 카운트·오귀속 동시 차단).
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
    // 제안은 화 단위 컨텍스트 — 화 전환 시 폐기 + 진행 중 요청 중단.
    aiAbortRef.current?.abort();
    setAiSuggestions([]);
    setAiError(null);
    setAiLoading(false);
  };

  // ---- AI 연출 제안 — 기존 /api/structured-generate 엔진 재사용 (신규 엔진 X) ----
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
      // 호스팅 크레딧 사용자 (BYOK 없음) — Firebase JWT 첨부 (ai-providers streamViaProxy 와 동일 패턴).
      try {
        const auth = await lazyFirebaseAuth();
        const u = auth?.currentUser;
        if (u) headers.Authorization = `Bearer ${await u.getIdToken()}`;
      } catch {
        /* BYOK-only flow 는 토큰 없이도 동작 */
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
          prompt: `${buildNoaSystemHeader("씬 연출 디자이너(콘티 제안가)")}\n\n${system}\n\n${buildDirectionPrompt(config, episode, episodeTitle, scenes)}`,
          schema: DIRECTION_AI_SCHEMA,
          apiKey: apiKey || undefined,
          fallback: { suggestions: [] },
        }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
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
      keyDialogue: sugg.keyDialogue,
      emotionPoint: sugg.emotionPoint,
    };
    handleConfirm(entry, { suppressLog: true });
    setAiSuggestions((prev) => prev.filter((x) => x !== sugg));
    // [s82] AI 연출 채택 = AI_SUGGESTION 귀속 (suppressLog 로 인간 기록 차단 후 단독 기록)
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

  return (
    // [Z2a-chatcanvas] 접이식 노아 채팅 도크 — 기본 접힘 (씬 테이블 작업 무방해),
    // 열면 좌측 1/3 채팅 + 캔버스 축소. 접힘 상태 noa-lg-chatdock 영속.
    <ChatCanvasDock
      tabKey="direction"
      roleMode="씬 연출 디자이너(콘티 제안가)"
      proposalGuide={DOCK_PROPOSAL_GUIDE}
      contextBlock={dockContext}
      extractSuggestions={dockExtract}
      placeholder="이 회차의 연출에 대해 노아와 대화…"
    >
    <div className="dr-grid">
      <DirectionNav sheets={sheets} currentEpisode={episode} onPick={handlePickEpisode} />
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
      />
      <DirectionPanel
        episode={episode}
        episodeTitle={episodeTitle}
        scenes={scenes}
        selected={selected}
        longArc={longArc}
        episodes={episodesForArc}
        language={language}
        isKO={isKO}
      />
    </div>
    </ChatCanvasDock>
  );
}
