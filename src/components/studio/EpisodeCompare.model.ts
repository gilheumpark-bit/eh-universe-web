import type { EngineReport } from "@/engine/types";
import type { AppLanguage, Message } from "@/lib/studio-types";

export interface Props {
  messages: Message[];
  language: AppLanguage;
}

export interface EpMetric {
  index: number;
  grade: string;
  tension: number;
  pacing: number;
  immersion: number;
  eos: number;
  charCount: number;
  dialogueRatio: number;
  avgSentenceLen: number;
}

export interface ParaAnalysis {
  text: string;
  tension: number;
  pacing: number;
  isDialogue: boolean;
}

export interface DrilldownData {
  index: number;
  fullText: string;
  paragraphs: ParaAnalysis[];
  longestSentence: string;
  shortestSentence: string;
  highDialogueParagraphIdx: number;
}

export const MAX_COMPARE = 4;

export const METRIC_KEYS = ["tension", "pacing", "immersion", "eos"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export const METRIC_COLORS: Record<MetricKey, string> = {
  tension: "#ef4444",
  pacing: "#3b82f6",
  immersion: "#22c55e",
  eos: "#a855f7",
};

export const METRIC_LABELS: Record<MetricKey, string> = {
  tension: "TEN",
  pacing: "PAC",
  immersion: "IMM",
  eos: "EOS",
};

export const COMPARE_PALETTE = ["#f59e0b", "#06b6d4", "#ec4899", "#84cc16"];

export function extractEpMetrics(messages: Message[]): EpMetric[] {
  const metrics: EpMetric[] = [];
  let idx = 0;

  for (const msg of messages) {
    if (msg.role !== "assistant" || !msg.content) continue;
    idx++;
    const report = msg.meta?.engineReport as EngineReport | undefined;
    const text = msg.content;

    const lines = text.split("\n").filter((line) => line.trim());
    const dialogueLines = lines.filter((line) => /^[\s]*["「『—]/.test(line));
    const dialogueRatio =
      lines.length > 0 ? Math.round((dialogueLines.length / lines.length) * 100) : 0;

    const sentences = text.split(/[.!?。！？]+/).filter((sentence) => sentence.trim().length > 2);
    const avgSentenceLen =
      sentences.length > 0
        ? Math.round(
            sentences.reduce((sum, sentence) => sum + sentence.trim().length, 0) / sentences.length,
          )
        : 0;

    metrics.push({
      index: idx,
      grade: report?.grade || "—",
      tension: report?.metrics?.tension ?? 0,
      pacing: report?.metrics?.pacing ?? 0,
      immersion: report?.metrics?.immersion ?? 0,
      eos: report?.eosScore ?? 0,
      charCount: text.length,
      dialogueRatio,
      avgSentenceLen,
    });
  }

  return metrics;
}

export function extractDrilldown(messages: Message[], targetIdx: number): DrilldownData | null {
  let idx = 0;

  for (const msg of messages) {
    if (msg.role !== "assistant" || !msg.content) continue;
    idx++;
    if (idx !== targetIdx) continue;

    const text = msg.content;
    const rawParas = text.split(/\n\n+/).filter((paragraph) => paragraph.trim().length > 0);

    const paragraphs: ParaAnalysis[] = rawParas.map((paragraph) => {
      const lines = paragraph.split("\n").filter((line) => line.trim());
      const dialogueLines = lines.filter((line) => /^[\s]*["「『—]/.test(line));
      const isDialogue = dialogueLines.length > lines.length * 0.5;
      const sentences = paragraph
        .split(/[.!?。！？]+/)
        .filter((sentence) => sentence.trim().length > 2);
      const lengths = sentences.map((sentence) => sentence.trim().length);
      const avgLen =
        lengths.length > 0 ? lengths.reduce((total, length) => total + length, 0) / lengths.length : 0;
      const variance =
        lengths.length > 1
          ? Math.sqrt(lengths.reduce((sum, length) => sum + (length - avgLen) ** 2, 0) / lengths.length)
          : 0;
      const tension = Math.min(100, Math.round((variance / Math.max(avgLen, 1)) * 100));
      const pacing = isDialogue
        ? Math.min(100, 60 + dialogueLines.length * 10)
        : Math.min(100, Math.round(30 + lines.length * 5));
      return { text: paragraph, tension, pacing, isDialogue };
    });

    const allSentences = text
      .split(/[.!?。！？]+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 5);
    const longestSentence =
      allSentences.length > 0
        ? allSentences.reduce((a, b) => (a.length >= b.length ? a : b))
        : "";
    const shortestSentence =
      allSentences.length > 0
        ? allSentences.reduce((a, b) => (a.length <= b.length ? a : b))
        : "";

    let highDialogueParagraphIdx = 0;
    let maxDialogueRatio = 0;
    paragraphs.forEach((paragraph, index) => {
      const lines = paragraph.text.split("\n").filter((line) => line.trim());
      const dialogueLines = lines.filter((line) => /^[\s]*["「『—]/.test(line));
      const ratio = lines.length > 0 ? dialogueLines.length / lines.length : 0;
      if (ratio > maxDialogueRatio) {
        maxDialogueRatio = ratio;
        highDialogueParagraphIdx = index;
      }
    });

    return {
      index: targetIdx,
      fullText: text,
      paragraphs,
      longestSentence,
      shortestSentence,
      highDialogueParagraphIdx,
    };
  }

  return null;
}
