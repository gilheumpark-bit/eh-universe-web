// ============================================================
// PART 1 — Types & Constants
// ============================================================
// Pair Programming AI companion for EH Universe Code Studio.
// Provides real-time code analysis with inline comments,
// suggestions, warnings, and auto-fix support.

import { streamChat } from "@/lib/ai-providers";

export interface PairComment {
  id: string;
  timestamp: number;
  line: number;
  type: "hint" | "warning" | "suggestion" | "praise" | "question";
  message: string;
  priority: "low" | "medium" | "high";
  autoFix?: string;
  dismissed: boolean;
}

export interface PairProgrammingConfig {
  enabled: boolean;
  verbosity: "quiet" | "normal" | "verbose";
  commentDelay: number;
  maxComments: number;
  categories: {
    nullChecks: boolean;
    deprecatedAPIs: boolean;
    performance: boolean;
    bestPractices: boolean;
    security: boolean;
    style: boolean;
  };
}

export interface PairSession {
  isActive: boolean;
  comments: PairComment[];
  totalComments: number;
  acceptedSuggestions: number;
  dismissedComments: number;
}

const DEFAULT_CONFIG: PairProgrammingConfig = {
  enabled: false,
  verbosity: "normal",
  commentDelay: 2000,
  maxComments: 5,
  categories: {
    nullChecks: true,
    deprecatedAPIs: true,
    performance: true,
    bestPractices: true,
    security: true,
    style: true,
  },
};

// IDENTITY_SEAL: PART-1 | role=타입 및 설정 | inputs=none | outputs=PairComment, PairProgrammingConfig, PairSession

// ============================================================
// PART 2 — System Prompt & Helpers
// ============================================================

const CONTEXT_LINES_BEFORE = 10;
const CONTEXT_LINES_AFTER = 5;

function buildSystemPrompt(config: PairProgrammingConfig): string {
  const enabledCategories: string[] = [];
  if (config.categories.nullChecks) enabledCategories.push("null/undefined check");
  if (config.categories.deprecatedAPIs) enabledCategories.push("deprecated API usage");
  if (config.categories.performance) enabledCategories.push("performance issues");
  if (config.categories.bestPractices) enabledCategories.push("best practice violations");
  if (config.categories.security) enabledCategories.push("security concerns");
  if (config.categories.style) enabledCategories.push("code style");

  const verbosityGuide =
    config.verbosity === "quiet"
      ? "Only report warnings and critical issues. Skip suggestions, hints, and praise."
      : config.verbosity === "verbose"
        ? "Report everything including minor style issues. Be generous with praise for good patterns."
        : "Report warnings, suggestions, and notable patterns. Include praise for particularly clean code.";

  return `You are a friendly senior developer pair-programming with a colleague in real-time.

PERSONALITY: Supportive and constructive. Keep comments concise (1-2 sentences max).

CATEGORIES (enabled): ${enabledCategories.join(", ")}

VERBOSITY: ${verbosityGuide}

COMMENT TYPES:
- hint: useful tip
- warning: potential bug or risk
- suggestion: improvement idea
- praise: good pattern recognition
- question: intent clarification

RESPONSE: JSON array only (no markdown fences). Each element:
{ "line": <number>, "type": "<type>", "message": "<message>", "priority": "low"|"medium"|"high", "autoFix": "<optional fix or null>" }

Empty array if no comments warranted. Max 3 comments per change.`;
}

