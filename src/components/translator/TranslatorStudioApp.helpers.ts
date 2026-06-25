import type { ProviderId } from "@/lib/ai-providers";
import { sanitizeLoadedText } from "@/lib/project-sanitize";
import type { ChapterEntry, HistoryEntry, StyleHeuristicAnalysis } from "@/types/translator";

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

export function analyzeTranslatorSourceStyle(source: string): StyleHeuristicAnalysis | null {
  if (!source.trim()) return null;

  const quoteCount = (source.match(/[“"'「『]/g) || []).length;
  const longSentenceCount = source
    .split(/[.!?。！？]/)
    .filter((line) => line.trim().length > 90).length;

  return {
    genre: /마법|검|왕국|황제|용/i.test(source) ? "판타지" : /보고서|가이드|정책/i.test(source) ? "정보형" : "서사형",
    tone: quoteCount >= 6 ? "대사 중심" : longSentenceCount >= 3 ? "문장 밀도 높음" : "균형형",
    metric: {
      fluency: `${Math.min(96, 72 + longSentenceCount * 4)}%`,
      immersion: `${Math.min(95, 68 + quoteCount * 3)}%`,
    },
  };
}
