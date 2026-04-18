// ============================================================
// Code Studio — Editor Selection (Code Actions) Sub-hook
// Tracks selected text + popup anchor position.
// ============================================================

import { useState, useCallback } from "react";

/** Editor selection state used to position the code-actions popup. */
export function useEditorSelectionPanel() {
  const [editorSelection, setEditorSelection] = useState({ text: "", top: 0, left: 0 });

  const updateEditorSelection = useCallback((text: string, top: number, left: number) => {
    setEditorSelection({ text, top, left });
  }, []);

  return { editorSelection, updateEditorSelection };
}
