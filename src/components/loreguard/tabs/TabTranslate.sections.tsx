"use client";

import { useCallback, useState } from "react";
import type React from "react";
import {
  Book,
  Check,
  ChevronL,
  ChevronR,
  Eye,
  Languages,
  Layers,
  Lock,
  Pin,
  Sparkle,
  X,
} from "@/components/loreguard/icons";
import type { TranslatePanelKind } from "@/components/loreguard/TranslatePanels";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";
import type { CatastrophicReport } from "@/lib/translation/ncg-nct";
import type { TranslationeseLintResult } from "@/lib/translation/translationese-lint";
import type { TranslationTrackComparison } from "@/lib/translation/track-comparison";
import type { TranslationRiskReport } from "@/lib/translation/risk-report";
import { EmptyTranslationRail } from "./TabTranslateRail";
import { readTxPanelOpen, useTxPanelSheet, writeTxPanelOpen } from "./TabTranslate.panel-state";
import { LANGS, type LangKey, type LayoutMode, type Segment, type SegStatus } from "./TabTranslate.shared";

// ============================================================
// PART 2 — 작은 프레젠테이션 빌딩 블록 (Bar / StatusDot)
// ============================================================

function Bar({ v, c }: { v: number; c?: string }) {
  return (
    <div className="tbar">
      <span style={{ width: Math.max(0, Math.min(1, v)) * 100 + "%", background: c || "var(--grad-primary)" }} />
    </div>
  );
}

function StatusDot({ s }: { s: SegStatus }) {
  const map: Record<SegStatus, [string, string]> = {
    done: ["green", "완료"],
    review: ["amber", "검수"],
    pending: ["gray", "대기"],
  };
  const [c, label] = map[s] || map.pending;
  return (
    <span className={"seg-status " + c} title={label}>
      <span className="sd" />
      {label}
    </span>
  );
}

// 원문에서 용어 사전 단어를 하이라이트 span 으로 감싼다 (translate_editor.renderSource)
function renderSource(seg: Segment, activeTerm: string | null) {
  const text = seg.ko;
  const terms = (seg.terms || []).slice().sort((a, b) => b.length - a.length);
  if (!terms.length) return text;
  let nodes: (string | React.ReactNode)[] = [text];
  let key = 0;
  for (const term of terms) {
    const next: (string | React.ReactNode)[] = [];
    for (const node of nodes) {
      if (typeof node !== "string") {
        next.push(node);
        continue;
      }
      const parts = node.split(term);
      parts.forEach((p, i) => {
        if (p) next.push(p);
        if (i < parts.length - 1) {
          next.push(
            <span key={"t" + key++} className={"gterm" + (activeTerm === term ? " hot" : "")}>
              {term}
            </span>,
          );
        }
      });
    }
    nodes = next;
  }
  return nodes;
}

// ============================================================
// PART 3 — LEFT RAIL (trail): 언어 쌍 / 회차 / 대조 보기 토글
// ============================================================

// ============================================================
// PART 4 — 세그먼트 에디터 보조 카드 (Suggestion / Confirm)
// ============================================================

function SuggestionCard({
  text,
  busy,
  onAccept,
  onReject,
}: {
  text: string;
  busy: boolean;
  onAccept: (e: React.MouseEvent) => void;
  onReject: (e: React.MouseEvent) => void;
}) {
  if (!text) return null;
  return (
    <div className="sugg fade-up">
        <div className="sugg-head">
          <Sparkle size={15} strokeWidth={1.6} />
        <span>노아 번역 제안</span>
        <span className="sugg-tag">대안</span>
      </div>
      <div className="sugg-text">{text}</div>
      <div className="sugg-actions">
        <button className="mini-btn ok" onClick={onAccept} disabled={busy}>
          <Check size={14} strokeWidth={1.6} />
          수락
        </button>
        <button className="mini-btn no" onClick={onReject} disabled={busy}>
          <X size={14} strokeWidth={1.6} />
          거절
        </button>
      </div>
    </div>
  );
}

