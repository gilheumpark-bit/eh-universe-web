// ============================================================
// Code Studio — Inline Diff (editor-integrated change view)
// ============================================================

export interface InlineChange {
  id: string;
  startLine: number;
  endLine: number;
  type: 'add' | 'remove' | 'modify';
  oldContent: string;
  newContent: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface InlineDiffState {
  changes: InlineChange[];
  originalContent: string;
  modifiedContent: string;
}

/* ── Helpers ── */

function uid(): string {
  return `chg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/* ── Compute inline changes ── */

export function computeInlineChanges(
  original: string,
  modified: string,
): InlineChange[] {
  const oldLines = original.split('\n');
  const newLines = modified.split('\n');
  const changes: InlineChange[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);

  let i = 0;
  while (i < maxLen) {
    const oldLine = oldLines[i] ?? '';
    const newLine = newLines[i] ?? '';

    if (oldLine === newLine) {
      i++;
      continue;
    }

    if (i >= oldLines.length) {
      changes.push({ id: uid(), startLine: i + 1, endLine: i + 1, type: 'add', oldContent: '', newContent: newLine, status: 'pending' });
    } else if (i >= newLines.length) {
      changes.push({ id: uid(), startLine: i + 1, endLine: i + 1, type: 'remove', oldContent: oldLine, newContent: '', status: 'pending' });
    } else {
      changes.push({ id: uid(), startLine: i + 1, endLine: i + 1, type: 'modify', oldContent: oldLine, newContent: newLine, status: 'pending' });
    }
    i++;
  }

  return changes;
}

export function createDiffState(original: string, modified: string): InlineDiffState {
  return {
    changes: computeInlineChanges(original, modified),
    originalContent: original,
    modifiedContent: modified,
  };
}

/* ── Accept / Reject ── */

export function acceptChange(state: InlineDiffState, changeId: string): InlineDiffState {
  return {
    ...state,
    changes: state.changes.map((c) =>
      c.id === changeId ? { ...c, status: 'accepted' as const } : c,
    ),
  };
}

export function rejectChange(state: InlineDiffState, changeId: string): InlineDiffState {
  return {
    ...state,
    changes: state.changes.map((c) =>
      c.id === changeId ? { ...c, status: 'rejected' as const } : c,
    ),
  };
}

export function acceptAll(state: InlineDiffState): InlineDiffState {
  return {
    ...state,
    changes: state.changes.map((c) => ({ ...c, status: 'accepted' as const })),
  };
}

export function rejectAll(state: InlineDiffState): InlineDiffState {
  return {
    ...state,
    changes: state.changes.map((c) => ({ ...c, status: 'rejected' as const })),
  };
}

/* ── Apply ── */

export function applyChanges(state: InlineDiffState): string {
  const oldLines = state.originalContent.split('\n');
  const result = [...oldLines];

  // Process in reverse order to avoid index shifting
  const sorted = [...state.changes].sort((a, b) => b.startLine - a.startLine);

  for (const change of sorted) {
    if (change.status === 'accepted') {
      const idx = change.startLine - 1;
      switch (change.type) {
        case 'add':
          result.splice(idx, 0, change.newContent);
          break;
        case 'remove':
          result.splice(idx, 1);
          break;
        case 'modify':
          result[idx] = change.newContent;
          break;
      }
    }
    // rejected = keep original (no change)
  }

  return result.join('\n');
}

export function getPendingCount(state: InlineDiffState): number {
  return state.changes.filter((c) => c.status === 'pending').length;
}

// IDENTITY_SEAL: role=InlineDiff | inputs=original,modified strings | outputs=InlineDiffState,InlineChange[]
