// ============================================================
// Diff Guard — Original/Modified enforcement (Scope/Contract/@block)
// ============================================================
// Pure TS module: no Node APIs. Intended to run at apply-boundaries.
//
// Policy:
// - SCOPE: only allow edits inside paired [SCOPE_START: ...] .. [SCOPE_END] blocks.
// - @block: metadata lines must be preserved exactly (no edits / no deletion).
// - CONTRACT: for TS/TSX, exported public surface must not change when CONTRACT marker present.

export type DiffGuardSeverity = 'critical' | 'major' | 'minor';

export interface DiffGuardFinding {
  rule:
    | 'SCOPE_MARKER_MISMATCH'
    | 'SCOPE_NESTED_UNSUPPORTED'
    | 'SCOPE_OUT_OF_BOUNDS'
    | 'BLOCK_META_TAMPER'
    | 'BLOCK_ID_DUPLICATE'
    | 'CONTRACT_PUBLIC_SURFACE_CHANGED'
    | 'CONTRACT_BLOCK_MISSING'
    | 'CONTRACT_PARSE_SKIPPED';
  severity: DiffGuardSeverity;
  message: string;
  /** 1-based line number (best-effort) */
  line?: number;
}

export interface DiffGuardPolicy {
  mode: 'soft' | 'hard';
}

export interface DiffGuardInput {
  original: string;
  modified: string;
  fileName: string;
  language?: string;
  policy?: DiffGuardPolicy;
}

export interface DiffGuardResult {
  status: 'pass' | 'fail';
  findings: DiffGuardFinding[];
}

type ScopeBlock = {
  label: string;
  startLine: number; // 1-based
  endLine: number; // 1-based (inclusive)
};

const SCOPE_START_RE = /\[SCOPE_START:\s*([^\]]+?)\s*\]/i;
const SCOPE_END_RE = /\[SCOPE_END\]/i;

function splitLines(s: string): string[] {
  // Keep as simple split; comparisons re-join with '\n'
  return s.replace(/\r\n/g, '\n').split('\n');
}

function joinLines(lines: string[], startLine1: number, endLine1: number): string {
  // start/end are 1-based inclusive; clamp safely
  const startIdx = Math.max(0, startLine1 - 1);
  const endIdx = Math.min(lines.length, endLine1);
  return lines.slice(startIdx, endIdx).join('\n');
}

function parseScopeBlocks(lines: string[]): { blocks: ScopeBlock[]; findings: DiffGuardFinding[] } {
  const findings: DiffGuardFinding[] = [];
  const blocks: ScopeBlock[] = [];
  let open: { label: string; startLine: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const start = lines[i]?.match(SCOPE_START_RE);
    if (start) {
      const label = (start[1] ?? '').trim();
      if (open) {
        findings.push({
          rule: 'SCOPE_NESTED_UNSUPPORTED',
          severity: 'major',
          message: `Nested SCOPE not supported (opened "${open.label}" then "${label}")`,
          line: lineNo,
        });
      } else {
        open = { label, startLine: lineNo };
      }
      continue;
    }

    if (SCOPE_END_RE.test(lines[i] ?? '')) {
      if (!open) {
        findings.push({
          rule: 'SCOPE_MARKER_MISMATCH',
          severity: 'major',
          message: 'SCOPE_END without matching SCOPE_START',
          line: lineNo,
        });
      } else {
        blocks.push({ label: open.label, startLine: open.startLine, endLine: lineNo });
        open = null;
      }
    }
  }

  if (open) {
    findings.push({
      rule: 'SCOPE_MARKER_MISMATCH',
      severity: 'major',
      message: `SCOPE_START("${open.label}") without matching SCOPE_END`,
      line: open.startLine,
    });
  }

  return { blocks, findings };
}

