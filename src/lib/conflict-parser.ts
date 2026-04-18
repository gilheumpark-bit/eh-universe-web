/**
 * conflict-parser — Pure parser for Git merge conflict markers.
 *
 * Recognizes both standard 2-way merge markers and diff3-style 3-way
 * markers with a common ancestor:
 *
 *   <<<<<<< HEAD
 *   ours
 *   |||||||  (optional — diff3 only)
 *   ancestor
 *   =======
 *   theirs
 *   >>>>>>> branch-name
 *
 * This module has no React and no DOM dependencies — it is a pure
 * function library safe to import from server or worker contexts.
 *
 * @module conflict-parser
 * @example
 * import { parseConflicts, resolveConflict, stringifyBlocks } from '@/lib/conflict-parser';
 *
 * const blocks = parseConflicts(fileContent);
 * const resolved = resolveConflict(blocks, 0, 'ours');
 * const merged = stringifyBlocks(resolved);
 */

import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Public types
// ============================================================

/**
 * One unresolved merge conflict region.
 * All line numbers are 1-based and refer to the ORIGINAL input.
 */
export interface ConflictBlock {
  type: 'conflict';
  /** Content between `<<<<<<< HEAD` and the next separator. */
  ours: string;
  /** Content between `=======` and `>>>>>>> branch`. */
  theirs: string;
  /** diff3-style ancestor between `|||||||` and `=======`. */
  ancestor?: string;
  /** Optional label from the `<<<<<<<` marker (e.g. `HEAD`). */
  oursLabel?: string;
  /** Optional label from the `>>>>>>>` marker (e.g. branch name). */
  theirsLabel?: string;
  /** 1-based line number of the `<<<<<<<` marker. */
  startLine: number;
  /** 1-based line number of the `>>>>>>>` marker. */
  endLine: number;
}

/**
 * Non-conflicting span of the document.
 */
export interface ContextBlock {
  type: 'context';
  content: string;
  startLine: number;
}

export type DocumentBlock = ConflictBlock | ContextBlock;

export type ConflictChoice = 'ours' | 'theirs' | 'both' | 'none';

// Re-export a trivial helper for explicit imports.
export const CONFLICT_MARKERS = Object.freeze({
  OURS: '<<<<<<<',
  ANCESTOR: '|||||||',
  SEPARATOR: '=======',
  THEIRS: '>>>>>>>',
});

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=DocumentBlock types

// ============================================================
// PART 2 — parseConflicts (pure state machine)
// ============================================================

type Mode = 'scan' | 'ours' | 'ancestor' | 'theirs';

/**
 * Parse a file's text into a list of context and conflict blocks.
 *
 * Ignores stray markers (e.g. `<<<<<<<` inside a code fence) only insofar
 * as they appear to start a conflict — in practice Git-generated markers
 * are at column 0 and followed by a space + label. This parser tolerates
 * trailing whitespace after the marker.
 *
 * On malformed input (unclosed conflict), the partial region is discarded
 * and the lines are appended to a context block — we prefer resilience
 * over throwing, so a bad file does not crash the editor.
 *
 * @param content Raw file text, LF or CRLF. Output preserves original newlines.
 * @returns Ordered list of blocks. Empty input yields `[]`.
 */
