// ============================================================
// Code Studio AI Features — 15 AI-powered coding assistants
// Unified module consuming streamChat from @/lib/ai-providers
// ============================================================

import { streamChat, getActiveProvider, PROVIDERS } from '@/lib/ai-providers';

// ============================================================
// PART 1 — Types & Helpers
// ============================================================

export interface ImportSuggestion {
  module: string;
  importStatement: string;
}

export interface LintResult {
  line: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  fix?: string;
}

export interface CodeAction {
  title: string;
  edit: string;
}

export interface PairComment {
  suggestion: string;
  reasoning: string;
}

// IDENTITY_SEAL: PART-1 | role=shared types & internal helpers | inputs=none | outputs=types, callAI, parseJSON

/** Internal: collect full streamed response into a string */
async function callAI(
  systemInstruction: string,
  userMessage: string,
  signal?: AbortSignal,
  temperature = 0.3,
): Promise<string> {
  let result = '';
  try {
    result = await streamChat({
      systemInstruction,
      messages: [{ role: 'user', content: userMessage }],
      temperature,
      onChunk: () => {},
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    console.warn('[ai-features] callAI failed:', err);
    return '';
  }
  return result.trim();
}

/** Internal: extract the first JSON block from an AI response */
function extractJSON(text: string): string {
  // Try fenced code block first
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Try raw JSON array or object
  const raw = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (raw) return raw[1].trim();
  return text.trim();
}

/** Safe JSON parse with fallback */
function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(extractJSON(text)) as T;
  } catch {
    return fallback;
  }
}

// ============================================================
// PART 2 — Hover Explanation, Auto-Import, Docstring, Lint
// ============================================================

// IDENTITY_SEAL: PART-2 | role=code understanding features | inputs=code,symbol,language | outputs=explanation,imports,docstring,lints

/**
 * 1. AI Hover Explanation
 * Returns a concise explanation of a symbol in the given code context.
 */
export async function getHoverExplanation(
  code: string,
  symbol: string,
  language: string,
  signal?: AbortSignal,
): Promise<string> {
  const system = `You are a code documentation assistant. Given source code in ${language}, explain the symbol "${symbol}" in 2-3 concise sentences. Focus on what it does, its type, and its role in the surrounding code. Do not include code blocks.`;
  const result = await callAI(system, code, signal);
  return result || `No explanation available for "${symbol}".`;
}

/**
 * 2. Auto-Import Suggestion
 * Detects missing imports and suggests import statements.
 */
export async function findMissingImports(
  code: string,
  language: string,
  signal?: AbortSignal,
): Promise<ImportSuggestion[]> {
  const system = `You are an import analyzer for ${language}. Analyze the code and find identifiers that are used but not imported or declared. Return a JSON array of objects with "module" (package/path) and "importStatement" (the full import line). Only include high-confidence suggestions. If none are missing, return an empty array []. Return ONLY the JSON array, no explanation.`;
  const result = await callAI(system, code, signal);
  return safeParseJSON<ImportSuggestion[]>(result, []);
}

/**
 * 3. Docstring Generation
 * Generates a language-appropriate docstring/JSDoc for a function.
 */
export async function generateDocstring(
  functionCode: string,
  language: string,
  signal?: AbortSignal,
): Promise<string> {
  const formatHint = language === 'python'
    ? 'Google-style Python docstring'
    : language === 'typescript' || language === 'javascript'
      ? 'JSDoc comment'
      : 'standard documentation comment';
  const system = `You are a documentation generator. Given a function in ${language}, generate a ${formatHint}. Include parameter descriptions, return type, and a brief summary. Return ONLY the documentation comment, nothing else.`;
  const result = await callAI(system, functionCode, signal);
  return result || '/** No documentation generated. */';
}

/**
 * 4. AI Lint (code quality check)
 * Returns structured lint results with line numbers, messages, and optional fixes.
 */
export async function lintCode(
  code: string,
  language: string,
  signal?: AbortSignal,
): Promise<LintResult[]> {
  const system = `You are a strict code reviewer for ${language}. Analyze the code for bugs, anti-patterns, security issues, and style problems. Return a JSON array of objects: {"line": number, "message": string, "severity": "error"|"warning"|"info", "fix": string|null}. "line" is the 1-based line number. "fix" is a suggested replacement for that line or null. If the code is clean, return []. Return ONLY the JSON array.`;
  const result = await callAI(system, code, signal);
  return safeParseJSON<LintResult[]>(result, []);
}