function sameOutsideScope(original: string, modified: string): { ok: boolean; finding?: DiffGuardFinding } {
  const oLines = splitLines(original);
  const mLines = splitLines(modified);

  const mParsed = parseScopeBlocks(mLines);
  if (mParsed.findings.length > 0) {
    return { ok: false, finding: mParsed.findings[0] };
  }

  // If no SCOPE blocks in modified, treat as "no allowance": full file must match
  if (mParsed.blocks.length === 0) {
    if (original.replace(/\r\n/g, '\n') === modified.replace(/\r\n/g, '\n')) return { ok: true };
    return {
      ok: false,
      finding: {
        rule: 'SCOPE_OUT_OF_BOUNDS',
        severity: 'major',
        message: 'No SCOPE blocks found; edits are not allowed outside SCOPE',
        line: 1,
      },
    };
  }

  // Pair blocks by finding identical labeled markers in original in order.
  // NOTE: If the same label appears multiple times, we match sequentially via cursor progression.
  const oParsed = parseScopeBlocks(oLines);
  if (oParsed.findings.length > 0) {
    return { ok: false, finding: oParsed.findings[0] };
  }

  // Fast fail: modified scope structure count should not exceed original's by label.
  const labelCounts = (blocks: ScopeBlock[]) => {
    const m = new Map<string, number>();
    for (const b of blocks) m.set(b.label, (m.get(b.label) ?? 0) + 1);
    return m;
  };
  const oCounts = labelCounts(oParsed.blocks);
  const mCounts = labelCounts(mParsed.blocks);
  for (const [label, count] of mCounts) {
    if ((oCounts.get(label) ?? 0) < count) {
      return {
        ok: false,
        finding: {
          rule: 'SCOPE_MARKER_MISMATCH',
          severity: 'major',
          message: `Modified contains extra SCOPE("${label}") block(s) not present in original`,
          line: mParsed.blocks.find((b) => b.label === label)?.startLine ?? 1,
        },
      };
    }
  }

  let oCursor = 1;
  let mCursor = 1;

  for (const mb of mParsed.blocks) {
    const oStart = findLineIndex(oLines, oCursor, (l) => SCOPE_START_RE.test(l) && (l.match(SCOPE_START_RE)?.[1] ?? '').trim() === mb.label);
    const oEnd = oStart ? findLineIndex(oLines, oStart + 1, (l) => SCOPE_END_RE.test(l)) : null;
    if (!oStart || !oEnd) {
      return {
        ok: false,
        finding: {
          rule: 'SCOPE_MARKER_MISMATCH',
          severity: 'major',
          message: `Original missing matching SCOPE markers for "${mb.label}"`,
          line: oStart ?? oCursor,
        },
      };
    }

    // Compare outside segment before this scope
    const oOutside = joinLines(oLines, oCursor, oStart - 1);
    const mOutside = joinLines(mLines, mCursor, mb.startLine - 1);
    if (oOutside !== mOutside) {
      return {
        ok: false,
        finding: {
          rule: 'SCOPE_OUT_OF_BOUNDS',
          severity: 'major',
          message: `Detected changes outside SCOPE("${mb.label}")`,
          line: mb.startLine,
        },
      };
    }

    // Compare marker lines themselves (must be preserved)
    const oStartLine = oLines[oStart - 1] ?? '';
    const mStartLine = mLines[mb.startLine - 1] ?? '';
    if (oStartLine !== mStartLine) {
      return {
        ok: false,
        finding: {
          rule: 'SCOPE_OUT_OF_BOUNDS',
          severity: 'major',
          message: `SCOPE_START marker line modified for "${mb.label}"`,
          line: mb.startLine,
        },
      };
    }
    const oEndLine = oLines[oEnd - 1] ?? '';
    const mEndLine = mLines[mb.endLine - 1] ?? '';
    if (oEndLine !== mEndLine) {
      return {
        ok: false,
        finding: {
          rule: 'SCOPE_OUT_OF_BOUNDS',
          severity: 'major',
          message: `SCOPE_END marker line modified for "${mb.label}"`,
          line: mb.endLine,
        },
      };
    }

    // Advance cursors to after scope end (scope content can differ freely)
    oCursor = oEnd + 1;
    mCursor = mb.endLine + 1;
  }

  // Compare trailing outside segment after last scope
  const oTail = joinLines(oLines, oCursor, oLines.length);
  const mTail = joinLines(mLines, mCursor, mLines.length);
  if (oTail !== mTail) {
    return {
      ok: false,
      finding: {
        rule: 'SCOPE_OUT_OF_BOUNDS',
        severity: 'major',
        message: 'Detected changes outside SCOPE (after last scope)',
        line: mCursor,
      },
    };
  }

  return { ok: true };
}

function findLineIndex(lines: string[], startLine: number, pred: (line: string) => boolean): number | null {
  for (let i = Math.max(1, startLine); i <= lines.length; i++) {
    if (pred(lines[i - 1] ?? '')) return i;
  }
  return null;
}

