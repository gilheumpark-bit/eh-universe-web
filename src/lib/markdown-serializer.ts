// ============================================================
// PART 1 — Imports & Types
// ============================================================

import matter from 'gray-matter';
import type { EpisodeManuscript, TranslatedManuscriptEntry, AppLanguage } from '@/lib/studio-types';

/** Frontmatter shape stored in the YAML header of each .md file. */
interface EpisodeFrontmatter {
  id: string;
  title: string;
  episode: number;
  volume?: number;
  charCount: number;
  summary?: string;
  detailedSummary?: string;
  tags?: string[];
  createdAt?: string;
  lastUpdate?: string;
}

// ============================================================
// PART 2 — Episode <-> Markdown Conversion
// ============================================================

/**
 * Convert an EpisodeManuscript to a Markdown file with YAML frontmatter.
 *
 * Frontmatter includes: id (ep-XXX), title, summary, detailedSummary,
 * episode, volume, charCount, tags, createdAt.
 * Body is the raw manuscript content.
 */
export function episodeToMarkdown(
  manuscript: EpisodeManuscript,
  volume?: number,
): string {
  if (!manuscript) return '';

  const ep = manuscript.episode ?? 1;
  const vol = volume ?? manuscript.volume ?? 1;

  const frontmatter: EpisodeFrontmatter = {
    id: `ep-${String(ep).padStart(3, '0')}`,
    title: manuscript.title || `Episode ${ep}`,
    episode: ep,
    volume: vol,
    charCount: manuscript.charCount ?? manuscript.content?.length ?? 0,
  };

  if (manuscript.summary) {
    frontmatter.summary = manuscript.summary;
  }
  if (manuscript.detailedSummary) {
    frontmatter.detailedSummary = manuscript.detailedSummary;
  }
  if (manuscript.lastUpdate) {
    frontmatter.lastUpdate = new Date(manuscript.lastUpdate).toISOString();
  }
  // Preserve sha for conflict detection round-trip
  if (manuscript.sha) {
    (frontmatter as unknown as Record<string, unknown>).sha = manuscript.sha;
  }

  const body = manuscript.content ?? '';

  return matter.stringify(body, frontmatter);
}

/**
 * Parse a Markdown file with YAML frontmatter back to an EpisodeManuscript.
 *
 * Handles missing fields gracefully:
 * - episode defaults to 1
 * - charCount defaults to content.length
 * - title defaults to filename or 'Untitled'
 */
export function markdownToEpisode(
  markdown: string,
  filePath?: string,
): EpisodeManuscript {
  if (!markdown || typeof markdown !== 'string') {
    return {
      episode: 1,
      title: 'Untitled',
      content: '',
      charCount: 0,
      lastUpdate: Date.now(),
    };
  }

  const { data, content } = matter(markdown);
  const fm = data as Partial<EpisodeFrontmatter>;

  const trimmedContent = content.trim();

  // Derive title from frontmatter, or filename, or default
  let title = fm.title ?? '';
  if (!title && filePath) {
    const segments = filePath.replace(/\\/g, '/').split('/');
    const filename = segments[segments.length - 1] ?? '';
    title = filename.replace(/\.md$/i, '');
  }
  if (!title) title = 'Untitled';

  const episode = typeof fm.episode === 'number' ? fm.episode : 1;
  const charCount =
    typeof fm.charCount === 'number' ? fm.charCount : trimmedContent.length;

  const lastUpdate = fm.lastUpdate
    ? new Date(fm.lastUpdate).getTime()
    : Date.now();

  const result: EpisodeManuscript = {
    episode,
    title,
    content: trimmedContent,
    charCount,
    lastUpdate,
  };

  if (fm.summary) result.summary = fm.summary;
  if (fm.detailedSummary) result.detailedSummary = fm.detailedSummary;
  if (fm.volume !== undefined) result.volume = fm.volume;
  if (filePath) result.filePath = filePath;
  // Restore sha from frontmatter for conflict detection
  const rawSha = (data as Record<string, unknown>).sha;
  if (typeof rawSha === 'string') result.sha = rawSha;

  return result;
}

// ============================================================
// PART 3 — File Path Helper
// ============================================================

/**
 * Generate a standardised file path for an episode.
 *
 * 원본(KO): `volumes/vol-{XX}/ep-{XXX}.md`
 * 번역본:   `translations/{lang}/volumes/vol-{XX}/ep-{XXX}.md`
 *
 * @param episode   에피소드 번호 (1-based)
 * @param volume    볼륨 번호 (1-based)
 * @param targetLang 번역본 언어 코드 ('EN'|'JP'|'CN'|'KO' or lowercase). 'ko'/undefined면 원본 경로.
 */
