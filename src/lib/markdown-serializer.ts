// ============================================================
// PART 1 — Imports & Types
// ============================================================

import matter from 'gray-matter';
import type { EpisodeManuscript } from '@/lib/studio-types';

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

  return result;
}

// ============================================================
// PART 3 — File Path Helper
// ============================================================

/**
 * Generate a standardised file path for an episode:
 *   volumes/vol-{XX}/ep-{XXX}.md
 */
export function episodeFilePath(episode: number, volume: number): string {
  const vol = String(volume ?? 1).padStart(2, '0');
  const ep = String(episode ?? 1).padStart(3, '0');
  return `volumes/vol-${vol}/ep-${ep}.md`;
}