export function parseConflicts(content: string): DocumentBlock[] {
  if (typeof content !== 'string' || content.length === 0) return [];

  const lines = content.split(/\r?\n/);
  const blocks: DocumentBlock[] = [];

  let mode: Mode = 'scan';
  let contextBuf: string[] = [];
  let contextStart = 1;

  let oursBuf: string[] = [];
  let ancestorBuf: string[] = [];
  let theirsBuf: string[] = [];
  let oursLabel: string | undefined;
  let conflictStart = 0;

  const flushContext = (upToLine: number) => {
    if (contextBuf.length === 0) return;
    blocks.push({
      type: 'context',
      content: contextBuf.join('\n'),
      startLine: contextStart,
    });
    contextBuf = [];
    contextStart = upToLine;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const lineNumber = i + 1;
    const trimmed = raw.replace(/\s+$/, '');

    if (mode === 'scan') {
      if (trimmed.startsWith(CONFLICT_MARKERS.OURS + ' ') || trimmed === CONFLICT_MARKERS.OURS) {
        flushContext(lineNumber);
        conflictStart = lineNumber;
        oursLabel = trimmed.slice(CONFLICT_MARKERS.OURS.length).trim() || undefined;
        oursBuf = [];
        ancestorBuf = [];
        theirsBuf = [];
        mode = 'ours';
        continue;
      }
      contextBuf.push(raw);
      continue;
    }

    if (mode === 'ours') {
      if (trimmed === CONFLICT_MARKERS.SEPARATOR) {
        mode = 'theirs';
        continue;
      }
      if (trimmed.startsWith(CONFLICT_MARKERS.ANCESTOR)) {
        mode = 'ancestor';
        continue;
      }
      oursBuf.push(raw);
      continue;
    }

    if (mode === 'ancestor') {
      if (trimmed === CONFLICT_MARKERS.SEPARATOR) {
        mode = 'theirs';
        continue;
      }
      ancestorBuf.push(raw);
      continue;
    }

    // mode === 'theirs'
    if (trimmed.startsWith(CONFLICT_MARKERS.THEIRS + ' ') || trimmed === CONFLICT_MARKERS.THEIRS) {
      const theirsLabel = trimmed.slice(CONFLICT_MARKERS.THEIRS.length).trim() || undefined;
      blocks.push({
        type: 'conflict',
        ours: oursBuf.join('\n'),
        theirs: theirsBuf.join('\n'),
        ancestor: ancestorBuf.length > 0 ? ancestorBuf.join('\n') : undefined,
        oursLabel,
        theirsLabel,
        startLine: conflictStart,
        endLine: lineNumber,
      });
      mode = 'scan';
      contextStart = lineNumber + 1;
      oursBuf = [];
      ancestorBuf = [];
      theirsBuf = [];
      oursLabel = undefined;
      continue;
    }
    theirsBuf.push(raw);
  }

  // Tail handling: malformed unclosed region → salvage as context.
  if (mode !== 'scan') {
    logger.warn('conflict-parser', 'unclosed conflict region — salvaging as context');
    const salvage = [
      `${CONFLICT_MARKERS.OURS}${oursLabel ? ' ' + oursLabel : ''}`,
      ...oursBuf,
    ];
    if (ancestorBuf.length > 0) {
      salvage.push(CONFLICT_MARKERS.ANCESTOR, ...ancestorBuf);
    }
    if (mode === 'theirs') {
      salvage.push(CONFLICT_MARKERS.SEPARATOR, ...theirsBuf);
    }
    contextBuf.push(...salvage);
  }

  if (contextBuf.length > 0) {
    blocks.push({
      type: 'context',
      content: contextBuf.join('\n'),
      startLine: contextStart,
    });
  }

  return blocks;
}

// IDENTITY_SEAL: PART-2 | role=parse | inputs=string | outputs=DocumentBlock[]

// ============================================================
// PART 3 — resolveConflict + stringifyBlocks + hasUnresolved
// ============================================================

/**
 * Replace the conflict block at `index` with a resolved context block.
 *
 * - `ours`    → keep the HEAD side, drop theirs
 * - `theirs`  → keep the incoming side, drop ours
 * - `both`    → concatenate ours then theirs, joined by a newline
 * - `none`    → remove the block entirely (empty context)
 *
 * The input array is not mutated; a new array is returned. The `index`
 * counts ALL blocks (context + conflict), not just conflicts — callers
 * that only know the Nth conflict should translate via a filter first.
 *
 * @param blocks Document blocks as returned by {@link parseConflicts}.
 * @param index Zero-based position inside `blocks` pointing at a conflict.
 * @param choice Which side to accept.
 * @returns New array with the conflict resolved, or the original when the
 *   index is invalid (out of range / not a conflict block).
 */
