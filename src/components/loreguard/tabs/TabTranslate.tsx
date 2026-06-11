"use client";

/* ===========================================================
   TabTranslate — 번역 (Translate) tab — Phase 3 실 엔진 연결
   핸드오프: tab_translate.jsx + translate_editor.jsx + translate_side.jsx
   3-pane: 256px 언어/장 레일(trail) / 이중언어 세그먼트 에디터 + 하단
   AI 바(tx-center) / 344px 검수 패널(tpanel).
   contract: default export, props 없음 → layout 상태는 컴포넌트 내부 소유.
   CSS 는 src/app/loreguard.css 의 .eh-app 스코프 클래스 사용(인라인 <style> 금지).
   아이콘은 @/components/loreguard/icons (lucide).

   [WIRING 2026-06-10] mock data.js EHData 제거 → useStudio() 실 상태 연결.
   - SEGMENTS: currentSession.config.manuscripts (활성 회차) 문장 분해 → 실 원문.
   - 번역: useTranslation().translateEpisode (단일/세그먼트) — 실 AI 엔진, onProgress 스트리밍.
   - GLOSSARY: config.translationConfig.glossary 읽기/쓰기 (setConfig → IndexedDB+Firestore).
   - 내보내기: useStudioExport.exportProjectManuscripts / 저장: triggerSave / 미리보기·되돌리기 real.
   - 제거된 가짜 지표: voice %, voice-grid, contamination, 검수 로그(엔진 출처 없음).
   - 실 점수: 번역 결과 avgScore 만 표기.
   =========================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Languages,
  Chevron,
  ChevronR,
  ChevronL,
  Layers,
  Book,
  Sparkle,
  Check,
  X,
  Sync,
  Download,
  Eye,
  Pin,
  Send,
  Lock,
} from "@/components/loreguard/icons";
import { useStudio } from "@/app/studio/StudioContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useStudioExport } from "@/hooks/useStudioExport";
// [C-translate-panels 2026-06-10] 구 번역 셸 3패널 (품질 감사·사인오프·세그먼트 채택)
// slide-over — useStudio 어댑터 브리지 (구 컨텍스트 통째 마운트 X). 패널 자체는 dynamic.
import TranslatePanels, { type TranslatePanelKind } from "@/components/loreguard/TranslatePanels";
import type { EpisodeManuscript, StoryConfig, TranslatedManuscriptEntry } from "@/lib/studio-types";
import type { TranslationProgress } from "@/engine/translation";
// [Z1a-UI 2026-06-11] 결정적 품질 게이트 최소 진입점 — Catastrophic + 번역투/AI티 린트.
// 순수 함수 (LLM 0) — 전량 번역 확정 시에만 산출 (부분 번역 오탐 방지).
import { runCatastrophicCheck, type CatastrophicReport } from "@/lib/translation/ncg-nct";
import { lintTranslationese, type TranslationeseLintResult } from "@/lib/translation/translationese-lint";

// ============================================================
// PART 0.5 — [s82-stage-coverage] 창작 과정 기록 (TabWriting S2 패턴 축약)
// ============================================================
// 번역 확정 = AI 결과 작가 수락 → logAcceptAI(targetType 'manuscript').
// 스팸 방지: per-세그먼트 명시 클릭(acceptSuggestion) 1건 + 일괄 번역
// (handleTranslateAll) 은 회차당 1건 배치 기록 — 디바운스 불요 (둘 다 명시 액션).
// fire-and-forget·실패 noa:alert 1회/60s. manuscripts 는 auto-trigger 의
// signature 감시 대상이 아니므로 이중 카운트 없음.

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
// PART 1 — 타입 + 상수 (UI 전용 — mock 데이터 제거됨)
// ============================================================

type LangKey = "en" | "ja" | "zh";
type SegStatus = "done" | "review" | "pending";
type LayoutMode = "split" | "inline";

interface Segment {
  id: string;
  kind?: "heading" | "dialogue";
  ko: string; // 원문 (한국어)
  status: SegStatus;
  terms: string[]; // glossary source 용어 중 이 세그먼트에 등장하는 것
}

interface LangMeta {
  code: string;
  label: string;
  native: string;
  flag: string;
}

// 엔진 targetLang 매핑 — UI LangKey ↔ TranslationConfig.targetLang
const LANG_TO_TARGET: Record<LangKey, "EN" | "JP" | "CN"> = {
  en: "EN",
  ja: "JP",
  zh: "CN",
};

const LANGS: Record<LangKey, LangMeta> = {
  en: { code: "EN", label: "영어", native: "English", flag: "EN" },
  ja: { code: "JA", label: "일본어", native: "日本語", flag: "日" },
  zh: { code: "ZH", label: "중국어", native: "中文", flag: "中" },
};

const REWRITE_CHIPS = ["더 자연스럽게", "직역에 가깝게", "문장 길이 맞추기", "존대 유지"];

// 문장 단위 분해 — 원문 manuscript.content → Segment[].
// 한국어 종결부호(. ! ? … " ") + 줄바꿈 기준 split. 대사("…") heading(숫자 prefix) 식별.
function splitIntoSegments(content: string): Segment[] {
  if (!content || !content.trim()) return [];
  const out: Segment[] = [];
  // 줄 단위로 먼저 나누고, 각 줄을 문장부호로 재분해
  const lines = content.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  let idx = 0;
  for (const line of lines) {
    // 문장 분해: 종결부호 뒤에서 끊되 부호는 유지
    const sentences = line.match(/[^.!?…。！？]+[.!?…。！？]*["”』」]?|[^.!?…。！？]+$/g) || [line];
    for (const raw of sentences) {
      const s = raw.trim();
      if (!s) continue;
      const isDialogue = /^["“『「]/.test(s);
      const isHeading = /^\s*\d{1,3}[.\-:\s]/.test(s) && s.length < 40;
      out.push({
        id: "s" + idx++,
        kind: isHeading ? "heading" : isDialogue ? "dialogue" : undefined,
        ko: s,
        status: "pending",
        terms: [],
      });
    }
  }
  return out;
}

// ============================================================
// PART 1.5 — [G4-panel-collapse] 검수 패널(tpanel) 접힘 상태 영속
// localStorage `noa-lg-tx-panel` — "0" = 접힘, 그 외/부재 = 펼침 (기본
// 펼침 — 기존 사용자 경험 보존). TabWorld noa-lg-world-sections 패턴 동일:
// 트리는 dynamic(ssr:false) — lazy init 안전. 쓰기 실패(quota 등)는 무시.
// ============================================================

const TX_PANEL_KEY = "noa-lg-tx-panel";

function readTxPanelOpen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(TX_PANEL_KEY) !== "0";
  } catch {
    return true;
  }
}

function writeTxPanelOpen(open: boolean): void {
  try {
    window.localStorage.setItem(TX_PANEL_KEY, open ? "1" : "0");
  } catch {
    /* quota/private mode — 세션 내 상태만 유지 */
  }
}

