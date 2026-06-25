import type {
  CSSProperties,
  ChangeEventHandler,
  ClipboardEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  RefObject,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Quote, Asterisk, Minus, IndentDecrease, IndentIncrease } from "@/components/loreguard/icons";
import { InlineActionPopup, type ReplaceRangeInfo } from "@/components/studio/InlineActionPopup";
import {
  applyIndentToLineRange,
  applyInsertAt,
  applyWrapToRange,
  type TextOperationResult,
} from "@/components/studio/WritingToolbar";
import { L4 } from "@/lib/i18n";
import type { AppLanguage, StoryConfig } from "@/lib/studio-types";
import type { WritingFontMode } from "@/components/loreguard/ComposerExtras";
import { WritingStatsStrip } from "@/components/loreguard/tabs/TabWritingStatsStrip";

type TabWritingEditorSurfaceProps = {
  language: AppLanguage;
  text: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  fontMode: WritingFontMode;
  editorViewStyle: CSSProperties;
  readMode: boolean;
  config: StoryConfig;
  snapshotSessionId: string | null;
  snapshotEpisode: number | null;
  onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onContextMenu: MouseEventHandler<HTMLTextAreaElement>;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  onPaste: ClipboardEventHandler<HTMLTextAreaElement>;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
  onTextPatch: (next: string) => void;
  onReplaceInlineSelection: (oldText: string, newText: string, range?: ReplaceRangeInfo) => void;
};

