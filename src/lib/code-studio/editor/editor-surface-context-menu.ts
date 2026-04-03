/**
 * Attach a custom right-click menu on the Monaco editor surface by intercepting
 * Monaco's contextmenu event (replaces the built-in menu with app UI).
 */

import type * as Monaco from "monaco-editor";

export function attachEditorSurfaceContextMenu(
  editor: Monaco.editor.IStandaloneCodeEditor,
  onOpen: (pos: { x: number; y: number }, target: Monaco.editor.IStandaloneCodeEditor) => void,
): Monaco.IDisposable {
  return editor.onContextMenu((e) => {
    e.event.preventDefault();
    e.event.stopPropagation();
    onOpen({ x: e.event.posx, y: e.event.posy }, editor);
  });
}

/** Menu item ids from {@link buildEditorSurfaceMenu} in ContextMenu.tsx */
export function runEditorSurfaceMenuAction(
  editor: Monaco.editor.IStandaloneCodeEditor | null | undefined,
  id: string,
  onAppCommandPalette?: () => void,
): void {
  if (!editor) return;
  const run = (actionId: string) => {
    void editor.getAction(actionId)?.run();
  };
  switch (id) {
    case "editor-cut":
      run("editor.action.clipboardCutAction");
      break;
    case "editor-copy":
      run("editor.action.clipboardCopyAction");
      break;
    case "editor-paste":
      run("editor.action.clipboardPasteAction");
      break;
    case "editor-format":
      run("editor.action.formatDocument");
      break;
    case "editor-select-all":
      run("editor.action.selectAll");
      break;
    case "editor-monaco-commands":
      run("editor.action.quickCommand");
      break;
    case "editor-app-commands":
      onAppCommandPalette?.();
      break;
    default:
      break;
  }
}
