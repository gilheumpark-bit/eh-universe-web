// ============================================================
// Code Studio — Git Blame Gutter
// ============================================================
// blame 출력 파싱, 라인 어노테이션 부착, 작성자+날짜 표시.

import type { GitBlameLine } from './git';

// ============================================================
// PART 1 — Types & Formatting
// ============================================================

export interface BlameAnnotation {
  lineNumber: number;
  hash: string;
  author: string;
  date: string;
  content: string;
  displayText: string;
  age: number; // days since commit
  color: string;
}

/** Author name → short form (max 12 chars) */
function shortenAuthor(author: string): string {
  if (author.length <= 12) return author;
  const parts = author.split(/\s+/);
  if (parts.length >= 2) return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  return author.slice(0, 11) + '\u2026';
}

/** Calculate days between date string and now */
function daysAgo(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

/** Age-based color (newer = brighter, older = dimmer) */
function ageColor(days: number): string {
  if (days <= 1) return '#4ade80';     // green — today/yesterday
  if (days <= 7) return '#60a5fa';     // blue — this week
  if (days <= 30) return '#a78bfa';    // purple — this month
  if (days <= 90) return '#f59e0b';    // amber — this quarter
  return '#6b7280';                     // gray — older
}

// IDENTITY_SEAL: PART-1 | role=TypesFormatting | inputs=author,dateStr | outputs=BlameAnnotation helpers

// ============================================================
// PART 2 — Blame Line Conversion
// ============================================================

/** Convert raw blame lines to annotated gutter data */
export function blameToAnnotations(blameLines: GitBlameLine[]): BlameAnnotation[] {
  return blameLines.map(line => {
    const age = daysAgo(line.date);
    const shortAuthor = shortenAuthor(line.author);
    const dateStr = line.date || 'unknown';
    const displayText = `${shortAuthor} \u00B7 ${dateStr}`;

    return {
      lineNumber: line.lineNumber,
      hash: line.hash,
      author: line.author,
      date: dateStr,
      content: line.content,
      displayText,
      age,
      color: ageColor(age),
    };
  });
}

/** Group consecutive lines by same commit hash */
export function groupByCommit(annotations: BlameAnnotation[]): Map<string, BlameAnnotation[]> {
  const groups = new Map<string, BlameAnnotation[]>();
  for (const ann of annotations) {
    const existing = groups.get(ann.hash) ?? [];
    existing.push(ann);
    groups.set(ann.hash, existing);
  }
  return groups;
}

/** Format a blame annotation for inline gutter display (fixed width) */
export function formatGutterText(ann: BlameAnnotation, width = 32): string {
  const text = `${ann.hash} ${shortenAuthor(ann.author)} ${ann.date}`;
  return text.length > width ? text.slice(0, width - 1) + '\u2026' : text.padEnd(width);
}

// IDENTITY_SEAL: PART-2 | role=BlameConversion | inputs=GitBlameLine[] | outputs=BlameAnnotation[]
