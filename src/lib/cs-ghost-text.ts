// ============================================================
// Ghost Text — AI Inline Completion Provider for Monaco
// ============================================================
// Registers as Monaco InlineCompletionProvider.
// Triggers after idle pause, sends context to AI, shows ghost text.
// Supports multi-line completions (Tab to accept, Esc to dismiss).

import { streamChatWithSlot } from "./ai-providers";
import type { ChatMsg } from "./ai-providers";
import { buildNegativePrompt, getAcceptanceRate } from "./ghost-text-learning";
import { getCurrentIndex } from "./code-indexer";
import { getQuickCompletion, getCachedCompletion, setCachedCompletion } from "./speed-optimizations";

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let abortController: AbortController | null = null;
let lastContext = "";  // cache to avoid duplicate requests

const BASE_DEBOUNCE_MS = 600;

/** Compute effective debounce: increase if acceptance rate is low */
function getEffectiveDebounce(language: string): number {
  const rate = getAcceptanceRate(language);
  // If we have data and rate is below 30%, slow down suggestions
  if (rate > 0 && rate < 0.3) {
    return BASE_DEBOUNCE_MS + Math.round((0.3 - rate) * 2000); // up to +600ms extra
  }
  return BASE_DEBOUNCE_MS;
}

/** File-type specific completion hints */
function getFileTypeHint(language: string): string {
  const hints: Record<string, string> = {
    typescript: "\nFor TypeScript files: prefer strong typing, use interfaces, and follow TS best practices.",
    javascript: "\nFor JavaScript files: use modern ES6+ syntax, prefer const/let over var.",
    "typescriptreact": "\nFor React TSX files: suggest JSX patterns, hooks, and component patterns.",
    "javascriptreact": "\nFor React JSX files: suggest JSX patterns, hooks, and component patterns.",
    css: "\nFor CSS files: suggest common styling patterns, use modern CSS features like flexbox/grid, custom properties.",
    scss: "\nFor SCSS files: suggest SCSS patterns with nesting, mixins, variables.",
    html: "\nFor HTML files: suggest semantic HTML5 elements and accessibility attributes.",
    json: "\nFor JSON files: suggest valid JSON structure with proper formatting.",
    python: "\nFor Python files: follow PEP 8 style, use type hints where appropriate.",
    rust: "\nFor Rust files: follow Rust idioms, use proper ownership/borrowing patterns.",
    go: "\nFor Go files: follow Go conventions, use error handling patterns.",
  };
  // Check for test files
  if (language === "typescript" || language === "javascript") {
    return hints[language] || "";
  }
  return hints[language] || "";
}

