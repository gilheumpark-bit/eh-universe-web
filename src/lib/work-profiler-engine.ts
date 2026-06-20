/**
 * work-profiler-engine — Work-level profiler aggregation (pure).
 *
 * Consumes `ChatSession[]` and derives tension / quality / pacing /
 * character heatmap / scene density curves across a whole work.
 *
 * - Pure: same input → same output, no side effects.
 * - No DOM, no React, no logger. Deterministic and tree-shakeable.
 * - Defensive: empty or malformed input yields an empty profile rather
 *   than throwing.
 *
 * @module work-profiler-engine
 * @example
 * import { buildProfile, profileToCsv } from '@/lib/work-profiler-engine';
 *
 * const profile = buildProfile(sessions, { sortBy: 'episode' });
 * const csv = profileToCsv(profile);
 */

import type { ChatSession, Message } from './studio-types';

// ============================================================
// PART 1 — public types
// ============================================================

export interface EpisodeMetric {
  episodeId: string;                // session.id
  episodeNumber: number;            // config.episode (fallback: array index+1)
  title: string;
  charCount: number;                // sum of assistant message content lengths
  avgQuality: number;               // 0–100 (from message.meta.eosScore * 100, or derived)
  tension: number;                  // 0–100 (message.meta.metrics.tension * 100)
  pacing: number;                   // 0–100 (message.meta.metrics.pacing * 100)
  dialogueRatio: number;            // 0–1 (quoted span chars / total chars)
  characterAppearances: Record<string, number>; // per-character mention count
  sceneCount: number;               // scenes in EpisodeSceneSheet (if present)
  reviewScore?: number;             // optional genre-review score (0–100)
}

export interface CurvePoint {
  x: number;
  y: number;
}

export interface CharacterHeatmapRow {
  name: string;
  series: number[]; // one value per episode, same order as metrics[]
}

export interface WorkProfile {
  totalEpisodes: number;
  totalCharCount: number;
  avgQualityAcrossWork: number;        // 0–100
  tensionCurve: CurvePoint[];
  qualityCurve: CurvePoint[];
  pacingCurve: CurvePoint[];
  characterHeatmap: CharacterHeatmapRow[];
  sceneDensity: CurvePoint[];
  metrics: EpisodeMetric[];
}

export interface BuildProfileOptions {
  maxEpisodes?: number;             // sampling cap; default 100
  sortBy?: 'episode' | 'date';      // default 'episode'
  characterNames?: string[];        // explicit roster (else derived from config.characters)
}

// ============================================================
// PART 2 — internal helpers (pure, defensive)
// ============================================================

const DIALOGUE_REGEX = /"([^"\n]{0,500})"|\u201C([^\u201C\u201D\n]{0,500})\u201D|\u300C([^\u300C\u300D\n]{0,500})\u300D|\u300E([^\u300E\u300F\n]{0,500})\u300F/g;

/** Escape regex meta for whole-word match. [C] prevents injection crashes. */
function escapeRegex(src: string): string {
  return src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Cache compiled character regexes across a buildProfile run. [G] */
function makeCharRegexCache(names: string[]): Map<string, RegExp> {
  const cache = new Map<string, RegExp>();
  for (const raw of names) {
    const name = (raw ?? '').trim();
    if (!name || cache.has(name)) continue;
    // CJK: agglutinative/no-space — match as substring (particles follow directly).
    // Latin/Cyrillic/etc: word-boundary whole-word match.
    const hasCJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(name);
    const pattern = hasCJK ? escapeRegex(name) : `\\b${escapeRegex(name)}\\b`;
    try {
      cache.set(name, new RegExp(pattern, 'giu'));
    } catch {
      // [C] bad unicode flag on very old engines → fall back to global/i only
      cache.set(name, new RegExp(escapeRegex(name), 'gi'));
    }
  }
  return cache;
}

/**
 * Count whole-word character mentions in `content`.
 *
 * Case-insensitive. For CJK names (Hangul, Kana, Hanzi), uses substring
 * matching because those scripts lack whitespace-bounded word breaks.
 * For Latin/Cyrillic names, uses `\b` word boundaries.
 *
 * @param content Source text to scan. Empty input yields `{}`.
 * @param characterNames Names to count. Trimmed and deduped internally.
 * @returns Map of name → count. Names with zero matches are omitted.
 * @example
 * countCharacterAppearances('Alice met Bob. Alice waved.', ['Alice', 'Bob'])
 * // → { Alice: 2, Bob: 1 }
 */
export function countCharacterAppearances(
  content: string,
  characterNames: string[],
): Record<string, number> {
  const result: Record<string, number> = {};
  if (!content || !characterNames?.length) return result;
  const cache = makeCharRegexCache(characterNames);
  for (const [name, re] of cache) {
    re.lastIndex = 0;
    let count = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      count += 1;
      if (m.index === re.lastIndex) re.lastIndex += 1; // [C] zero-width safety
      if (count > 10_000) break;                        // [C] runaway guard
    }
    if (count > 0) result[name] = count;
  }
  return result;
}

