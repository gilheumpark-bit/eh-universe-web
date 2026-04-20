'use client';

// ============================================================
// PART 1 — Imports & Types
// ============================================================
import React, { useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { NovelKeymap } from '@/components/studio/extensions/novel-keymap';
import { InlineCompletion } from '@/components/studio/extensions/inline-completion';
import { L4 } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/studio-types';

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
  'data-zen-editor'?: boolean;
}

// ============================================================
// PART 2 — Component
// ============================================================
export const NovelEditor = forwardRef<NovelEditorHandle, NovelEditorProps>(
  function NovelEditor(
    { content, onChange, placeholder, readOnly = false, className, language, onSelectionChange, ...rest },
    ref,
  ) {
    // Debounce timer for onChange
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Guard against external content → editor loops
    const suppressUpdateRef = useRef(false);

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
          // 콘솔 경고만 — 사용자 알림은 상위에서 editor 에러 처리에 일임
          // eslint-disable-next-line no-console
          console.warn('[NovelEditor] FileReader failed to read dropped file:', file.name, reader.error);
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
        {...zenAttr}
      >
        <EditorContent editor={editor} />
        {/* scoped styles for ProseMirror element */}
        <style jsx global>{`
          .novel-editor-wrapper .ProseMirror {
            /* CJK 독자 우선 — Noto Serif KR 이 있으면 먼저, fallback으로 Georgia. */
            font-family: var(--font-document), 'Georgia', 'Times New Roman', serif;
            font-size: var(--editor-font-size, 1rem);
            /* Readability 최적 1.6~1.8 — M6 타이포그래피 프리셋이 override */
            line-height: var(--editor-line-height, 1.75);
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
