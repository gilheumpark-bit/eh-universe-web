"use client";

import type React from "react";
import { Book, Check, ChevronR, Languages, Sparkle, X } from "@/components/loreguard/icons";
import { EmptyTranslationRail } from "./TabTranslateRail";
import { EmptyReviewPanel } from "./TabTranslatePanel";
import { LANGS, type LangKey, type LayoutMode, type Segment, type SegStatus } from "./TabTranslate.shared";

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
  translations: Record<string, string>;
  suggestions: Record<string, string>;
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
          <span className="ed-col-label tgt ed-inline-label">
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
                <div className="seg-tgt-text">{tgt || <span className="tx-muted-inline">—</span>}</div>
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
      <div className="tx-center tx-empty-center">
        <div className="tx-empty-body">
          <Languages size={40} strokeWidth={1.2} className="tx-empty-icon" />
          <div className="tx-empty-title">
            {reason === "no-session" ? "프로젝트가 없습니다" : "번역할 원고가 없습니다"}
          </div>
          <div className="tx-empty-copy">
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