function generateId(): string {
  return `pair_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function extractJson(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

function extractChangedContext(
  code: string,
  changedLines: number[],
): { snippet: string; startLine: number; endLine: number } {
  const lines = code.split("\n");
  if (changedLines.length === 0) return { snippet: code, startLine: 1, endLine: lines.length };
  const minLine = Math.min(...changedLines);
  const maxLine = Math.max(...changedLines);
  const startLine = Math.max(1, minLine - CONTEXT_LINES_BEFORE);
  const endLine = Math.min(lines.length, maxLine + CONTEXT_LINES_AFTER);

  const numbered = lines.slice(startLine - 1, endLine)
    .map((l, i) => {
      const lineNum = startLine + i;
      const marker = changedLines.includes(lineNum) ? ">>>" : "   ";
      return `${marker} ${lineNum}: ${l}`;
    }).join("\n");

  return { snippet: numbered, startLine, endLine };
}

// IDENTITY_SEAL: PART-2 | role=프롬프트 빌드 및 헬퍼 | inputs=config, code | outputs=systemPrompt, snippet

// ============================================================
// PART 3 — PairProgrammer Class
// ============================================================

export class PairProgrammer {
  private _config: PairProgrammingConfig;
  private _active = false;
  private _comments: PairComment[] = [];
  private _totalComments = 0;
  private _acceptedSuggestions = 0;
  private _dismissedComments = 0;
  private _commentCallbacks: Array<(comment: PairComment) => void> = [];
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _abortController: AbortController | null = null;
  private _lastAnalyzedCode = "";

  constructor(config?: Partial<PairProgrammingConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    if (config?.categories) {
      this._config.categories = { ...DEFAULT_CONFIG.categories, ...config.categories };
    }
  }

  start(): void { this._active = true; this._config.enabled = true; }
  stop(): void { this._active = false; this._config.enabled = false; this._cancelPending(); }
  isActive(): boolean { return this._active; }

  onCodeChange(code: string, changedLines: number[], language: string, fileName: string): void {
    if (!this._active) return;
    if (code === this._lastAnalyzedCode) return;
    this._cancelPending();
    this._debounceTimer = setTimeout(() => {
      this._lastAnalyzedCode = code;
      this._analyzeChange(code, changedLines, language, fileName);
    }, this._config.commentDelay);
  }

  getActiveComments(): PairComment[] {
    return this._comments.filter((c) => !c.dismissed).slice(0, this._config.maxComments);
  }

  dismissComment(id: string): void {
    const c = this._comments.find((c) => c.id === id);
    if (c && !c.dismissed) { c.dismissed = true; this._dismissedComments++; }
  }

  acceptSuggestion(id: string): string | null {
    const c = this._comments.find((c) => c.id === id);
    if (!c) return null;
    c.dismissed = true;
    if (c.autoFix) { this._acceptedSuggestions++; return c.autoFix; }
    return null;
  }

  onComment(callback: (comment: PairComment) => void): () => void {
    this._commentCallbacks.push(callback);
    return () => {
      const idx = this._commentCallbacks.indexOf(callback);
      if (idx >= 0) this._commentCallbacks.splice(idx, 1);
    };
  }

  getSession(): PairSession {
    return {
      isActive: this._active,
      comments: [...this._comments],
      totalComments: this._totalComments,
      acceptedSuggestions: this._acceptedSuggestions,
      dismissedComments: this._dismissedComments,
    };
  }

  getConfig(): PairProgrammingConfig { return { ...this._config }; }

  updateConfig(config: Partial<PairProgrammingConfig>): void {
    if (config.categories) this._config.categories = { ...this._config.categories, ...config.categories };
    const { categories: _c, ...rest } = config;
    Object.assign(this._config, rest);
    if (config.enabled === true && !this._active) this.start();
    if (config.enabled === false && this._active) this.stop();
  }

  private _cancelPending(): void {
    if (this._debounceTimer) { clearTimeout(this._debounceTimer); this._debounceTimer = null; }
    if (this._abortController) { this._abortController.abort(); this._abortController = null; }
  }

  private async _analyzeChange(code: string, changedLines: number[], language: string, fileName: string): Promise<void> {
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const { snippet } = extractChangedContext(code, changedLines);

    const userMessage = `File: ${fileName} (${language})\nChanged lines: ${changedLines.length > 0 ? changedLines.join(", ") : "all"}\n\nCode:\n${snippet}`;

    let result = "";
    try {
      await streamChat({
        systemInstruction: buildSystemPrompt(this._config),
        messages: [{ role: "user", content: userMessage }],
        temperature: 0.3,
        signal,
        onChunk: (text) => { result += text; },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      return;
    }

    let parsed: Array<{
      line: number;
      type: PairComment["type"];
      message: string;
      priority: PairComment["priority"];
      autoFix?: string | null;
    }>;

    try {
      parsed = JSON.parse(extractJson(result));
      if (!Array.isArray(parsed)) return;
    } catch { return; }

    const filtered = parsed.filter((item) => {
      if (this._config.verbosity === "quiet") return item.type === "warning" && item.priority !== "low";
      return true;
    });

    for (const item of filtered) {
      if (!this._active) break;
      const comment: PairComment = {
        id: generateId(), timestamp: Date.now(), line: item.line ?? 0,
        type: item.type ?? "hint", message: item.message ?? "",
        priority: item.priority ?? "low", autoFix: item.autoFix || undefined, dismissed: false,
      };
      this._comments.push(comment);
      this._totalComments++;
      if (this._comments.length > this._config.maxComments * 3) {
        this._comments = this._comments.slice(-this._config.maxComments * 2);
      }
      for (const cb of this._commentCallbacks) { try { cb(comment); } catch { /* */ } }
    }
  }
}

// IDENTITY_SEAL: PART-3 | role=페어 프로그래머 코어 | inputs=code, changedLines | outputs=PairComment[]

// ============================================================
// PART 4 — Factory
// ============================================================

export function createPairProgrammer(config?: Partial<PairProgrammingConfig>): PairProgrammer {
  return new PairProgrammer(config);
}

export function getDefaultPairConfig(): PairProgrammingConfig {
  return { ...DEFAULT_CONFIG, categories: { ...DEFAULT_CONFIG.categories } };
}

// IDENTITY_SEAL: PART-4 | role=팩토리 | inputs=config | outputs=PairProgrammer
