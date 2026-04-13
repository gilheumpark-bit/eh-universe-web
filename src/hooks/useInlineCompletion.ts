// ============================================================
// PART 1 — Types & Interface
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseInlineCompletionOpts {
  enabled: boolean;
  debounceMs?: number;      // default 1500
  maxTokens?: number;       // default 100
  genre?: string;
  characters?: Array<{ name: string; role?: string }>;
}

export interface UseInlineCompletionReturn {
  suggestion: string | null;
  isLoading: boolean;
  accept: () => string | null;   // Returns suggestion text for insertion, then clears
  dismiss: () => void;
  triggerCompletion: (textBefore: string) => void;
}

// ============================================================
// PART 2 — Hook Implementation
// ============================================================

export function useInlineCompletion(opts: UseInlineCompletionOpts): UseInlineCompletionReturn {
  const {
    enabled,
    debounceMs = 1500,
    maxTokens = 100,
    genre,
    characters,
  } = opts;

  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTextRef = useRef<string>('');
  // Track accept/dismiss for writer profile
  const statsRef = useRef({ accepted: 0, dismissed: 0 });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ── Fetch completion from API ──
  const fetchCompletion = useCallback(async (textBefore: string) => {
    if (!enabled || textBefore.length < 20) return;

    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const body: Record<string, unknown> = {
        text: textBefore.slice(-500),
        maxTokens,
      };
      if (genre) body.genre = genre;
      if (characters && characters.length > 0) {
        body.characters = characters.slice(0, 10).map(c => c.name);
      }
      // Detect language from text (simple heuristic)
      const hasKorean = /[\uAC00-\uD7AF]/.test(textBefore.slice(-200));
      body.language = hasKorean ? 'ko' : 'en';

      const res = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        setSuggestion(null);
        return;
      }

      const data = await res.json() as { completion?: string };
      const text = data.completion?.trim();
      if (text && text.length > 0) {
        setSuggestion(text);
      } else {
        setSuggestion(null);
      }
    } catch (err: unknown) {
      // Ignore abort errors
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setSuggestion(null);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, maxTokens, genre, characters]);

  // ── Trigger with debounce ──
  const triggerCompletion = useCallback((textBefore: string) => {
    if (!enabled) return;
    lastTextRef.current = textBefore;
    // Clear previous suggestion while waiting
    setSuggestion(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Only fire if text hasn't changed
      if (lastTextRef.current === textBefore) {
        fetchCompletion(textBefore);
      }
    }, debounceMs);
  }, [enabled, debounceMs, fetchCompletion]);

  // ── Accept: return suggestion text, clear state ──
  const accept = useCallback((): string | null => {
    const text = suggestion;
    if (text) {
      statsRef.current.accepted += 1;
      setSuggestion(null);
      if (abortRef.current) abortRef.current.abort();
    }
    return text;
  }, [suggestion]);

  // ── Dismiss: clear suggestion ──
  const dismiss = useCallback(() => {
    if (suggestion) {
      statsRef.current.dismissed += 1;
    }
    setSuggestion(null);
    if (abortRef.current) abortRef.current.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, [suggestion]);

  return { suggestion, isLoading, accept, dismiss, triggerCompletion };
}

// ============================================================
// PART 3 — Stats Accessor (for writer-profile integration)
// ============================================================

/** Get accept rate from the stats ref — call from parent via hook return */
export function getCompletionAcceptRate(accepted: number, dismissed: number): number {
  const total = accepted + dismissed;
  if (total === 0) return 0;
  return accepted / total;
}
