"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Alert,
  Book,
  Check,
  Chevron,
  ChevronL,
  ChevronR,
  Clock,
  Coins,
  Flag,
  Globe,
  Grad,
  Layers,
  Lock,
  Map,
  Pin,
  Plus,
  Route,
  Scale,
  Shield,
  Sparkle,
  User,
  Eye,
} from "@/components/loreguard/icons";
import type {
  AcceptedImportCandidateRecord,
  StoryConfig,
  WorldFactArcsStatus,
  WorldFieldEvidenceRecord,
} from "@/lib/studio-types";

export type WorldFieldKey =
  | "corePremise"
  | "powerStructure"
  | "currentConflict"
  | "worldHistory"
  | "socialSystem"
  | "economy"
  | "magicTechSystem"
  | "factionRelations"
  | "survivalEnvironment"
  | "culture"
  | "religion"
  | "education"
  | "lawOrder"
  | "taboo"
  | "dailyLife"
  | "travelComm"
  | "truthVsBeliefs";

export interface WorldFieldDef {
  key: WorldFieldKey;
  ic: LucideIcon;
  color: string;
  title: string;
  desc: string;
  tier: 1 | 2 | 3;
}

export const WORLD_FIELDS: WorldFieldDef[] = [
  { key: "corePremise", ic: Globe, color: "var(--c-blue)", title: "핵심 전제", desc: "현실과 다른 이 세계의 근본 전제를 정의합니다.", tier: 1 },
  { key: "powerStructure", ic: Scale, color: "var(--c-purple)", title: "권력 구조", desc: "누가 세계를 지배하고 어떤 질서가 작동하는지 정리합니다.", tier: 1 },
  { key: "currentConflict", ic: Alert, color: "var(--c-red)", title: "현재 갈등", desc: "이야기를 움직이는 지금의 핵심 갈등을 기록합니다.", tier: 1 },
  { key: "worldHistory", ic: Clock, color: "var(--c-green)", title: "역사", desc: "세계의 주요 사건과 시대 흐름을 연대순으로 정리합니다.", tier: 2 },
  { key: "socialSystem", ic: Layers, color: "var(--c-teal)", title: "사회 시스템", desc: "신분·계층·제도 등 사회가 작동하는 방식을 정의합니다.", tier: 2 },
  { key: "economy", ic: Coins, color: "var(--c-amber)", title: "경제와 생활", desc: "자원·화폐·일상적 생업 등 경제가 돌아가는 방식을 정리합니다.", tier: 2 },
  { key: "magicTechSystem", ic: Sparkle, color: "var(--c-amber)", title: "마법 / 기술 체계", desc: "마법 또는 기술의 원천·규칙·한계를 체계적으로 정리합니다.", tier: 2 },
  { key: "factionRelations", ic: Shield, color: "var(--c-blue)", title: "종족 / 세력 관계", desc: "주요 종족·세력과 그들 사이의 관계를 정리합니다.", tier: 2 },
  { key: "survivalEnvironment", ic: Map, color: "var(--c-green)", title: "생존 환경", desc: "지리·기후·위험 요소 등 생존 조건을 정의합니다.", tier: 2 },
  { key: "culture", ic: Book, color: "var(--c-purple)", title: "문화", desc: "관습·예술·언어 등 세계의 문화적 결을 정의합니다.", tier: 3 },
  { key: "religion", ic: Flag, color: "var(--c-amber)", title: "종교와 신화", desc: "신앙·신화·세계관적 믿음 체계를 정리합니다.", tier: 3 },
  { key: "education", ic: Grad, color: "var(--c-blue)", title: "교육/지식 전달", desc: "어떻게 배우고 가르치는지, 지식이 전달되는 방식을 정리합니다.", tier: 3 },
  { key: "lawOrder", ic: Lock, color: "var(--c-green)", title: "법과 질서", desc: "법·치안·처벌 등 질서 유지 방식을 정의합니다.", tier: 3 },
  { key: "taboo", ic: Pin, color: "var(--c-red)", title: "금기와 규범", desc: "넘으면 안 되는 금기와 사회적 규범을 기록합니다.", tier: 3 },
  { key: "dailyLife", ic: User, color: "var(--c-teal)", title: "평범한 사람의 하루", desc: "아침에 일어나서 잠들기까지 평범한 사람의 하루를 그립니다.", tier: 3 },
  { key: "travelComm", ic: Route, color: "var(--c-purple)", title: "이동/통신 속도", desc: "도시 간 이동 시간과 정보가 전달되는 속도를 정의합니다.", tier: 3 },
  { key: "truthVsBeliefs", ic: Eye, color: "var(--c-amber)", title: "믿음 vs 진실", desc: "사람들이 믿는 것과 실제 진실의 간극을 기록합니다.", tier: 3 },
];

