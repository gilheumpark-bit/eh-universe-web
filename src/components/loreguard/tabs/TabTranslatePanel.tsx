"use client";

import { useCallback, useState } from "react";
import {
  Book,
  Check,
  ChevronL,
  ChevronR,
  Eye,
  Layers,
  Lock,
  Pin,
  X,
} from "@/components/loreguard/icons";
import type { TranslatePanelKind } from "@/components/loreguard/TranslatePanels";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";
import type { CatastrophicReport } from "@/lib/translation/ncg-nct";
import type { TranslationeseLintResult } from "@/lib/translation/translationese-lint";
import type { TranslationTrackComparison } from "@/lib/translation/track-comparison";
import type { TranslationRiskReport } from "@/lib/translation/risk-report";
import { readTxPanelOpen, useTxPanelSheet, writeTxPanelOpen } from "./TabTranslate.panel-state";
import { LANGS, type LangKey } from "./TabTranslate.shared";

function Bar({ v }: { v: number }) {
  const value = Math.max(0, Math.min(1, v));
  return (
    <progress className="tbar" value={value} max={1} aria-label={`완성도 ${Math.round(value * 100)}%`} />
  );
}

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
  onOpenPanel: (kind: TranslatePanelKind) => void;
  open: boolean;
  onToggle: () => void;
  gate: { cat: CatastrophicReport; lint: TranslationeseLintResult | null } | null;
  trackComparison: TranslationTrackComparison | null;
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
  const progressPct = Math.round(stats.progress * 100);
  const collapsedSummary = [
    { label: "완성", value: `${progressPct}%`, tone: progressPct >= 100 ? "green" : progressPct > 0 ? "blue" : "amber" },
    { label: "검수", value: gate ? "ON" : "대기", tone: gate ? "green" : "amber" },
    {
      label: "위험",
      value: riskReport ? (riskReport.level === "ready" ? "낮음" : riskReport.level === "review" ? "검토" : "높음") : "대기",
      tone: riskReport ? (riskReport.level === "ready" ? "green" : riskReport.level === "review" ? "amber" : "red") : "gray",
    },
  ];

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
        <span
          className="wd-collapsed-summary"
          aria-label={collapsedSummary.map((item) => `${item.label} ${item.value}`).join(", ")}
        >
          {collapsedSummary.map((item) => (
            <span key={`${item.label}:${item.value}`} className={`wd-mini-chip ${item.tone}`}>
              <small>{item.label}</small>
              <b>{item.value}</b>
            </span>
          ))}
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
            <div key={card.id} className="stat-row tx-stat-row-top">
              <span>
                {card.labelKo}
                <span className="tx-card-detail">
                  {card.detailKo}
                </span>
              </span>
              <b className="tx-card-score">
                {card.score == null ? "대기" : `${card.score}점`}
                <span
                  className={"pill " + (card.status === "ready" ? "green" : card.status === "review" ? "amber" : "gray")}
                >
                  {card.status === "ready" ? "준비" : card.status === "review" ? "검토" : "대기"}
                </span>
                <span className="tx-card-summary">
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
                "pill tx-push " +
                (riskReport.level === "ready" ? "green" : riskReport.level === "review" ? "amber" : "red")
              }
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
            <div key={card.id} className="stat-row tx-stat-row-top">
              <span>
                {card.labelKo}
                <span className="tx-card-detail">
                  {card.detailKo}
                </span>
              </span>
              <b className="tx-card-score">
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
                >
                  {card.status === "ready"
                    ? "준비"
                    : card.status === "review"
                      ? "검토"
                      : card.status === "high"
                        ? "높음"
                        : "대기"}
                </span>
                <span className="tx-card-summary">
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

      {gate && (
        <div className="pcard" role="status" aria-label="번역 품질 점검 결과">
          <div className="pcard-h">
            <Check size={15} strokeWidth={1.6} />
            품질 점검
            <span className={"pill tx-push " + (gate.cat.blocked ? "red" : "green")}>
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

      <div className="pcard">
        <div className="pcard-h">
          <Book size={15} strokeWidth={1.6} />
          용어 사전
          <span className="pill green tx-push">
            {glossary.length}건
          </span>
        </div>
        <div className="gloss">
          {glossary.length === 0 && (
            <div className="gloss-meta tx-gloss-empty">
              등록된 용어가 없습니다. 아래에서 추가하세요.
            </div>
          )}
          {glossary.map((g) => (
            <div
              key={g.source}
              className={"gloss-row" + (activeTerm === g.source ? " on" : "")}
            >
              <button
                type="button"
                className="gloss-body gloss-body-button"
                onClick={() => onTerm(activeTerm === g.source ? null : g.source)}
              >
                <div className="gloss-pair">
                  {g.locked && <Lock size={11} strokeWidth={1.6} className="tx-muted-icon" />}
                  <span className="gloss-ko">{g.source}</span>
                  <ChevronR size={11} strokeWidth={1.6} className="tx-muted-icon" />
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
              >
                <X size={13} strokeWidth={1.6} />
              </button>
            </div>
          ))}
        </div>
        <div className="gloss-add">
          <input
            className="tx-ai-input"
            value={newSrc}
            onChange={(e) => setNewSrc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitGlossary()}
            placeholder="원문 용어"
            aria-label="원문 용어"
          />
          <input
            className="tx-ai-input"
            value={newTgt}
            onChange={(e) => setNewTgt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitGlossary()}
            placeholder="번역 용어"
            aria-label="번역 용어"
          />
          <button
            type="button"
            className="mini-btn ok"
            onClick={submitGlossary}
            aria-label="용어 추가"
            title="용어 추가"
          >
            <Check size={14} strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function EmptyReviewPanel() {
  const [open, setOpen] = useState(readTxPanelOpen);
  const isSheet = useTxPanelSheet();
  const collapsedSummary = [
    { label: "완성", value: "0%", tone: "amber" },
    { label: "검수", value: "대기", tone: "gray" },
  ];

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
        <span
          className="wd-collapsed-summary"
          aria-label={collapsedSummary.map((item) => `${item.label} ${item.value}`).join(", ")}
        >
          {collapsedSummary.map((item) => (
            <span key={`${item.label}:${item.value}`} className={`wd-mini-chip ${item.tone}`}>
              <small>{item.label}</small>
              <b>{item.value}</b>
            </span>
          ))}
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
