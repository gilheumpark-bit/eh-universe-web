// ============================================================
// Code Studio — AI-Assisted Symbol Rename
// ============================================================

import type { FileNode } from './code-studio-types';
import { streamChat } from '@/lib/ai-providers';

/* ── Types ── */

export interface RenameLocation {
  fileName: string;
  filePath: string;
  line: number;
  oldText: string;
  newText: string;
}

export interface RenameResult {
  oldName: string;
  newName: string;
  changes: RenameLocation[];
}

/* ── Helpers ── */

function flattenFiles(
  nodes: FileNode[],
  parentPath = '',
): Array<{ path: string; name: string; content: string }> {
  const result: Array<{ path: string; name: string; content: string }> = [];
  for (const node of nodes) {
    const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    if (node.type === 'file' && node.content != null) {
      result.push({ path: fullPath, name: node.name, content: node.content });
    }
    if (node.children) {
      result.push(...flattenFiles(node.children, fullPath));
    }
  }
  return result;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findCandidateLines(
  content: string,
  symbol: string,
): Array<{ line: number; text: string }> {
  const re = new RegExp(`\\b${escapeRegex(symbol)}\\b`);
  return content.split('\n').reduce<Array<{ line: number; text: string }>>((acc, text, i) => {
    if (re.test(text)) acc.push({ line: i + 1, text });
    return acc;
  }, []);
}

/* ── AI rename ── */

const RENAME_SYSTEM =
  'You are a precise code refactoring assistant. Determine which occurrences are real semantic references.\n' +
  'Respond ONLY with JSON array: [{"file":"...","line":1,"isReference":true,"reason":"..."}]';

export async function smartRename(
  symbol: string,
  newName: string,
  files: FileNode[],
  currentFile: string,
  signal?: AbortSignal,
): Promise<RenameResult> {
  const flat = flattenFiles(files);
  const candidates: Array<{ file: string; line: number; text: string }> = [];
  for (const f of flat) {
    for (const c of findCandidateLines(f.content, symbol)) {
      candidates.push({ file: f.path, line: c.line, text: c.text });
    }
  }

  if (candidates.length === 0) {
    return { oldName: symbol, newName, changes: [] };
  }

  const context = candidates
    .map((c) => `${c.file}:${c.line}: ${c.text.trim()}`)
    .join('\n');

  let raw = '';
  await streamChat({
    systemInstruction: RENAME_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Symbol: "${symbol}" → "${newName}"\nCurrent file: ${currentFile}\n\nOccurrences:\n${context}`,
      },
    ],
    onChunk: (t) => { raw += t; },
    signal,
  });

  const changes: RenameLocation[] = [];
  try {
    const parsed = JSON.parse(raw.trim()) as Array<{
      file: string;
      line: number;
      isReference: boolean;
    }>;
    const re = new RegExp(`\\b${escapeRegex(symbol)}\\b`, 'g');
    for (const p of parsed) {
      if (!p.isReference) continue;
      const cand = candidates.find((c) => c.file === p.file && c.line === p.line);
      if (!cand) continue;
      changes.push({
        fileName: cand.file.split('/').pop() ?? cand.file,
        filePath: cand.file,
        line: cand.line,
        oldText: cand.text,
        newText: cand.text.replace(re, newName),
      });
    }
  } catch {
    // fallback: replace all occurrences
    const re = new RegExp(`\\b${escapeRegex(symbol)}\\b`, 'g');
    for (const c of candidates) {
      changes.push({
        fileName: c.file.split('/').pop() ?? c.file,
        filePath: c.file,
        line: c.line,
        oldText: c.text,
        newText: c.text.replace(re, newName),
      });
    }
  }

  return { oldName: symbol, newName, changes };
}

// IDENTITY_SEAL: role=AIRename | inputs=symbol,newName,FileNode[] | outputs=RenameResult
