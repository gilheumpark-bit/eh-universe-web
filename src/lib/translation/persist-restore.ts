import type { StoryConfig, TranslatedManuscriptEntry } from '@/lib/studio-types';

export const SEG_JOIN = '\n\n';

function splitStoredContent(content: string): { ko: string }[] {
  const lines = content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const out: { ko: string }[] = [];
  for (const line of lines) {
    const sentences = line.match(/[^.!?…。！？]+[.!?…。！？]*["”』」]?|[^.!?…。！？]+$/g) || [line];
    for (const raw of sentences) {
      const text = raw.trim();
      if (text) out.push({ ko: text });
    }
  }
  return out;
}

export function mapStoredToSegments(
  storedContent: string,
  boundaries: { id: string; len: number }[] | undefined,
  segIds: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!storedContent || segIds.length === 0) return out;

  if (boundaries && boundaries.length > 0) {
    const segIdSet = new Set(segIds);
    const expectedLen =
      boundaries.reduce((sum, boundary) => sum + boundary.len, 0) + SEG_JOIN.length * (boundaries.length - 1);
    const allKnown = boundaries.every((boundary) => segIdSet.has(boundary.id));
    if (allKnown && expectedLen === storedContent.length) {
      let cursor = 0;
      for (let boundaryIndex = 0; boundaryIndex < boundaries.length; boundaryIndex += 1) {
        const boundary = boundaries[boundaryIndex];
        const txt = storedContent.slice(cursor, cursor + boundary.len);
        if (txt) out[boundary.id] = txt;
        cursor += boundary.len + SEG_JOIN.length;
      }
      return out;
    }
  }

  const pieces = splitStoredContent(storedContent);
  const lastIndex = segIds.length - 1;
  segIds.forEach((id, index) => {
    const text =
      index === lastIndex
        ? pieces
            .slice(index)
            .map((piece) => piece.ko)
            .filter(Boolean)
            .join(' ')
        : pieces[index]?.ko;
    if (text) out[id] = text;
  });
  return out;
}

export function upsertTranslatedEntry(args: {
  prev: StoryConfig;
  episode: number;
  title: string;
  targetLang: 'EN' | 'JP' | 'CN';
  ordered: { id: string; txt: string }[];
  avgScore?: number | null;
  glossary: { source: string; target: string; locked?: boolean }[];
  dirty: boolean;
  now?: number;
}): TranslatedManuscriptEntry[] | null {
  const { prev, episode, title, targetLang, ordered, avgScore, glossary, dirty } = args;
  const list = prev.translatedManuscripts ?? [];
  const entryIndex = list.findIndex((entry) => entry.episode === episode && entry.targetLang === targetLang);
  if (ordered.length === 0) {
    if (entryIndex < 0) return null;
    return list.filter((_, index) => index !== entryIndex);
  }

  const hasManuscript = (prev.manuscripts ?? []).some((manuscript) => manuscript.episode === episode);
  if (!hasManuscript) return null;

  const translatedContent = ordered.map((item) => item.txt).join(SEG_JOIN);
  const segmentBoundaries = ordered.map((item) => ({ id: item.id, len: item.txt.length }));
  const translationConfig = prev.translationConfig;
  const prevEntry = entryIndex >= 0 ? list[entryIndex] : undefined;
  const now = args.now ?? Date.now();
  const resetSignoff = dirty || !prevEntry;

  const entry: TranslatedManuscriptEntry = {
    episode,
    sourceLang: 'KO',
    targetLang,
    mode: translationConfig?.mode ?? 'fidelity',
    translatedTitle: title,
    translatedContent,
    charCount: translatedContent.length,
    avgScore: avgScore ?? 0,
    band: translationConfig?.band ?? 0.5,
    glossarySnapshot: (translationConfig?.glossary ?? glossary).map((term) => ({
      source: term.source,
      target: term.target,
      locked: !!term.locked,
    })),
    segmentBoundaries,
    lastUpdate: resetSignoff ? now : prevEntry.lastUpdate,
    faithfulApproved: resetSignoff ? undefined : prevEntry.faithfulApproved,
    marketApproved: resetSignoff ? undefined : prevEntry.marketApproved,
    approvedAt: resetSignoff ? undefined : prevEntry.approvedAt,
  };

  return entryIndex >= 0
    ? list.map((existingEntry, index) => (index === entryIndex ? entry : existingEntry))
    : [...list, entry];
}