// ============================================================
// PART 3 — Rename, Search/Replace, Edit Predictor, Code Actions
// ============================================================

// IDENTITY_SEAL: PART-3 | role=code transformation features | inputs=code,context | outputs=names,replacements,predictions,actions

/**
 * 5. AI Rename (smart variable renaming)
 * Suggests better names for a variable/function.
 */
export async function suggestRename(
  code: string,
  oldName: string,
  language: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const system = `You are a naming expert for ${language}. Given code containing the identifier "${oldName}", suggest 3-5 better, more descriptive names. Follow ${language} naming conventions. Return a JSON array of strings. Return ONLY the JSON array.`;
  const result = await callAI(system, code, signal);
  const parsed = safeParseJSON<string[]>(result, []);
  return parsed.filter((n) => typeof n === 'string' && n.length > 0);
}

/**
 * 6. AI Search/Replace (semantic find and replace)
 * Generates find/replace pairs based on a natural language description.
 */
export async function semanticSearchReplace(
  code: string,
  description: string,
  language: string,
  signal?: AbortSignal,
): Promise<{ find: string; replace: string }[]> {
  const system = `You are a code transformation assistant for ${language}. The user describes a change they want. Generate an array of find/replace pairs to apply. Return a JSON array of {"find": string, "replace": string}. Use exact string matches from the code. Return ONLY the JSON array.`;
  const userMsg = `Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nRequested change: ${description}`;
  const result = await callAI(system, userMsg, signal);
  return safeParseJSON<{ find: string; replace: string }[]>(result, []);
}

/**
 * 7. Edit Predictor (predict next edit)
 * Predicts what the developer will likely change next based on recent edits.
 */
export async function predictNextEdit(
  code: string,
  recentChanges: string,
  language: string,
  signal?: AbortSignal,
): Promise<string> {
  const system = `You are a code edit predictor for ${language}. Given the current file and a description of recent changes, predict the most likely next edit the developer will make. Be specific — output only the predicted code change as a diff-like snippet (lines to add/remove). Keep it concise.`;
  const userMsg = `Current code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nRecent changes:\n${recentChanges}`;
  const result = await callAI(system, userMsg, signal, 0.5);
  return result || '';
}

/**
 * 8. Code Actions (quick fixes)
 * Given an error message, suggests structured code fixes.
 */
export async function getCodeActions(
  code: string,
  errorMessage: string,
  language: string,
  signal?: AbortSignal,
): Promise<CodeAction[]> {
  const system = `You are a quick-fix assistant for ${language}. Given code and an error message, suggest 1-3 fixes. Return a JSON array of {"title": string, "edit": string}. "title" is a short description of the fix. "edit" is the corrected code snippet that replaces the problematic section. Return ONLY the JSON array.`;
  const userMsg = `Error: ${errorMessage}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\``;
  const result = await callAI(system, userMsg, signal);
  return safeParseJSON<CodeAction[]>(result, []);
}

// ============================================================
// PART 4 — Pair Programming, Diff Stream, Tool Use, Model Router
// ============================================================

// IDENTITY_SEAL: PART-4 | role=collaboration & orchestration | inputs=code,context,tool | outputs=comments,diffs,toolResults,modelId

/**
 * 9. Pair Programming (comment-based collaboration)
 * Acts as a pair programmer reviewing code with context.
 */
export async function pairProgramComment(
  code: string,
  context: string,
  language: string,
  signal?: AbortSignal,
): Promise<PairComment> {
  const system = `You are a pair programmer reviewing ${language} code. Given the code and the developer's context/question, provide a constructive suggestion. Return a JSON object: {"suggestion": string, "reasoning": string}. "suggestion" is the actionable advice or code change. "reasoning" is a 1-2 sentence justification. Return ONLY the JSON object.`;
  const userMsg = `Context: ${context}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\``;
  const result = await callAI(system, userMsg, signal, 0.4);
  return safeParseJSON<PairComment>(result, {
    suggestion: 'No suggestion available.',
    reasoning: '',
  });
}

/**
 * 10. AI Diff Stream (generate diff from description)
 * Streams a unified diff based on a natural language change description.
 * Calls onChunk for each streamed piece, and returns the full result.
 */
