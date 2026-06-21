"use client";

import { useEffect, useState } from "react";
import type {
  AcceptedImportCandidateRecord,
  Character,
  EpisodeSceneEntry,
  EpisodeSceneSheet,
  SceneProductionDirection,
  StoryConfig,
} from "@/lib/studio-types";
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
export function fireCpLog(p: Promise<string | null> | null | undefined): void {
  if (!p) { surfaceCpLogFailure(); return; }
  p.then((id) => { if (id === null) surfaceCpLogFailure(); }).catch(() => surfaceCpLogFailure());
}
export const getCreativeLogger = () =>
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

export function toneColor(tone: string): string {
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

export const grad = (i: number): string => GRADS[i % GRADS.length];
export const DIRECTION_NAV_KEY = "noa-lg-direction-nav";
export const DIRECTION_PANEL_KEY = "noa-lg-direction-panel";

function readDirectionNarrowLayout(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(max-width: 1179.98px)").matches;
}

export function readDirectionPanelOpen(key: string): boolean {
  if (typeof window === "undefined") return false;
  if (readDirectionNarrowLayout()) return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writeDirectionPanelOpen(key: string, open: boolean): void {
  try {
    window.localStorage.setItem(key, open ? "1" : "0");
  } catch {
    /* quota/private mode — 세션 내 상태만 유지 */
  }
}

export function useDirectionPanelSheet(): boolean {
  const [isSheet, setIsSheet] = useState(readDirectionNarrowLayout);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(max-width: 1179.98px)");
    const sync = () => setIsSheet(query.matches);
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);

  return isSheet;
}

// 6 컬럼 — loreguard.css .dr-trow grid (1.6 .7 1.7 1.7 .55 .9) 와 1:1.
// 실제 EpisodeSceneEntry 필드로 헤더 정정 (날조 "길이/검수" → "감정 포인트/다음 씬").
export const TABLE_HEADERS = ["샷 (씬)", "장면 톤", "연출 의도", "핵심 대사", "감정 포인트", "다음 씬"];

export const TONE_OPTIONS = ["감동", "긴장", "개그", "액션", "일상", "반전", "공포", "서사"];

export const SCENE_DESIGN_FIELDS = [
  { key: "purpose", label: "목적" },
  { key: "conflict", label: "갈등" },
  { key: "publicInfo", label: "공개 정보" },
  { key: "hiddenInfo", label: "숨김 정보" },
  { key: "emotionCurve", label: "감정곡선" },
  { key: "rewardBeat", label: "보상감" },
  { key: "hookPoint", label: "후킹" },
  { key: "nextScene", label: "다음 연결" },
] as const;

export type SceneDesignFieldKey = (typeof SCENE_DESIGN_FIELDS)[number]["key"];

export function sceneDesignValue(scene: EpisodeSceneEntry, key: SceneDesignFieldKey): string {
  const value = scene[key];
  return typeof value === "string" ? value.trim() : "";
}

export function sceneDesignSummary(scene: EpisodeSceneEntry): string {
  return SCENE_DESIGN_FIELDS
    .map(({ key, label }) => {
      const value = sceneDesignValue(scene, key);
      return value ? `${label}: ${value}` : "";
    })
    .filter(Boolean)
    .join(" | ");
}

export const PRODUCTION_DIRECTION_FIELDS = [
  { key: "miseEnScene", label: "미장센", placeholder: "공간 배치, 색감, 상징 오브젝트" },
  { key: "camera", label: "카메라", placeholder: "앵글, 구도, 시선 이동, 컷 전환" },
  { key: "lighting", label: "조명", placeholder: "광원, 명암, 색온도, 시간대" },
  { key: "sound", label: "사운드", placeholder: "침묵, 효과음, 음악, 환경음" },
  { key: "action", label: "액션", placeholder: "동선, 충돌, 제스처, 전투 리듬" },
  { key: "proseRhythm", label: "문장 리듬", placeholder: "문장 길이, 단락 호흡, 속도감" },
] as const;

export type ProductionDirectionFieldKey = (typeof PRODUCTION_DIRECTION_FIELDS)[number]["key"];

export function productionDirectionValue(profile: SceneProductionDirection | undefined, key: ProductionDirectionFieldKey): string {
  const value = profile?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function appendProductionLine(current: string | undefined, addition: string): string {
  const cleanAddition = addition.trim();
  if (!cleanAddition) return current?.trim() ?? "";
  const cleanCurrent = current?.trim();
  if (!cleanCurrent) return cleanAddition;
  if (cleanCurrent.includes(cleanAddition)) return cleanCurrent;
  return `${cleanCurrent}\n${cleanAddition}`;
}

function readLabeledDirectionLine(line: string): { key: ProductionDirectionFieldKey; value: string } | null {
  const trimmed = line.trim();
  const match = /^(미장센|공간|배치|색감|프레임|컷\s*\d+|카메라|구도|앵글|렌즈|조명|빛|색온도|사운드|음향|효과음|음악|침묵|액션|동선|움직임|전투|문장\s*리듬|리듬|호흡|문체)\s*[:：]\s*(.+)$/u.exec(trimmed);
  if (!match) return null;
  const label = match[1];
  const value = match[2]?.trim() ?? "";
  if (!value) return null;
  if (/^(미장센|공간|배치|색감|프레임)$/u.test(label)) return { key: "miseEnScene", value };
  if (/^(컷\s*\d+|카메라|구도|앵글|렌즈)$/u.test(label)) return { key: "camera", value };
  if (/^(조명|빛|색온도)$/u.test(label)) return { key: "lighting", value };
  if (/^(사운드|음향|효과음|음악|침묵)$/u.test(label)) return { key: "sound", value };
  if (/^(액션|동선|움직임|전투)$/u.test(label)) return { key: "action", value };
  return { key: "proseRhythm", value };
}

export function buildProductionDirectionFromCandidate(
  candidate: AcceptedImportCandidateRecord,
  current: SceneProductionDirection | undefined,
): SceneProductionDirection {
  const next: SceneProductionDirection = { ...(current ?? {}), updatedAt: Date.now() };
  const lines = candidate.text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const labeled = readLabeledDirectionLine(line);
    if (!labeled) continue;
    next[labeled.key] = appendProductionLine(next[labeled.key], labeled.value);
  }

  if (!PRODUCTION_DIRECTION_FIELDS.some(({ key }) => productionDirectionValue(next, key))) {
    next.miseEnScene = appendProductionLine(next.miseEnScene, candidate.excerpt || candidate.text);
  }

  return next;
}

// ============================================================
// PART 1.5 — 노아 연출 제안 (기존 structured-generate 엔진 재사용)
// ============================================================
// IDENTITY_SEAL: PART-1.5 | role=ai-direction-suggest | inputs=config,scenes | outputs=DirectionAiSuggestion[]
// 엔진: /api/structured-generate (provider 무관 JSON 라우트 — useTranslation·
// publish-audit 와 동일 호출 패턴). 신규 라우트/엔진 생성 X.

export interface DirectionAiSuggestion {
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
export const DIRECTION_AI_SCHEMA = {
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
export function buildDirectionPrompt(
  config: StoryConfig,
  episode: number,
  episodeTitle: string,
  scenes: EpisodeSceneEntry[],
): string {
  const sceneLines = scenes.length
    ? scenes
        .map(
          (s) => {
            const design = sceneDesignSummary(s);
            return `- [${s.sceneId}] ${s.sceneName || "(제목 없음)"} | 톤: ${s.tone || "-"} | 연출 의도: ${s.summary || "-"} | 핵심 대사: ${s.keyDialogue || "-"} | 감정 포인트: ${s.emotionPoint || "-"} | 8영역: ${design || "-"}`;
          },
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
export function buildSceneSheetBlock(sheet: EpisodeSceneSheet | undefined): string | undefined {
  if (!sheet) return undefined;
  const head = [
    `${sheet.episode}화${sheet.title ? ` · ${sheet.title}` : ""}`,
    sheet.arc ? `아크: ${sheet.arc}` : "",
    sheet.characters ? `회차 등장인물: ${sheet.characters}` : "",
  ].filter(Boolean);
  // 씬 행은 user 블록(buildDirectionPrompt)에 전체 필드가 이미 실리므로
  // 여기서는 이름·톤·의도만 압축 (중복 토큰 최소화).
  const rows = (sheet.scenes ?? []).map((s) => {
    const design = sceneDesignSummary(s);
    return `- ${s.sceneName || s.sceneId || "(제목 없음)"} [${s.tone || "-"}] ${s.summary || ""}${design ? ` / ${design}` : ""}`.trimEnd();
  });
  const body = rows.length ? `씬 ${rows.length}개:\n${rows.join("\n")}` : "등록된 씬 없음";
  return `${head.join("\n")}\n${body}`;
}

/** config.characters → character-dna 블록. 이름 있는 캐릭터 없으면 미주입. */
export function buildCharacterDnaBlock(characters: Character[]): string | undefined {
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
export function buildStorySummaryBlock(config: StoryConfig): string | undefined {
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
export const DIRECTION_SCHEMA_OVERRIDE = `[출력 스키마 — 본 호출 한정 오버라이드] 위 임무 설명의 "shots" 스키마는 이 호출에 적용하지 않습니다. 반드시 아래 형식의 JSON 만 출력하십시오: { "suggestions": [ { "sceneName": string, "tone": string, "summary": string, "keyDialogue": string, "emotionPoint": string } ] }`;

/** 응답 검증 — 필수 필드·톤 어휘 미충족 행은 정직하게 드롭 (날조 보정 X). */
export function parseDirectionSuggestions(data: unknown): DirectionAiSuggestion[] {
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

// ============================================================
// PART 1.7 — 프로젝트 생성에서 읽은 자료 → 씬시트/연출 반영
// ============================================================

export function parseImportedSceneRows(
  candidate: AcceptedImportCandidateRecord,
  episode: number,
  startIndex = 0,
): EpisodeSceneEntry[] {
  const rows = candidate.text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed: EpisodeSceneEntry[] = [];
  rows.forEach((line, idx) => {
    const stripped = line.replace(/^씬\s*\d+\s*[:：]\s*/u, "").trim();
    const [namePart, ...summaryParts] = stripped.split(/\s+[-—]\s+/u);
    const rawName = namePart.trim() || stripped;
    const summary = summaryParts.join(" - ").trim() || candidate.excerpt || candidate.text;
    const cleanName = rawName.replace(/[.。]$/u, "").trim() || `씬 ${idx + 1}`;
    parsed.push({
      sceneId: `${episode}-${startIndex + idx + 1}`,
      sceneName: cleanName,
      characters: "",
      tone: "긴장",
      summary,
      purpose: summary,
      conflict: "",
      publicInfo: cleanName,
      hiddenInfo: "",
      emotionCurve: "긴장 → 확인",
      rewardBeat: "",
      hookPoint: summary,
      keyDialogue: "",
      emotionPoint: "",
      nextScene: "",
    });
  });
  if (parsed.length > 0) {
    return parsed.map((scene, idx) => ({
      ...scene,
      nextScene: scene.nextScene || parsed[idx + 1]?.sceneId || "",
    }));
  }
  return [
    {
      sceneId: `${episode}-${startIndex + 1}`,
      sceneName: candidate.title || "가져온 씬",
      characters: "",
      tone: "긴장",
      summary: candidate.excerpt || candidate.text,
      purpose: candidate.excerpt || candidate.text,
      conflict: "",
      publicInfo: candidate.title || "가져온 씬",
      hiddenInfo: "",
      emotionCurve: "도입 → 확인",
      rewardBeat: "",
      hookPoint: candidate.excerpt || candidate.text,
      keyDialogue: "",
      emotionPoint: "",
      nextScene: "",
    },
  ];
}

export function appendImportedNotes(current: string | undefined, candidate: AcceptedImportCandidateRecord): string {
  const base = current?.trim();
  const imported = `[가져온자료: ${candidate.sourceFileName}]\n${candidate.text.trim()}`;
  return base ? `${base}\n\n${imported}` : imported;
}

export function cleanImportedDirectionTitle(title: string): string {
  return title.replace(/^연출\s*[:：]\s*/u, "").trim() || title;
}

export function candidateSubtitle(candidate: AcceptedImportCandidateRecord): string {
  const confidence = Math.round(candidate.confidence * 100);
  return `${candidate.sourceFileName} · 일치도 ${confidence}%`;
}

export function candidateMeta(candidate: AcceptedImportCandidateRecord): string {
  return `${candidate.detectedFormat.toUpperCase()} · ${candidate.charCount.toLocaleString("ko-KR")}자`;
}

export function candidateNotices(candidate: AcceptedImportCandidateRecord) {
  return (candidate.alignmentWarnings ?? []).map((warning) => ({
    label: warning.label,
    detail: warning.detail,
    severity: warning.severity === "warning" ? "warning" as const : "info" as const,
  }));
}

// ---- [Z2a-chatcanvas] 채팅 도크 — 콘티 제안 JSON 블록 형식 지시 ----
// 스키마는 DIRECTION_AI_SCHEMA 와 동일 shape → parseDirectionSuggestions 그대로 재사용.
export const DOCK_PROPOSAL_GUIDE = `[캔버스 제안 형식] 대화 중 구체적인 콘티(연출 샷) 제안에 도달하면, 응답 끝에 아래 형식의 \`\`\`json 코드 블록을 1개 포함하십시오 (제안이 없으면 블록 생략):
\`\`\`json
{"suggestions":[{"sceneName":"씬 제목","tone":"장면 톤","summary":"연출 의도 1~2문장","keyDialogue":"핵심 대사 1줄","emotionPoint":"독자 감정 한 구절"}]}
\`\`\`
tone 은 반드시 다음 중 하나: ${TONE_OPTIONS.join(", ")}. 캔버스 반영은 작가가 채택 버튼으로 확정합니다 — 이미 반영했다고 단정하지 마십시오.`;