export function episodeFilePath(episode: number, volume: number, targetLang?: string): string {
  const vol = String(volume ?? 1).padStart(2, '0');
  const ep = String(episode ?? 1).padStart(3, '0');
  const lang = (targetLang ?? '').toLowerCase();
  if (lang && lang !== 'ko') {
    return `translations/${lang}/volumes/vol-${vol}/ep-${ep}.md`;
  }
  return `volumes/vol-${vol}/ep-${ep}.md`;
}

// ============================================================
// PART 4 — Translated Manuscript <-> Markdown
// ============================================================

/** Frontmatter shape for a translated episode. Distinct from EpisodeFrontmatter. */
interface TranslatedEpisodeFrontmatter {
  id: string;                                            // ep-XXX
  episode: number;
  volume?: number;
  sourceLang: AppLanguage;
  targetLang: 'EN' | 'JP' | 'CN' | 'KO';
  mode: 'fidelity' | 'experience';
  title: string;                                         // translatedTitle
  charCount: number;
  avgScore: number;                                      // 0~1
  band: number;                                          // 0.480~0.520
  lastUpdate?: string;
  glossary?: { source: string; target: string; locked: boolean }[];
}

/**
 * Convert a TranslatedManuscriptEntry to a Markdown file with YAML frontmatter.
 * Body is the `translatedContent`.
 */
export function translatedManuscriptToMarkdown(entry: TranslatedManuscriptEntry): string {
  if (!entry) return '';
  const ep = entry.episode ?? 1;
  const frontmatter: TranslatedEpisodeFrontmatter = {
    id: `ep-${String(ep).padStart(3, '0')}`,
    episode: ep,
    sourceLang: entry.sourceLang,
    targetLang: entry.targetLang,
    mode: entry.mode,
    title: entry.translatedTitle || `Episode ${ep}`,
    charCount: entry.charCount ?? entry.translatedContent?.length ?? 0,
    avgScore: entry.avgScore ?? 0,
    band: entry.band ?? 0.5,
  };
  if (entry.glossarySnapshot && entry.glossarySnapshot.length > 0) {
    frontmatter.glossary = entry.glossarySnapshot;
  }
  if (entry.lastUpdate) {
    frontmatter.lastUpdate = new Date(entry.lastUpdate).toISOString();
  }
  const body = entry.translatedContent ?? '';
  return matter.stringify(body, frontmatter);
}

/**
 * Parse a translation Markdown file back to TranslatedManuscriptEntry.
 * Returns null if frontmatter lacks `targetLang` (i.e. not a translation file).
 */
export function markdownToTranslatedManuscript(
  markdown: string,
  filePath?: string,
): TranslatedManuscriptEntry | null {
  if (!markdown || typeof markdown !== 'string') return null;
  const { data, content } = matter(markdown);
  const fm = data as Partial<TranslatedEpisodeFrontmatter>;

  // translation 파일 식별: frontmatter의 targetLang 존재가 기준.
  // 혹시 frontmatter에 없을 경우 filePath prefix로 보조 식별.
  let targetLang = fm.targetLang;
  if (!targetLang && filePath) {
    const m = filePath.replace(/\\/g, '/').match(/^translations\/([a-z]+)\//i);
    if (m) targetLang = m[1].toUpperCase() as TranslatedManuscriptEntry['targetLang'];
  }
  if (!targetLang) return null;

  const episode = typeof fm.episode === 'number' ? fm.episode : 1;
  const body = content.trim();

  const lastUpdate = fm.lastUpdate ? new Date(fm.lastUpdate).getTime() : Date.now();

  const entry: TranslatedManuscriptEntry = {
    episode,
    sourceLang: (fm.sourceLang ?? 'KO') as AppLanguage,
    targetLang,
    mode: (fm.mode === 'experience' ? 'experience' : 'fidelity'),
    translatedTitle: fm.title ?? `Episode ${episode}`,
    translatedContent: body,
    charCount: typeof fm.charCount === 'number' ? fm.charCount : body.length,
    avgScore: typeof fm.avgScore === 'number' ? fm.avgScore : 0,
    band: typeof fm.band === 'number' ? fm.band : 0.5,
    lastUpdate,
  };
  if (Array.isArray(fm.glossary)) entry.glossarySnapshot = fm.glossary;
  return entry;
}
