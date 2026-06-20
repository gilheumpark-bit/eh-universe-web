"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Chevron,
  ChevronL,
  ChevronR,
  Languages,
} from "@/components/loreguard/icons";
import { LANGS, type LangKey, type LayoutMode } from "./TabTranslate.shared";

const TX_RAIL_KEY = "noa-lg-tx-rail";

function readNarrowLayout(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(max-width: 1179.98px)").matches;
}

function readTxRailOpen(): boolean {
  if (typeof window === "undefined") return false;
  if (readNarrowLayout()) return false;
  try {
    return window.localStorage.getItem(TX_RAIL_KEY) === "1";
  } catch {
    return false;
  }
}

function writeTxRailOpen(open: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TX_RAIL_KEY, open ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function useTxRailSheet(): boolean {
  const [isSheet, setIsSheet] = useState(readNarrowLayout);
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

function RailProgressBar({ value }: { value: number }) {
  return (
    <div className="tbar">
      <span style={{ width: Math.max(0, Math.min(1, value)) * 100 + "%", background: "var(--grad-primary)" }} />
    </div>
  );
}

interface TranslateRailProps {
  lang: LangKey;
  onLang: (key: LangKey) => void;
  progress: Record<LangKey, number>;
  layout: LayoutMode;
  onLayout: (mode: LayoutMode) => void;
  chapters: { episode: number; title: string; words: number }[];
  activeManuscriptEp: number | null;
  onSelectChapter: (episode: number) => void;
}

export function TranslateRail({
  lang,
  onLang,
  progress,
  layout,
  onLayout,
  chapters,
  activeManuscriptEp,
  onSelectChapter,
}: TranslateRailProps) {
  const [open, setOpen] = useState(readTxRailOpen);
  const isSheet = useTxRailSheet();

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      writeTxRailOpen(next);
      return next;
    });
  }, []);

  const closeIfSheet = useCallback(() => {
    if (!isSheet) return;
    setOpen(false);
    writeTxRailOpen(false);
  }, [isSheet]);

  if (!open) {
    return (
      <aside className="trail collapsed" id="lg-tx-rail" aria-label="번역 언어·회차 레일 (접힘)">
        <button
          type="button"
          className="trail-toggle"
          aria-expanded={false}
          aria-controls="lg-tx-rail"
          aria-label="언어·회차 레일 펼치기"
          title="언어·회차 레일 펼치기"
          onClick={toggle}
        >
          <ChevronR size={16} strokeWidth={1.6} aria-hidden="true" />
        </button>
        <span className="trail-vlabel" aria-hidden="true">
          언어·회차
        </span>
      </aside>
    );
  }

  return (
    <aside
      className="trail"
      id="lg-tx-rail"
      aria-label="번역 언어·회차 레일"
      role={isSheet ? "dialog" : undefined}
      aria-modal={isSheet ? "true" : undefined}
    >
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
        <button
          type="button"
          className="trail-toggle"
          aria-expanded={true}
          aria-controls="lg-tx-rail"
          aria-label="언어·회차 레일 접기"
          title="언어·회차 레일 접기"
          onClick={toggle}
        >
          <ChevronL size={16} strokeWidth={1.6} aria-hidden="true" />
        </button>
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
          {(Object.keys(LANGS) as LangKey[]).map((key) => {
            const meta = LANGS[key];
            const selected = lang === key;
            const pct = progress[key];
            return (
              <button
                key={key}
                className={"lang-opt" + (selected ? " on" : "")}
                onClick={() => {
                  onLang(key);
                  closeIfSheet();
                }}
              >
                <span className={"lang-chip" + (selected ? "" : " mute")}>{meta.flag}</span>
                <div className="lang-opt-body">
                  <div className="lang-opt-top">
                    <span className="lang-opt-name">{meta.label}</span>
                    <span className="lang-opt-pct">{Math.round(pct * 100)}%</span>
                  </div>
                  <RailProgressBar value={pct} />
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
          chapters.map((chapter) => {
            const active = chapter.episode === activeManuscriptEp;
            return (
              <div
                key={chapter.episode}
                className={"chap" + (active ? " on" : "")}
                role="button"
                tabIndex={0}
                aria-current={active ? "true" : undefined}
                aria-label={`${chapter.episode}화 ${chapter.title} 회차로 전환`}
                onClick={() => {
                  onSelectChapter(chapter.episode);
                  closeIfSheet();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectChapter(chapter.episode);
                    closeIfSheet();
                  }
                }}
              >
                <span className="chap-n">{String(chapter.episode).padStart(2, "0")}</span>
                <span className="chap-t">{chapter.title}</span>
                {active ? (
                  <span className="chap-dot" />
                ) : (
                  <span className="chap-w">{chapter.words.toLocaleString()}</span>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="trail-sec">
        <div className="trail-label">대조 보기</div>
        <div className="seg">
          <button
            className={layout === "split" ? "on" : ""}
            onClick={() => {
              onLayout("split");
              closeIfSheet();
            }}
          >
            좌우 분할
          </button>
          <button
            className={layout === "inline" ? "on" : ""}
            onClick={() => {
              onLayout("inline");
              closeIfSheet();
            }}
          >
            인라인
          </button>
        </div>
      </div>
    </aside>
  );
}

export function EmptyTranslationRail() {
  const [open, setOpen] = useState(readTxRailOpen);
  const isSheet = useTxRailSheet();

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      writeTxRailOpen(next);
      return next;
    });
  }, []);

  if (!open) {
    return (
      <aside className="trail collapsed" id="lg-tx-rail" aria-label="번역 언어·회차 레일 (접힘)">
        <button
          type="button"
          className="trail-toggle"
          aria-expanded={false}
          aria-controls="lg-tx-rail"
          aria-label="언어·회차 레일 펼치기"
          title="언어·회차 레일 펼치기"
          onClick={toggle}
        >
          <ChevronR size={16} strokeWidth={1.6} aria-hidden="true" />
        </button>
        <span className="trail-vlabel" aria-hidden="true">
          언어·회차
        </span>
      </aside>
    );
  }

  return (
    <aside
      className="trail"
      id="lg-tx-rail"
      aria-label="번역 언어·회차 레일"
      role={isSheet ? "dialog" : undefined}
      aria-modal={isSheet ? "true" : undefined}
    >
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
        <button
          type="button"
          className="trail-toggle"
          aria-expanded={true}
          aria-controls="lg-tx-rail"
          aria-label="언어·회차 레일 접기"
          title="언어·회차 레일 접기"
          onClick={toggle}
        >
          <ChevronL size={16} strokeWidth={1.6} aria-hidden="true" />
        </button>
      </div>
      <div className="trail-sec">
        <div className="trail-label">회차 · CHAPTER</div>
        <div className="trail-sub" style={{ padding: "4px 0" }}>
          원고가 없습니다
        </div>
      </div>
    </aside>
  );
}
