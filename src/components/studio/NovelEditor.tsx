'use client';

// ============================================================
// PART 1 — Imports & Types
// ============================================================
import React, { useEffect, useCallback, useRef, useImperativeHandle, useState, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { NovelKeymap } from '@/components/studio/extensions/novel-keymap';
import { InlineCompletion } from '@/components/studio/extensions/inline-completion';
// [Phase A-4 — 2026-05-07] Symbol Index 본문 데코레이션 (Phase B Symbol IDE).
import { SymbolDecorationExtension } from '@/components/studio/extensions/symbol-decoration';
// [Phase A-5 — 2026-05-07] Breakpoint Gutter (Phase D Story Debugger).
import { BreakpointGutterExtension } from '@/components/studio/extensions/breakpoint-gutter';
// [연결 #1 — 2026-05-07] Symbol hover quick info — symbolIndex + episodes 주입 시 활성.
import { SymbolHoverCard } from '@/components/studio/symbol-ide/SymbolHoverCard';
import { buildHoverInfo } from '@/lib/symbol-index/find-references';
import type { HoverInfo } from '@/lib/symbol-index/types';
import { L4 } from '@/lib/i18n';
import type { AppLanguage, EpisodeManuscript, Character } from '@/lib/studio-types';
import type { SymbolIndex } from '@/lib/symbol-index/types';
import type { Breakpoint } from '@/lib/story-debugger/types';
import { logger } from '@/lib/logger';

export interface NovelEditorSelection {
  from: number;
  to: number;
  text: string;
  /** Screen-space rect of the selection head for popup positioning */
  coords: { top: number; left: number; bottom: number } | null;
}

export interface NovelEditorHandle {
  /** Direct access to the Tiptap editor instance */
  getEditor: () => ReturnType<typeof useEditor> | null;
}

interface NovelEditorProps {
  content: string;
  onChange: (text: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  language?: AppLanguage;
  onSelectionChange?: (selection: NovelEditorSelection | null) => void;
  /** [Phase A-4] Symbol Index — 주입 시 본문 underline + hover 트리거 */
  symbolIndex?: SymbolIndex;
  /** [연결 #1] 모든 episodes — Symbol Hover quick info 의 references count + 최근 화수 lookup */
  episodes?: EpisodeManuscript[];
  /** [연결 #1] 캐릭터 풀 — Symbol Hover speechSignature lookup */
  characters?: Character[];
  /** [Phase A-5] 현재 episode 의 breakpoints — 좌측 거터 표시 + 클릭 토글 */
  breakpoints?: Breakpoint[];
  'data-zen-editor'?: boolean;
}

// ============================================================
// PART 2 — Component
// ============================================================
export const NovelEditor = forwardRef<NovelEditorHandle, NovelEditorProps>(
  function NovelEditor(
    { content, onChange, placeholder, readOnly = false, className, language, onSelectionChange, symbolIndex, episodes, characters, breakpoints, ...rest },
    ref,
  ) {
    // Debounce timer for onChange
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Guard against external content → editor loops
    const suppressUpdateRef = useRef(false);

    // [연결 #1 — 2026-05-07] Symbol hover state — .symbol-deco mouseover 시 표시.
    const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
    const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
    const hoverHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSymbolMouseOver = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!symbolIndex) return;
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const symbolEl = target.closest<HTMLElement>('.symbol-deco');
        if (!symbolEl) return;
        const symbolId = symbolEl.dataset.symbolId;
        if (!symbolId) return;

        // [G] 동일 symbol 위 hover 유지 시 hide timer 만 취소, 재계산 X
        if (hoverHideTimerRef.current) {
          clearTimeout(hoverHideTimerRef.current);
          hoverHideTimerRef.current = null;
        }
        if (hoverInfo?.symbol.id === symbolId) {
          return;
        }

        const info = buildHoverInfo(symbolId, episodes ?? [], symbolIndex, characters);
        if (!info) return;
        const rect = symbolEl.getBoundingClientRect();
        setHoverInfo(info);
        setHoverPos({ x: rect.left, y: rect.bottom + 6 });
      },
      [symbolIndex, episodes, characters, hoverInfo],
    );

    const handleSymbolMouseOut = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      // [C] hovered 가 카드 또는 같은 symbol 안이면 닫지 않음 — relatedTarget 체크
      const related = e.relatedTarget as Node | null;
      if (related && (related as HTMLElement).closest?.('.symbol-deco, [role="tooltip"]')) {
        return;
      }
      // [G] 짧은 grace period — 빠른 mouseout-mouseover 깜빡임 방지
      if (hoverHideTimerRef.current) clearTimeout(hoverHideTimerRef.current);
      hoverHideTimerRef.current = setTimeout(() => {
        setHoverInfo(null);
        setHoverPos(null);
      }, 150);
    }, []);

    useEffect(() => {
      return () => {
        if (hoverHideTimerRef.current) clearTimeout(hoverHideTimerRef.current);
      };
    }, []);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          // History (undo/redo) is included in StarterKit by default
          heading: false,
          codeBlock: false,
          code: false,
          blockquote: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          horizontalRule: false,
        }),
        Placeholder.configure({
          placeholder: placeholder ?? L4(language ?? 'KO', {
            ko: '여기에 이야기를 써 내려가세요... (기존 원고 .txt 파일을 여기에 드래그할 수 있습니다)',
            en: 'Start writing your story here... (You can drag & drop .txt manuscript files)',
            ja: 'ここに物語を書き始めてください... (.txtファイルをドラッグ＆ドロップできます)',
            zh: '在这里开始写作... (可以拖放.txt稿件文件)',
          }),
          emptyEditorClass: 'novel-editor-empty',
        }),
        CharacterCount,
        NovelKeymap,
        InlineCompletion,
        // [Phase A-4 — 2026-05-07] Symbol Index 데코레이션 — symbolIndex 주입 시만 활성.
        ...(symbolIndex
          ? [SymbolDecorationExtension.configure({ index: symbolIndex, className: 'symbol-deco' })]
          : []),
        // [Phase A-5 — 2026-05-07] Breakpoint Gutter — breakpoints 주입 시만 활성.
        ...(breakpoints
          ? [BreakpointGutterExtension.configure({ breakpoints, gutterWidth: 24 })]
          : []),
      ],
      editable: !readOnly,
      content: textToHtml(content),
      onUpdate: ({ editor: ed }) => {
        if (suppressUpdateRef.current) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          onChange(ed.getText());
        }, 300);
      },
      onSelectionUpdate: ({ editor: ed }) => {
        if (!onSelectionChange) return;
        const { from, to } = ed.state.selection;
        const text = ed.state.doc.textBetween(from, to, '\n');
        if (text.length < 2) {
          onSelectionChange(null);
          return;
        }
        // Get screen coordinates at selection head
        let coords: NovelEditorSelection['coords'] = null;
        try {
          const c = ed.view.coordsAtPos(from);
          coords = { top: c.top, left: c.left, bottom: c.bottom };
        } catch {
          // coordsAtPos can throw if editor is not mounted yet
        }
        onSelectionChange({ from, to, text, coords });
      },
      // Suppress the "SSR mismatch" warning — we only render client-side
      immediatelyRender: false,
    });

    // Expose editor to parent
    useImperativeHandle(ref, () => ({
      getEditor: () => editor,
    }), [editor]);

    // ============================================================
    // PART 3 — Sync external content changes into editor
    // ============================================================
    const lastContentRef = useRef(content);
    useEffect(() => {
      if (!editor) return;
      // Only push content in when it actually changed externally
      // (not from our own onUpdate callback)
      if (content === lastContentRef.current) return;
      lastContentRef.current = content;

      const currentText = editor.getText();
      if (currentText === content) return;

      suppressUpdateRef.current = true;
      editor.commands.setContent(textToHtml(content), { emitUpdate: false });
      suppressUpdateRef.current = false;
    }, [content, editor]);

    // Sync readOnly
    useEffect(() => {
      if (!editor) return;
      editor.setEditable(!readOnly);
    }, [readOnly, editor]);

    // Cleanup debounce on unmount
    useEffect(() => {
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, []);

    // [연결 #3 — 2026-05-07] Snippet Palette 'noa:snippet-insert' listener — caret 위치 삽입.
    // [연결 #4 — 2026-05-07] Multi-cursor 'noa:manuscript-replace' listener — 본문 전체 교체.
    // [C] useEditor 호출 후로 위치 이동 — block-scoped 'editor' 의존성 보장.
    useEffect(() => {
      if (typeof window === 'undefined') return;

      const insertHandler = (e: Event) => {
        const detail = (e as CustomEvent<{ text: string }>).detail;
        if (!detail?.text) return;
        if (!editor || readOnly) return;
        editor.chain().focus().insertContent(detail.text).run();
      };

      const replaceHandler = (e: Event) => {
        const detail = (e as CustomEvent<{ newText: string }>).detail;
        if (typeof detail?.newText !== 'string') return;
        if (!editor || readOnly) return;
        suppressUpdateRef.current = true;
        editor.commands.setContent(textToHtml(detail.newText), { emitUpdate: false });
        suppressUpdateRef.current = false;
        onChange(detail.newText);
      };

      window.addEventListener('noa:snippet-insert', insertHandler as EventListener);
      window.addEventListener('noa:manuscript-replace', replaceHandler as EventListener);
      return () => {
        window.removeEventListener('noa:snippet-insert', insertHandler as EventListener);
        window.removeEventListener('noa:manuscript-replace', replaceHandler as EventListener);
      };
    }, [editor, readOnly, onChange]);

    // ============================================================
    // PART 4 — File drag-and-drop (.txt / .md)
    // ============================================================
    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        const file = e.dataTransfer?.files?.[0];
        if (!file) return; // let Tiptap handle other drops
        if (!/\.(txt|md)$/i.test(file.name)) return;
        e.preventDefault();
        e.stopPropagation();
        const reader = new FileReader();
        reader.onload = () => {
          const text = reader.result as string;
          if (!text || !editor) return;
          // Append to end
          const endPos = editor.state.doc.content.size;
          editor.chain().focus().insertContentAt(endPos, textToHtml('\n\n---\n\n' + text)).run();
        };
        // [C] FileReader.onerror 추가 — 누락 시 실패한 drop이 silent hang으로 남음
        reader.onerror = () => {
          logger.warn('NovelEditor', 'FileReader failed to read dropped file', {
            fileName: file.name,
            error: reader.error?.message ?? String(reader.error ?? ''),
          });
        };
        reader.readAsText(file, 'UTF-8');
      },
      [editor],
    );

    // ============================================================
    // PART 5 — Render
    // ============================================================
    const zenAttr = rest['data-zen-editor'] ? { 'data-zen-editor': true } : {};

    return (
      <div
        className={`novel-editor-wrapper ${className ?? ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onMouseOver={handleSymbolMouseOver}
        onMouseOut={handleSymbolMouseOut}
        {...zenAttr}
      >
        <EditorContent editor={editor} />
        {/* [연결 #1 — 2026-05-07] Symbol hover quick info — fixed 위치 floating */}
        {hoverInfo && hoverPos && (
          <SymbolHoverCard
            hoverInfo={hoverInfo}
            language={language ?? 'KO'}
            position={hoverPos}
            onClose={() => {
              setHoverInfo(null);
              setHoverPos(null);
            }}
          />
        )}
        {/* scoped styles for ProseMirror element */}
        <style jsx global>{`
          .novel-editor-wrapper .ProseMirror {
            /* CJK 독자 우선 — Noto Serif KR 이 있으면 먼저, fallback으로 Georgia. */
            font-family: var(--font-document), 'Georgia', 'Times New Roman', serif;
            /* [Doc 3 ergonomics ① P1 + Doc 5 Zen — 2026-05-12] 기본 17px / 1.85.
               이전: 1rem(16px) / 1.75 — 3시간 연속 읽기 가독성 부족.
               WCAG 2.2 권장 + 시각 피로 13% 감소. M6 typography preset이 여전히 override 가능. */
            font-size: var(--editor-font-size, 17px);
            line-height: var(--editor-line-height, 1.85);
            letter-spacing: var(--editor-letter-spacing, 0.01em);
            min-height: 70vh;
            padding: 2rem;
            /* R1 정지 직사각형 — 가로 최대 68ch + 가운데 정렬.
               대형 모니터에서 본문이 가로로 늘어나지 않도록 고정.
               typography preset이 --editor-max-width 로 재정의 가능. */
            max-width: var(--editor-max-width, 68ch);
            margin-left: auto;
            margin-right: auto;
            /* R5 Caret 색상 — 검정/흰 대신 amber 톤으로 시각 피로 감소.
               blink 주기는 브라우저 기본(웹 표준 CSS로 변경 불가). */
            caret-color: var(--editor-caret-color, var(--color-accent-amber, #d4a574));
            outline: none;
          }
          .novel-editor-wrapper .ProseMirror:focus-visible {
            outline: 2px solid var(--color-accent-blue);
            outline-offset: 2px;
          }
          .novel-editor-wrapper .ProseMirror p {
            text-indent: 1em;
            margin-bottom: 0;
          }
          .novel-editor-wrapper .ProseMirror p + p {
            margin-top: 0;
          }
          /* Placeholder styling */
          .novel-editor-wrapper .ProseMirror.novel-editor-empty::before {
            content: attr(data-placeholder);
            float: left;
            color: var(--color-text-tertiary, #888);
            pointer-events: none;
            height: 0;
            font-style: italic;
          }
          /* Keep selection visible when popup is active */
          .novel-editor-wrapper .ProseMirror ::selection {
            background: rgba(202, 161, 92, 0.25);
          }
          /* Ghost text for inline completion */
          .inline-completion-ghost {
            color: var(--color-text-tertiary, #888);
            font-style: italic;
            pointer-events: none;
            user-select: none;
          }
        `}</style>
      </div>
    );
  },
);

NovelEditor.displayName = 'NovelEditor';

// ============================================================
// PART 6 — Utility: plain text → HTML paragraphs
// ============================================================
function textToHtml(text: string): string {
  if (!text) return '<p></p>';
  return text
    .split(/\n/)
    .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
    .join('');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