export async function generateDiffFromDescription(
  code: string,
  description: string,
  language: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const system = `You are a diff generator for ${language}. Given source code and a change description, output a unified diff (--- / +++ / @@ format) that applies the described change. Output ONLY the diff, no explanation.`;
  const userMsg = `Description: ${description}\n\nSource:\n\`\`\`${language}\n${code}\n\`\`\``;
  let full = '';
  try {
    full = await streamChat({
      systemInstruction: system,
      messages: [{ role: 'user', content: userMsg }],
      temperature: 0.2,
      onChunk,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    console.warn('[ai-features] generateDiffFromDescription failed:', err);
  }
  return full.trim();
}

/**
 * 11. AI Tool Use (execute tool calls)
 * Simulates tool use by asking the AI to produce the result of a tool invocation.
 */
export async function executeToolCall(
  tool: string,
  args: Record<string, string>,
  code: string,
  signal?: AbortSignal,
): Promise<string> {
  const argsStr = Object.entries(args)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  const system = `You are a code tool executor. The user invoked tool "${tool}" with arguments: ${argsStr}. Given the current code context, produce the tool's output. If the tool is "explain", explain the code. If "refactor", refactor it. If "test", generate a test. For unknown tools, describe what the tool would do. Output the result directly.`;
  const result = await callAI(system, code, signal, 0.3);
  return result || `Tool "${tool}" produced no output.`;
}

/**
 * 12. Model Router (select best model for task)
 * Selects the optimal model string based on task type and active provider.
 */
export function selectModel(
  task: 'completion' | 'review' | 'generation' | 'explanation',
): string {
  const provider = getActiveProvider();
  const def = PROVIDERS[provider];
  if (!def) return 'gpt-4o';

  const models = def.models;

  // Strategy: fast/cheap models for completion, best model for review/generation
  const preferFast = task === 'completion' || task === 'explanation';

  if (preferFast && models.length > 1) {
    // Pick the smallest/fastest model (typically the last or one with "mini"/"flash"/"instant")
    const fast = models.find(
      (m) => /mini|flash|instant|nano|small|haiku/i.test(m),
    );
    return fast ?? models[0];
  }

  // For review/generation, use the default (typically the most capable)
  return def.defaultModel;
}

// ============================================================
// PART 5 — Commit Message, PR Description, Code Explanation
// ============================================================

// IDENTITY_SEAL: PART-5 | role=git & documentation features | inputs=diff,commits,code | outputs=commitMsg,prDesc,explanation

/**
 * 13. Commit Message Generation
 * Generates a conventional-commit-style message from a diff.
 */
export async function generateCommitMessage(
  diff: string,
  signal?: AbortSignal,
): Promise<string> {
  const system = `You are a commit message generator. Given a git diff, write a concise conventional commit message (type: description). Use lowercase type (feat, fix, refactor, chore, docs, style, test, perf). The description should be under 72 characters and describe what changed and why. If multiple changes are present, focus on the most significant one. Output ONLY the commit message, nothing else.`;
  const result = await callAI(system, diff, signal);
  if (!result) return 'chore: update code';
  // Ensure single line
  return result.split('\n')[0].trim();
}

/**
 * 14. PR Description Generation
 * Generates a pull request description from a list of commit messages.
 */
export async function generatePRDescription(
  commits: string[],
  signal?: AbortSignal,
): Promise<string> {
  const system = `You are a pull request description writer. Given a list of commit messages from a branch, generate a clear PR description in Markdown. Include:
- A brief summary (1-2 sentences)
- A "Changes" section with bullet points
- A "Testing" section noting what should be tested
Keep it professional and concise.`;
  const userMsg = `Commits:\n${commits.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
  const result = await callAI(system, userMsg, signal, 0.4);
  return result || '## Summary\n\nNo description generated.';
}

/**
 * 15. Code Explanation (explain selected code)
 * Returns a detailed explanation of a code snippet.
 */
export async function explainCode(
  code: string,
  language: string,
  signal?: AbortSignal,
): Promise<string> {
  const system = `You are a code explainer for ${language}. Explain the given code clearly and thoroughly. Cover:
1. What the code does (high-level purpose)
2. How it works (step by step)
3. Key concepts or patterns used
Use plain language. Assume the reader knows basic programming but may not know the specific library/framework.`;
  const result = await callAI(system, code, signal, 0.3);
  return result || 'No explanation available.';
}
