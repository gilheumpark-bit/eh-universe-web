import type {
  Character,
  EpisodeSceneSheet,
  StoryConfig,
} from "@/lib/studio-types";
import type { AuditPerspective } from "@/lib/creative/qa-auditor";

const FINDING_TYPES = ["repetition", "causality", "voice", "pacing"] as const;
export type FindingType = (typeof FINDING_TYPES)[number];
const FINDING_SEVERITIES = ["high", "medium", "low"] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export interface ProofreadFinding {
  type: FindingType;
  severity: FindingSeverity;
  location: string;
  diagnosis: string;
  suggestion: string;
}

export const PROOFREAD_SCHEMA = {
  type: "object" as const,
  properties: {
    findings: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          type: { type: "string" as const, enum: [...FINDING_TYPES] },
          severity: { type: "string" as const, enum: [...FINDING_SEVERITIES] },
          location: { type: "string" as const },
          diagnosis: { type: "string" as const },
          suggestion: { type: "string" as const },
        },
        required: ["type", "severity", "location", "diagnosis", "suggestion"],
      },
    },
  },
  required: ["findings"],
};

const MAX_FINDINGS = 20;
export const MAX_AI_CHARS = 20_000;

export function parseProofreadFindings(data: unknown): ProofreadFinding[] {
  if (!data || typeof data !== "object") return [];
  const raw = (data as { findings?: unknown }).findings;
  if (!Array.isArray(raw)) return [];
  const out: ProofreadFinding[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const finding = item as Record<string, unknown>;
    const type =
      typeof finding.type === "string" && (FINDING_TYPES as readonly string[]).includes(finding.type)
        ? (finding.type as FindingType)
        : null;
    const diagnosis = typeof finding.diagnosis === "string" ? finding.diagnosis.trim() : "";
    if (!type || !diagnosis) continue;
    const severity =
      typeof finding.severity === "string" &&
      (FINDING_SEVERITIES as readonly string[]).includes(finding.severity)
        ? (finding.severity as FindingSeverity)
        : "low";
    out.push({
      type,
      severity,
      location: typeof finding.location === "string" ? finding.location.trim().slice(0, 200) : "",
      diagnosis: diagnosis.slice(0, 500),
      suggestion: typeof finding.suggestion === "string" ? finding.suggestion.trim().slice(0, 500) : "",
    });
    if (out.length >= MAX_FINDINGS) break;
  }
  return out;
}

export function buildCharacterDnaBlock(characters: Character[]): string | undefined {
  const named = characters.filter((character) => character.name.trim());
  if (named.length === 0) return undefined;
  const maxCharacters = 12;
  const lines = named.slice(0, maxCharacters).map((character) => {
    const bits = [
      character.role.trim() ? `역할: ${character.role.trim()}` : "",
      character.traits.trim() ? `특성: ${character.traits.trim()}` : "",
      character.speechStyle?.trim() ? `말투: ${character.speechStyle.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    return `- ${character.name.trim()}${bits ? ` (${bits})` : ""}`;
  });
  if (named.length > maxCharacters) lines.push(`(외 ${named.length - maxCharacters}명 생략)`);
  return lines.join("\n");
}

export function buildSceneSheetBlock(sheet: EpisodeSceneSheet | undefined): string | undefined {
  if (!sheet) return undefined;
  const head = [
    `${sheet.episode}화${sheet.title ? ` · ${sheet.title}` : ""}`,
    sheet.arc ? `아크: ${sheet.arc}` : "",
    sheet.characters ? `회차 등장인물: ${sheet.characters}` : "",
  ].filter(Boolean);
  const rows = (sheet.scenes ?? []).map(
    (scene) => `- ${scene.sceneName || scene.sceneId || "(제목 없음)"} [${scene.tone || "-"}] ${scene.summary || ""}`.trimEnd(),
  );
  const body = rows.length ? `씬 ${rows.length}개:\n${rows.join("\n")}` : "등록된 씬 없음";
  return `${head.join("\n")}\n${body}`;
}

export function buildStorySummaryBlock(config: StoryConfig): string | undefined {
  const parts = [
    config.corePremise?.trim() ? `핵심 전제: ${config.corePremise.trim().slice(0, 600)}` : "",
    config.synopsis?.trim() ? `시놉시스: ${config.synopsis.trim().slice(0, 1500)}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : undefined;
}

export const CRITIQUE_ORDER: readonly AuditPerspective[] = ["consistency", "outsider", "refuter", "structure"];

export const CRITIQUE_LABEL: Record<AuditPerspective, { ko: string; en: string }> = {
  consistency: { ko: "편집자", en: "Editor" },
  outsider: { ko: "평론가", en: "Critic" },
  refuter: { ko: "동료 작가", en: "Writer" },
  structure: { ko: "구조 감평", en: "Structure" },
};

export const FINDING_TYPE_LABEL: Record<FindingType, { ko: string; en: string }> = {
  repetition: { ko: "우회 반복", en: "Paraphrased repetition" },
  causality: { ko: "인과 단절", en: "Causality break" },
  voice: { ko: "보이스 드리프트", en: "Voice drift" },
  pacing: { ko: "페이싱", en: "Pacing" },
};

export const SEVERITY_LABEL: Record<FindingSeverity, { ko: string; en: string }> = {
  high: { ko: "높음", en: "high" },
  medium: { ko: "중간", en: "medium" },
  low: { ko: "낮음", en: "low" },
};

export const REACTION_RISK_LABEL = {
  low: { ko: "낮음", en: "low" },
  medium: { ko: "보통", en: "medium" },
  high: { ko: "높음", en: "high" },
} as const;
