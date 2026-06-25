import { GUARDS, STRUCTURED_PLOT_GUARD_IDS } from "@/lib/ai/writing-agent-registry";
import { buildNoaSystemHeader } from "@/lib/ai/noa-identity";
import { lazyFirebaseAuth } from "@/lib/firebase";
import type {
  AcceptedImportCandidateRecord,
  EpisodeSceneSheet,
  MainScenarioAct,
  MainScenarioEvent,
  MainScenarioSentence,
  MainScenarioStructure,
  StoryConfig,
} from "@/lib/studio-types";

export interface Phase {
  name: string;
  range: string;
  g: string;
}

export const PHASES: Phase[] = [
  { name: "도입", range: "0 – 25%", g: "var(--phase-1)" },
  { name: "전개", range: "25 – 60%", g: "var(--phase-2)" },
  { name: "절정", range: "60 – 85%", g: "var(--phase-3)" },
  { name: "결말", range: "85 – 100%", g: "var(--phase-4)" },
];

export const TL_BARS: [string, number, string][] = [
  ["도입", 25, "var(--phase-1)"],
  ["전개", 35, "var(--phase-2)"],
  ["절정", 25, "var(--phase-3)"],
  ["결말", 15, "var(--phase-4)"],
];

const SEVEN_SENTENCE_LABELS = [
  "1. 시작 상태",
  "2. 균열 사건",
  "3. 첫 선택",
  "4. 확장 갈등",
  "5. 반전/대가",
  "6. 최종 선택",
  "7. 결말 이미지",
] as const;

const DEFAULT_SCENARIO_ACTS: MainScenarioAct[] = [
  { id: "act1", title: "1막 도입", seasonLabel: "시즌/부 1", startEpisode: 1, endEpisode: undefined, summary: "" },
  { id: "act2", title: "2막 전개", seasonLabel: "시즌/부 2", startEpisode: undefined, endEpisode: undefined, summary: "" },
  { id: "act3", title: "3막 결말", seasonLabel: "시즌/부 3", startEpisode: undefined, endEpisode: undefined, summary: "" },
];

const PH_COLORS = ["var(--c-blue)", "var(--c-teal)", "var(--c-purple)", "var(--c-blue)"];
const PH_ACCENT_CLASSES = ["pl-accent-blue", "pl-accent-teal", "pl-accent-purple", "pl-accent-blue"];
const PHASE_TONE_CLASSES: Record<string, string> = {
  "도입": "pl-tone-intro",
  "전개": "pl-tone-build",
  "절정": "pl-tone-climax",
  "결말": "pl-tone-ending",
};
const TIMELINE_TONE_CLASSES: Record<string, string> = {
  "도입": "pl-tl-intro",
  "전개": "pl-tl-build",
  "절정": "pl-tl-climax",
  "결말": "pl-tl-ending",
};

export const accentFor = (index: number): string =>
  PH_COLORS[index % PH_COLORS.length] ?? "var(--c-blue)";

export const accentToneClass = (index: number): string =>
  PH_ACCENT_CLASSES[index % PH_ACCENT_CLASSES.length] ?? "pl-accent-blue";

export const phaseToneClass = (name: string): string =>
  PHASE_TONE_CLASSES[name] ?? "pl-tone-intro";

export const timelineToneClass = (name: string): string =>
  TIMELINE_TONE_CLASSES[name] ?? "pl-tl-intro";

export const FLOW_COL_W = 260;
export const FLOW_SCENE_Y0 = 120;
export const FLOW_SCENE_GAP = 86;