export const TIER_TONE: Record<1 | 2 | 3, string> = { 1: "purple", 2: "blue", 3: "teal" };
export const TIER_LABEL: Record<1 | 2 | 3, string> = { 1: "1단계 뼈대", 2: "2단계 작동", 3: "3단계 디테일" };
export const WORLD_TIERS = [1, 2, 3] as const;

const ARCS_STATUS_LABEL: Record<WorldFactArcsStatus, { label: string; tone: string }> = {
  not_checked: { label: "미검토", tone: "gray" },
  draft: { label: "초안", tone: "amber" },
  hold: { label: "보류", tone: "amber" },
  pass: { label: "통과", tone: "green" },
  conflict: { label: "충돌", tone: "red" },
};

export function fieldValue(config: StoryConfig | null | undefined, key: WorldFieldKey): string {
  const value = config?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function candidateConflictCount(candidate: AcceptedImportCandidateRecord): number {
  return (candidate.alignmentWarnings ?? []).filter((warning) => warning.severity === "warning").length;
}

function candidateArcsStatus(candidate: AcceptedImportCandidateRecord): WorldFactArcsStatus {
  if (candidateConflictCount(candidate) > 0) return "conflict";
  if (candidate.confidence >= 0.7) return "pass";
  if (candidate.confidence >= 0.5) return "hold";
  return "hold";
}

export function makeCandidateEvidence(
  candidate: AcceptedImportCandidateRecord,
  fieldKey: WorldFieldKey,
): WorldFieldEvidenceRecord {
  const conflictCount = candidateConflictCount(candidate);
  return {
    fieldKey,
    sourceLabel: candidate.sourceFileName,
    sourceFileName: candidate.sourceFileName,
    sourceCandidateId: candidate.id,
    confidence: candidate.confidence,
    conflictCount,
    arcsStatus: conflictCount > 0 ? "conflict" : candidateArcsStatus(candidate),
    updatedAt: new Date().toISOString(),
    note: candidate.reason,
  };
}

export function makeNoaEvidence(fieldKey: WorldFieldKey): WorldFieldEvidenceRecord {
  return {
    fieldKey,
    sourceLabel: "노아 대화",
    conflictCount: 0,
    arcsStatus: "draft",
    updatedAt: new Date().toISOString(),
    note: "작가가 노아 답변을 채택해 세계관 보드에 반영함",
  };
}

export interface WorldChatDraftSource {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  live?: boolean;
}

export interface WorldChatDraft {
  id: string;
  fieldKey: WorldFieldKey;
  title: string;
  excerpt: string;
  sourceLabel: string;
  confidence: number;
  reason: string;
  pinned?: boolean;
}

const WORLD_FIELD_HINTS: Record<WorldFieldKey, string[]> = {
  corePremise: ["전제", "규칙", "현실", "세계는", "다르게", "근본"],
  powerStructure: ["권력", "지배", "왕", "정부", "귀족", "통제", "의회"],
  currentConflict: ["갈등", "전쟁", "대립", "위기", "문제", "충돌", "압력"],
  worldHistory: ["역사", "과거", "사건", "연대", "시대", "건국", "몰락"],
  socialSystem: ["신분", "계층", "제도", "사회", "시민", "가문"],
  economy: ["경제", "화폐", "자원", "상인", "세금", "생업", "시장"],
  magicTechSystem: ["마법", "기술", "능력", "마나", "시스템", "장치", "초능력"],
  factionRelations: ["세력", "종족", "파벌", "동맹", "관계", "길드", "조직"],
  survivalEnvironment: ["환경", "지리", "기후", "생존", "위험", "황무지", "바다"],
  culture: ["문화", "관습", "예술", "축제", "언어", "전통"],
  religion: ["종교", "신화", "신", "사원", "믿음", "교단"],
  education: ["교육", "학교", "학원", "지식", "전승", "스승"],
  lawOrder: ["법", "치안", "처벌", "재판", "질서", "금지"],
  taboo: ["금기", "규범", "터부", "금지", "하면 안", "불문율"],
  dailyLife: ["일상", "하루", "생활", "먹고", "잠", "평범한 사람"],
  travelComm: ["이동", "통신", "거리", "속도", "교통", "전달", "항로"],
  truthVsBeliefs: ["진실", "거짓", "믿음", "착각", "비밀", "은폐", "왜곡"],
};

function compactWorldDraftText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

function hashWorldDraft(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  }
  return (hash >>> 0).toString(36);
}

