// ============================================================
// Code Studio — Gutter Click Actions
// ============================================================
// 함수 실행, 브레이크포인트 토글, 폴드/언폴드, 참조 수 표시.

import type * as Monaco from 'monaco-editor';

// ============================================================
// PART 1 — Types & State
// ============================================================

export interface GutterAction {
  type: 'breakpoint' | 'run' | 'fold' | 'references';
  lineNumber: number;
  enabled: boolean;
}

export interface BreakpointInfo {
  lineNumber: number;
  condition?: string;
  hitCount?: number;
}

const breakpoints = new Map<string, Set<number>>();

function getFileBreakpoints(fileId: string): Set<number> {
  let set = breakpoints.get(fileId);
  if (!set) {
    set = new Set();
    breakpoints.set(fileId, set);
  }
  return set;
}

// IDENTITY_SEAL: PART-1 | role=TypesState | inputs=fileId | outputs=GutterAction,BreakpointInfo

// ============================================================
// PART 2 — Breakpoint Management
// ============================================================

export function toggleBreakpoint(fileId: string, lineNumber: number): boolean {
  const set = getFileBreakpoints(fileId);
  if (set.has(lineNumber)) {
    set.delete(lineNumber);
    return false;
  }
  set.add(lineNumber);
  return true;
}

export function getBreakpoints(fileId: string): number[] {
  return [...getFileBreakpoints(fileId)].sort((a, b) => a - b);
}

export function clearBreakpoints(fileId: string): void {
  breakpoints.delete(fileId);
}

export function hasBreakpoint(fileId: string, lineNumber: number): boolean {
  return getFileBreakpoints(fileId).has(lineNumber);
}

/** Build Monaco glyph margin decorations for breakpoints */
export function buildBreakpointDecorations(
  fileId: string,
  monaco: typeof Monaco,
): Monaco.editor.IModelDeltaDecoration[] {
  const lines = getBreakpoints(fileId);
  return lines.map(line => ({
    range: new monaco.Range(line, 1, line, 1),
    options: {
      isWholeLine: false,
      glyphMarginClassName: 'eh-breakpoint-glyph',
      glyphMarginHoverMessage: { value: `Breakpoint at line ${line}` },
    },
  }));
}

// IDENTITY_SEAL: PART-2 | role=BreakpointMgmt | inputs=fileId,lineNumber | outputs=boolean,number[]

// ============================================================
// PART 3 — Runnable Detection & Reference Counting
// ============================================================

/** Detect if a line starts a runnable function/test */
export function isRunnableLine(lineContent: string): boolean {
  const patterns = [
    /^\s*(?:export\s+)?(?:async\s+)?function\s+\w+/,
    /^\s*(?:export\s+)?(?:const|let)\s+\w+\s*=\s*(?:async\s+)?\(/,
    /^\s*(?:it|test|describe)\s*\(/,
    /^\s*(?:export\s+)?default\s+(?:async\s+)?function/,
  ];
  return patterns.some(p => p.test(lineContent));
}

/** Count references to a symbol in code */
export function countReferences(code: string, symbol: string): number {
  if (!symbol || symbol.length < 2) return 0;
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'g');
  const matches = code.match(regex);
  return matches ? matches.length - 1 : 0; // subtract 1 for the definition itself
}

/** Extract function name from a line if it's a function definition */
export function extractFunctionName(lineContent: string): string | null {
  const patterns = [
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
    /(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>/,
    /(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?function/,
  ];

  for (const p of patterns) {
    const m = lineContent.match(p);
    if (m) return m[1];
  }
  return null;
}

/** Register gutter click handler on Monaco editor */
export function registerGutterClickHandler(
  editor: Monaco.editor.IStandaloneCodeEditor,
  fileId: string,
  onBreakpointChange?: (lineNumber: number, active: boolean) => void,
): Monaco.IDisposable {
  return editor.onMouseDown((e) => {
    if (e.target.type !== 2) return; // 2 = GUTTER_GLYPH_MARGIN
    const lineNumber = e.target.position?.lineNumber;
    if (!lineNumber) return;

    const active = toggleBreakpoint(fileId, lineNumber);
    onBreakpointChange?.(lineNumber, active);
  });
}

// IDENTITY_SEAL: PART-3 | role=RunnableDetection | inputs=lineContent,code,symbol | outputs=boolean,number,string|null