export function genSheetId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through to fallback */
  }
  return `beat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function beatDesc(sheet: EpisodeSceneSheet): string {
  const parts: string[] = [];
  if (sheet.arc) parts.push(sheet.arc);
  if (sheet.characters) parts.push(sheet.characters);
  if (sheet.scenes && sheet.scenes.length > 0) {
    parts.push(`장면 ${sheet.scenes.length}개`);
  }
  return parts.join(" · ");
}

export interface BeatSuggestion {
  title: string;
  summary: string;
}

export const BEAT_SUGGEST_SCHEMA = {
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

export function buildBeatPrompt(config: StoryConfig | null, sheets: EpisodeSceneSheet[]): string {
  const lines: string[] = [
    buildNoaSystemHeader("한국 웹소설 플롯 설계 어시스턴트"),
    "",
    GUARDS[STRUCTURED_PLOT_GUARD_IDS.ipBrand],
    GUARDS[STRUCTURED_PLOT_GUARD_IDS.jsonOnly],
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
    .map((character) => character.name)
    .filter(Boolean)
    .slice(0, 20);
  if (names.length > 0) lines.push(`[등장인물] ${names.join(", ")}`);
  if (sheets.length > 0) {
    lines.push("[현재 비트 보드]");
    for (const sheet of sheets) {
      lines.push(`- ${sheet.episode}화: ${sheet.title}${sheet.arc ? ` — ${sheet.arc}` : ""}`);
    }
  } else {
    lines.push("[현재 비트 보드] 아직 비트가 없습니다. 도입부 비트부터 제안하십시오.");
  }
  return lines.join("\n");
}

export function parseBeatSuggestions(data: unknown): BeatSuggestion[] {
  if (!data || typeof data !== "object") return [];
  const beats = (data as { beats?: unknown }).beats;
  if (!Array.isArray(beats)) return [];
  const out: BeatSuggestion[] = [];
  for (const beat of beats) {
    if (!beat || typeof beat !== "object") continue;
    const rec = beat as { title?: unknown; summary?: unknown };
    const title = typeof rec.title === "string" ? rec.title.trim() : "";
    const summary = typeof rec.summary === "string" ? rec.summary.trim() : "";
    if (title) out.push({ title, summary });
    if (out.length >= 6) break;
  }
  return out;
}

export function cleanImportedMainScenarioTitle(title: string): string {
  return title.replace(/^메인\s*시나리오\s*[:：]\s*/u, "").trim() || title;
}

export function mainScenarioImportCandidates(config: StoryConfig | null): AcceptedImportCandidateRecord[] {
  return (config?.acceptedImportCandidates ?? []).filter(
    (candidate) => candidate.bucket === "mainScenario" && !candidate.routedAt,
  );
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

export function parseImportedMainScenarioRows(
  candidate: AcceptedImportCandidateRecord,
  existing: EpisodeSceneSheet[],
): EpisodeSceneSheet[] {
  const source = candidate.text || candidate.excerpt || "";
  const lines = source
    .split(/\r?\n/u)
    .map((line) => line.replace(/^[\s>*\-•·]+/u, "").trim())
    .filter(Boolean);
  const usedEpisodes = new Set(existing.map((sheet) => sheet.episode));
  const parsed: EpisodeSceneSheet[] = [];

  const nextEpisode = () => {
    let episode = Math.max(0, ...Array.from(usedEpisodes), ...parsed.map((sheet) => sheet.episode)) + 1;
    while (usedEpisodes.has(episode) || parsed.some((sheet) => sheet.episode === episode)) episode += 1;
    return episode;
  };

  for (const line of lines) {
    const match = /^(?:제\s*)?(\d+)\s*화\s*[:：.\-–—]?\s*(.+)$/u.exec(line);
    const episode = match ? Number(match[1]) : nextEpisode();
    const body = (match ? match[2] : line).trim();
    const [rawTitle, ...arcParts] = body.split(/\s+[-–—]\s+/u);
    const title = (rawTitle || body || candidate.title).trim();
    const arc = (arcParts.join(" - ").trim() || body.replace(title, "").trim()).replace(/^[-–—]\s*/u, "");

    parsed.push({
      id: genSheetId(),
      episode,
      title: title || `${episode}화`,
      arc: arc || candidate.excerpt || "",
      lastUpdate: Date.now(),
    });
  }

  if (parsed.length > 0) return parsed;
  return [
    {
      id: genSheetId(),
      episode: nextEpisode(),
      title: cleanImportedMainScenarioTitle(candidate.title),
      arc: candidate.excerpt || candidate.text,
      lastUpdate: Date.now(),
    },
  ];
}

function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const clean = value.trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

function sentenceFragments(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？])\s+|\r?\n/u)
    .map((part) => part.replace(/^[\s>*\-•·]+/u, "").trim())
    .filter(Boolean);
}

function buildSevenSentenceSynopsis(
  candidate: AcceptedImportCandidateRecord,
  rows: EpisodeSceneSheet[],
): MainScenarioSentence[] {
  const rowLines = rows.map((row) => `${row.title}${row.arc ? `: ${row.arc}` : ""}`);
  const sourceLines = sentenceFragments(candidate.text || candidate.excerpt || "");
  const texts = uniqueNonEmpty([...rowLines, ...sourceLines, candidate.excerpt || ""]).slice(0, 7);
  return SEVEN_SENTENCE_LABELS.map((label, index) => ({
    id: `synopsis-${index + 1}`,
    index: index + 1,
    label,
    text: texts[index] ?? "",
  }));
}

function buildScenarioActs(rows: EpisodeSceneSheet[], existing?: MainScenarioStructure): MainScenarioAct[] {
  if (existing?.acts?.length) return existing.acts;
  const sorted = [...rows].sort((a, b) => a.episode - b.episode);
  if (sorted.length === 0) return DEFAULT_SCENARIO_ACTS.map((act) => ({ ...act }));
  const first = sorted[0]?.episode;
  const last = sorted[sorted.length - 1]?.episode;
  const midpoint = sorted[Math.floor(sorted.length / 2)]?.episode;
  return [
    {
      ...DEFAULT_SCENARIO_ACTS[0],
      startEpisode: first,
      endEpisode: midpoint,
      summary: sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 3))).map((row) => row.title).join(" → "),
    },
    {
      ...DEFAULT_SCENARIO_ACTS[1],
      startEpisode: midpoint,
      endEpisode: last,
      summary: sorted
        .slice(Math.max(1, Math.ceil(sorted.length / 3)), Math.max(2, Math.ceil(sorted.length * 2 / 3)))
        .map((row) => row.title)
        .join(" → "),
    },
    {
      ...DEFAULT_SCENARIO_ACTS[2],
      startEpisode: last,
      endEpisode: last,
      summary: sorted.slice(Math.max(0, Math.ceil(sorted.length * 2 / 3))).map((row) => row.title).join(" → "),
    },
  ];
}

export function buildEventChain(rows: EpisodeSceneSheet[]): MainScenarioEvent[] {
  return [...rows]
    .sort((a, b) => a.episode - b.episode)
    .map((row, index, sorted) => ({
      id: row.id ?? `event-${row.episode}-${index + 1}`,
      order: index + 1,
      title: row.title || `${row.episode}화`,
      cause: index === 0 ? "도입 사건" : sorted[index - 1]?.title,
      effect: row.arc || row.scenes?.[0]?.summary || "",
      linkedEpisode: row.episode,
      locked: false,
    }));
}

export function buildScenarioStructureFromImport(
  candidate: AcceptedImportCandidateRecord,
  rows: EpisodeSceneSheet[],
  existing?: MainScenarioStructure,
): MainScenarioStructure {
  const now = new Date().toISOString();
  return {
    ...existing,
    sevenSentenceSynopsis: buildSevenSentenceSynopsis(candidate, rows),
    acts: buildScenarioActs(rows, existing),
    endingLock: existing?.endingLock ?? { locked: false, updatedAt: now },
    eventChain: buildEventChain(rows),
    updatedAt: now,
  };
}

export function normalizeMainScenarioStructure(
  config: StoryConfig | null,
  sheets: EpisodeSceneSheet[],
): MainScenarioStructure {
  const existing = config?.mainScenarioStructure;
  const synopsisTexts = existing?.sevenSentenceSynopsis?.length
    ? existing.sevenSentenceSynopsis
    : SEVEN_SENTENCE_LABELS.map((label, index) => ({
        id: `synopsis-${index + 1}`,
        index: index + 1,
        label,
        text: index === 0 ? (config?.synopsis ?? "") : "",
      }));
  return {
    sevenSentenceSynopsis: synopsisTexts,
    acts: existing?.acts?.length ? existing.acts : DEFAULT_SCENARIO_ACTS.map((act) => ({ ...act })),
    endingLock: existing?.endingLock ?? { locked: false },
    eventChain: existing?.eventChain?.length ? existing.eventChain : buildEventChain(sheets),
    updatedAt: existing?.updatedAt,
  };
}

export const DOCK_PROPOSAL_GUIDE = `[캔버스 제안 형식] 대화 중 구체적인 비트(beat) 제안에 도달하면, 응답 끝에 아래 형식의 \`\`\`json 코드 블록을 1개 포함하십시오 (제안이 없으면 블록 생략):
\`\`\`json
{"beats":[{"title":"20자 이내 제목","summary":"1~2문장 요약"}]}
\`\`\`
캔버스 반영은 작가가 채택 버튼으로 확정합니다 — 이미 반영했다고 단정하지 마십시오.`;

export const BEAT_CACHE_MODEL = "structured-generate/default";

export function beatCacheMessages(prompt: string): Array<{ role: string; content: string }> {
  return [
    { role: "user", content: prompt },
    { role: "system", content: JSON.stringify(BEAT_SUGGEST_SCHEMA) },
  ];
}

export async function buildAiHeaders(): Promise<Record<string, string>> {
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
