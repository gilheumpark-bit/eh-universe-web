// ============================================================
// Code Studio — Multi-File Replace Engine
// ============================================================

import type { FileNode } from './code-studio-types';

/* ── Types ── */

export interface ReplaceOperation {
  fileId: string;
  filePath: string;
  matches: Array<{
    line: number;
    column: number;
    length: number;
    oldText: string;
    newText: string;
  }>;
}

export interface ReplacePreview {
  operations: ReplaceOperation[];
  totalMatches: number;
  totalFiles: number;
}

export interface ReplaceResult {
  applied: number;
  skipped: number;
  errors: string[];
}

/* ── Helpers ── */

function flattenFiles(
  nodes: FileNode[],
  prefix = '',
): Array<{ id: string; path: string; content: string }> {
  const out: Array<{ id: string; path: string; content: string }> = [];
  for (const n of nodes) {
    const p = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === 'file') out.push({ id: n.id, path: p, content: n.content ?? '' });
    if (n.children) out.push(...flattenFiles(n.children, p));
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ── Preview (dry-run) ── */

export function previewReplace(
  files: FileNode[],
  search: string,
  replace: string,
  options?: { regex?: boolean; caseSensitive?: boolean; wholeWord?: boolean; fileFilter?: string },
): ReplacePreview {
  const flat = flattenFiles(files);
  const ops: ReplaceOperation[] = [];
  const flags = options?.caseSensitive ? 'g' : 'gi';

  let pattern: string;
  if (options?.regex) {
    pattern = search;
  } else {
    pattern = escapeRegex(search);
  }
  if (options?.wholeWord) pattern = `\\b${pattern}\\b`;

  const re = new RegExp(pattern, flags);

  for (const f of flat) {
    if (options?.fileFilter && !f.path.endsWith(options.fileFilter)) continue;

    const lines = f.content.split('\n');
    const matches: ReplaceOperation['matches'] = [];

    for (let i = 0; i < lines.length; i++) {
      let match: RegExpExecArray | null;
      const lineRe = new RegExp(pattern, flags);
      while ((match = lineRe.exec(lines[i])) !== null) {
        matches.push({
          line: i + 1,
          column: match.index + 1,
          length: match[0].length,
          oldText: match[0],
          newText: match[0].replace(new RegExp(pattern, options?.caseSensitive ? '' : 'i'), replace),
        });
        if (!lineRe.global) break;
      }
    }

    if (matches.length > 0) {
      ops.push({ fileId: f.id, filePath: f.path, matches });
    }
  }

  return {
    operations: ops,
    totalMatches: ops.reduce((s, o) => s + o.matches.length, 0),
    totalFiles: ops.length,
  };
}

/* ── Execute replace ── */

export function executeReplace(
  files: FileNode[],
  preview: ReplacePreview,
  updateFileContent: (id: string, content: string) => void,
): ReplaceResult {
  let applied = 0;
  let skipped = 0;
  const errors: string[] = [];
  const flat = flattenFiles(files);

  for (const op of preview.operations) {
    const file = flat.find((f) => f.id === op.fileId);
    if (!file) {
      errors.push(`File not found: ${op.filePath}`);
      skipped += op.matches.length;
      continue;
    }

    try {
      let content = file.content;
      // Apply replacements in reverse order to maintain line positions
      const sorted = [...op.matches].sort((a, b) => b.line - a.line || b.column - a.column);
      const lines = content.split('\n');

      for (const m of sorted) {
        const lineIdx = m.line - 1;
        if (lineIdx < lines.length) {
          const line = lines[lineIdx];
          lines[lineIdx] = line.slice(0, m.column - 1) + m.newText + line.slice(m.column - 1 + m.length);
          applied++;
        } else {
          skipped++;
        }
      }

      content = lines.join('\n');
      updateFileContent(file.id, content);
    } catch (err) {
      errors.push(`Error in ${op.filePath}: ${err instanceof Error ? err.message : String(err)}`);
      skipped += op.matches.length;
    }
  }

  return { applied, skipped, errors };
}

// IDENTITY_SEAL: role=ReplaceEngine | inputs=FileNode[],search,replace | outputs=ReplacePreview,ReplaceResult
