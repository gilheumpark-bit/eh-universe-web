// ============================================================
// NovelKeymap — Tiptap extension: novel-specific keyboard shortcuts
// ============================================================
import { Extension } from '@tiptap/core';

/**
 * Ctrl+Shift+R  => dispatch `noa:trigger-inline-rewrite` custom event
 * Additional novel-centric shortcuts can be added here.
 */
export const NovelKeymap = Extension.create({
  name: 'novelKeymap',

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-r': () => {
        window.dispatchEvent(new CustomEvent('noa:trigger-inline-rewrite'));
        return true;
      },
    };
  },
});
