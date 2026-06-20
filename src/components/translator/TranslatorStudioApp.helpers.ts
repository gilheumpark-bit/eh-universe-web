import type { ProviderId } from "@/lib/ai-providers";
import { sanitizeLoadedText } from "@/lib/project-sanitize";
import type { ChapterEntry, HistoryEntry } from "@/types/translator";

export const AI_STORE_PROVIDER_IDS = new Set<ProviderId>([
  "gemini",
  "openai",
  "claude",
  "groq",
  "mistral",
  "ollama",
  "lmstudio",
]);

export const TRANSLATOR_API_BANNER_DISMISSED_KEY = "eh_translator_api_banner_dismissed";

export function isTranslationChapterComplete(chapter: Partial<ChapterEntry>): boolean {
  return Boolean(chapter.isDone || (chapter.result || chapter.resultMarket || chapter.resultFaithful || "").trim().length > 0);
}

export function sanitizeTranslatorText(value: unknown): string {
  return typeof value === "string" ? sanitizeLoadedText(value) : "";
}

export function sanitizeTranslatorChapter(chapter: ChapterEntry): ChapterEntry {
  return {
    ...chapter,
    name: sanitizeLoadedText(chapter.name),
    content: sanitizeLoadedText(chapter.content),
    result: sanitizeLoadedText(chapter.result),
    resultFaithful: typeof chapter.resultFaithful === "string"
      ? sanitizeLoadedText(chapter.resultFaithful)
      : chapter.resultFaithful,
    resultMarket: typeof chapter.resultMarket === "string"
      ? sanitizeLoadedText(chapter.resultMarket)
      : chapter.resultMarket,
    storyNote: typeof chapter.storyNote === "string"
      ? sanitizeLoadedText(chapter.storyNote)
      : chapter.storyNote,
    error: typeof chapter.error === "string"
      ? sanitizeLoadedText(chapter.error)
      : chapter.error,
  };
}

export function sanitizeTranslatorHistory(history: HistoryEntry[]): HistoryEntry[] {
  return history.map((entry) => ({
    ...entry,
    source: sanitizeLoadedText(entry.source),
    result: sanitizeLoadedText(entry.result),
  }));
}

export function estimateChunkFormStability(sourceText: string, translatedText: string): number {
  const source = sourceText.trim();
  const translated = translatedText.trim();
  if (!source || !translated) return 0;
  const sourceLen = source.length || 1;
  const ratio = translated.length / sourceLen;
  const lengthScore = Math.min(1, Math.max(0, 1 - Math.abs(1 - ratio) * 0.3));
  const sourceParagraphs = source.split(/\n\s*\n/).filter((part) => part.trim().length > 0).length;
  const translatedParagraphs = translated.split(/\n\s*\n/).filter((part) => part.trim().length > 0).length;
  const paragraphScore =
    sourceParagraphs <= 1
      ? 1
      : Math.min(1, Math.max(0, 1 - Math.abs(sourceParagraphs - translatedParagraphs) / sourceParagraphs));
  return Math.min(1, Math.max(0, lengthScore * 0.7 + paragraphScore * 0.3));
}
