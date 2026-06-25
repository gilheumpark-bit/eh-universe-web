// Helpers for classifying text that arrives faster than normal manual drafting.

export const LARGE_PASTE_NOTICE_CHARS = 100_000;
export const BURST_ABSOLUTE_MIN_CHARS = 500;
export const BURST_RATE_MIN_CHARS = 120;
export const BURST_RATE_WINDOW_MS = 1_500;
export const BURST_RATE_CHARS_PER_SECOND = 60;

export type InputBurstDetection = {
  insertedText: string;
  charsPerSecond: number;
  reason: "large-instant-insert" | "fast-input-burst";
};

export function shouldShowLargePasteNotice(text: string): boolean {
  return text.length > LARGE_PASTE_NOTICE_CHARS;
}

export function extractInsertedText(before: string, after: string): string {
  if (after.length <= before.length) return "";

  let prefix = 0;
  const maxPrefix = Math.min(before.length, after.length);
  while (prefix < maxPrefix && before.charCodeAt(prefix) === after.charCodeAt(prefix)) {
    prefix += 1;
  }

  let suffix = 0;
  const beforeRemaining = before.length - prefix;
  const afterRemaining = after.length - prefix;
  while (
    suffix < beforeRemaining &&
    suffix < afterRemaining &&
    before.charCodeAt(before.length - 1 - suffix) === after.charCodeAt(after.length - 1 - suffix)
  ) {
    suffix += 1;
  }

  return after.slice(prefix, after.length - suffix);
}

export function detectExternalInputBurst(input: {
  before: string;
  after: string;
  elapsedMs: number;
  isComposing: boolean;
}): InputBurstDetection | null {
  if (input.isComposing) return null;

  const insertedText = extractInsertedText(input.before, input.after);
  const insertedChars = insertedText.trim().length;
  if (insertedChars === 0) return null;

  const elapsedMs = Math.max(1, input.elapsedMs);
  const charsPerSecond = Math.round((insertedChars / elapsedMs) * 1000);

  if (insertedChars >= BURST_ABSOLUTE_MIN_CHARS) {
    return { insertedText, charsPerSecond, reason: "large-instant-insert" };
  }

  if (
    insertedChars >= BURST_RATE_MIN_CHARS &&
    elapsedMs <= BURST_RATE_WINDOW_MS &&
    charsPerSecond >= BURST_RATE_CHARS_PER_SECOND
  ) {
    return { insertedText, charsPerSecond, reason: "fast-input-burst" };
  }

  return null;
}

