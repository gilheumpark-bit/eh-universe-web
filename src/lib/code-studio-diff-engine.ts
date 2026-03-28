// ============================================================
// Code Studio — Diff Engine (Myers diff, unified, word-level)
// ============================================================

// ============================================================
// PART 1 — Types
// ============================================================

export interface DiffEdit {
  type: 'equal' | 'insert' | 'delete';
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
  lines: string[];
}

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  edits: DiffEdit[];
}

export interface UnifiedDiffLine {
  type: 'context' | 'add' | 'remove' | 'header';
  content: string;
  oldLineNo?: number;
  newLineNo?: number;
}

export interface WordDiffSegment {
  type: 'equal' | 'insert' | 'delete';
  value: string;
}

export interface MergeResult {
  merged: string;
  conflicts: MergeConflict[];
  hasConflicts: boolean;
}

export interface MergeConflict {
  startLine: number;
  endLine: number;
  ours: string[];
  theirs: string[];
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=DiffEdit,DiffHunk,UnifiedDiffLine

// ============================================================
// PART 2 — Myers Diff
// ============================================================

export function myersDiff(oldLines: string[], newLines: string[]): DiffEdit[] {
  const n = oldLines.length;
  const m = newLines.length;
  const max = n + m;
  const v = new Map<number, number>();
  v.set(1, 0);

  const trace: Map<number, number>[] = [];

  for (let d = 0; d <= max; d++) {
    const vClone = new Map(v);
    trace.push(vClone);

    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && (v.get(k - 1) ?? 0) < (v.get(k + 1) ?? 0))) {
        x = v.get(k + 1) ?? 0;
      } else {
        x = (v.get(k - 1) ?? 0) + 1;
      }
      let y = x - k;
      while (x < n && y < m && oldLines[x] === newLines[y]) {
        x++;
        y++;
      }
      v.set(k, x);
      if (x >= n && y >= m) {
        return backtrack(trace, oldLines, newLines);
      }
    }
  }

  return backtrack(trace, oldLines, newLines);
}

function backtrack(
  trace: Map<number, number>[],
  oldLines: string[],
  newLines: string[],
): DiffEdit[] {
  let x = oldLines.length;
  let y = newLines.length;
  const edits: DiffEdit[] = [];

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;
    let prevK: number;

    if (k === -d || (k !== d && (v.get(k - 1) ?? 0) < (v.get(k + 1) ?? 0))) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = v.get(prevK) ?? 0;
    const prevY = prevX - prevK;

    // Diagonal (equal)
    while (x > prevX && y > prevY) {
      x--;
      y--;
      edits.unshift({ type: 'equal', oldStart: x, oldEnd: x + 1, newStart: y, newEnd: y + 1, lines: [oldLines[x]] });
    }

    if (d > 0) {
      if (x === prevX) {
        // Insert
        y--;
        edits.unshift({ type: 'insert', oldStart: x, oldEnd: x, newStart: y, newEnd: y + 1, lines: [newLines[y]] });
      } else {
        // Delete
        x--;
        edits.unshift({ type: 'delete', oldStart: x, oldEnd: x + 1, newStart: y, newEnd: y, lines: [oldLines[x]] });
      }
    }
  }

  return edits;
}

// IDENTITY_SEAL: PART-2 | role=Myers diff | inputs=string[],string[] | outputs=DiffEdit[]

// ============================================================
// PART 3 — Unified Diff & Word Diff
// ============================================================

export function unifiedDiff(
  oldText: string,
  newText: string,
  oldLabel = 'a',
  newLabel = 'b',
  contextLines = 3,
): UnifiedDiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const edits = myersDiff(oldLines, newLines);
  const output: UnifiedDiffLine[] = [];

  output.push({ type: 'header', content: `--- ${oldLabel}` });
  output.push({ type: 'header', content: `+++ ${newLabel}` });

  let oldLine = 0;
  let newLine = 0;
  for (const edit of edits) {
    switch (edit.type) {
      case 'equal':
        oldLine++;
        newLine++;
        output.push({ type: 'context', content: ` ${edit.lines[0]}`, oldLineNo: oldLine, newLineNo: newLine });
        break;
      case 'delete':
        oldLine++;
        output.push({ type: 'remove', content: `-${edit.lines[0]}`, oldLineNo: oldLine });
        break;
      case 'insert':
        newLine++;
        output.push({ type: 'add', content: `+${edit.lines[0]}`, newLineNo: newLine });
        break;
    }
  }

  // Apply context window
  if (contextLines < Infinity) {
    const changeIndices = new Set<number>();
    output.forEach((line, i) => {
      if (line.type === 'add' || line.type === 'remove') {
        for (let j = Math.max(0, i - contextLines); j <= Math.min(output.length - 1, i + contextLines); j++) {
          changeIndices.add(j);
        }
      }
      if (line.type === 'header') changeIndices.add(i);
    });
    return output.filter((_, i) => changeIndices.has(i));
  }

  return output;
}

export function wordDiff(oldText: string, newText: string): WordDiffSegment[] {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  const edits = myersDiff(oldWords, newWords);

  return edits.map((e) => ({
    type: e.type,
    value: e.lines.join(''),
  }));
}

// IDENTITY_SEAL: PART-3 | role=unified+word diff | inputs=oldText,newText | outputs=UnifiedDiffLine[],WordDiffSegment[]

// ============================================================
// PART 4 — 3-Way Merge
// ============================================================

export function threeWayMerge(base: string, ours: string, theirs: string): MergeResult {
  const baseLines = base.split('\n');
  const ourLines = ours.split('\n');
  const theirLines = theirs.split('\n');

  const ourEdits = myersDiff(baseLines, ourLines);
  const theirEdits = myersDiff(baseLines, theirLines);

  const merged: string[] = [];
  const conflicts: MergeConflict[] = [];
  let i = 0;

  // Simple merge strategy: prefer ours, detect conflicts
  const ourChanges = new Set(ourEdits.filter((e) => e.type !== 'equal').map((e) => e.oldStart));
  const theirChanges = new Set(theirEdits.filter((e) => e.type !== 'equal').map((e) => e.oldStart));

  for (i = 0; i < baseLines.length; i++) {
    const ourChanged = ourChanges.has(i);
    const theirChanged = theirChanges.has(i);

    if (ourChanged && theirChanged) {
      const ourLine = ourLines[i] ?? '';
      const theirLine = theirLines[i] ?? '';
      if (ourLine === theirLine) {
        merged.push(ourLine);
      } else {
        conflicts.push({ startLine: merged.length, endLine: merged.length + 1, ours: [ourLine], theirs: [theirLine] });
        merged.push(`<<<<<<< ours`);
        merged.push(ourLine);
        merged.push(`=======`);
        merged.push(theirLine);
        merged.push(`>>>>>>> theirs`);
      }
    } else if (ourChanged) {
      merged.push(ourLines[i] ?? '');
    } else if (theirChanged) {
      merged.push(theirLines[i] ?? '');
    } else {
      merged.push(baseLines[i]);
    }
  }

  return { merged: merged.join('\n'), conflicts, hasConflicts: conflicts.length > 0 };
}

// IDENTITY_SEAL: PART-4 | role=3-way merge | inputs=base,ours,theirs | outputs=MergeResult
