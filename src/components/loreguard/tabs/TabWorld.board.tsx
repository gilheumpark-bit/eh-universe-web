"use client";

import {
  Alert,
  Check,
  Chevron,
  ChevronL,
  ChevronR,
  Globe,
  Pin,
  Plus,
} from "@/components/loreguard/icons";
import type {
  AcceptedImportCandidateRecord,
  StoryConfig,
  WorldFieldEvidenceRecord,
} from "@/lib/studio-types";
import {
  ARCS_STATUS_LABEL,
  TIER_LABEL,
  TIER_TONE,
  WORLD_BOARD_KEY,
  WORLD_FIELDS,
  WORLD_TIERS,
  candidateArcsStatus,
  candidateConflictCount,
  fieldValue,
  worldToneClass,
  type CollapsedTiers,
  type WorldChatDraft,
  type WorldCollapsedSummaryItem,
  type WorldFieldDef,
  type WorldFieldKey,
} from "./TabWorld.parts";

function EvidenceMeta({ evidence }: { evidence?: WorldFieldEvidenceRecord }) {
  if (!evidence) return null;
  const status = ARCS_STATUS_LABEL[evidence.arcsStatus] ?? ARCS_STATUS_LABEL.not_checked;
  const confidence = typeof evidence.confidence === "number" ? `${Math.round(evidence.confidence * 100)}%` : "검토 전";
  return (
    <div className="wd-card-meta wd-meta-wrap">
      <span>출처 {evidence.sourceLabel}</span>
      <span>일치도 {confidence}</span>
      <span className={`pill ${status.tone}`}>{status.label}</span>
      <span className={`pill ${evidence.conflictCount > 0 ? "red" : "green"}`}>
        충돌 {evidence.conflictCount}
      </span>
    </div>
  );
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
      className={`wd-card wd-board-card ${picked ? "is-picked" : ""}`}
      onClick={() => onPick(def.key)}
      aria-pressed={picked}
      title={picked ? `${def.title} — 채택 대상으로 선택됨` : `${def.title} 채택 대상으로 선택`}
    >
      <div className={`wd-card-ic ${worldToneClass(def.color)}`}>
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
      <ChevronR size={18} className="wd-card-chevron" />
    </button>
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
    <div className="wd-card wd-card-stack wd-card-static">
      <div className="wd-card-top">
        <span className="wd-card-title">{candidate.title}</span>
        <span className="pill blue wd-push">
          {Math.round(candidate.confidence * 100)}%
        </span>
      </div>
      <div className="wd-card-meta wd-meta-wrap">
        <span>출처 {candidate.sourceFileName}</span>
        <span className={`pill ${status.tone}`}>{status.label}</span>
        <span className={`pill ${conflictCount > 0 ? "red" : "green"}`}>충돌 {conflictCount}</span>
      </div>
      <div className="wd-card-desc">{candidate.excerpt || candidate.text}</div>
      {(candidate.alignmentWarnings ?? []).length > 0 ? (
        <div className="wd-warning-stack">
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
        className="btn primary wd-action-center"
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
    <div className="wd-card wd-card-stack wd-card-static">
      <div className="wd-card-top">
        <span className="wd-card-title">{draft.title}</span>
        <span className={`pill ${draft.pinned ? "green" : "blue"} wd-push`}>
          {draft.pinned ? "고정 메모" : "대화 후보"}
        </span>
      </div>
      <div className="wd-card-meta wd-meta-wrap">
        <span>출처 {draft.sourceLabel}</span>
        <span>일치도 {Math.round(draft.confidence * 100)}%</span>
        <span className="pill amber">{draft.reason}</span>
      </div>
      <div className="wd-card-desc">{draft.excerpt}</div>
      <div className="wd-action-grid">
        <button
          type="button"
          className="btn ghost wd-action-center"
          aria-label={`${draft.title} 메모 고정`}
          onClick={() => onPin(draft)}
          disabled={draft.pinned}
        >
          <Pin size={14} aria-hidden="true" />
          {draft.pinned ? "고정됨" : "메모 고정"}
        </button>
        <button
          type="button"
          className="btn primary wd-action-center"
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
      id={WORLD_BOARD_KEY}
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
          aria-controls={WORLD_BOARD_KEY}
          aria-label="세계관 보드 접기"
          title="세계관 보드 접기"
          onClick={onCollapse}
        >
          <ChevronR size={16} strokeWidth={1.6} aria-hidden="true" />
        </button>
      </div>
      <div className="wd-card wd-card-static wd-card-stack wd-card-stretch wd-card-compact">
        <div className="wd-card-top">
          <span className="wd-card-title">세계관 기준선</span>
          <span className="pill blue wd-push">
            {filledCount} / {WORLD_FIELDS.length} 작성됨
          </span>
        </div>
        <progress className="wd-progress" value={completeness} max={100} aria-label={`세계관 완성도 ${completeness}%`} />
        <div className="wd-card-meta">
          <span>완성도 {completeness}%</span>
        </div>
      </div>
      {pendingImportCandidates.length > 0 ? (
        <section aria-label="세계관 읽은 자료 검토" className="wd-board-section">
          <div className="wd-board-head wd-board-head-compact">
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
        <section aria-label="세계관 대화 메모 후보" className="wd-board-section">
          <div className="wd-board-head wd-board-head-compact">
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
            className="wd-board-section"
          >
            <button
              type="button"
              className="wd-card wd-tier-toggle"
              aria-expanded={!collapsed}
              aria-controls={sectionId}
              onClick={() => onToggleTier(tier)}
              title={collapsed ? `${TIER_LABEL[tier]} 섹션 펼치기` : `${TIER_LABEL[tier]} 섹션 접기`}
            >
              <span className={`pill ${TIER_TONE[tier]}`}>{TIER_LABEL[tier]}</span>
              <span className="wd-card-meta wd-push">
                {tierFilled} / {fields.length} 작성됨
              </span>
              <Chevron
                size={16}
                aria-hidden="true"
                className={`wd-tier-chevron ${collapsed ? "is-collapsed" : ""}`}
              />
            </button>
            {!collapsed && (
              <div id={sectionId} className="wd-card-list">
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
      <div className="wd-chat card wd-empty-panel">
        <div className="wd-card-ic wd-tone-blue">
          <Globe size={22} />
        </div>
        <p className="wd-p wd-empty-lead">
          먼저 작품의 기준선 3개만 잡아도 충분합니다.
        </p>
        <p className="wd-p wd-empty-copy">
          핵심 전제, 현재 갈등, 주인공의 욕망을 정하면 세계관 보드가 열리고 나머지 {WORLD_FIELDS.length}개 항목은 집필하면서 보강할 수 있습니다.
        </p>
        <div className="wd-empty-grid">
          {[
            ["핵심 전제", "현실과 다르게 작동하는 첫 규칙"],
            ["현재 갈등", "지금 이야기를 밀어붙이는 압력"],
            ["주인공 욕망", "첫 회차부터 독자가 붙잡을 동기"],
          ].map(([title, body]) => (
            <div key={title} className="wd-empty-suggestion">
              <div className="wd-card-title wd-empty-suggestion-title">{title}</div>
              <div className="wd-card-desc wd-empty-suggestion-copy">{body}</div>
            </div>
          ))}
        </div>
        <button type="button" className="btn primary wd-empty-cta" onClick={onCreate}>
          <Plus size={16} />3분 기준선 만들기
        </button>
      </div>
    </section>
  );
}