function ConfirmBar({
  busy,
  onTranslate,
}: {
  busy: boolean;
  onTranslate: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="confirm fade-up">
      <span className="confirm-q">이 문단을 번역할까요?</span>
      <div className="confirm-actions">
        <button className="mini-btn ok" onClick={onTranslate} disabled={busy}>
          <Sparkle size={14} strokeWidth={1.6} />
          {busy ? "번역 중…" : "번역"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PART 5 — CENTER: bilingual segment 에디터 (split / inline)
// ============================================================

export function TranslateEditor({
  segments,
  lang,
  layout,
  statuses,
  translations,
  suggestions,
  selectedId,
  onSelect,
  activeTerm,
  onTranslateSeg,
  onAcceptSugg,
  onRejectSugg,
  busy,
}: {
  segments: Segment[];
  lang: LangKey;
  layout: LayoutMode;
  statuses: Record<string, SegStatus>;
  translations: Record<string, string>; // key `${lang}:${id}` -> text
  suggestions: Record<string, string>; // key `${lang}:${id}` -> alt text
  selectedId: string;
  onSelect: (id: string) => void;
  activeTerm: string | null;
  onTranslateSeg: (id: string) => void;
  onAcceptSugg: (id: string) => void;
  onRejectSugg: (id: string) => void;
  busy: boolean;
}) {
  return (
    <section className="ed-wrap">
      {layout === "split" && (
        <div className="ed-toolbar">
          <div className="ed-cols">
            <span className="ed-col-label">
              <span className="lang-chip ko">KR</span>
              원문 · 한국어
            </span>
            <span className="ed-col-label tgt">
              <span className="lang-chip">{LANGS[lang].flag}</span>
              번역문 · {LANGS[lang].native}
            </span>
          </div>
        </div>
      )}
      {layout === "inline" && (
        <div className="ed-toolbar">
          <span
            className="ed-col-label tgt"
            style={{ borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}
          >
            <span className="lang-chip ko">KR</span>
            <ChevronR size={13} strokeWidth={1.6} />
            <span className="lang-chip">{LANGS[lang].flag}</span>
            인라인 대조 · 한국어 → {LANGS[lang].native}
          </span>
        </div>
      )}

      <div className={"ed-body " + layout}>
        {segments.map((seg) => {
          const key = lang + ":" + seg.id;
          const st = statuses[seg.id] || seg.status;
          const sel = selectedId === seg.id;
          const isHeading = seg.kind === "heading";
          const tgt = translations[key] || "";
          const sugg = suggestions[key] || "";
          const showSugg = sel && !!sugg;
          return (
            <div
              key={seg.id}
              className={
                "seg-row" +
                (sel ? " sel" : "") +
                (isHeading ? " heading" : "") +
                (seg.kind === "dialogue" ? " dialogue" : "")
              }
              onClick={() => onSelect(seg.id)}
            >
              <div className="seg-src">{renderSource(seg, activeTerm)}</div>
              <div className="seg-tgt">
                <div className="seg-tgt-text">{tgt || <span style={{ color: "var(--ink-3)" }}>—</span>}</div>
                {!isHeading && (
                  <div className="seg-meta">
                    <StatusDot s={st} />
                  </div>
                )}
              </div>

              {showSugg && (
                <SuggestionCard
                  text={sugg}
                  busy={busy}
                  onAccept={(e) => {
                    e?.stopPropagation();
                    onAcceptSugg(seg.id);
                  }}
                  onReject={(e) => {
                    e?.stopPropagation();
                    onRejectSugg(seg.id);
                  }}
                />
              )}
              {sel && !sugg && !isHeading && st !== "done" && (
                <ConfirmBar
                  busy={busy}
                  onTranslate={(e) => {
                    e?.stopPropagation();
                    onTranslateSeg(seg.id);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================
// PART 6 — RIGHT PANEL (tpanel): 검수 패널 (실 데이터만)
// ============================================================

export function TranslatePanel({
  lang,
  uiLanguage,
  stats,
  glossary,
  activeTerm,
  onTerm,
  onAddGlossary,
  onRemoveGlossary,
  onOpenPanel,
  open,
  onToggle,
  gate,
  trackComparison,
  riskReport,
}: {
  lang: LangKey;
  uiLanguage: AppLanguage;
  stats: { progress: number; done: number; total: number; avgScore: number | null };
  glossary: { source: string; target: string; context?: string; locked: boolean }[];
  activeTerm: string | null;
  onTerm: (term: string | null) => void;
  onAddGlossary: (source: string, target: string) => void;
  onRemoveGlossary: (source: string) => void;
  /** [C-translate-panels] 검수 도구 slide-over 오픈 (품질 감사·사인오프·채택) */
  onOpenPanel: (kind: TranslatePanelKind) => void;
  /** [G4-panel-collapse] 접힘 상태 — noa-lg-tx-panel 영속 (부모 소유) */
  open: boolean;
  onToggle: () => void;
  /** [Z1a-UI] 결정적 품질 점검 — 전량 확정 시에만 non-null */
  gate: { cat: CatastrophicReport; lint: TranslationeseLintResult | null } | null;
  /** 사용자가 대상 언어를 몰라도 보는 원문/충실판/시장판 비교 요약 */
  trackComparison: TranslationTrackComparison | null;
  /** 한국어 위험 요약 — 원문 보존·문체·용어·승인·역번역 상태 */
  riskReport: TranslationRiskReport | null;
}) {
  const meta = LANGS[lang];
  const [newSrc, setNewSrc] = useState("");
  const [newTgt, setNewTgt] = useState("");
  const isSheet = useTxPanelSheet();

  const submitGlossary = () => {
    const s = newSrc.trim();
    const t = newTgt.trim();
    if (!s || !t) return;
    onAddGlossary(s, t);
    setNewSrc("");
    setNewTgt("");
  };

  // [G4-panel-collapse] 접힘 — 40px 스트립 + 펼치기 버튼만. hooks 뒤 분기라
  // hook 순서 불변·newSrc/newTgt 입력값은 접었다 펴도 보존(언마운트 X).
  if (!open) {
    return (
      <aside className="tpanel collapsed" id="lg-tx-panel" aria-label="번역 검수 패널 (접힘)">
        <button
          type="button"
          className="tpanel-toggle"
          aria-expanded={false}
          aria-controls="lg-tx-panel"
          aria-label="검수 패널 펼치기"
          title="검수 패널 펼치기"
          onClick={onToggle}
        >
          <ChevronL size={16} strokeWidth={1.6} aria-hidden="true" />
        </button>
        <span className="tpanel-vlabel" aria-hidden="true">
          검수 패널
        </span>
      </aside>
    );
  }

  return (
    <aside
      className="tpanel"
      id="lg-tx-panel"
      aria-label="번역 검수 패널"
      role={isSheet ? "dialog" : undefined}
      aria-modal={isSheet ? "true" : undefined}
    >
      <div className="tpanel-head">
        <span>검수 패널</span>
        <div className="tpanel-tools">
          <Pin size={15} strokeWidth={1.6} />
          {/* [G4-panel-collapse] 장식 Chevron → 실 토글 버튼 (aria-expanded) */}
          <button
            type="button"
            className="tpanel-toggle"
            aria-expanded={true}
            aria-controls="lg-tx-panel"
            aria-label="검수 패널 접기"
            title="검수 패널 접기"
            onClick={onToggle}
          >
            <ChevronR size={15} strokeWidth={1.6} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* [C-translate-panels] 검수 도구 — 구 번역 셸 3패널 slide-over 토글 */}
      <div className="pcard">
        <div className="pcard-h">
          <Eye size={15} strokeWidth={1.6} />
          검수 도구
        </div>
        <div className="seg">
          <button type="button" aria-haspopup="dialog" onClick={() => onOpenPanel("audit")}>
            품질 감사
          </button>
          <button type="button" aria-haspopup="dialog" onClick={() => onOpenPanel("signoff")}>
            사인오프
          </button>
          <button type="button" aria-haspopup="dialog" onClick={() => onOpenPanel("adoption")}>
            채택
          </button>
        </div>
      </div>

      {/* 번역 상태 — 실 진행률 (번역 완료 세그먼트 / 전체) */}
      <div className="pcard">
        <div className="pcard-h">
          <Layers size={15} strokeWidth={1.6} />
          번역 상태
        </div>
        <div className="stat-row">
          <span>대상 언어</span>
          <b>
            {meta.label} · {meta.native}
          </b>
        </div>
        <div className="stat-big">
          <span className="stat-pct">{Math.round(stats.progress * 100)}%</span>
          <span className="stat-cap">완성도</span>
        </div>
        <Bar v={stats.progress} />
        <div className="stat-foot">
          번역 완료 {stats.done} / {stats.total} 문단
          {stats.avgScore != null && (
            <>
              {" · "}품질 {Math.round(stats.avgScore * 100)}점
            </>
          )}
        </div>
      </div>

      {trackComparison && (
        <div className="pcard">
          <div className="pcard-h">
            <Eye size={15} strokeWidth={1.6} />
            원문·충실판·시장판
          </div>
          <div className="gloss-meta">{trackComparison.noteKo}</div>
          {trackComparison.cards.map((card) => (
            <div key={card.id} className="stat-row" style={{ alignItems: "flex-start", gap: 10 }}>
              <span>
                {card.labelKo}
                <span style={{ display: "block", color: "var(--ink-3)", fontSize: 11 }}>
                  {card.detailKo}
                </span>
              </span>
              <b style={{ textAlign: "right" }}>
                {card.score == null ? "대기" : `${card.score}점`}
                <span
                  className={"pill " + (card.status === "ready" ? "green" : card.status === "review" ? "amber" : "gray")}
                  style={{ display: "inline-flex", marginLeft: 6 }}
                >
                  {card.status === "ready" ? "준비" : card.status === "review" ? "검토" : "대기"}
                </span>
                <span style={{ display: "block", color: "var(--ink-3)", fontSize: 11, fontWeight: 600 }}>
                  {card.summaryKo}
                </span>
              </b>
            </div>
          ))}
        </div>
      )}

      {riskReport && (
        <div className="pcard" role="status" aria-label="한국어 번역 위험 요약">
          <div className="pcard-h">
            <Check size={15} strokeWidth={1.6} />
            한국어 위험 요약
            <span
              className={
                "pill " +
                (riskReport.level === "ready" ? "green" : riskReport.level === "review" ? "amber" : "red")
              }
              style={{ marginLeft: "auto" }}
            >
              {riskReport.level === "ready" ? "준비" : riskReport.level === "review" ? "검토" : "높음"}
            </span>
          </div>
          <div className="gloss-meta">{riskReport.noteKo}</div>
          <div className="stat-row">
            <span>위험 점수</span>
            <b>{riskReport.score}점</b>
          </div>
          {riskReport.cards.map((card) => (
            <div key={card.id} className="stat-row" style={{ alignItems: "flex-start", gap: 10 }}>
              <span>
                {card.labelKo}
                <span style={{ display: "block", color: "var(--ink-3)", fontSize: 11 }}>
                  {card.detailKo}
                </span>
              </span>
              <b style={{ textAlign: "right" }}>
                {card.count > 0 ? `${card.count}건` : "0건"}
                <span
                  className={
                    "pill " +
                    (card.status === "ready"
                      ? "green"
                      : card.status === "review"
                        ? "amber"
                        : card.status === "high"
                          ? "red"
                          : "gray")
                  }
                  style={{ display: "inline-flex", marginLeft: 6 }}
                >
                  {card.status === "ready"
                    ? "준비"
                    : card.status === "review"
                      ? "검토"
                      : card.status === "high"
                        ? "높음"
                        : "대기"}
                </span>
                <span style={{ display: "block", color: "var(--ink-3)", fontSize: 11, fontWeight: 600 }}>
                  {card.summaryKo}
                </span>
              </b>
            </div>
          ))}
          {riskReport.glossaryMisses.length > 0 && (
            <div className="gloss-meta">
              용어 확인:{" "}
              {riskReport.glossaryMisses
                .slice(0, 3)
                .map((miss) => `${miss.source} → ${miss.expected}`)
                .join(" / ")}
            </div>
          )}
        </div>
      )}

      {/* [Z1a-UI] 결정적 품질 점검 — 전량 번역 확정 시에만 표시 (순수 함수·LLM 0) */}
      {gate && (
        <div className="pcard" role="status" aria-label="번역 품질 점검 결과">
          <div className="pcard-h">
            <Check size={15} strokeWidth={1.6} />
            품질 점검
            <span className={"pill " + (gate.cat.blocked ? "red" : "green")} style={{ marginLeft: "auto" }}>
              {gate.cat.blocked ? "확인 필요" : "통과"}
            </span>
          </div>
          <div className="stat-row">
            <span>치명 결함 (Catastrophic)</span>
            <b>{gate.cat.blocked ? `${gate.cat.reasons.length}건` : "0건"}</b>
          </div>
          {gate.cat.reasons.map((r) => (
            <div className="gloss-meta" key={r.kind}>
              {L4(uiLanguage, r.message)}
            </div>
          ))}
          {gate.lint && (
            <>
              <div className="stat-row">
                <span>
                  {L4(uiLanguage, {
                    ko: "영어 자연스러움 점검 (EN)",
                    en: "Natural phrasing check (EN)",
                    ja: "自然な英語表現チェック（EN）",
                    zh: "英语自然表达检查（EN）",
                  })}
                </span>
                <b>{gate.lint.hits.length === 0 ? "깨끗" : `경고 ${gate.lint.hits.length}건`}</b>
              </div>
              {gate.lint.hits.slice(0, 3).map((h) => (
                <div className="gloss-meta" key={h.kind + h.pattern}>
                  {L4(uiLanguage, h.message)}
                </div>
              ))}
            </>
          )}
          <div className="gloss-meta">
            {L4(uiLanguage, {
              ko: "자동 점검 결과입니다. 경고는 중단 조건이 아니라 검토 권장입니다.",
              en: "Automatic review result. Warnings are review prompts, not blockers.",
              ja: "自動チェックの結果です。警告はブロックではなく、確認の提案です。",
              zh: "这是自动检查结果。警告不是阻止项，而是建议复核。",
            })}
          </div>
        </div>
      )}

      {/* 용어 사전 — config.translationConfig.glossary 읽기/쓰기 */}
      <div className="pcard">
        <div className="pcard-h">
          <Book size={15} strokeWidth={1.6} />
          용어 사전
          <span className="pill green" style={{ marginLeft: "auto" }}>
            {glossary.length}건
          </span>
        </div>
        <div className="gloss">
          {glossary.length === 0 && (
            <div className="gloss-meta" style={{ padding: "4px 0" }}>
              등록된 용어가 없습니다. 아래에서 추가하세요.
            </div>
          )}
          {glossary.map((g) => (
            <div
              key={g.source}
              className={"gloss-row" + (activeTerm === g.source ? " on" : "")}
              style={{ display: "flex", alignItems: "center" }}
            >
              <button
                type="button"
                className="gloss-body"
                style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
                onClick={() => onTerm(activeTerm === g.source ? null : g.source)}
              >
                <div className="gloss-pair">
                  {g.locked && <Lock size={11} strokeWidth={1.6} style={{ color: "var(--ink-3)" }} />}
                  <span className="gloss-ko">{g.source}</span>
                  <ChevronR size={11} strokeWidth={1.6} style={{ color: "var(--ink-3)" }} />
                  <span className="gloss-tgt">{g.target || "—"}</span>
                </div>
                {g.context && <div className="gloss-meta">{g.context}</div>}
              </button>
              <button
                type="button"
                className="mini-btn no"
                aria-label={`${g.source} 용어 삭제`}
                title="삭제"
                onClick={() => onRemoveGlossary(g.source)}
                style={{ flex: "0 0 auto" }}
              >
                <X size={13} strokeWidth={1.6} />
              </button>
            </div>
          ))}
        </div>
        {/* 용어 추가 폼 — setConfig 로 persist */}
        <div className="gloss-add" style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
          <input
            className="tx-ai-input"
            value={newSrc}
            onChange={(e) => setNewSrc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitGlossary()}
            placeholder="원문 용어"
            aria-label="원문 용어"
            style={{ flex: 1, minWidth: 0 }}
          />
          <input
            className="tx-ai-input"
            value={newTgt}
            onChange={(e) => setNewTgt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitGlossary()}
            placeholder="번역 용어"
            aria-label="번역 용어"
            style={{ flex: 1, minWidth: 0 }}
          />
          <button
            type="button"
            className="mini-btn ok"
            onClick={submitGlossary}
            aria-label="용어 추가"
            title="용어 추가"
            style={{ flex: "0 0 auto" }}
          >
            <Check size={14} strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function EmptyReviewPanel() {
  const [open, setOpen] = useState(readTxPanelOpen);
  const isSheet = useTxPanelSheet();

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      writeTxPanelOpen(next);
      return next;
    });
  }, []);

  if (!open) {
    return (
      <aside className="tpanel collapsed" id="lg-tx-panel" aria-label="번역 검수 패널 (접힘)">
        <button
          type="button"
          className="tpanel-toggle"
          aria-expanded={false}
          aria-controls="lg-tx-panel"
          aria-label="검수 패널 펼치기"
          title="검수 패널 펼치기"
          onClick={toggle}
        >
          <ChevronL size={16} strokeWidth={1.6} aria-hidden="true" />
        </button>
        <span className="tpanel-vlabel" aria-hidden="true">
          검수 패널
        </span>
      </aside>
    );
  }

  return (
    <aside
      className="tpanel"
      id="lg-tx-panel"
      aria-label="번역 검수 패널"
      role={isSheet ? "dialog" : undefined}
      aria-modal={isSheet ? "true" : undefined}
    >
      <div className="tpanel-head">
        <span>검수 패널</span>
        <button
          type="button"
          className="tpanel-toggle"
          aria-expanded={true}
          aria-controls="lg-tx-panel"
          aria-label="검수 패널 접기"
          title="검수 패널 접기"
          onClick={toggle}
        >
          <ChevronR size={15} strokeWidth={1.6} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}

// ============================================================
// PART 7 — 빈 상태 (원고/세션 없음)
// ============================================================

export function EmptyState({
  reason,
  onGoProject,
  onGoWriting,
}: {
  reason: "no-session" | "no-manuscript";
  onGoProject: () => void;
  onGoWriting: () => void;
}) {
  return (
    <div className="tx-grid">
      <EmptyTranslationRail />
      <div className="tx-center" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 380, color: "var(--ink-2)" }}>
          <Languages size={40} strokeWidth={1.2} style={{ color: "var(--ink-3)", marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--ink-1)" }}>
            {reason === "no-session" ? "프로젝트가 없습니다" : "번역할 원고가 없습니다"}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
            {reason === "no-session"
              ? "프로젝트 생성에서 작품을 만들고, 집필 탭에서 회차 본문을 저장하면 번역을 시작할 수 있습니다."
              : "집필 탭에서 회차 본문을 작성하고 저장하면 이 화면에서 문단별로 번역할 수 있습니다."}
          </div>
          <button
            type="button"
            className="btn primary"
            onClick={reason === "no-session" ? onGoProject : onGoWriting}
          >
            <Book size={15} strokeWidth={1.6} />
            {reason === "no-session" ? "프로젝트 생성으로" : "집필 탭으로"}
          </button>
        </div>
      </div>
      <EmptyReviewPanel />
    </div>
  );
}

