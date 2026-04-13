// ============================================================
// PART 1 — InlineCompletion Tiptap Extension
// ============================================================
// Renders ghost text (gray, italic) at the cursor position using ProseMirror Decorations.
// Tab accepts the suggestion, Escape dismisses it.
// The parent component writes to editor.storage.inlineCompletion.suggestion to show ghost text.

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface InlineCompletionStorage {
  suggestion: string | null;
}

const inlineCompletionPluginKey = new PluginKey('inlineCompletion');

// ============================================================
// PART 2 — Extension Definition
// ============================================================

export const InlineCompletion = Extension.create<Record<string, never>, InlineCompletionStorage>({
  name: 'inlineCompletion',

  addStorage() {
    return { suggestion: null };
  },

  addProseMirrorPlugins() {
    const extensionStorage = this.storage;

    return [
      new Plugin({
        key: inlineCompletionPluginKey,

        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, _oldSet, _oldState, newState) {
            const suggestion = extensionStorage.suggestion;
            if (!suggestion) return DecorationSet.empty;

            // Place ghost text at the cursor (head of selection)
            const { selection } = newState;
            if (!selection.empty) return DecorationSet.empty;

            const pos = selection.head;
            const widget = Decoration.widget(pos, () => {
              const span = document.createElement('span');
              span.className = 'inline-completion-ghost';
              span.textContent = suggestion;
              // Prevent ProseMirror from treating this as editable content
              span.contentEditable = 'false';
              span.setAttribute('data-inline-completion', 'true');
              return span;
            }, {
              // side > 0 means the widget appears after content at this position
              side: 1,
            });

            return DecorationSet.create(newState.doc, [widget]);
          },
        },

        props: {
          decorations(state) {
            return this.getState(state) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },

  // ============================================================
  // PART 3 — Keyboard Shortcuts
  // ============================================================

  addKeyboardShortcuts() {
    return {
      'Tab': () => {
        const suggestion = this.storage.suggestion;
        if (!suggestion) return false; // Let Tab work normally

        // Insert suggestion text at cursor
        const { editor } = this;
        const { state, dispatch } = editor.view;
        const tr = state.tr.insertText(suggestion, state.selection.head);
        dispatch(tr);

        // Clear suggestion
        this.storage.suggestion = null;
        // Force decoration update
        editor.view.dispatch(editor.view.state.tr);

        // Emit accept event for tracking
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('noa:completion-accepted'));
        }

        return true; // Prevent default Tab
      },

      'Escape': () => {
        if (!this.storage.suggestion) return false;

        this.storage.suggestion = null;
        // Force decoration update
        const { editor } = this;
        editor.view.dispatch(editor.view.state.tr);

        // Emit dismiss event for tracking
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('noa:completion-dismissed'));
        }

        return true;
      },
    };
  },
});
