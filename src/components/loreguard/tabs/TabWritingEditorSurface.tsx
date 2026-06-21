import type {
  CSSProperties,
  ChangeEventHandler,
  ClipboardEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  RefObject,
} from "react";
import { InlineActionPopup, type ReplaceRangeInfo } from "@/components/studio/InlineActionPopup";
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
  onReplaceInlineSelection: (oldText: string, newText: string, range?: ReplaceRangeInfo) => void;
};

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
  onReplaceInlineSelection,
}: TabWritingEditorSurfaceProps) {
  const readParagraphs = text.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);

  if (readMode) {
    return (
      <>
        <article
          className="wr-doc wr-manuscript-surface wr-read-surface"
          data-font={fontMode}
          role="document"
          aria-label={L4(language, { ko: "원고 읽기 검토", en: "Draft reading review" })}
          style={{ ...editorViewStyle, flex: 1 }}
        >
          <div className="wr-reader-page">
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
      <div className="wr-doc wr-manuscript-surface" data-font={fontMode} style={{ ...editorViewStyle, flex: 1, display: "flex" }}>
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
          spellCheck={false}
          style={{
            flex: 1,
            width: "100%",
            minHeight: 360,
            resize: "none",
            border: "none",
            outline: "none",
            background: "transparent",
            color: "inherit",
            font: "inherit",
            lineHeight: "inherit",
          }}
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