export function resolveConflict(
  blocks: DocumentBlock[],
  index: number,
  choice: ConflictChoice,
): DocumentBlock[] {
  if (!Array.isArray(blocks) || blocks.length === 0) return blocks ?? [];
  if (index < 0 || index >= blocks.length) return blocks.slice();
  const target = blocks[index];
  if (target?.type !== 'conflict') return blocks.slice();

  let resolvedContent: string;
  switch (choice) {
    case 'ours':
      resolvedContent = target.ours;
      break;
    case 'theirs':
      resolvedContent = target.theirs;
      break;
    case 'both':
      resolvedContent = target.ours.length > 0 && target.theirs.length > 0
        ? `${target.ours}\n${target.theirs}`
        : target.ours + target.theirs;
      break;
    case 'none':
      resolvedContent = '';
      break;
    default:
      return blocks.slice();
  }

  const replacement: ContextBlock = {
    type: 'context',
    content: resolvedContent,
    startLine: target.startLine,
  };
  const next = blocks.slice();
  next[index] = replacement;
  return next;
}

/**
 * Fast check whether any conflict block remains unresolved.
 *
 * @param blocks Document blocks.
 * @returns true when at least one `type === 'conflict'` block exists.
 */
export function hasUnresolved(blocks: DocumentBlock[]): boolean {
  if (!Array.isArray(blocks)) return false;
  for (const b of blocks) {
    if (b?.type === 'conflict') return true;
  }
  return false;
}

/**
 * Serialize a block list back to a string.
 *
 * Unresolved conflict blocks are re-emitted with their original markers —
 * this keeps the file loadable by any Git client even after partial
 * editing. Context blocks are concatenated verbatim.
 *
 * @param blocks Document blocks.
 * @returns Single string with `\n` separators.
 */
export function stringifyBlocks(blocks: DocumentBlock[]): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return '';
  const parts: string[] = [];
  for (const b of blocks) {
    if (!b) continue;
    if (b.type === 'context') {
      parts.push(b.content);
      continue;
    }
    // type === 'conflict' — re-emit original markers
    const oursHeader = b.oursLabel
      ? `${CONFLICT_MARKERS.OURS} ${b.oursLabel}`
      : CONFLICT_MARKERS.OURS;
    const theirsHeader = b.theirsLabel
      ? `${CONFLICT_MARKERS.THEIRS} ${b.theirsLabel}`
      : CONFLICT_MARKERS.THEIRS;
    const seg = [oursHeader, b.ours];
    if (typeof b.ancestor === 'string') {
      seg.push(CONFLICT_MARKERS.ANCESTOR, b.ancestor);
    }
    seg.push(CONFLICT_MARKERS.SEPARATOR, b.theirs, theirsHeader);
    parts.push(seg.join('\n'));
  }
  return parts.join('\n');
}

/**
 * Count the number of conflict blocks in a document.
 *
 * @param blocks Document blocks.
 * @returns Zero or more.
 */
export function countConflicts(blocks: DocumentBlock[]): number {
  if (!Array.isArray(blocks)) return 0;
  let n = 0;
  for (const b of blocks) {
    if (b?.type === 'conflict') n += 1;
  }
  return n;
}

/**
 * Indices of remaining conflict blocks in a document, in order.
 * Useful for ↑/↓ navigation in the resolver UI.
 *
 * @param blocks Document blocks.
 * @returns Zero-based indices of unresolved conflicts.
 */
export function conflictIndices(blocks: DocumentBlock[]): number[] {
  if (!Array.isArray(blocks)) return [];
  const out: number[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    if (blocks[i]?.type === 'conflict') out.push(i);
  }
  return out;
}

// IDENTITY_SEAL: PART-3 | role=resolve+stringify | inputs=blocks | outputs=blocks|string