function getTestFileHint(codeBefore: string, _language: string): string {
  // Detect test file context from imports/patterns
  const isTestFile = /(?:describe|it|test|expect|jest|vitest|beforeEach|afterEach)\s*\(/.test(codeBefore) ||
    /import.*(?:jest|vitest|@testing-library|enzyme)/.test(codeBefore);
  if (isTestFile) {
    return "\nThis is a test file. Suggest test patterns: describe/it blocks, assertions, mock setups, and test utilities.";
  }
  return "";
}

const GHOST_SYSTEM_PROMPT = `You are a code completion engine. Given the code context, output ONLY the completion text to insert at the cursor.

Rules:
- Output raw code only. No explanations, no markdown, no code fences.
- You may output multiple lines if the context calls for it (e.g., completing a function body, if/else block, class method).
- Match the existing indentation style exactly.
- If completing a block (function, if, for, class), include the closing brace/bracket.
- Keep completions concise: 1-15 lines max.
- If nothing meaningful to suggest, output empty string.
- Never repeat code that already exists before the cursor.`;

export interface GhostTextResult {
  text: string;
  range: { startLine: number; startCol: number; endLine: number; endCol: number };
}

export function cancelGhostText() {
  if (debounceTimer) clearTimeout(debounceTimer);
  abortController?.abort();
  abortController = null;
}

/**
 * Detect if the cursor is at a position where multi-line completion makes sense.
 * Returns a hint for the AI about expected completion length.
 */
function detectCompletionIntent(codeBefore: string, _codeAfter: string): "single" | "multi" | "block" {
  const lastLine = codeBefore.split("\n").pop() ?? "";
  const trimmed = lastLine.trim();

  // After opening brace/paren/bracket → block completion
  if (/[{(\[]\s*$/.test(trimmed)) return "block";

  // After function/class/if/for/while declaration → block completion
  if (/(?:function|class|if|else|for|while|switch|try|catch)\b.*[{(]\s*$/.test(trimmed)) return "block";
  if (/(?:=>)\s*$/.test(trimmed)) return "block";

  // Empty line after a comment → multi-line (likely implementing what the comment describes)
  if (/^\s*$/.test(lastLine)) {
    const lines = codeBefore.split("\n");
    const prevLine = lines.length >= 2 ? lines[lines.length - 2].trim() : "";
    if (/^\/\/|^\/\*|^\*/.test(prevLine)) return "multi";
  }

  // After export/const/let/var with = but no value → multi-line
  if (/(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*$/.test(trimmed)) return "multi";

  // After return with nothing → single
  if (/return\s*$/.test(trimmed)) return "single";

  // Default: single line
  return "single";
}

/**
 * Import completion: when cursor is on an import line, suggest from known project symbols.
 * Returns a completion string or null if not applicable.
 */
function tryImportCompletion(codeBefore: string, _language: string): string | null {
  const lastLine = codeBefore.split("\n").pop() ?? "";
  // Check if we're on an import line that's being typed
  const importMatch = lastLine.match(/^(?:import\s+.*from\s+['"]|import\s+['"]|from\s+['"])([^'"]*?)$/);
  if (!importMatch) return null;
  const partial = importMatch[1];
  const index = getCurrentIndex();
  if (!index) return null;
  // Search for files matching the partial path
  const matches: string[] = [];
  for (const indexedFile of index.files) {
    const normalized = "./" + indexedFile.path.replace(/\.\w+$/, "");
    if (normalized.includes(partial) && normalized !== partial) {
      matches.push(normalized);
      if (matches.length >= 3) break;
    }
  }
  if (matches.length === 1) return matches[0].slice(partial.length);
  return null;
}

/**
 * Bracket auto-close: detect if Monaco would already auto-close the bracket.
 * Returns true if the suggestion should be suppressed.
 */
function shouldSuppressBracketClose(codeBefore: string, codeAfter: string): boolean {
  const lastChar = codeBefore.slice(-1);
  const nextChar = codeAfter.charAt(0);
  const bracketPairs: Record<string, string> = { "(": ")", "[": "]", "{": "}", "'": "'", '"': '"', "`": "`" };
  // If the last char is an opening bracket and the next char is its closing pair,
  // Monaco likely auto-closed it — don't suggest the closing bracket
  if (lastChar in bracketPairs && nextChar === bracketPairs[lastChar]) return true;
  return false;
}

/**
 * Comment continuation: if the previous line is a comment, suggest continuing the pattern.
 * Returns a prefix hint or null.
 */
function getCommentContinuation(codeBefore: string): string | null {
  const lines = codeBefore.split("\n");
  const lastLine = lines[lines.length - 1] ?? "";
  const prevLine = lines.length >= 2 ? lines[lines.length - 2] : "";
  // Only if the current line is empty/whitespace
  if (lastLine.trim().length > 0) return null;
  const indent = lastLine.match(/^(\s*)/)?.[1] ?? "";
  // JSDoc continuation: previous line starts with * or /**
  if (/^\s*\*\s/.test(prevLine) || /^\s*\/\*\*/.test(prevLine)) {
    return `${indent} * `;
  }
  // Single-line comment continuation
  if (/^\s*\/\//.test(prevLine)) {
    return `${indent}// `;
  }
  // Python/shell comment continuation
  if (/^\s*#/.test(prevLine)) {
    return `${indent}# `;
  }
  return null;
}

/**
 * Snippet awareness: detect if user is in an active snippet expansion.
 * Monaco sets a snippet mode context; we check for tab-stop markers.
 */
function isInSnippetExpansion(codeBefore: string, codeAfter: string): boolean {
  // Heuristic: if codeAfter starts with snippet-like placeholder patterns, suppress
  const snippetPlaceholder = /^\$\{\d+[:|]|^\$\d+/;
  if (snippetPlaceholder.test(codeAfter.trimStart())) return true;
  return false;
}

export function requestGhostText(
  codeBefore: string,
  codeAfter: string,
  language: string,
  cursorLine: number,
  cursorCol: number,
  onResult: (result: GhostTextResult | null) => void,
): void {
  cancelGhostText();

  // Skip duplicate context
  const contextKey = `${codeBefore.slice(-200)}|${cursorLine}:${cursorCol}`;
  if (contextKey === lastContext) return;

  // ── Instant local pattern matching (no debounce, no AI call) ──
  // For short edits or common patterns, respond immediately
  const quickResult = getQuickCompletion(codeBefore, language);
  if (quickResult) {
    lastContext = contextKey;
    const lines = quickResult.split("\n");
    const endLine = cursorLine + lines.length - 1;
    const endCol = lines.length === 1
      ? cursorCol + lines[0].length
      : lines[lines.length - 1].length + 1;
    onResult({
      text: quickResult,
      range: { startLine: cursorLine, startCol: cursorCol, endLine, endCol },
    });
    return;
  }

  // ── Check completion cache: same context returns cached AI result ──
  const cached = getCachedCompletion(contextKey);
  if (cached) {
    lastContext = contextKey;
    const lines = cached.split("\n");
    const endLine = cursorLine + lines.length - 1;
    const endCol = lines.length === 1
      ? cursorCol + lines[0].length
      : lines[lines.length - 1].length + 1;
    onResult({
      text: cached,
      range: { startLine: cursorLine, startCol: cursorCol, endLine, endCol },
    });
    return;
  }

  const effectiveDebounce = getEffectiveDebounce(language);

  debounceTimer = setTimeout(async () => {
    // Don't suggest for very short code
    if (codeBefore.length < 10) { onResult(null); return; }

    // Snippet awareness: don't suggest if user is in a snippet expansion
    if (isInSnippetExpansion(codeBefore, codeAfter)) { onResult(null); return; }

    // Import completion: try fast symbol-based completion first
    const importResult = tryImportCompletion(codeBefore, language);
    if (importResult) {
      onResult({
        text: importResult,
        range: { startLine: cursorLine, startCol: cursorCol, endLine: cursorLine, endCol: cursorCol + importResult.length },
      });
      return;
    }

    // Bracket auto-close suppression
    if (shouldSuppressBracketClose(codeBefore, codeAfter)) { onResult(null); return; }

    lastContext = contextKey;
    abortController = new AbortController();

    const intent = detectCompletionIntent(codeBefore, codeAfter);
    const maxTokens = intent === "block" ? 400 : intent === "multi" ? 250 : 150;

    const intentHint = intent === "block"
      ? "\nThe cursor is at the start of a code block. Complete the entire block body including the closing bracket."
      : intent === "multi"
      ? "\nThe cursor position suggests a multi-line completion. Output up to 10 lines."
      : "\nComplete the current line. Keep it to 1-2 lines.";

    // Add file-type and test-file specific hints
    const fileTypeHint = getFileTypeHint(language);
    const testHint = getTestFileHint(codeBefore, language);

    // Comment continuation hint
    const commentPrefix = getCommentContinuation(codeBefore);
    const commentHint = commentPrefix
      ? `\nThe cursor follows a comment line. Continue the comment pattern (start with "${commentPrefix.trim()}").`
      : "";

    const messages: ChatMsg[] = [{
      role: "user",
      content: `Language: ${language}${intentHint}${fileTypeHint}${testHint}${commentHint}\n\nCode before cursor:\n${codeBefore.slice(-2000)}\n\n[CURSOR HERE]\n\nCode after cursor:\n${codeAfter.slice(0, 800)}`,
    }];

    let accumulated = "";

    // Build enhanced system prompt with negative patterns
    const negativePrompt = buildNegativePrompt();
    const enhancedSystemPrompt = negativePrompt
      ? `${GHOST_SYSTEM_PROMPT}\n\n${negativePrompt}`
      : GHOST_SYSTEM_PROMPT;

    try {
      await streamChatWithSlot('fast', {
        systemInstruction: enhancedSystemPrompt,
        messages,
        temperature: 0.15,
        maxTokens,
        signal: abortController.signal,
        onChunk: (chunk) => { accumulated += chunk; },
      });

      let text = accumulated.trimEnd();
      // Strip markdown fences if AI accidentally included them
      text = text.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");

      if (!text || text.length < 2) { onResult(null); return; }

      // Cache this completion for future identical contexts
      setCachedCompletion(contextKey, text);

      // Calculate end position for multi-line completions
      const lines = text.split("\n");
      const endLine = cursorLine + lines.length - 1;
      const endCol = lines.length === 1
        ? cursorCol + lines[0].length
        : lines[lines.length - 1].length + 1;

      onResult({
        text,
        range: {
          startLine: cursorLine,
          startCol: cursorCol,
          endLine,
          endCol,
        },
      });
    } catch {
      onResult(null);
    } finally {
      abortController = null;
    }
  }, effectiveDebounce);
}