// 활성 manuscript 선택 — config.manuscripts 중 config.episode 우선, 없으면 첫 회차.
function pickActiveManuscript(config: StoryConfig | null): EpisodeManuscript | null {
  const list = config?.manuscripts;
  if (!list || list.length === 0) return null;
  const byEpisode = list.find((m) => m.episode === config?.episode && m.content?.trim());
  if (byEpisode) return byEpisode;
  return list.find((m) => m.content?.trim()) ?? null;
}

// glossary source 용어가 원문에 등장하는지 — 세그먼트 terms 채움
function termsInText(text: string, glossarySources: string[]): string[] {
  if (!text || glossarySources.length === 0) return [];
  return glossarySources.filter((src) => src && text.includes(src));
}

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

function TranslateRail({
  lang,
  onLang,
  progress,
  layout,
  onLayout,
  chapters,
  activeManuscriptEp,
  onSelectChapter,
}: {
  lang: LangKey;
  onLang: (k: LangKey) => void;
  progress: Record<LangKey, number>;
  layout: LayoutMode;
  onLayout: (m: LayoutMode) => void;
  chapters: { episode: number; title: string; words: number }[];
  activeManuscriptEp: number | null;
  onSelectChapter: (episode: number) => void;
}) {
  return (
    // [A-01 priority-high 2026-06-09] 2개 aside 구분 — unique aria-label.
    <aside className="trail" aria-label="번역 세그먼트 목록">
      <div className="trail-head">
        <div className="trail-title">
          <span className="trail-ic">
            <Languages size={18} strokeWidth={1.6} />
          </span>
          <div>
            <div className="trail-name">번역 모드</div>
            <div className="trail-sub">원문을 지키며 옮깁니다</div>
          </div>
        </div>
      </div>

      <div className="trail-sec">
        <div className="trail-label">언어 쌍</div>
        <div className="lang-from">
          <span className="lang-chip ko">KR</span>
          한국어
          <span className="lang-from-tag">원본 · 고정</span>
        </div>
        <div className="lang-arrow">
          <Chevron size={16} strokeWidth={1.6} />
        </div>
        <div className="lang-list">
          {(Object.keys(LANGS) as LangKey[]).map((k) => {
            const meta = LANGS[k];
            const on = lang === k;
            const p = progress[k];
            return (
              <button
                key={k}
                className={"lang-opt" + (on ? " on" : "")}
                onClick={() => onLang(k)}
              >
                <span className={"lang-chip" + (on ? "" : " mute")}>{meta.flag}</span>
                <div className="lang-opt-body">
                  <div className="lang-opt-top">
                    <span className="lang-opt-name">{meta.label}</span>
                    <span className="lang-opt-pct">{Math.round(p * 100)}%</span>
                  </div>
                  <Bar v={p} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="trail-sec">
        <div className="trail-label">회차 · CHAPTER</div>
        {chapters.length === 0 ? (
          <div className="trail-sub" style={{ padding: "4px 0" }}>
            원고가 없습니다
          </div>
        ) : (
          chapters.map((c) => {
            const active = c.episode === activeManuscriptEp;
            return (
              <div
                key={c.episode}
                className={"chap" + (active ? " on" : "")}
                role="button"
                tabIndex={0}
                aria-current={active ? "true" : undefined}
                aria-label={`${c.episode}화 ${c.title} 회차로 전환`}
                onClick={() => onSelectChapter(c.episode)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectChapter(c.episode);
                  }
                }}
              >
                <span className="chap-n">{String(c.episode).padStart(2, "0")}</span>
                <span className="chap-t">{c.title}</span>
                {active ? (
                  <span className="chap-dot" />
                ) : (
                  <span className="chap-w">{c.words.toLocaleString()}</span>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="trail-sec">
        <div className="trail-label">대조 보기</div>
        <div className="seg">
          <button className={layout === "split" ? "on" : ""} onClick={() => onLayout("split")}>
            좌우 분할
          </button>
          <button className={layout === "inline" ? "on" : ""} onClick={() => onLayout("inline")}>
            인라인
          </button>
        </div>
      </div>
    </aside>
  );
}

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
        <span>NOA 번역 제안</span>
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

function TranslateEditor({
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

function TranslatePanel({
  lang,
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
}: {
  lang: LangKey;
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
  /** [Z1a-UI] 결정적 품질 게이트 — 전량 확정 시에만 non-null */
  gate: { cat: CatastrophicReport; lint: TranslationeseLintResult | null } | null;
}) {
  const meta = LANGS[lang];
  const [newSrc, setNewSrc] = useState("");
  const [newTgt, setNewTgt] = useState("");

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
    <aside className="tpanel" id="lg-tx-panel" aria-label="번역 검수 패널">
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

      {/* [Z1a-UI] 결정적 품질 게이트 — 전량 번역 확정 시에만 표시 (순수 함수·LLM 0) */}
      {gate && (
        <div className="pcard" role="status" aria-label="번역 품질 게이트 결과">
          <div className="pcard-h">
            <Check size={15} strokeWidth={1.6} />
            품질 게이트
            <span className={"pill " + (gate.cat.blocked ? "red" : "green")} style={{ marginLeft: "auto" }}>
              {gate.cat.blocked ? "차단" : "통과"}
            </span>
          </div>
          <div className="stat-row">
            <span>치명 결함 (Catastrophic)</span>
            <b>{gate.cat.blocked ? `${gate.cat.reasons.length}건` : "0건"}</b>
          </div>
          {gate.cat.reasons.map((r) => (
            <div className="gloss-meta" key={r.kind}>
              {r.message.ko}
            </div>
          ))}
          {gate.lint && (
            <>
              <div className="stat-row">
                <span>번역투·AI티 (EN)</span>
                <b>{gate.lint.hits.length === 0 ? "깨끗" : `경고 ${gate.lint.hits.length}건`}</b>
              </div>
              {gate.lint.hits.slice(0, 3).map((h) => (
                <div className="gloss-meta" key={h.kind + h.pattern}>
                  {h.message.ko}
                </div>
              ))}
            </>
          )}
          <div className="gloss-meta">휴리스틱 검사 — 경고는 차단이 아닌 검토 권장입니다.</div>
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

// ============================================================
// PART 7 — 빈 상태 (원고/세션 없음)
// ============================================================

function EmptyState({ reason }: { reason: "no-session" | "no-manuscript" }) {
  return (
    <div className="tx-grid">
      <aside className="trail" aria-label="번역 세그먼트 목록">
        <div className="trail-head">
          <div className="trail-title">
            <span className="trail-ic">
              <Languages size={18} strokeWidth={1.6} />
            </span>
            <div>
              <div className="trail-name">번역 모드</div>
              <div className="trail-sub">원문을 지키며 옮깁니다</div>
            </div>
          </div>
        </div>
      </aside>
      <div className="tx-center" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 360, color: "var(--ink-2)" }}>
          <Languages size={40} strokeWidth={1.2} style={{ color: "var(--ink-3)", marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--ink-1)" }}>
            {reason === "no-session" ? "프로젝트가 없습니다" : "번역할 원고가 없습니다"}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            {reason === "no-session"
              ? "왼쪽 사이드바에서 프로젝트를 만들거나 선택한 뒤, 원고를 작성하면 번역을 시작할 수 있습니다."
              : "‘원고’ 탭에서 회차 본문을 작성하면 이 화면에서 문단별로 번역할 수 있습니다."}
          </div>
        </div>
      </div>
      <aside className="tpanel" aria-label="번역 검수 패널">
        <div className="tpanel-head">
          <span>검수 패널</span>
        </div>
      </aside>
    </div>
  );
}

// ============================================================
// PART 8 — orchestrator: 상태 소유 + 3-pane 조립 (tx-grid)
// ============================================================

export default function TabTranslate() {
  const studio = useStudio();
  const {
    currentSession,
    currentSessionId,
    currentProjectId,
    projects,
    sessions,
    setConfig,
    setCurrentSessionId,
    setCurrentProjectId,
    setActiveTab,
    triggerSave,
    language,
    isKO,
    writingMode,
    editDraft,
  } = studio;

  const config = currentSession?.config ?? null;

  // ── 실 원고 → segments ──────────────────────────────────
  const activeManuscript = useMemo(() => pickActiveManuscript(config), [config]);
  const glossary = useMemo(() => config?.translationConfig?.glossary ?? [], [config]);
  const glossarySources = useMemo(() => glossary.map((g) => g.source).filter(Boolean), [glossary]);

  const segments = useMemo(() => {
    const segs = splitIntoSegments(activeManuscript?.content ?? "");
    return segs.map((s) => ({ ...s, terms: termsInText(s.ko, glossarySources) }));
  }, [activeManuscript, glossarySources]);

  // 회차 목록 (rail) — config.manuscripts 기반
  const chapters = useMemo(
    () =>
      (config?.manuscripts ?? [])
        .slice()
        .sort((a, b) => a.episode - b.episode)
        .map((m) => ({ episode: m.episode, title: m.title || `${m.episode}화`, words: m.charCount ?? m.content?.length ?? 0 })),
    [config],
  );

  // ── UI 상태 ─────────────────────────────────────────────
  const [lang, setLang] = useState<LangKey>("en");
  const [layout, setLayout] = useState<LayoutMode>("split");
  const [selectedId, setSelectedId] = useState<string>("");
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [aiText, setAiText] = useState("");
  // [C-translate-panels] 검수 도구 slide-over (품질 감사·사인오프·채택) — null = 닫힘
  const [openPanel, setOpenPanel] = useState<TranslatePanelKind | null>(null);
  // [G4-panel-collapse] 검수 패널 접힘/펴기 — noa-lg-tx-panel 영속.
  // lazy init (트리는 dynamic ssr:false — LoreguardShell 테마와 동일 안전 규칙).
  const [panelOpen, setPanelOpen] = useState<boolean>(() => readTxPanelOpen());
  const togglePanel = useCallback(() => {
    setPanelOpen((prev) => {
      const next = !prev;
      writeTxPanelOpen(next);
      return next;
    });
  }, []);

  // 번역 결과 / 제안 / 상태 — key `${lang}:${segId}`
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, SegStatus>>({});
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [progressLabel, setProgressLabel] = useState<string>("");

  // 첫 세그먼트 자동 선택
  const firstId = segments[0]?.id ?? "";
  const effectiveSelected = selectedId && segments.some((s) => s.id === selectedId) ? selectedId : firstId;

  // ── 번역 결과 영속화: config.translatedManuscripts upsert (setConfig → IndexedDB+Firestore) ──
  // 확정(done) 세그먼트를 순서대로 결합해 (회차 + 대상언어) 단위 엔트리로 저장.
  // 로컬 state 만의 데이터 유실(새로고침·탭 전환·세션 변경 시)을 차단한다.
  // translatedManuscripts upsert 산출(순수) — `prev` 기준 다음 목록을 계산.
  // 반환 null = 변경 없음(엔트리 미존재 시 제거 불필요 / 고아 회차 등). persistTranslations 와
  // handleSelectChapter 가 동일 로직을 공유해, 회차 전환 시 단일 setConfig updater 안에서
  // 번역 영속화 + episode 변경을 함께 처리(stale-closure 2회 write 클로버 방지)하기 위함.
  const computeTranslatedManuscripts = useCallback(
    (
      prev: StoryConfig,
      override?: { translations?: Record<string, string>; statuses?: Record<string, SegStatus>; avgScore?: number | null },
    ): TranslatedManuscriptEntry[] | null => {
      if (!activeManuscript) return null;
      const trans = override?.translations ?? translations;
      const stat = override?.statuses ?? statuses;
      const score = override?.avgScore ?? avgScore;
      const prefix = lang + ":";
      const ordered = segments
        .map((s) => ({ id: s.id, txt: trans[prefix + s.id] }))
        .filter((x) => !!x.txt && stat[x.id] === "done");
      const target = LANG_TO_TARGET[lang];
      const list = prev.translatedManuscripts ?? [];
      const idx = list.findIndex((e) => e.episode === activeManuscript.episode && e.targetLang === target);
      if (ordered.length === 0) {
        // 확정 세그먼트가 없으면(되돌리기 등) 기존 엔트리 제거
        if (idx < 0) return null;
        return list.filter((_, i) => i !== idx);
      }
      // 고아 번역 차단: 해당 회차의 원고(manuscript)가 실제 존재할 때만 upsert.
      // (원고 없는 회차에 번역본만 남는 고아 엔트리 방지 — 회차 삭제/전환 레이스 등.)
      const hasManuscript = (prev.manuscripts ?? []).some((m) => m.episode === activeManuscript.episode);
      if (!hasManuscript) return null;
      const translatedContent = ordered.map((x) => x.txt as string).join("\n\n");
      const tc = prev.translationConfig;
      const prevEntry = idx >= 0 ? list[idx] : undefined;
      // 사인오프 보존 계약(studio-types.ts:438-440): 내용 변경 시에만 재승인 필요(리셋).
      // 회차 이동 등 내용 무변경 upsert 에서는 작가 사인오프(faithful/market/approvedAt)를
      // 그대로 보존한다 — 순수 네비게이션이 영속 사인오프를 조용히 취소하는 회귀 차단.
      const contentChanged = !prevEntry || prevEntry.translatedContent !== translatedContent;
      const entry: TranslatedManuscriptEntry = {
        episode: activeManuscript.episode,
        sourceLang: "KO",
        targetLang: target,
        mode: tc?.mode ?? "fidelity",
        translatedTitle: activeManuscript.title ?? "",
        translatedContent,
        charCount: translatedContent.length,
        avgScore: score ?? 0,
        band: tc?.band ?? 0.5,
        glossarySnapshot: (tc?.glossary ?? glossary).map((g) => ({ source: g.source, target: g.target, locked: !!g.locked })),
        // 내용 변경 없으면 기존 lastUpdate 유지(매 이동마다 교체 방지), 변경 시에만 갱신.
        lastUpdate: contentChanged ? Date.now() : prevEntry!.lastUpdate,
        // 내용 변경 시 계약대로 사인오프 리셋(undefined), 무변경 시 보존.
        faithfulApproved: contentChanged ? undefined : prevEntry!.faithfulApproved,
        marketApproved: contentChanged ? undefined : prevEntry!.marketApproved,
        approvedAt: contentChanged ? undefined : prevEntry!.approvedAt,
      };
      return idx >= 0 ? list.map((e, i) => (i === idx ? entry : e)) : [...list, entry];
    },
    [activeManuscript, translations, statuses, avgScore, lang, segments, glossary],
  );

  const persistTranslations = useCallback(
    (override?: { translations?: Record<string, string>; statuses?: Record<string, SegStatus>; avgScore?: number | null }) => {
      if (!activeManuscript) return;
      setConfig((prev: StoryConfig) => {
        const nextTM = computeTranslatedManuscripts(prev, override);
        if (nextTM === null) return prev;
        return { ...prev, translatedManuscripts: nextTM };
      });
    },
    [activeManuscript, computeTranslatedManuscripts, setConfig],
  );

  // ── 회차 전환 (rail chapter 클릭) ───────────────────────
  // 전환 직전 현재 회차의 진행 중(확정) 번역을 먼저 영속화 → 데이터 유실 방지.
  // 회차 이동 경로 재사용: TabWriting goPrev/goNext 와 동일한 setConfig episode 패턴.
  const handleSelectChapter = useCallback(
    (episode: number) => {
      if (episode === config?.episode) return;
      const nextEp = Math.floor(episode);
      // [3-tier 수리 2026-06-11] 회차 전환은 episode 변경만 — 번역 재영속 호출 금지.
      // 사유: 모든 실제 번역 편집(applyExternalResult/acceptSuggestion/handleTranslateAll/
      //   handleRevert)이 이미 즉시 persistTranslations 로 영속한다. 따라서 전환 시점에
      //   미영속 'pending' 번역은 없다. 이전 구현은 전환 직전 computeTranslatedManuscripts 로
      //   재영속했으나, restore effect 의 비멱등 재분해(multi-sentence 세그먼트 꼬리 유실)로
      //   ① contentChanged 오탐 → 영속 작가 사인오프(faithful/market/approvedAt) 조용히 취소,
      //   ② lossy 버퍼로 stored 본문 truncate 의 두 HIGH 데이터무결성 회귀를 유발했다
      //   (독립 7-리뷰어 적발). episode 단일 변경으로 두 회귀를 모두 제거.
      setConfig((prev: StoryConfig) =>
        prev.episode === nextEp ? prev : { ...prev, episode: nextEp },
      );
    },
    [config, setConfig],
  );

  // ── 복원: config.translatedManuscripts → 로컬 번역 버퍼 (회차/언어 전환 시 1회) ──
  // best-effort: 저장된 translatedContent 를 동일 문장 분해기로 재분해 후 세그먼트에 1:1 매핑.
  // segId 는 splitIntoSegments 에서 위치 기반(s0,s1,…)이라 회차마다 동일 인덱스가 충돌한다.
  // 따라서 머지(...prev) 가 아니라 회차 경계에서 *현재 lang/현재 회차 세그먼트* 키를 전량
  // 제거(strip)한 뒤 stored 로만 재구성한다 — 이전 회차의 잔존 버퍼가 신규 회차로 누수되어
  // computeTranslatedManuscripts 가 엉뚱한 회차 엔트리로 영속하는 교차오염을 차단(replace 시맨틱).
  useEffect(() => {
    if (!activeManuscript) return;
    const target = LANG_TO_TARGET[lang];
    const prefix = lang + ":";
    // 현재 회차 세그먼트가 소유한 키 집합 — 이 키들만 회차 경계에서 strip 대상.
    const ownTransKeys = new Set(segments.map((seg) => prefix + seg.id));
    const ownStatusKeys = new Set(segments.map((seg) => seg.id));
    const stripTrans = (prev: Record<string, string>): Record<string, string> => {
      const next: Record<string, string> = {};
      for (const k of Object.keys(prev)) if (!ownTransKeys.has(k)) next[k] = prev[k];
      return next;
    };
    const stripStatus = (prev: Record<string, SegStatus>): Record<string, SegStatus> => {
      const next: Record<string, SegStatus> = {};
      for (const k of Object.keys(prev)) if (!ownStatusKeys.has(k)) next[k] = prev[k];
      return next;
    };
    const stored = (config?.translatedManuscripts ?? []).find(
      (e) => e.episode === activeManuscript.episode && e.targetLang === target,
    );
    if (!stored || !stored.translatedContent) {
      // 저장된 번역 없음 — 이전 회차 버퍼 잔존 차단을 위해 현재 회차 키만 비운다.
      setTranslations((prev) => stripTrans(prev));
      setStatuses((prev) => stripStatus(prev));
      setAvgScore(null);
      return;
    }
    const pieces = splitIntoSegments(stored.translatedContent);
    const t: Record<string, string> = {};
    const s: Record<string, SegStatus> = {};
    // [3-tier 수리 2026-06-11] 비멱등 재분해 꼬리 유실 방지: splitIntoSegments 왕복은 멱등이
    //   아니라(multi-sentence·대사 세그먼트는 더 많은 조각으로 재분해됨) 위치 1:1 매핑 시
    //   pieces[N..] 초과분이 드롭돼 stored 본문 일부가 버퍼에서 사라졌다. 마지막 세그먼트가
    //   잔여 조각을 전부 흡수해 본문 손실을 차단(편집 후 재영속 시 stored truncate 방지).
    const lastIdx = segments.length - 1;
    segments.forEach((seg, i) => {
      const txt =
        i === lastIdx
          ? pieces
              .slice(i)
              .map((p) => p.ko)
              .filter(Boolean)
              .join(" ")
          : pieces[i]?.ko;
      if (txt) {
        t[prefix + seg.id] = txt;
        s[seg.id] = "done";
      }
    });
    // strip 후 stored 로 재구성(replace) — 잔존 키 누수 차단.
    setTranslations((prev) => ({ ...stripTrans(prev), ...t }));
    setStatuses((prev) => ({ ...stripStatus(prev), ...s }));
    setAvgScore(stored.avgScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeManuscript?.episode, lang]);

  // ── [C-translate-panels] slide-over 패널발 결과 반영 ─────
  // 출판 검수 자동 고침 / NOA 교정 적용 / 세그먼트 채택 finalize 가 회차 전체
  // 텍스트를 돌려준다 → 복원 effect 와 동일한 best-effort 1:1 문장 매핑으로
  // 세그먼트 버퍼에 반영 + 즉시 영속. (분해 수 불일치 시 초과분은 매핑 불가 — 정직 한계)
  const applyExternalResult = useCallback(
    (text: string) => {
      if (!text || !text.trim()) return;
      const pieces = splitIntoSegments(text);
      const t: Record<string, string> = {};
      const s: Record<string, SegStatus> = {};
      segments.forEach((seg, i) => {
        const txt = pieces[i]?.ko;
        if (txt) {
          t[lang + ":" + seg.id] = txt;
          s[seg.id] = "done";
        }
      });
      if (Object.keys(t).length === 0) return;
      const nextTrans = { ...translations, ...t };
      const nextStatuses: Record<string, SegStatus> = { ...statuses, ...s };
      setTranslations(nextTrans);
      setStatuses(nextStatuses);
      persistTranslations({ translations: nextTrans, statuses: nextStatuses });
    },
    [segments, lang, translations, statuses, persistTranslations],
  );

  // 검수 패널용 — 현재 언어의 확정 번역 결합 텍스트 (원고 단위)
  const liveResult = useMemo(() => {
    const prefix = lang + ":";
    return segments
      .map((s) => translations[prefix + s.id])
      .filter(Boolean)
      .join("\n\n");
  }, [segments, translations, lang]);

  // ── [Z1a-UI] 결정적 품질 게이트 (최소 진입점) ────────────
  // Catastrophic 게이트 (성별 대명사 격변·신규 고유명사 환각) + 번역투/AI티 린트(EN만).
  // 전 세그먼트 확정(done) 시에만 산출 — 부분 번역에 대한 오탐 차단 (정직).
  // 주의: 세그먼트 결합(liveResult)은 문장 단위 \n\n 결합이라 문단 수가 원문보다
  // 많아짐 → 문단 손실(floor) 검사는 여기선 사실상 비활성 (전체 회차 검사는
  // 구 번역 셸 NCT 경로가 담당) — 본 카드의 핵심은 대명사/고유명사/린트.
  const qualityGate = useMemo((): {
    cat: CatastrophicReport;
    lint: TranslationeseLintResult | null;
  } | null => {
    if (!activeManuscript || segments.length === 0) return null;
    const allDone = segments.every((s) => statuses[s.id] === "done");
    if (!allDone || !liveResult.trim()) return null;
    try {
      const cat = runCatastrophicCheck({
        source: activeManuscript.content ?? "",
        translation: liveResult,
        srcLang: "ko",
        tgtLang: lang, // LangKey('en'|'ja'|'zh') ⊂ SupportedLang
        glossary: glossary.map((g) => ({ source: g.source, target: g.target, locked: !!g.locked })),
      });
      const lint = lang === "en" ? lintTranslationese(liveResult) : null;
      return { cat, lint };
    } catch {
      return null; // 게이트 오류가 탭 본 흐름을 깨지 않게 (silent)
    }
  }, [activeManuscript, segments, statuses, liveResult, lang, glossary]);

  // ── useTranslation 실 엔진 연결 ─────────────────────────
  const onProgress = useCallback((p: TranslationProgress) => {
    if (p.status === "translating") setProgressLabel("번역 중…");
    else if (p.status === "scoring") setProgressLabel("품질 채점 중…");
    else if (p.status === "recreating") setProgressLabel(`재번역 중… (${p.recreateCount})`);
    else if (p.status === "done") setProgressLabel("");
    else if (p.status === "error") setProgressLabel("오류: " + (p.error ?? ""));
  }, []);

  const { translateEpisode, translateBatch, isTranslating, abort } = useTranslation({ onProgress });

  // 현재 언어의 config 스냅샷 — glossary 를 엔진에 주입
  const buildPartialConfig = useCallback(() => {
    const tc = config?.translationConfig;
    return {
      targetLang: LANG_TO_TARGET[lang] as "EN" | "JP" | "CN",
      glossary: glossary.map((g) => ({ source: g.source, target: g.target, context: g.context, locked: g.locked })),
      mode: tc?.mode ?? ("fidelity" as const),
      band: tc?.band,
      scoreThreshold: tc?.scoreThreshold,
      maxRecreate: tc?.maxRecreate,
      contractionLevel: tc?.contractionLevel,
    };
  }, [config, glossary, lang]);

  // 단일 세그먼트 번역 (segment.ko → 1개 문장 manuscript) — translateEpisode 실 엔진.
  // 결과를 제안(suggestions)으로 스트림 → 사용자가 수락 시 확정 번역으로.
  const translateSegment = useCallback(
    async (segId: string, directive?: string) => {
      const seg = segments.find((s) => s.id === segId);
      if (!seg || !seg.ko.trim()) return;
      const key = lang + ":" + segId;
      setProgressLabel("번역 중…");
      const partial = buildPartialConfig();
      const ms: EpisodeManuscript = {
        episode: activeManuscript?.episode ?? config?.episode ?? 1,
        title: activeManuscript?.title ?? currentSession?.title ?? "",
        content: directive ? `${seg.ko}\n\n[지시: ${directive}]` : seg.ko,
        charCount: seg.ko.length,
        lastUpdate: Date.now(),
      };
      const result = await translateEpisode(ms, partial);
      if (result && result.translatedText) {
        setSuggestions((prev) => ({ ...prev, [key]: result.translatedText.trim() }));
        setStatuses((prev) => ({ ...prev, [segId]: "review" }));
        setAvgScore(result.avgScore);
      }
      setProgressLabel("");
    },
    [segments, lang, buildPartialConfig, translateEpisode, activeManuscript, config, currentSession],
  );

  // 제안 수락 → 확정 번역으로 확정 + done + 즉시 영속화 (데이터 유실 방지)
  const acceptSuggestion = useCallback(
    (segId: string) => {
      const key = lang + ":" + segId;
      const txt = suggestions[key];
      const nextTrans = txt ? { ...translations, [key]: txt } : translations;
      const nextStatuses: Record<string, SegStatus> = { ...statuses, [segId]: "done" };
      setTranslations(nextTrans);
      setSuggestions((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setStatuses(nextStatuses);
      persistTranslations({ translations: nextTrans, statuses: nextStatuses });
      // [s82] 세그먼트 확정 = AI 번역 작가 수락 → AI_SUGGESTION 귀속.
      // 'translate' 구분은 logAcceptAI 에 note 입력이 없어 targetId prefix 로 전달 (정직).
      if (txt) {
        fireCpLog(
          getCreativeLogger()?.logAcceptAI({
            targetType: "manuscript",
            targetId: `translate:${lang}:${activeManuscript?.episode ?? 0}:${segId}`,
            episodeId: activeManuscript?.episode,
            afterContent: txt,
            stage: "translate",
          }),
        );
      }
    },
    [lang, suggestions, translations, statuses, persistTranslations, activeManuscript],
  );

  const rejectSuggestion = useCallback(
    (segId: string) => {
      const key = lang + ":" + segId;
      setSuggestions((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setStatuses((prev) => ({ ...prev, [segId]: "pending" }));
    },
    [lang],
  );

  // AI 바 / chip 재번역 요청 — 선택 세그먼트에 지시문 적용
  const handleAiSend = useCallback(() => {
    const directive = aiText.trim();
    if (!effectiveSelected) return;
    translateSegment(effectiveSelected, directive || undefined);
    setAiText("");
  }, [aiText, effectiveSelected, translateSegment]);

  // 전체 회차 일괄 번역 — translateBatch 실 엔진
  const handleTranslateAll = useCallback(async () => {
    if (!activeManuscript) return;
    setProgressLabel("일괄 번역 중…");
    const partial = buildPartialConfig();
    const results = await translateBatch([activeManuscript], partial);
    const r = results[0];
    if (r && r.translatedText) {
      // 회차 전체 번역문을 세그먼트 수만큼 분배 (문장 분해 후 1:1 매핑 best-effort)
      const lines = splitIntoSegments(r.translatedText);
      const next: Record<string, string> = {};
      const nextStatus: Record<string, SegStatus> = {};
      segments.forEach((seg, i) => {
        const txt = lines[i]?.ko ?? "";
        if (txt) {
          next[lang + ":" + seg.id] = txt;
          nextStatus[seg.id] = "done";
        }
      });
      setTranslations((prev) => ({ ...prev, ...next }));
      setStatuses((prev) => ({ ...prev, ...nextStatus }));
      setAvgScore(r.avgScore);
      persistTranslations({
        translations: { ...translations, ...next },
        statuses: { ...statuses, ...nextStatus },
        avgScore: r.avgScore,
      });
      // [s82] 일괄 번역 적용 = 회차당 1건 배치 기록 (세그먼트별 스팸 방지 — 문서화된 선택)
      fireCpLog(
        getCreativeLogger()?.logAcceptAI({
          targetType: "manuscript",
          targetId: `translate:${lang}:${activeManuscript.episode}:batch`,
          episodeId: activeManuscript.episode,
          afterContent: r.translatedText,
          stage: "translate",
        }),
      );
    }
    setProgressLabel("");
  }, [activeManuscript, buildPartialConfig, translateBatch, segments, lang, translations, statuses, persistTranslations]);

  // ── Glossary persist (setConfig → IndexedDB+Firestore) ──
  const addGlossary = useCallback(
    (source: string, target: string) => {
      setConfig((prev: StoryConfig) => {
        const tc = prev.translationConfig;
        const existing = tc?.glossary ?? [];
        if (existing.some((g) => g.source === source)) return prev;
        const nextGlossary = [...existing, { source, target, locked: false }];
        return {
          ...prev,
          translationConfig: {
            mode: tc?.mode ?? "fidelity",
            targetLang: tc?.targetLang ?? "EN",
            band: tc?.band ?? 0.5,
            scoreThreshold: tc?.scoreThreshold ?? 0.7,
            maxRecreate: tc?.maxRecreate ?? 2,
            contractionLevel: tc?.contractionLevel ?? "normal",
            glossary: nextGlossary,
          },
        };
      });
    },
    [setConfig],
  );

  const removeGlossary = useCallback(
    (source: string) => {
      setConfig((prev: StoryConfig) => {
        const tc = prev.translationConfig;
        if (!tc) return prev;
        return {
          ...prev,
          translationConfig: { ...tc, glossary: (tc.glossary ?? []).filter((g) => g.source !== source) },
        };
      });
    },
    [setConfig],
  );

  // ── 하단 바: export / 저장 / 미리보기 / 되돌리기 ─────────
  const exportApi = useStudioExport({
    currentSession,
    sessions,
    currentSessionId,
    currentProjectId,
    projects,
    // setProjects/setSessions: export 의 manuscripts export 경로는 projects 만 읽으므로 no-op 안전.
    // (이 탭은 import/세션 변경을 호출하지 않음 — exportProjectManuscripts 만 사용.)
    setProjects: () => {},
    setCurrentProjectId,
    setSessions: () => {},
    setCurrentSessionId,
    setActiveTab,
    isKO,
    language,
    writingMode,
    editDraft,
  });

  const handleExport = useCallback(() => {
    exportApi.exportProjectManuscripts("txt");
  }, [exportApi]);

  // 미리보기 — 현재 언어 번역문을 새 창에 렌더 (실 동작)
  const handlePreview = useCallback(() => {
    const ordered = segments
      .map((s) => translations[lang + ":" + s.id] || suggestions[lang + ":" + s.id] || "")
      .filter(Boolean);
    if (ordered.length === 0) return;
    const esc = (t: string) =>
      t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const body = ordered.map((p) => `<p>${esc(p)}</p>`).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    const title = esc((activeManuscript?.title ?? currentSession?.title ?? "Translation") + " · " + LANGS[lang].native);
    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>` +
        `<style>body{max-width:760px;margin:48px auto;padding:0 24px;font-family:serif;line-height:1.85;color:#222}h1{font-family:sans-serif;font-size:18px;color:#555}p{margin:0 0 1em}</style>` +
        `</head><body><h1>${title}</h1>${body}</body></html>`,
    );
    w.document.close();
  }, [segments, translations, suggestions, lang, activeManuscript, currentSession]);

  // 되돌리기 — 현재 언어의 번역/제안/상태 초기화 (확정 전 작업 폐기)
  const handleRevert = useCallback(() => {
    const prefix = lang + ":";
    const strip = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith(prefix)));
    setTranslations((prev) => strip(prev));
    setSuggestions((prev) => strip(prev));
    setStatuses((prev) => {
      const next: Record<string, SegStatus> = {};
      for (const seg of segments) next[seg.id] = "pending";
      return next;
    });
    setAvgScore(null);
  }, [lang, segments]);

  const handleSave = useCallback(() => {
    persistTranslations();
    triggerSave();
  }, [triggerSave, persistTranslations]);

  // ── 진행률 계산 (실 데이터) ─────────────────────────────
  const doneCount = segments.filter((s) => statuses[s.id] === "done").length;
  const total = segments.length;
  const liveProgress = total > 0 ? doneCount / total : 0;

  // 현재 언어는 실시간 진행률, 그 외 언어는 저장된 번역 엔트리 유무로 추정 (0/1)
  const progressForLang = (k: LangKey): number => {
    if (k === lang) return liveProgress;
    const stored = (config?.translatedManuscripts ?? []).find(
      (e) => e.episode === activeManuscript?.episode && e.targetLang === LANG_TO_TARGET[k],
    );
    return stored ? 1 : 0;
  };
  const progressMap: Record<LangKey, number> = {
    en: progressForLang("en"),
    ja: progressForLang("ja"),
    zh: progressForLang("zh"),
  };
  const stats = { progress: liveProgress, done: doneCount, total, avgScore };

  // ── 빈 상태 가드 ────────────────────────────────────────
  if (!currentSession) return <EmptyState reason="no-session" />;
  if (!activeManuscript || segments.length === 0) return <EmptyState reason="no-manuscript" />;

  const bottomActions: [string, typeof Sync, () => void][] = [
    ["되돌리기", Sync, handleRevert],
    ["저장", Download, handleSave],
    ["미리보기", Eye, handlePreview],
  ];

  return (
    <div className="tx-grid">
      <TranslateRail
        lang={lang}
        onLang={setLang}
        progress={progressMap}
        layout={layout}
        onLayout={setLayout}
        chapters={chapters}
        activeManuscriptEp={activeManuscript.episode}
        onSelectChapter={handleSelectChapter}
      />

      <div className="tx-center">
        <TranslateEditor
          segments={segments}
          lang={lang}
          layout={layout}
          statuses={statuses}
          translations={translations}
          suggestions={suggestions}
          selectedId={effectiveSelected}
          onSelect={setSelectedId}
          activeTerm={activeTerm}
          onTranslateSeg={(id) => translateSegment(id)}
          onAcceptSugg={acceptSuggestion}
          onRejectSugg={rejectSuggestion}
          busy={isTranslating}
        />

        {/* bottom action bar */}
        <div className="tx-bottom">
          <div className="tx-actions">
            {bottomActions.map(([label, Icon, onClick]) => (
              <button key={label} className="tx-act" onClick={onClick}>
                <Icon size={16} strokeWidth={1.6} />
                <span>{label}</span>
              </button>
            ))}
            <button className="btn primary" style={{ marginLeft: "4px" }} onClick={handleExport}>
              <Download size={15} strokeWidth={1.6} />
              번역본 내보내기
            </button>
          </div>
          <div className="tx-ai">
            <div className="tx-ai-bar">
              <span className="tx-ai-spark">
                <Sparkle size={16} strokeWidth={1.6} />
              </span>
              <input
                className="tx-ai-input"
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isTranslating && handleAiSend()}
                placeholder={
                  progressLabel || "선택한 문단을 NOA에게 재번역 요청… (Enter)"
                }
                disabled={isTranslating}
              />
              {isTranslating ? (
                <button
                  type="button"
                  className="tx-ai-send"
                  aria-label="번역 취소"
                  title="번역 취소"
                  onClick={abort}
                >
                  <X size={15} strokeWidth={1.6} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  className="tx-ai-send"
                  aria-label="재번역 요청 전송"
                  title="재번역 요청 전송"
                  onClick={handleAiSend}
                >
                  <Send size={15} strokeWidth={1.6} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="tx-chips">
              <button
                className="tx-chip"
                onClick={handleTranslateAll}
                disabled={isTranslating}
                title="현재 회차 전체를 일괄 번역"
              >
                <Sparkle size={13} strokeWidth={1.6} />
                전체 번역
              </button>
              {REWRITE_CHIPS.map((c) => (
                <button
                  key={c}
                  className="tx-chip"
                  disabled={isTranslating || !effectiveSelected}
                  onClick={() => {
                    if (effectiveSelected) translateSegment(effectiveSelected, c);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <TranslatePanel
        lang={lang}
        stats={stats}
        glossary={glossary}
        activeTerm={activeTerm}
        onTerm={setActiveTerm}
        onAddGlossary={addGlossary}
        onRemoveGlossary={removeGlossary}
        onOpenPanel={setOpenPanel}
        open={panelOpen}
        onToggle={togglePanel}
        gate={qualityGate}
      />

      {/* [C-translate-panels] 구 번역 셸 3패널 slide-over (fixed overlay) */}
      <TranslatePanels
        open={openPanel}
        onClose={() => setOpenPanel(null)}
        lang={lang}
        activeEpisode={activeManuscript.episode}
        source={activeManuscript.content ?? ""}
        result={liveResult}
        onResultChange={applyExternalResult}
      />
    </div>
  );
}