function extractBlockMetaLines(code: string): string[] {
  const lines = splitLines(code);
  return lines.filter((l) => /@block\s*\{/.test(l));
}

function checkBlockMetaPreserved(original: string, modified: string): DiffGuardFinding[] {
  const findings: DiffGuardFinding[] = [];
  const origLines = extractBlockMetaLines(original);
  if (origLines.length === 0) return findings;

  const modSet = new Set(extractBlockMetaLines(modified));
  for (const l of origLines) {
    if (!modSet.has(l)) {
      findings.push({
        rule: 'BLOCK_META_TAMPER',
        severity: 'major',
        message: '@block metadata line was modified or removed',
      });
      break;
    }
  }

  // Duplicate ID check in modified
  const ids = new Map<string, number>();
  const modLines = splitLines(modified);
  for (let i = 0; i < modLines.length; i++) {
    const m = modLines[i]?.match(/@block\s*\{\s*[^}]*"id"\s*:\s*([0-9]+)\s*,/i);
    if (!m) continue;
    const id = m[1] ?? '';
    if (!id) continue;
    if (ids.has(id)) {
      findings.push({
        rule: 'BLOCK_ID_DUPLICATE',
        severity: 'major',
        message: `Duplicate @block id=${id} (first at L${ids.get(id)})`,
        line: i + 1,
      });
      break;
    }
    ids.set(id, i + 1);
  }

  return findings;
}

function hasContractMarker(code: string): boolean {
  return /\[CONTRACT:\s*PART-\d+\]/i.test(code);
}

function extractContractBlocks(code: string): Array<{ part: string; body: string }> {
  // Contract blocks are assumed to begin at a line containing [CONTRACT: PART-xx]
  // and continue until the next [CONTRACT: PART-yy] or EOF.
  // This is intentionally simple and pure-regex for offline use.
  const lines = splitLines(code);
  const blocks: Array<{ part: string; start: number; end: number }> = [];
  let current: { part: string; start: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i]?.match(/\[CONTRACT:\s*(PART-\d+)\]/i);
    if (!m) continue;
    const part = (m[1] ?? '').toUpperCase();
    if (current) {
      blocks.push({ part: current.part, start: current.start, end: i - 1 });
    }
    current = { part, start: i };
  }

  if (current) {
    blocks.push({ part: current.part, start: current.start, end: lines.length - 1 });
  }

  return blocks.map((b) => ({
    part: b.part,
    body: lines.slice(b.start, b.end + 1).join('\n'),
  }));
}

function isTsLike(fileName: string, language?: string): boolean {
  if (/\.(ts|tsx)$/i.test(fileName)) return true;
  if (language && /typescript|tsx/i.test(language)) return true;
  return false;
}

function normalizeSig(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

function extractTsExportSurface(code: string): Set<string> {
  const lines = splitLines(code);
  const sigs = new Set<string>();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('export ')) continue;

    // export function foo(...) : ...
    if (/^export\s+(?:async\s+)?function\s+\w+\s*\(/.test(line)) {
      sigs.add(normalizeSig(line.replace(/\{\s*$/, '')));
      continue;
    }

    // export interface/type/enum/class Name ...
    if (/^export\s+(interface|type|enum|class)\s+\w+/.test(line)) {
      sigs.add(normalizeSig(line));
      continue;
    }

    // export const foo = ... (take declaration head)
    if (/^export\s+const\s+\w+\s*=/.test(line)) {
      sigs.add(normalizeSig(line));
      continue;
    }
  }

  return sigs;
}

function checkContractSurfaceUnchanged(input: DiffGuardInput): DiffGuardFinding[] {
  const findings: DiffGuardFinding[] = [];
  const { original, modified, fileName, language } = input;

  const hasMarker = hasContractMarker(original) || hasContractMarker(modified);
  if (!hasMarker) return findings;

  if (!isTsLike(fileName, language)) {
    findings.push({
      rule: 'CONTRACT_PARSE_SKIPPED',
      severity: 'minor',
      message: 'CONTRACT marker found, but file is not TS/TSX; skipping surface check',
    });
    return findings;
  }

  // If contract blocks exist, only compare surfaces inside contract blocks.
  // This prevents unrelated exports elsewhere from being incorrectly treated as contract changes.
  const oBlocks = extractContractBlocks(original);
  const mBlocks = extractContractBlocks(modified);

  if (oBlocks.length === 0 && mBlocks.length === 0) {
    findings.push({
      rule: 'CONTRACT_BLOCK_MISSING',
      severity: 'major',
      message: 'CONTRACT marker detected but no contract block could be extracted',
    });
    return findings;
  }

  const oSurface = new Set<string>();
  for (const b of oBlocks) {
    for (const s of extractTsExportSurface(b.body)) oSurface.add(`${b.part}:${s}`);
  }
  const mSurface = new Set<string>();
  for (const b of mBlocks) {
    for (const s of extractTsExportSurface(b.body)) mSurface.add(`${b.part}:${s}`);
  }

  if (oSurface.size === 0 && mSurface.size === 0) return findings;
  if (!setEquals(oSurface, mSurface)) {
    findings.push({
      rule: 'CONTRACT_PUBLIC_SURFACE_CHANGED',
      severity: 'major',
      message: 'Public export surface changed under CONTRACT',
    });
  }

  return findings;
}

function setEquals(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export function runDiffGuard(input: DiffGuardInput): DiffGuardResult {
  const findings: DiffGuardFinding[] = [];

  // SCOPE guard (out-of-bounds edits + marker preservation)
  const scope = sameOutsideScope(input.original, input.modified);
  if (!scope.ok && scope.finding) findings.push(scope.finding);

  // @block preservation
  findings.push(...checkBlockMetaPreserved(input.original, input.modified));

  // CONTRACT: TS export surface immutability (when marker present)
  findings.push(...checkContractSurfaceUnchanged(input));

  const status: 'pass' | 'fail' = findings.some((f) => f.severity === 'critical' || f.severity === 'major') ? 'fail' : 'pass';
  return { status, findings };
}

