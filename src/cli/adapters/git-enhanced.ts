// ============================================================
// CS Quill 🦔 — Git Enhanced (Merge Conflict + Rebase Helper)
// ============================================================
// Git 80% → 90%: 머지 충돌 해결 + 리베이스 도우미.

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// ============================================================
// PART 1 — Merge Conflict Detector
// ============================================================

export interface ConflictInfo {
  file: string;
  conflicts: Array<{
    startLine: number;
    ours: string;
    theirs: string;
    endLine: number;
  }>;
}

export function detectConflicts(rootPath: string): ConflictInfo[] {
  const results: ConflictInfo[] = [];

  try {
    const output = execSync('git diff --name-only --diff-filter=U 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', stdio: 'pipe',
    });

    for (const file of output.split('\n').filter(Boolean)) {
      const fullPath = require('path').join(rootPath, file);
      if (!existsSync(fullPath)) continue;

      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      const conflicts: ConflictInfo['conflicts'] = [];

      let inConflict = false;
      let startLine = 0;
      let ours = '';
      let theirs = '';

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('<<<<<<<')) {
          inConflict = true;
          startLine = i + 1;
          ours = '';
          theirs = '';
        } else if (lines[i].startsWith('=======') && inConflict) {
          // Switch from ours to theirs
        } else if (lines[i].startsWith('>>>>>>>') && inConflict) {
          conflicts.push({ startLine, ours: ours.trim(), theirs: theirs.trim(), endLine: i + 1 });
          inConflict = false;
        } else if (inConflict) {
          if (theirs === '' && !lines[i - 1]?.startsWith('=======')) {
            ours += lines[i] + '\n';
          } else {
            theirs += lines[i] + '\n';
          }
        }
      }

      if (conflicts.length > 0) {
        results.push({ file, conflicts });
      }
    }
  } catch { /* not in merge state */ }

  return results;
}

// IDENTITY_SEAL: PART-1 | role=conflict-detect | inputs=rootPath | outputs=ConflictInfo[]

// ============================================================
// PART 2 — AI Conflict Resolver
// ============================================================

export async function resolveConflictWithAI(conflict: ConflictInfo['conflicts'][0], context: string): Promise<string> {
  try {
    const { streamChat } = await import('@/lib/ai-providers');

    let resolved = '';
    await streamChat({
      systemInstruction: `You are a merge conflict resolver. Given "ours" and "theirs" code, output ONLY the resolved code. No explanation. Choose the best combination or write new code that satisfies both intents.`,
      messages: [{
        role: 'user',
        content: `Context:\n${context.slice(0, 2000)}\n\nOurs:\n${conflict.ours}\n\nTheirs:\n${conflict.theirs}\n\nResolved:`,
      }],
      onChunk: (t: string) => { resolved += t; },
    });

    return resolved.replace(/^```\w*\n?/gm, '').replace(/```$/gm, '').trim();
  } catch {
    return conflict.ours; // Fallback: keep ours
  }
}

// IDENTITY_SEAL: PART-2 | role=ai-resolve | inputs=conflict,context | outputs=string

// ============================================================
// PART 3 — Smart Commit Message
// ============================================================

export async function generateCommitMessage(rootPath: string): Promise<string> {
  try {
    const diff = execSync('git diff --cached --stat 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', stdio: 'pipe',
    });

    const diffContent = execSync('git diff --cached 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', stdio: 'pipe',
    });

    const { streamChat } = await import('@/lib/ai-providers');

    let message = '';
    await streamChat({
      systemInstruction: 'Generate a concise git commit message. Format: type(scope): description. Max 72 chars. Types: feat, fix, refactor, docs, test, chore. Output ONLY the message.',
      messages: [{
        role: 'user',
        content: `Files:\n${diff.slice(0, 500)}\n\nDiff:\n${diffContent.slice(0, 3000)}`,
      }],
      onChunk: (t: string) => { message += t; },
    });

    return message.trim().split('\n')[0].slice(0, 72);
  } catch {
    return 'chore: update files';
  }
}

// IDENTITY_SEAL: PART-3 | role=commit-msg | inputs=rootPath | outputs=string

// ============================================================
// PART 4 — Branch Strategy Helper
// ============================================================

export function suggestBranchName(description: string): string {
  const prefix = /fix|bug/i.test(description) ? 'fix' :
    /feat|add|new/i.test(description) ? 'feat' :
    /refactor|clean/i.test(description) ? 'refactor' :
    /test/i.test(description) ? 'test' :
    /doc/i.test(description) ? 'docs' : 'feat';

  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);

  return `${prefix}/${slug}`;
}

export function getStaleLocalBranches(rootPath: string, daysSince: number = 30): string[] {
  try {
    const output = execSync(
      `git for-each-ref --sort=committerdate --format="%(refname:short)|%(committerdate:unix)" refs/heads/ 2>/dev/null`,
      { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' },
    );

    const cutoff = Date.now() / 1000 - daysSince * 86400;
    return output.split('\n').filter(Boolean)
      .map(line => {
        const [branch, timestamp] = line.split('|');
        return { branch, timestamp: parseInt(timestamp, 10) };
      })
      .filter(b => b.timestamp < cutoff && b.branch !== 'main' && b.branch !== 'master')
      .map(b => b.branch);
  } catch {
    return [];
  }
}

// IDENTITY_SEAL: PART-4 | role=branch | inputs=description | outputs=branchName
