// ============================================================
// Code Studio — Mentions System
// ============================================================
// @file, @agent, @symbol 파싱, 실제 객체 해석, AI 컨텍스트 포매팅.

import type { FileNode } from '../core/types';

// ============================================================
// PART 1 — Types & Patterns
// ============================================================

export type MentionType = 'file' | 'agent' | 'symbol' | 'url';

export interface Mention {
  type: MentionType;
  raw: string;         // original @-prefixed text
  value: string;       // resolved value
  startIndex: number;
  endIndex: number;
}

export interface ResolvedMention extends Mention {
  resolved: boolean;
  content?: string;     // file content or agent description
  filePath?: string;
  metadata?: Record<string, string>;
}

const MENTION_REGEX = /@(file|agent|symbol|url):([^\s,]+)/g;
const SIMPLE_FILE_REGEX = /@([\w./-]+\.\w+)/g; // @filename.ext

const KNOWN_AGENTS = new Set([
  'coder', 'reviewer', 'debugger', 'architect', 'tester',
  'optimizer', 'documenter', 'security',
]);

// IDENTITY_SEAL: PART-1 | role=TypesPatterns | inputs=none | outputs=Mention,ResolvedMention

// ============================================================
// PART 2 — Parsing
// ============================================================

/** Parse all mentions from text */
export function parseMentions(text: string): Mention[] {
  const mentions: Mention[] = [];
  const seen = new Set<string>();

  // Typed mentions: @file:path, @agent:name, @symbol:name, @url:http...
  let m: RegExpExecArray | null;
  const typedRe = new RegExp(MENTION_REGEX.source, 'g');
  while ((m = typedRe.exec(text)) !== null) {
    const type = m[1] as MentionType;
    const value = m[2];
    const key = `${type}:${value}`;
    if (!seen.has(key)) {
      seen.add(key);
      mentions.push({
        type,
        raw: m[0],
        value,
        startIndex: m.index,
        endIndex: m.index + m[0].length,
      });
    }
  }

  // Simple file mentions: @filename.ts
  const simpleRe = new RegExp(SIMPLE_FILE_REGEX.source, 'g');
  while ((m = simpleRe.exec(text)) !== null) {
    // Skip if already captured as typed mention
    const value = m[1];
    const key = `file:${value}`;
    if (!seen.has(key) && !KNOWN_AGENTS.has(value)) {
      seen.add(key);
      mentions.push({
        type: 'file',
        raw: m[0],
        value,
        startIndex: m.index,
        endIndex: m.index + m[0].length,
      });
    }
  }

  return mentions.sort((a, b) => a.startIndex - b.startIndex);
}

// IDENTITY_SEAL: PART-2 | role=Parsing | inputs=text | outputs=Mention[]

// ============================================================
// PART 3 — Resolution
// ============================================================

/** Find a file in the tree by name or path */
function findFile(nodes: FileNode[], name: string, prefix = ''): { node: FileNode; path: string } | null {
  for (const node of nodes) {
    const fullPath = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === 'file' && (node.name === name || fullPath === name || fullPath.endsWith('/' + name))) {
      return { node, path: fullPath };
    }
    if (node.children) {
      const found = findFile(node.children, name, fullPath);
      if (found) return found;
    }
  }
  return null;
}

/** Resolve mentions against actual project data */
export function resolveMentions(
  mentions: Mention[],
  fileTree: FileNode[],
): ResolvedMention[] {
  return mentions.map(mention => {
    switch (mention.type) {
      case 'file': {
        const found = findFile(fileTree, mention.value);
        if (found) {
          return {
            ...mention,
            resolved: true,
            content: found.node.content ?? '',
            filePath: found.path,
          };
        }
        return { ...mention, resolved: false };
      }

      case 'agent': {
        const isKnown = KNOWN_AGENTS.has(mention.value.toLowerCase());
        return {
          ...mention,
          resolved: isKnown,
          content: isKnown ? `Agent: ${mention.value}` : undefined,
        };
      }

      case 'symbol':
        // Symbol resolution would need the symbol index
        return { ...mention, resolved: false };

      case 'url':
        return { ...mention, resolved: true, content: mention.value };

      default:
        return { ...mention, resolved: false };
    }
  });
}

// IDENTITY_SEAL: PART-3 | role=Resolution | inputs=Mention[],FileNode[] | outputs=ResolvedMention[]

// ============================================================
// PART 4 — Context Formatting
// ============================================================

/** Format resolved mentions as AI context block */
export function formatMentionsForAI(resolved: ResolvedMention[]): string {
  const parts: string[] = [];

  for (const m of resolved) {
    if (!m.resolved) continue;

    switch (m.type) {
      case 'file':
        if (m.content && m.filePath) {
          parts.push(`<file path="${m.filePath}">\n${m.content}\n</file>`);
        }
        break;

      case 'agent':
        parts.push(`<agent name="${m.value}" />`);
        break;

      case 'url':
        parts.push(`<reference url="${m.value}" />`);
        break;

      case 'symbol':
        parts.push(`<symbol name="${m.value}" />`);
        break;
    }
  }

  return parts.join('\n\n');
}

/** Strip mention syntax from text (for display) */
export function stripMentions(text: string): string {
  return text
    .replace(MENTION_REGEX, '$2')
    .replace(SIMPLE_FILE_REGEX, '$1');
}

// IDENTITY_SEAL: PART-4 | role=ContextFormatting | inputs=ResolvedMention[] | outputs=string
