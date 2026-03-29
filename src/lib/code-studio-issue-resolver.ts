// ============================================================
// Code Studio — Issue Resolver (error analysis + auto-fix)
// ============================================================

import { streamChat } from '@/lib/ai-providers';

// ============================================================
// PART 1 — Types
// ============================================================

export interface CodeIssue {
  id: string;
  type: 'error' | 'warning' | 'lint' | 'type-error' | 'runtime';
  message: string;
  fileName: string;
  line?: number;
  column?: number;
  source: string;
}

export interface IssueFix {
  issueId: string;
  description: string;
  changes: Array<{
    fileName: string;
    startLine: number;
    endLine: number;
    oldContent: string;
    newContent: string;
  }>;
  confidence: number;
  explanation: string;
}

export interface ResolverResult {
  issue: CodeIssue;
  fixes: IssueFix[];
  relatedIssues: string[];
  rootCause: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=CodeIssue,IssueFix,ResolverResult

// ============================================================
// PART 2 — Error Parsing
// ============================================================

export function parseErrorOutput(output: string, source = 'terminal'): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // TypeScript: file.ts(10,5): error TS2345: ...
    const tsMatch = line.match(/^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)/);
    if (tsMatch) {
      issues.push({
        id: `issue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: tsMatch[4] === 'error' ? 'type-error' : 'warning',
        message: `${tsMatch[5]}: ${tsMatch[6]}`,
        fileName: tsMatch[1],
        line: parseInt(tsMatch[2], 10),
        column: parseInt(tsMatch[3], 10),
        source,
      });
      continue;
    }

    // ESLint: /path/file.ts:10:5 error description rule-name
    const eslintMatch = line.match(/^\s*(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(\S+)$/);
    if (eslintMatch) {
      issues.push({
        id: `issue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: eslintMatch[3] === 'error' ? 'lint' : 'warning',
        message: `${eslintMatch[4]} (${eslintMatch[5]})`,
        fileName: '',
        line: parseInt(eslintMatch[1], 10),
        column: parseInt(eslintMatch[2], 10),
        source,
      });
      continue;
    }

    // Generic: Error: message
    const genericMatch = line.match(/^(Error|TypeError|ReferenceError|SyntaxError):\s*(.+)/);
    if (genericMatch) {
      issues.push({
        id: `issue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'runtime',
        message: `${genericMatch[1]}: ${genericMatch[2]}`,
        fileName: '',
        source,
      });
    }
  }

  return issues;
}

// IDENTITY_SEAL: PART-2 | role=error parsing | inputs=terminal output | outputs=CodeIssue[]

// ============================================================
// PART 3 — AI Resolution
// ============================================================

const RESOLVE_SYSTEM =
  'You are an expert debugger. Analyze the error and provide fixes.\n' +
  'Respond with JSON: {"rootCause":"...","fixes":[{"description":"...","changes":[{"fileName":"...","startLine":1,"endLine":1,"oldContent":"...","newContent":"..."}],"confidence":0.9,"explanation":"..."}],"relatedIssues":["..."]}';

export async function resolveIssue(
  issue: CodeIssue,
  fileContent: string,
  signal?: AbortSignal,
): Promise<ResolverResult> {
  let raw = '';
  await streamChat({
    systemInstruction: RESOLVE_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Error: ${issue.message}\nFile: ${issue.fileName}\nLine: ${issue.line ?? 'unknown'}\n\nCode:\n${fileContent.slice(0, 3000)}`,
      },
    ],
    onChunk: (t) => { raw += t; },
    signal,
  });

  try {
    const parsed = JSON.parse(raw.trim());
    return {
      issue,
      rootCause: parsed.rootCause ?? issue.message,
      fixes: (parsed.fixes ?? []).map((f: Record<string, unknown>, i: number) => ({
        issueId: issue.id,
        description: f.description ?? `Fix ${i + 1}`,
        changes: f.changes ?? [],
        confidence: typeof f.confidence === 'number' ? f.confidence : 0.5,
        explanation: f.explanation ?? '',
      })),
      relatedIssues: parsed.relatedIssues ?? [],
    };
  } catch {
    return {
      issue,
      rootCause: issue.message,
      fixes: [],
      relatedIssues: [],
    };
  }
}

// IDENTITY_SEAL: PART-3 | role=AI resolution | inputs=CodeIssue,fileContent | outputs=ResolverResult
