// ============================================================
// AI Hover Explanation — On-hover AI-generated explanations
// for code symbols, with result caching.
// ============================================================

import { streamChat } from "@/lib/ai-providers";

/** The result of an AI hover explanation request. */
export interface HoverExplanation {
  symbol: string;
  kind: string; // function, class, variable, etc.
  explanation: string; // AI-generated explanation
  signature?: string; // inferred type signature
  parameters?: Array<{ name: string; type?: string; description?: string }>;
  returnType?: string;
  usageExamplesCount?: number;
}

/* ── LRU Cache with TTL ── */

const LRU_MAX = 500;
const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  value: HoverExplanation;
  expires: number;
}

const cache = new Map<string, CacheEntry>();

/** In-flight request deduplication map */
const inflight = new Map<string, Promise<HoverExplanation | null>>();

function cacheKey(fileName: string, symbol: string, line: number): string {
  return `${fileName}:${symbol}:${line}`;
}

function cacheGet(key: string): HoverExplanation | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return undefined;
  }
  // Move to end for LRU ordering
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

function cacheSet(key: string, value: HoverExplanation): void {
  // Evict oldest if at capacity
  if (cache.size >= LRU_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expires: Date.now() + TTL_MS });
}

/* ── Prompt ── */

const HOVER_SYSTEM_PROMPT = `You are a concise code documentation assistant. Given a code snippet and a highlighted symbol, respond with a JSON object containing:
- "symbol": the symbol name
- "kind": one of "function", "class", "interface", "type", "variable", "constant", "method", "property", "parameter", "module", "enum"
- "explanation": a brief (1-2 sentence) explanation of what the symbol does
- "signature": the inferred type signature (if applicable, otherwise omit)
- "parameters": array of {name, type?, description?} for functions/methods (omit if not applicable)
- "returnType": the return type for functions/methods (omit if not applicable)
- "usageExamplesCount": estimated number of usage patterns visible in the provided code context (0 if none)

Rules:
- Be concise — hover tooltips must be scannable
- Infer the kind from context
- Output ONLY valid JSON, nothing else`;

/* ── Public API ── */

/**
 * Get an AI-generated hover explanation for a symbol in code.
 *
 * Results are cached by `${fileName}:${symbol}:${line}` so repeated
 * hovers over the same symbol don't trigger additional API calls.
 *
 * @param code     - The surrounding code context (a few lines around the symbol)
 * @param symbol   - The symbol name being hovered
 * @param line     - The 1-based line number of the symbol
 * @param language - The programming language of the file
 * @param signal   - Optional AbortSignal to cancel the request
 * @param fileName - Optional file name for stable per-file caching
 * @returns A HoverExplanation or null if the request fails
 */
export async function getHoverExplanation(
  code: string,
  symbol: string,
  line: number,
  language: string,
  signal?: AbortSignal,
  fileName?: string,
): Promise<HoverExplanation | null> {
  // Use fileName for cache key when available, fall back to language
  const key = cacheKey(fileName ?? language, symbol, line);

  const cached = cacheGet(key);
  if (cached) return cached;

  // Request deduplication: if the same key is already in-flight, wait for it
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = _fetchHoverExplanation(code, symbol, line, language, key, signal);
  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

/** Internal fetch implementation (separated for dedup wrapper). */
async function _fetchHoverExplanation(
  code: string,
  symbol: string,
  line: number,
  language: string,
  key: string,
  signal?: AbortSignal,
): Promise<HoverExplanation | null> {

  const userContent = [
    `Language: ${language}`,
    `Symbol: \`${symbol}\` at line ${line}`,
    "",
    "Code:",
    "```" + language,
    code,
    "```",
  ].join("\n");

  let result = "";
  try {
    await streamChat({
      systemInstruction: HOVER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
      temperature: 0.1,
      signal,
      onChunk: (text) => {
        result += text;
      },
    });
  } catch (err) {
    // Abort is expected when the user moves the cursor away
    if (err instanceof DOMException && err.name === "AbortError") return null;
    console.warn("[ai-hover] Failed to get explanation:", err);
    return null;
  }

  // Parse response
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as HoverExplanation;
      const explanation: HoverExplanation = {
        symbol: parsed.symbol ?? symbol,
        kind: parsed.kind ?? "variable",
        explanation: parsed.explanation ?? "",
        signature: parsed.signature,
        parameters: parsed.parameters,
        returnType: parsed.returnType,
        usageExamplesCount: parsed.usageExamplesCount ?? 0,
      };
      cacheSet(key, explanation);
      return explanation;
    }
  } catch {
    // Fallback: treat the entire result as a plain-text explanation
  }

  const fallback: HoverExplanation = {
    symbol,
    kind: "variable",
    explanation: result.trim().slice(0, 200),
  };
  cacheSet(key, fallback);
  return fallback;
}

/**
 * Clear the hover explanation cache.
 * Call this when files change to avoid stale explanations.
 */
export function clearHoverCache(): void {
  cache.clear();
}

/**
 * Remove a specific entry from the hover cache.
 */
export function invalidateHoverCache(
  fileName: string,
  symbol: string,
  line: number,
): void {
  cache.delete(cacheKey(fileName, symbol, line));
}
