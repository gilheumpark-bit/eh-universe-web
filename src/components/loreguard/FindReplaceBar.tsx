"use client";

/* ===========================================================
   FindReplaceBar — 집필 본문(editDraft textarea) 찾기·바꾸기 바 (QB-tabwriting-ide (1)).

   TabWriting 의 editDraft textarea 전용 보조 컴포넌트. 발명 금지 —
   매칭/치환 로직은 기존 순수 함수 재사용:
     - findAllOccurrences  (src/lib/multi-cursor/find-occurrences.ts) — 일치 위치 N개
     - replaceAllOccurrences (동) — 뒤→앞 단일 패스 치환 (offset 무효화 방지)

   계약 (contract):
   - 표시/제어는 부모(TabWriting)가 소유. 이 바는 *값을 직접 set 하지 않는다* —
     바꾼 결과는 onReplace(next) 로 부모에게 위임 → 부모가 기존 본문 set 경로
     (setEditDraft + undo 링버퍼 push)로 일원화 (undo 스택과 정합·QB (2)).
   - 찾기 입력 → 실시간 일치 수 + 현재 위치. 다음/이전 = 해당 occurrence 를
     textarea 에서 select + scrollIntoView (본문 변경 0 — 단순 내비).
   - 바꾸기(현재 1건) / 전체 바꾸기 = onReplace 로 새 본문 전달.
   - Escape = onClose. 닫힐 때 textarea 포커스 복귀는 부모가 처리하지 않아도
     이 바가 직접 el.focus() (작가 흐름 유지).
   - a11y: role/aria-label/aria-live(일치 수)·각 버튼 aria-label.

   안전:
   - text/query 빈값 → 일치 0 (findAllOccurrences 가 [] 반환·여기서도 가드).
   - 정규식 모드 미지원(평문 검색만) — 작가용 단순 찾기·바꾸기 (FindOptions.regex
     기본 false). 대소문자 구분 토글 제공 (caseSensitive).
   - i18n: L4 (KO/EN) — 부모가 language 전달.
   =========================================================== */

import { useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";
import { findAllOccurrences, replaceAllOccurrences, type Occurrence } from "@/lib/multi-cursor/find-occurrences";
import { Search, X, ChevronL, ChevronR } from "@/components/loreguard/icons";

export interface FindReplaceBarProps {
  /** 검색 대상 본문 (= editDraft) */
  text: string;
  /** 본문 textarea ref (select·scroll 내비 전용 — 값 set 안 함) */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** 바꾼 결과 본문 위임 (부모가 setEditDraft + undo push 로 일원화) */
  onReplace: (next: string) => void;
  /** 바 닫기 (Escape / 닫기 버튼) */
  onClose: () => void;
  language: AppLanguage;
}

export default function FindReplaceBar({
  text,
  textareaRef,
  onReplace,
  onClose,
  language,
}: FindReplaceBarProps) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  /** 현재 강조 중인 일치 index (0-based·일치 없으면 -1) */
  const [current, setCurrent] = useState(0);

  const findInputRef = useRef<HTMLInputElement | null>(null);
  const liveId = useId();

  // 마운트 시 찾기 입력에 포커스 (작가가 바로 타이핑) — 본문 선택 텍스트가 있으면 그것을 초기 query 로
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      const sel = el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0);
      if (sel && !sel.includes("\n") && sel.length <= 100) setQuery(sel);
    }
    findInputRef.current?.focus();
    findInputRef.current?.select();
    // textareaRef 는 stable ref 객체 — 마운트 1회만 의도 (값 변화로 재실행 금지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 일치 위치 — findAllOccurrences 재사용 (평문·정규식 미사용·발명 0). text/query 의존 메모 1개. */
  const occurrences = useMemo<Occurrence[]>(
    () => (query ? findAllOccurrences(text, query, { caseSensitive }) : []),
    [text, query, caseSensitive],
  );

  // query/text 변경으로 일치 수가 줄면 current 를 범위 안으로 보정 (out-of-range 강조 방지)
  useEffect(() => {
    if (occurrences.length === 0) {
      if (current !== 0) setCurrent(0);
    } else if (current > occurrences.length - 1) {
      setCurrent(occurrences.length - 1);
    }
  }, [occurrences.length, current]);

  /** textarea 에서 i번째 일치를 select + 가시 영역으로 스크롤 (본문 변경 0). */
  const focusOccurrence = (idx: number) => {
    const el = textareaRef.current;
    const occ = occurrences[idx];
    if (!el || !occ) return;
    el.focus();
    try {
      el.setSelectionRange(occ.start, occ.end);
    } catch {
      /* 일부 브라우저 미지원 — 무동작 (기능 영향 없음) */
    }
    // 대략적 스크롤: 선택 시작까지의 줄 수 × 줄 높이 추정 (네이티브 caret 스크롤 보강)
    const before = el.value.slice(0, occ.start);
    const line = before.split("\n").length - 1;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24;
    const target = Math.max(0, line * lineHeight - el.clientHeight / 2);
    el.scrollTop = target;
  };

  const goNext = () => {
    if (occurrences.length === 0) return;
    const next = (current + 1) % occurrences.length;
    setCurrent(next);
    focusOccurrence(next);
  };
  const goPrev = () => {
    if (occurrences.length === 0) return;
    const prev = (current - 1 + occurrences.length) % occurrences.length;
    setCurrent(prev);
    focusOccurrence(prev);
  };

  /** 현재 1건 바꾸기 — 해당 occurrence 만 replacement 로. 부모 set 경로 위임. */
  const replaceCurrent = () => {
    const occ = occurrences[current];
    if (!occ) return;
    const next = text.slice(0, occ.start) + replacement + text.slice(occ.end);
    onReplace(next);
    // 치환 후 다음 일치로 — text 가 바뀌면 occurrences 재계산되므로 current 유지(보정 effect 가 처리)
  };

  /** 전체 바꾸기 — replaceAllOccurrences 재사용 (뒤→앞 단일 패스). 부모 set 경로 위임. */
  const replaceAll = () => {
    if (occurrences.length === 0) return;
    const next = replaceAllOccurrences(text, occurrences, replacement);
    if (next !== text) onReplace(next);
  };

  const matchLabel =
    occurrences.length === 0
      ? L4(language, { ko: "일치 없음", en: "No matches" })
      : L4(language, {
          ko: `${current + 1} / ${occurrences.length}`,
          en: `${current + 1} / ${occurrences.length}`,
        });

  const onBarKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      textareaRef.current?.focus();
    }
  };

  return (
    <div
      className="wr-doc"
      role="search"
      aria-label={L4(language, { ko: "본문 찾기·바꾸기", en: "Find and replace in manuscript" })}
      onKeyDown={onBarKeyDown}
      style={{ paddingBottom: 0 }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          border: "1px solid var(--line)",
          borderRadius: 10,
          background: "var(--page-2, transparent)",
        }}
      >
        <Search size={15} style={{ flexShrink: 0, color: "var(--c-sub, #888)" }} />
        {/* 찾기 입력 */}
        <input
          ref={findInputRef}
          className="wd-in-field"
          aria-label={L4(language, { ko: "찾을 내용", en: "Find" })}
          aria-describedby={liveId}
          placeholder={L4(language, { ko: "찾기", en: "Find" })}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") {
              e.preventDefault();
              if (e.shiftKey) goPrev();
              else goNext();
            }
          }}
          style={{ flex: "1 1 140px", minWidth: 0 }}
        />
        {/* 실시간 일치 수 — aria-live 로 스크린리더 통지 */}
        <span
          id={liveId}
          role="status"
          aria-live="polite"
          style={{ fontSize: 11.5, color: "var(--c-sub, #888)", minWidth: 64, textAlign: "center" }}
        >
          {matchLabel}
        </span>
        {/* 이전/다음 */}
        <button
          type="button"
          className="mini-btn"
          aria-label={L4(language, { ko: "이전 일치", en: "Previous match" })}
          title={L4(language, { ko: "이전 일치 (Shift+Enter)", en: "Previous match (Shift+Enter)" })}
          disabled={occurrences.length === 0}
          onClick={goPrev}
        >
          <ChevronL size={13} />
        </button>
        <button
          type="button"
          className="mini-btn"
          aria-label={L4(language, { ko: "다음 일치", en: "Next match" })}
          title={L4(language, { ko: "다음 일치 (Enter)", en: "Next match (Enter)" })}
          disabled={occurrences.length === 0}
          onClick={goNext}
        >
          <ChevronR size={13} />
        </button>
        {/* 대소문자 구분 토글 (영문 효과적·한글 무영향) */}
        <button
          type="button"
          className={"mini-btn" + (caseSensitive ? " ok" : "")}
          aria-pressed={caseSensitive}
          aria-label={L4(language, { ko: "대소문자 구분", en: "Match case" })}
          title={L4(language, { ko: "대소문자 구분", en: "Match case" })}
          onClick={() => setCaseSensitive((v) => !v)}
          style={{ fontWeight: 700 }}
        >
          Aa
        </button>
        {/* 닫기 */}
        <button
          type="button"
          className="eh-icbtn"
          aria-label={L4(language, { ko: "찾기·바꾸기 닫기", en: "Close find and replace" })}
          title={L4(language, { ko: "닫기 (Esc)", en: "Close (Esc)" })}
          style={{ marginLeft: "auto" }}
          onClick={() => {
            onClose();
            textareaRef.current?.focus();
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* 바꾸기 행 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          marginTop: 6,
          border: "1px solid var(--line)",
          borderRadius: 10,
          background: "var(--page-2, transparent)",
        }}
      >
        <span style={{ width: 15, flexShrink: 0 }} aria-hidden="true" />
        <input
          className="wd-in-field"
          aria-label={L4(language, { ko: "바꿀 내용", en: "Replace with" })}
          placeholder={L4(language, { ko: "바꾸기", en: "Replace" })}
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") {
              e.preventDefault();
              replaceCurrent();
            }
          }}
          style={{ flex: "1 1 140px", minWidth: 0 }}
        />
        <button
          type="button"
          className="mini-btn"
          aria-label={L4(language, { ko: "현재 일치 바꾸기", en: "Replace current match" })}
          disabled={occurrences.length === 0}
          onClick={replaceCurrent}
        >
          {L4(language, { ko: "바꾸기", en: "Replace" })}
        </button>
        <button
          type="button"
          className="mini-btn"
          aria-label={L4(language, {
            ko: `전체 바꾸기 (${occurrences.length}건)`,
            en: `Replace all (${occurrences.length})`,
          })}
          disabled={occurrences.length === 0}
          onClick={replaceAll}
        >
          {L4(language, { ko: "전체 바꾸기", en: "Replace all" })}
        </button>
      </div>
    </div>
  );
}
