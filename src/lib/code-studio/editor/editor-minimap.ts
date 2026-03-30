// ============================================================
// Code Studio — Minimap Decorations
// ============================================================
// 에러/경고 하이라이트, 검색 결과 표시, 북마크, 커스텀 범위 하이라이트.

import type * as Monaco from 'monaco-editor';

// ============================================================
// PART 1 — Types & Constants
// ============================================================

export type DecorationKind = 'error' | 'warning' | 'info' | 'search' | 'bookmark' | 'highlight' | 'diff-add' | 'diff-remove';

export interface MinimapDecoration {
  kind: DecorationKind;
  startLine: number;
  endLine: number;
  message?: string;
}

const KIND_COLORS: Record<DecorationKind, string> = {
  error: '#f85149',
  warning: '#d29922',
  info: '#58a6ff',
  search: '#e3b341',
  bookmark: '#a371f7',
  highlight: '#3fb950',
  'diff-add': '#3fb950',
  'diff-remove': '#f85149',
};

const KIND_CSS_CLASSES: Record<DecorationKind, string> = {
  error: 'eh-minimap-error',
  warning: 'eh-minimap-warning',
  info: 'eh-minimap-info',
  search: 'eh-minimap-search',
  bookmark: 'eh-minimap-bookmark',
  highlight: 'eh-minimap-highlight',
  'diff-add': 'eh-minimap-diff-add',
  'diff-remove': 'eh-minimap-diff-remove',
};

// IDENTITY_SEAL: PART-1 | role=TypesConstants | inputs=none | outputs=MinimapDecoration,KIND_COLORS

// ============================================================
// PART 2 — Decoration Management
// ============================================================

/** Convert our decoration format to Monaco IModelDeltaDecoration[] */
export function toMonacoDecorations(
  decorations: MinimapDecoration[],
  monaco: typeof Monaco,
): Monaco.editor.IModelDeltaDecoration[] {
  return decorations.map(d => ({
    range: new monaco.Range(d.startLine, 1, d.endLine, 1),
    options: {
      isWholeLine: true,
      minimap: {
        color: KIND_COLORS[d.kind],
        position: monaco.editor.MinimapPosition.Inline,
      },
      overviewRuler: {
        color: KIND_COLORS[d.kind],
        position: monaco.editor.OverviewRulerLane.Right,
      },
      className: KIND_CSS_CLASSES[d.kind],
      hoverMessage: d.message ? { value: d.message } : undefined,
    },
  }));
}

/** Apply decorations to an editor instance, returning dispose handle */
export function applyMinimapDecorations(
  editor: Monaco.editor.IStandaloneCodeEditor,
  monaco: typeof Monaco,
  decorations: MinimapDecoration[],
  previousIds: string[] = [],
): string[] {
  const model = editor.getModel();
  if (!model) return [];

  const monacoDecorations = toMonacoDecorations(decorations, monaco);
  return model.deltaDecorations(previousIds, monacoDecorations);
}

/** Generate CSS for minimap decoration classes */
export function getMinimapCSS(): string {
  return Object.entries(KIND_CSS_CLASSES)
    .map(([kind, cls]) => {
      const color = KIND_COLORS[kind as DecorationKind];
      return `.${cls} { background-color: ${color}22; border-left: 3px solid ${color}; }`;
    })
    .join('\n');
}

// IDENTITY_SEAL: PART-2 | role=DecorationMgmt | inputs=MinimapDecoration[],monaco | outputs=string[]

// ============================================================
// PART 3 — Decoration Builders
// ============================================================

/** Build error/warning decorations from diagnostic-like entries */
export function buildDiagnosticDecorations(
  diagnostics: Array<{ line: number; endLine?: number; severity: 'error' | 'warning' | 'info'; message: string }>,
): MinimapDecoration[] {
  return diagnostics.map(d => ({
    kind: d.severity,
    startLine: d.line,
    endLine: d.endLine ?? d.line,
    message: d.message,
  }));
}

/** Build search result decorations */
export function buildSearchDecorations(
  results: Array<{ line: number }>,
): MinimapDecoration[] {
  return results.map(r => ({
    kind: 'search' as DecorationKind,
    startLine: r.line,
    endLine: r.line,
  }));
}

/** Build bookmark decorations */
export function buildBookmarkDecorations(lines: number[]): MinimapDecoration[] {
  return lines.map(line => ({
    kind: 'bookmark' as DecorationKind,
    startLine: line,
    endLine: line,
    message: `Bookmark at line ${line}`,
  }));
}

/** Build diff decorations (additions/removals) */
export function buildDiffDecorations(
  changes: Array<{ type: 'add' | 'remove'; startLine: number; endLine: number }>,
): MinimapDecoration[] {
  return changes.map(c => ({
    kind: c.type === 'add' ? 'diff-add' as DecorationKind : 'diff-remove' as DecorationKind,
    startLine: c.startLine,
    endLine: c.endLine,
  }));
}

// IDENTITY_SEAL: PART-3 | role=DecorationBuilders | inputs=diagnostics,results,lines | outputs=MinimapDecoration[]
