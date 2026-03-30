// ============================================================
// Code Studio — Commit Message Generator
// ============================================================
// 스테이징된 변경 분석, conventional commit 메시지 생성.

import type { GitDiffResult } from './git';

export type CommitType = 'feat' | 'fix' | 'refactor' | 'style' | 'docs' | 'test' | 'chore' | 'perf' | 'ci' | 'build';

export interface CommitMessageSuggestion {
  type: CommitType;
  scope: string;
  subject: string;
  body: string;
  full: string;
  confidence: number;
}

/** Infer commit type from diff content */
function inferType(diffs: GitDiffResult[]): CommitType {
  const allPaths = diffs.map(d => d.filePath.toLowerCase());
  const allContent = diffs.flatMap(d => d.hunks.flatMap(h => h.lines.map(l => l.content))).join('\n');

  if (allPaths.some(p => p.includes('test') || p.includes('spec'))) return 'test';
  if (allPaths.every(p => p.endsWith('.md') || p.endsWith('.txt'))) return 'docs';
  if (allPaths.some(p => p.includes('.css') || p.includes('.scss'))) {
    if (allPaths.every(p => /\.(css|scss|less|styled)/.test(p))) return 'style';
  }
  if (allPaths.some(p => p.includes('ci') || p.includes('.github'))) return 'ci';
  if (allPaths.some(p => p.includes('config') || p === 'package.json')) return 'chore';

  // Content-based heuristics
  if (/fix|bug|patch|repair|resolve/i.test(allContent)) return 'fix';
  if (/perf|optimize|speed|cache|memo/i.test(allContent)) return 'perf';
  if (/refactor|rename|move|extract|cleanup/i.test(allContent)) return 'refactor';

  return 'feat';
}

/** Infer scope from file paths */
function inferScope(diffs: GitDiffResult[]): string {
  if (diffs.length === 0) return '';
  if (diffs.length === 1) {
    const parts = diffs[0].filePath.split('/');
    // Use parent directory or file name without extension
    if (parts.length >= 2) return parts[parts.length - 2];
    return parts[0].replace(/\.\w+$/, '');
  }

  // Multiple files: find common directory
  const dirs = diffs.map(d => {
    const parts = d.filePath.split('/');
    return parts.length > 1 ? parts.slice(0, -1) : parts;
  });

  let commonLen = 0;
  outer: for (let i = 0; i < dirs[0].length; i++) {
    for (let j = 1; j < dirs.length; j++) {
      if (dirs[j][i] !== dirs[0][i]) break outer;
    }
    commonLen = i + 1;
  }

  return commonLen > 0 ? dirs[0][commonLen - 1] : '';
}

/** Generate subject line from diffs */
function inferSubject(diffs: GitDiffResult[], type: CommitType): string {
  const totalAdds = diffs.reduce((s, d) => s + d.additions, 0);
  const totalDels = diffs.reduce((s, d) => s + d.deletions, 0);

  if (diffs.length === 1) {
    const name = diffs[0].filePath.split('/').pop() ?? '';
    if (type === 'feat') return `add ${name}`;
    if (type === 'fix') return `fix issue in ${name}`;
    if (type === 'refactor') return `refactor ${name}`;
    if (type === 'docs') return `update ${name}`;
    return `update ${name}`;
  }

  if (totalAdds > 0 && totalDels === 0) return `add ${diffs.length} files`;
  if (totalDels > 0 && totalAdds === 0) return `remove code from ${diffs.length} files`;
  return `update ${diffs.length} files (+${totalAdds} -${totalDels})`;
}

/** Generate commit message suggestion from staged diffs */
export function generateCommitMessage(diffs: GitDiffResult[]): CommitMessageSuggestion {
  if (diffs.length === 0) {
    return { type: 'chore', scope: '', subject: 'empty commit', body: '', full: 'chore: empty commit', confidence: 0 };
  }

  const type = inferType(diffs);
  const scope = inferScope(diffs);
  const subject = inferSubject(diffs, type);

  const scopePart = scope ? `(${scope})` : '';
  const full = `${type}${scopePart}: ${subject}`;

  const body = diffs.length > 1
    ? `Files changed:\n${diffs.map(d => `- ${d.filePath} (+${d.additions} -${d.deletions})`).join('\n')}`
    : '';

  // Confidence based on heuristic strength
  const confidence = diffs.length === 1 ? 0.7 : 0.5;

  return { type, scope, subject, body, full, confidence };
}

/** Format a conventional commit message */
export function formatConventionalCommit(
  type: CommitType,
  scope: string,
  subject: string,
  body?: string,
  breaking?: boolean,
): string {
  const scopePart = scope ? `(${scope})` : '';
  const breakingMark = breaking ? '!' : '';
  let msg = `${type}${scopePart}${breakingMark}: ${subject}`;
  if (body) msg += `\n\n${body}`;
  return msg;
}

// IDENTITY_SEAL: role=CommitMessage | inputs=GitDiffResult[] | outputs=CommitMessageSuggestion