/** Count dialogue chars — supports ASCII ", CJK 「」『』 and smart curly quotes. */
function dialogueCharCount(content: string): number {
  if (!content) return 0;
  DIALOGUE_REGEX.lastIndex = 0;
  let total = 0;
  let m: RegExpExecArray | null;
  while ((m = DIALOGUE_REGEX.exec(content)) !== null) {
    const inner = m[1] ?? m[2] ?? m[3] ?? m[4] ?? '';
    total += inner.length;
    if (m.index === DIALOGUE_REGEX.lastIndex) DIALOGUE_REGEX.lastIndex += 1;
  }
  return total;
}

/** Average of defined numbers; returns 0 when list is empty. */
function safeAvg(values: readonly number[]): number {
  if (!values || values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += Number.isFinite(v) ? v : 0;
  return sum / values.length;
}

/** Clamp 0..1 then scale to 0..100. */
function pct(v: number | undefined | null): number {
  if (v == null || !Number.isFinite(v)) return 0;
  if (v <= 1 && v >= 0) return Math.round(v * 100);
  if (v < 0) return 0;
  if (v > 100) return 100;
  return Math.round(v);
}

/** Even-stride downsample to `max` points while preserving endpoints. [G] */
function sampleArray<T>(arr: T[], max: number): T[] {
  if (arr.length <= max || max <= 0) return arr.slice();
  const out: T[] = [];
  const step = (arr.length - 1) / (max - 1);
  for (let i = 0; i < max; i += 1) {
    const idx = Math.min(arr.length - 1, Math.round(i * step));
    out.push(arr[idx]);
  }
  return out;
}

/** Assistant-only concatenated content of a session (safe on missing messages). */
function assistantText(session: ChatSession): string {
  const messages: Message[] = session.messages ?? [];
  const parts: string[] = [];
  for (const m of messages) {
    if (m.role === 'assistant' && typeof m.content === 'string') parts.push(m.content);
  }
  return parts.join('\n\n');
}

/**
 * Derive per-episode metric — reads the latest assistant message for
 * engine meta (tension/pacing/eos); falls back to 0 when absent.
 */
function sessionToMetric(
  session: ChatSession,
  episodeNumber: number,
  characterNames: string[],
): EpisodeMetric {
  const content = assistantText(session);
  const messages = session.messages ?? [];

  // Pick the *last* assistant message with meta.metrics — most recent grading wins.
  let tension = 0;
  let pacing = 0;
  const qualityScores: number[] = [];
  for (const m of messages) {
    if (m.role !== 'assistant' || !m.meta) continue;
    const metrics = m.meta.metrics;
    if (metrics) {
      tension = pct(metrics.tension);
      pacing = pct(metrics.pacing);
    }
    if (typeof m.meta.eosScore === 'number') qualityScores.push(pct(m.meta.eosScore));
  }

  const sceneSheet = session.config?.episodeSceneSheets?.find(
    (s) => s.episode === episodeNumber,
  );
  const sceneCount = sceneSheet?.scenes?.length ?? 0;

  const dChars = dialogueCharCount(content);
  const dialogueRatio = content.length > 0 ? Math.min(1, dChars / content.length) : 0;

  return {
    episodeId: session.id,
    episodeNumber,
    title: session.title || session.config?.title || `EP ${episodeNumber}`,
    charCount: content.length,
    avgQuality: Math.round(safeAvg(qualityScores)),
    tension,
    pacing,
    dialogueRatio,
    characterAppearances: countCharacterAppearances(content, characterNames),
    sceneCount,
  };
}

// ============================================================
// PART 3 — public API: buildProfile
// ============================================================

/**
 * Build the whole-work profile from a list of sessions.
 *
 * Pure: same input → same output. Safe on empty or partial data.
 *
 * Workflow:
 *   1. Derive character roster (from `opts.characterNames` or session configs)
 *   2. Sort sessions by `episode` (default) or `lastUpdate`
 *   3. Sample up to `opts.maxEpisodes` (default 100) preserving endpoints
 *   4. Compute per-episode metrics → curves + heatmap
 *
 * @param sessions Source sessions — empty array returns an empty profile.
 * @param opts Optional build options.
 * @returns {@link WorkProfile} with curves, heatmap, and per-episode metrics.
 * @example
 * const profile = buildProfile(sessions, { sortBy: 'episode', maxEpisodes: 50 });
 */
export function buildProfile(
  sessions: ChatSession[],
  opts: BuildProfileOptions = {},
): WorkProfile {
  const maxEpisodes = Math.max(1, opts.maxEpisodes ?? 100);
  const sortBy = opts.sortBy ?? 'episode';

  // [C] defensive — empty/undefined input → empty profile
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return {
      totalEpisodes: 0,
      totalCharCount: 0,
      avgQualityAcrossWork: 0,
      tensionCurve: [],
      qualityCurve: [],
      pacingCurve: [],
      characterHeatmap: [],
      sceneDensity: [],
      metrics: [],
    };
  }

  // Derive character roster — prefer explicit opt, else union of session configs.
  const rosterSet = new Set<string>();
  if (opts.characterNames?.length) {
    for (const n of opts.characterNames) {
      const trimmed = (n ?? '').trim();
      if (trimmed) rosterSet.add(trimmed);
    }
  } else {
    for (const s of sessions) {
      for (const c of s.config?.characters ?? []) {
        const trimmed = (c?.name ?? '').trim();
        if (trimmed) rosterSet.add(trimmed);
      }
    }
  }
  const roster = Array.from(rosterSet);

  // Sort BEFORE sampling so endpoints reflect the chosen order.
  const ordered = [...sessions];
  if (sortBy === 'date') {
    ordered.sort((a, b) => (a.lastUpdate ?? 0) - (b.lastUpdate ?? 0));
  } else {
    ordered.sort((a, b) => (a.config?.episode ?? 0) - (b.config?.episode ?? 0));
  }

  // Sampling cap — keep endpoints + even strides.
  const picked = sampleArray(ordered, maxEpisodes);

  const metrics: EpisodeMetric[] = picked.map((s, i) =>
    sessionToMetric(s, s.config?.episode ?? i + 1, roster),
  );

  const tensionCurve: CurvePoint[] = metrics.map((m, i) => ({ x: i + 1, y: m.tension }));
  const qualityCurve: CurvePoint[] = metrics.map((m, i) => ({ x: i + 1, y: m.avgQuality }));
  const pacingCurve: CurvePoint[] = metrics.map((m, i) => ({ x: i + 1, y: m.pacing }));
  const sceneDensity: CurvePoint[] = metrics.map((m, i) => ({ x: i + 1, y: m.sceneCount }));

  const heatmap: CharacterHeatmapRow[] = roster
    .map((name) => ({
      name,
      series: metrics.map((m) => m.characterAppearances[name] ?? 0),
    }))
    // [K] drop characters that never appear — trims empty rows
    .filter((row) => row.series.some((v) => v > 0));

  const totalCharCount = metrics.reduce((acc, m) => acc + m.charCount, 0);
  const avgQualityAcrossWork = Math.round(
    safeAvg(metrics.map((m) => m.avgQuality).filter((v) => v > 0)),
  );

  return {
    totalEpisodes: metrics.length,
    totalCharCount,
    avgQualityAcrossWork,
    tensionCurve,
    qualityCurve,
    pacingCurve,
    characterHeatmap: heatmap,
    sceneDensity,
    metrics,
  };
}

/**
 * Flatten a {@link WorkProfile} into a CSV string.
 *
 * Rows = episodes, columns = metric fields (episode #, title, charCount,
 * tension, pacing, quality, dialogueRatio, sceneCount, reviewScore).
 * UTF-8 safe; values containing commas or newlines are double-quoted
 * with embedded quotes escaped.
 *
 * @param profile Profile to serialize.
 * @returns CSV text, ready to write to disk or pipe to a download.
 */
export function profileToCsv(profile: WorkProfile): string {
  const header = [
    'episode',
    'title',
    'charCount',
    'avgQuality',
    'tension',
    'pacing',
    'dialogueRatio',
    'sceneCount',
  ];
  const escape = (v: string | number): string => {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows = profile.metrics.map((m) =>
    [
      m.episodeNumber,
      escape(m.title),
      m.charCount,
      m.avgQuality,
      m.tension,
      m.pacing,
      m.dialogueRatio.toFixed(3),
      m.sceneCount,
    ].join(','),
  );
  return [header.join(','), ...rows].join('\n');
}