function cssLength(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return `${value}px`;
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function cssScalar(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function cssText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function setCssVar(style: CSSStyleDeclaration, name: string, value: string | null): void {
  if (value) style.setProperty(name, value);
  else style.removeProperty(name);
}

function applyEditorViewVars(node: HTMLElement | null, editorViewStyle: CSSProperties): void {
  if (!node) return;
  setCssVar(node.style, "--wr-editor-font-size", cssLength(editorViewStyle.fontSize));
  setCssVar(node.style, "--wr-editor-line-height", cssScalar(editorViewStyle.lineHeight));
  setCssVar(node.style, "--wr-editor-max-width", cssLength(editorViewStyle.maxWidth));
  setCssVar(node.style, "--wr-editor-font-family", cssText(editorViewStyle.fontFamily));
}

export default function TabWritingEditorSurface({
  language,
  text,
  textareaRef,
  fontMode,
  editorViewStyle,
  readMode,
  config,
  snapshotSessionId,
  snapshotEpisode,
  onKeyDown,
  onContextMenu,
  onChange,
  onPaste,
  onCompositionStart,
  onCompositionEnd,
  onTextPatch,
  onReplaceInlineSelection,
}: TabWritingEditorSurfaceProps) {
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(false);
  const surfaceRef = useRef<HTMLElement | null>(null);
  const readParagraphs = text.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const trimmedLength = text.trim().length;
  const readMinuteEstimate = trimmedLength > 0 ? Math.max(1, Math.ceil(trimmedLength / 650)) : 0;
  const isKorean = language === "KO";

  const bindSurfaceRef = useCallback(
    (node: HTMLElement | null) => {
      surfaceRef.current = node;
      applyEditorViewVars(node, editorViewStyle);
    },
    [editorViewStyle],
  );

  useEffect(() => {
    applyEditorViewVars(surfaceRef.current, editorViewStyle);
  }, [editorViewStyle]);

  const selectionRange = () => {
    const textarea = textareaRef.current;
    if (!textarea) return { start: text.length, end: text.length };
    return { start: textarea.selectionStart ?? text.length, end: textarea.selectionEnd ?? text.length };
  };

  const applyTextOperation = (result: TextOperationResult) => {
    onTextPatch(result.text);
    window.setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      try {
        textarea.setSelectionRange(result.selection.start, result.selection.end);
      } catch {
        /* selection restoration is best-effort */
      }
    }, 0);
  };

  const insertAtCursor = (insert: string) => {
    applyTextOperation(applyInsertAt(text, selectionRange().end, insert));
  };

  if (readMode) {
    return (
      <>
        <article
          ref={bindSurfaceRef}
          className="wr-doc wr-manuscript-surface wr-read-surface wr-view-box"
          data-font={fontMode}
          role="document"
          aria-label={L4(language, { ko: "원고 읽기 검토", en: "Draft reading review" })}
        >
          <div className="wr-reader-page">
            <div className="wr-reader-meta" aria-label={L4(language, { ko: "읽기 검토 요약", en: "Reading review summary" })}>
              <span>
                {L4(language, { ko: "문단", en: "Paragraphs" })} {readParagraphs.length.toLocaleString()}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {L4(language, { ko: "예상", en: "Est." })} {readMinuteEstimate.toLocaleString()}
                {L4(language, { ko: "분", en: " min" })}
              </span>
            </div>
            {readParagraphs.length > 0 ? (
              readParagraphs.map((paragraph, index) => (
                <p key={`${index}:${paragraph.slice(0, 16)}`} className="wr-read-p">
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="wr-reader-empty">
                {L4(language, { ko: "아직 읽을 원고가 없습니다.", en: "No draft to read yet." })}
              </p>
            )}
          </div>
        </article>

        <WritingStatsStrip
          key={`${snapshotSessionId ?? "none"}:${snapshotEpisode ?? "draft"}`}
          text={text}
          language={language}
        />
      </>
    );
  }

  return (
    <>
      <div
        ref={bindSurfaceRef}
        className="wr-doc wr-manuscript-surface wr-view-box wr-editor-shell"
        data-font={fontMode}
      >
        <div
          role="toolbar"
          aria-label={L4(language, { ko: "원고 수동 편집 도구", en: "Manual manuscript editing tools" })}
          className="wr-manual-toolbar"
        >
          <span className="wr-manual-toolbar-title">
            {L4(language, { ko: "원고 도구", en: "Draft tools" })}
          </span>
          <button
            type="button"
            className="mini-btn wr-tool-btn"
            aria-label={L4(language, { ko: "선택 문장 따옴표", en: "Wrap selection in quotes" })}
            title={L4(language, { ko: "선택 문장을 「 」로 감쌉니다.", en: "Wrap the selection in quotes." })}
            onClick={() => applyTextOperation(applyWrapToRange(text, selectionRange(), "「", "」"))}
          >
            <Quote size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mini-btn wr-tool-btn"
            aria-label={L4(language, { ko: "장면 전환 삽입", en: "Insert scene break" })}
            title={L4(language, { ko: "커서 위치에 장면 전환 표식을 넣습니다.", en: "Insert a scene break at the cursor." })}
            onClick={() => insertAtCursor("\n\n* * *\n\n")}
          >
            <Asterisk size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mini-btn wr-tool-btn"
            aria-label={L4(language, { ko: "구분선 삽입", en: "Insert divider" })}
            title={L4(language, { ko: "커서 위치에 구분선을 넣습니다.", en: "Insert a divider at the cursor." })}
            onClick={() => insertAtCursor("\n\n────────────────\n\n")}
          >
            <Minus size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mini-btn wr-tool-btn"
            aria-label={L4(language, { ko: "내어쓰기", en: "Outdent selected lines" })}
            title={L4(language, { ko: "선택 줄의 들여쓰기를 줄입니다.", en: "Reduce indentation for selected lines." })}
            onClick={() => applyTextOperation(applyIndentToLineRange(text, selectionRange(), "out"))}
          >
            <IndentDecrease size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mini-btn wr-tool-btn"
            aria-label={L4(language, { ko: "들여쓰기", en: "Indent selected lines" })}
            title={L4(language, { ko: "선택 줄을 들여씁니다.", en: "Indent selected lines." })}
            onClick={() => applyTextOperation(applyIndentToLineRange(text, selectionRange(), "in"))}
          >
            <IndentIncrease size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={"mini-btn wr-tool-btn" + (spellCheckEnabled ? " ok" : "")}
            aria-pressed={spellCheckEnabled}
            aria-label={L4(language, { ko: "브라우저 맞춤법 표시", en: "Browser spellcheck" })}
            title={L4(language, {
              ko: isKorean ? "브라우저가 지원하는 맞춤법 표시를 켭니다." : "Use browser spellcheck for this draft.",
              en: "Use browser spellcheck for this draft.",
            })}
            onClick={() => setSpellCheckEnabled((value) => !value)}
          >
            {L4(language, { ko: "맞춤법", en: "Spell" })}
          </button>
        </div>
        <textarea
          data-testid="writing-manuscript-editor"
          ref={textareaRef}
          className="wr-editor"
          aria-label={L4(language, { ko: "원고 본문 편집", en: "Edit manuscript body" })}
          value={text}
          onKeyDown={onKeyDown}
          onContextMenu={onContextMenu}
          onChange={onChange}
          onPaste={onPaste}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          placeholder={L4(language, { ko: "여기에 이야기를 써 내려가세요…", en: "Write your story here…" })}
          spellCheck={spellCheckEnabled}
        />
      </div>

      <InlineActionPopup
        textareaRef={textareaRef}
        language={language}
        fullText={text}
        storyConfig={{
          genre: config.genre || undefined,
          tone: config.primaryEmotion || undefined,
          narrativeIntensity: config.narrativeIntensity || undefined,
          characters: config.characters?.slice(0, 5).map((character) => ({
            name: character.name,
            role: character.role,
            speechStyle: character.speechStyle,
          })),
        }}
        onReplace={onReplaceInlineSelection}
      />

      <WritingStatsStrip
        key={`${snapshotSessionId ?? "none"}:${snapshotEpisode ?? "draft"}`}
        text={text}
        language={language}
      />
    </>
  );
}