function inferWorldFieldKey(text: string, fallback: WorldFieldKey): { key: WorldFieldKey; score: number } {
  const lower = text.toLowerCase();
  let bestKey = fallback;
  let bestScore = 0;
  for (const [key, hints] of Object.entries(WORLD_FIELD_HINTS) as Array<[WorldFieldKey, string[]]>) {
    const score = hints.reduce((sum, hint) => sum + (lower.includes(hint.toLowerCase()) ? 1 : 0), 0);
    if (score > bestScore) {
      bestKey = key;
      bestScore = score;
    }
  }
  return { key: bestKey, score: bestScore };
}

export function buildWorldChatDrafts(
  sources: WorldChatDraftSource[],
  fallbackField: WorldFieldKey,
): WorldChatDraft[] {
  const drafts: WorldChatDraft[] = [];
  const seen = new Set<string>();

  for (const source of sources.slice(-8)) {
    const excerpt = compactWorldDraftText(source.content);
    if (excerpt.length < 18) continue;
    const { key, score } = inferWorldFieldKey(excerpt, fallbackField);
    if (score === 0 && !source.live) continue;
    const id = `${source.live ? "live" : source.id}:${key}:${hashWorldDraft(excerpt)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const fieldTitle = WORLD_FIELDS.find((field) => field.key === key)?.title ?? "세계관";
    const sourceLabel = source.live
      ? "입력 중 메모"
      : source.role === "assistant"
        ? "노아 대화 메모"
        : "작가 대화 메모";
    drafts.push({
      id,
      fieldKey: key,
      title: fieldTitle,
      excerpt,
      sourceLabel,
      confidence: Math.min(0.86, 0.58 + score * 0.08 + (source.live ? 0.02 : 0.06)),
      reason: score > 0 ? `${fieldTitle} 단서 감지` : "현재 선택 항목 기준으로 임시 메모",
    });
  }

  return drafts.slice(-5).reverse();
}

export function makeChatDraftEvidence(draft: WorldChatDraft): WorldFieldEvidenceRecord {
  return {
    fieldKey: draft.fieldKey,
    sourceLabel: draft.sourceLabel,
    confidence: draft.confidence,
    conflictCount: 0,
    arcsStatus: draft.confidence >= 0.74 ? "draft" : "hold",
    updatedAt: new Date().toISOString(),
    note: draft.reason,
  };
}

function EvidenceMeta({ evidence }: { evidence?: WorldFieldEvidenceRecord }) {
  if (!evidence) return null;
  const status = ARCS_STATUS_LABEL[evidence.arcsStatus] ?? ARCS_STATUS_LABEL.not_checked;
  const confidence = typeof evidence.confidence === "number" ? `${Math.round(evidence.confidence * 100)}%` : "검토 전";
  return (
    <div className="wd-card-meta" style={{ flexWrap: "wrap" }}>
      <span>출처 {evidence.sourceLabel}</span>
      <span>일치도 {confidence}</span>
      <span className={`pill ${status.tone}`}>{status.label}</span>
      <span className={`pill ${evidence.conflictCount > 0 ? "red" : "green"}`}>
        충돌 {evidence.conflictCount}
      </span>
    </div>
  );
}

export const WORLD_SECTIONS_KEY = "noa-lg-world-sections";
export const WORLD_RAIL_KEY = "noa-lg-world-rail";
export const WORLD_BOARD_KEY = "noa-lg-world-board";
export type CollapsedTiers = Record<1 | 2 | 3, boolean>;

export interface WorldCollapsedSummaryItem {
  label: string;
  value: string;
  tone: string;
}

export function WorldCollapsedPanel({
  side,
  id,
  label,
  expandLabel,
  summary,
  onExpand,
}: {
  side: "rail" | "board";
  id: string;
  label: string;
  expandLabel: string;
  summary: readonly WorldCollapsedSummaryItem[];
  onExpand: () => void;
}) {
  const ExpandIcon = side === "rail" ? ChevronR : ChevronL;
  return (
    <aside className={`wd-${side} collapsed`} id={id} aria-label={`${label} (접힘)`}>
      <button
        type="button"
        className="wd-panel-toggle"
        aria-expanded={false}
        aria-controls={id}
        aria-label={expandLabel}
        title={expandLabel}
        onClick={onExpand}
      >
        <ExpandIcon size={16} strokeWidth={1.6} aria-hidden="true" />
      </button>
      <span className="wd-vlabel" aria-hidden="true">{label}</span>
      <span
        className="wd-collapsed-summary"
        aria-label={summary.map((item) => `${item.label} ${item.value}`).join(", ")}
      >
        {summary.map((item) => (
          <span key={`${item.label}:${item.value}`} className={`wd-mini-chip ${item.tone}`}>
            <small>{item.label}</small>
            <b>{item.value}</b>
          </span>
        ))}
      </span>
    </aside>
  );
}

const SECTIONS_DEFAULT: CollapsedTiers = { 1: false, 2: false, 3: false };

export function readCollapsedTiers(): CollapsedTiers {
  if (typeof window === "undefined") return SECTIONS_DEFAULT;
  try {
    const raw = window.localStorage.getItem(WORLD_SECTIONS_KEY);
    if (!raw) return SECTIONS_DEFAULT;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return SECTIONS_DEFAULT;
    const p = parsed as Record<string, unknown>;
    return { 1: p["1"] === true, 2: p["2"] === true, 3: p["3"] === true };
  } catch {
    return SECTIONS_DEFAULT;
  }
}

export function readWorldNarrowLayout(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(max-width: 1179.98px)").matches;
}

export function readWorldPanelOpen(key: string): boolean {
  if (typeof window === "undefined") return false;
  if (readWorldNarrowLayout()) return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writeWorldPanelOpen(key: string, open: boolean): void {
  try {
    window.localStorage.setItem(key, open ? "1" : "0");
  } catch {
    /* quota/private mode — 세션 내 상태만 유지 */
  }
}

export function useWorldPanelSheet(): boolean {
  const [isSheet, setIsSheet] = useState(readWorldNarrowLayout);

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

interface BoardCardProps {
  def: WorldFieldDef;
  value: string;
  evidence?: WorldFieldEvidenceRecord;
  onPick: (key: WorldFieldKey) => void;
  picked: boolean;
}

export function BoardCard({ def, value, evidence, onPick, picked }: BoardCardProps) {
  const Icon = def.ic;
  const filled = value.length > 0;
  return (
    <button
      type="button"
      className="wd-card"
      onClick={() => onPick(def.key)}
      style={{
        textAlign: "left",
        cursor: "pointer",
        outline: picked ? "2px solid var(--primary)" : undefined,
      }}
      aria-pressed={picked}
      title={picked ? `${def.title} — 채택 대상으로 선택됨` : `${def.title} 채택 대상으로 선택`}
    >
      <div
        className="wd-card-ic"
        style={{
          color: def.color,
          background: `color-mix(in srgb, ${def.color} 13%, transparent)`,
        }}
      >
        <Icon size={20} />
      </div>
      <div className="wd-card-body">
        <div className="wd-card-top">
          <span className="wd-card-title">{def.title}</span>
          <span className={`pill ${TIER_TONE[def.tier]}`}>{TIER_LABEL[def.tier]}</span>
          <span className={`pill ${filled ? "green" : "gray"}`}>{filled ? "작성됨" : "비어 있음"}</span>
        </div>
        <div className="wd-card-desc">{filled ? value : def.desc}</div>
        <EvidenceMeta evidence={evidence} />
      </div>
      <ChevronR size={18} style={{ color: "var(--ink-3)", alignSelf: "center" }} />
    </button>
  );
}

export function worldImportCandidates(config: StoryConfig | null): AcceptedImportCandidateRecord[] {
  return (config?.acceptedImportCandidates ?? []).filter(
    (candidate) =>
      candidate.targetType === "world" &&
      candidate.bucket === "world" &&
      candidate.routedToStage !== "world",
  );
}

export function WorldImportCandidateCard({
  candidate,
  pickedDef,
  onApply,
}: {
  candidate: AcceptedImportCandidateRecord;
  pickedDef: WorldFieldDef;
  onApply: (candidate: AcceptedImportCandidateRecord) => void;
}) {
  const conflictCount = candidateConflictCount(candidate);
  const status = ARCS_STATUS_LABEL[candidateArcsStatus(candidate)];
  return (
    <div className="wd-card" style={{ flexDirection: "column", gap: 10 }}>
      <div className="wd-card-top">
        <span className="wd-card-title">{candidate.title}</span>
        <span className="pill blue" style={{ marginLeft: "auto" }}>
          {Math.round(candidate.confidence * 100)}%
        </span>
      </div>
      <div className="wd-card-meta" style={{ flexWrap: "wrap" }}>
        <span>출처 {candidate.sourceFileName}</span>
        <span className={`pill ${status.tone}`}>{status.label}</span>
        <span className={`pill ${conflictCount > 0 ? "red" : "green"}`}>충돌 {conflictCount}</span>
      </div>
      <div className="wd-card-desc">{candidate.excerpt || candidate.text}</div>
      {(candidate.alignmentWarnings ?? []).length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(candidate.alignmentWarnings ?? []).map((warning) => (
            <div key={`${candidate.id}-${warning.code}`} className="wd-card-meta">
              <Alert size={13} aria-hidden="true" />
              <span>{warning.label}</span>
            </div>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="btn primary"
        style={{ justifyContent: "center" }}
        aria-label={`${pickedDef.title}에 반영`}
        onClick={() => onApply(candidate)}
      >
        <Check size={14} aria-hidden="true" />
        {pickedDef.title}에 반영
      </button>
    </div>
  );
}

export function WorldChatDraftCard({
  draft,
  onPin,
  onApply,
}: {
  draft: WorldChatDraft;
  onPin: (draft: WorldChatDraft) => void;
  onApply: (draft: WorldChatDraft) => void;
}) {
  return (
    <div className="wd-card" style={{ flexDirection: "column", gap: 10 }}>
      <div className="wd-card-top">
        <span className="wd-card-title">{draft.title}</span>
        <span className={`pill ${draft.pinned ? "green" : "blue"}`} style={{ marginLeft: "auto" }}>
          {draft.pinned ? "고정 메모" : "대화 후보"}
        </span>
      </div>
      <div className="wd-card-meta" style={{ flexWrap: "wrap" }}>
        <span>출처 {draft.sourceLabel}</span>
        <span>일치도 {Math.round(draft.confidence * 100)}%</span>
        <span className="pill amber">{draft.reason}</span>
      </div>
      <div className="wd-card-desc">{draft.excerpt}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        <button
          type="button"
          className="btn ghost"
          style={{ justifyContent: "center" }}
          aria-label={`${draft.title} 메모 고정`}
          onClick={() => onPin(draft)}
          disabled={draft.pinned}
        >
          <Pin size={14} aria-hidden="true" />
          {draft.pinned ? "고정됨" : "메모 고정"}
        </button>
        <button
          type="button"
          className="btn primary"
          style={{ justifyContent: "center" }}
          aria-label={`${draft.title}에 대화 메모 반영`}
          onClick={() => onApply(draft)}
        >
          <Check size={14} aria-hidden="true" />
          양식에 반영
        </button>
      </div>
    </div>
  );
}

export function WorldBoardPanel({
  isSheet,
  cfg,
  pickedField,
  pickedDef,
  filledCount,
  completeness,
  collapsedTiers,
  pendingImportCandidates,
  chatDrafts,
  onCollapse,
  onToggleTier,
  onPickField,
  onApplyImportCandidate,
  onPinChatDraft,
  onApplyChatDraft,
}: {
  isSheet: boolean;
  cfg: StoryConfig | null;
  pickedField: WorldFieldKey;
  pickedDef: WorldFieldDef;
  filledCount: number;
  completeness: number;
  collapsedTiers: CollapsedTiers;
  pendingImportCandidates: AcceptedImportCandidateRecord[];
  chatDrafts: WorldChatDraft[];
  onCollapse: () => void;
  onToggleTier: (tier: 1 | 2 | 3) => void;
  onPickField: (key: WorldFieldKey) => void;
  onApplyImportCandidate: (candidate: AcceptedImportCandidateRecord) => void;
  onPinChatDraft: (draft: WorldChatDraft) => void;
  onApplyChatDraft: (draft: WorldChatDraft) => void;
}) {
  return (
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
          onClick={onCollapse}
        >
          <ChevronR size={16} strokeWidth={1.6} aria-hidden="true" />
        </button>
      </div>
      <div className="wd-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        <div className="wd-card-top">
          <span className="wd-card-title">세계관 기준선</span>
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
              onApply={onApplyImportCandidate}
            />
          ))}
        </section>
      ) : null}
      {chatDrafts.length > 0 ? (
        <section aria-label="세계관 대화 메모 후보" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="wd-board-head" style={{ minHeight: 0 }}>
            <span>대화 메모 후보</span>
            <span className="pill amber">{chatDrafts.length}</span>
          </div>
          {chatDrafts.map((draft) => (
            <WorldChatDraftCard
              key={draft.id}
              draft={draft}
              onPin={onPinChatDraft}
              onApply={onApplyChatDraft}
            />
          ))}
        </section>
      ) : null}
      {WORLD_TIERS.map((tier) => {
        const fields = WORLD_FIELDS.filter((field) => field.tier === tier);
        const tierFilled = fields.filter((field) => fieldValue(cfg, field.key).length > 0).length;
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
              onClick={() => onToggleTier(tier)}
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
                    onPick={onPickField}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </aside>
  );
}

export function WorldEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="wd-center">
      <div className="wd-chat card" style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: "48px 24px" }}>
        <div className="wd-card-ic" style={{ color: "var(--c-blue)", background: "color-mix(in srgb, var(--c-blue) 13%, transparent)" }}>
          <Globe size={22} />
        </div>
        <p className="wd-p" style={{ marginTop: 16, fontWeight: 600 }}>
          먼저 작품의 기준선 3개만 잡아도 충분합니다.
        </p>
        <p className="wd-p" style={{ color: "var(--ink-3)" }}>
          핵심 전제, 현재 갈등, 주인공의 욕망을 정하면 세계관 보드가 열리고 나머지 {WORLD_FIELDS.length}개 항목은 집필하면서 보강할 수 있습니다.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, width: "min(560px, 100%)", marginTop: 18 }}>
          {[
            ["핵심 전제", "현실과 다르게 작동하는 첫 규칙"],
            ["현재 갈등", "지금 이야기를 밀어붙이는 압력"],
            ["주인공 욕망", "첫 회차부터 독자가 붙잡을 동기"],
          ].map(([title, body]) => (
            <div key={title} className="pcard" style={{ padding: 12, textAlign: "left" }}>
              <div className="wd-card-title" style={{ fontSize: 12 }}>{title}</div>
              <div className="wd-card-desc" style={{ fontSize: 11.5 }}>{body}</div>
            </div>
          ))}
        </div>
        <button type="button" className="btn primary" style={{ marginTop: 16 }} onClick={onCreate}>
          <Plus size={16} />3분 기준선 만들기
        </button>
      </div>
    </section>
  );
}
