/**
 * rename-engine — Bulk rename engine for Novel Studio.
 *
 * Pure functions for searching and replacing character names / world elements
 * across projects, sessions, messages, configs, and episode scene sheets.
 *
 * Non-destructive: `previewRename` returns match info without mutating.
 * Destructive (via fresh copies): `applyRename` returns new projects/sessions
 * with replacements applied — caller is responsible for persistence.
 *
 * @module rename-engine
 * @example
 * // Dry-run: check what would change
 * const preview = previewRename(projects, sessions, {
 *   from: 'Kairos',
 *   to: 'Kyros',
 *   scope: 'project',
 *   currentProjectId: 'p-123',
 * });
 *
 * if (preview.totalMatches > 0) {
 *   const result = applyRename(projects, sessions, {
 *     from: 'Kairos',
 *     to: 'Kyros',
 *     scope: 'project',
 *     currentProjectId: 'p-123',
 *   });
 *   // Persist result.projects and result.sessions.
 * }
 */

import type { Project, ChatSession } from '@/lib/studio-types';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Types, helpers, regex builders
// ============================================================

export type RenameScope = 'session' | 'project' | 'all';

export interface RenameOptions {
  from: string;
  to: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  scope?: RenameScope;
  /** Scope context: used when scope = 'session' or 'project' */
  currentSessionId?: string | null;
  currentProjectId?: string | null;
}

export interface RenameMatch {
  /** Dotted JSON-ish path e.g. "projects[0].sessions[2].config.characters[0].name" */
  path: string;
  /** Human-readable label e.g. "EP.3 · messages[5].content" */
  label: string;
  /** Snippet of original text (±30 chars around first match) */
  before: string;
  /** Snippet of new text (same window, replaced) */
  after: string;
  /** Number of matches inside this specific field */
  matchCount: number;
}

export interface RenamePreview {
  totalMatches: number;
  matches: RenameMatch[];
}

export interface RenameResult {
  projects: Project[];
  sessions: ChatSession[];
  changedCount: number;
}

/**
 * Escape regex metacharacters so user input is treated literally.
 *
 * @param input Raw user text to escape.
 * @returns Escaped pattern safe to concatenate into a RegExp body.
 * @example
 * escapeRegex('a.b*c') // → 'a\\.b\\*c'
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a regex for the given options. Returns `null` if `from` is empty
 * or if the produced pattern is rejected by the RegExp constructor.
 *
 * `wholeWord` uses `\b` boundaries — only meaningful for ASCII-ish tokens.
 * CJK text lacks word boundaries, so keep `wholeWord=false` for those.
 *
 * @param opts Rename options; only `from`, `wholeWord`, `caseSensitive` are read.
 * @returns Compiled regex or `null`.
 */
export function buildRenameRegex(opts: RenameOptions): RegExp | null {
  const from = opts.from ?? '';
  if (from.length === 0) return null;
  const escaped = escapeRegex(from);
  const body = opts.wholeWord ? `\\b${escaped}\\b` : escaped;
  const flags = opts.caseSensitive ? 'g' : 'gi';
  try {
    return new RegExp(body, flags);
  } catch (err) {
    logger.warn('rename-engine', 'regex build failed', err);
    return null;
  }
}

/** Count regex matches in a string. */
function countMatches(value: string, rx: RegExp): number {
  if (!value) return 0;
  // Clone to avoid lastIndex side-effects when regex is reused.
  const local = new RegExp(rx.source, rx.flags);
  let count = 0;
  while (local.exec(value) !== null) count += 1;
  return count;
}

/** Build a preview snippet pair with actual replacement text. */
function buildSnippetPair(value: string, rx: RegExp, to: string, contextLen = 30): { before: string; after: string } {
  if (!value) return { before: '', after: '' };
  const local = new RegExp(rx.source, rx.flags);
  const match = local.exec(value);
  if (!match) return { before: '', after: '' };
  const start = Math.max(0, match.index - contextLen);
  const end = Math.min(value.length, match.index + match[0].length + contextLen);
  const head = start > 0 ? '…' : '';
  const tail = end < value.length ? '…' : '';
  const beforeSlice = value.slice(start, end);
  const afterSlice = beforeSlice.replace(new RegExp(rx.source, rx.flags), to);
  return { before: head + beforeSlice + tail, after: head + afterSlice + tail };
}

/** Deep clone using structured JSON serialization — safe for POD data in this model. */
function deepClone<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (err) {
    logger.warn('rename-engine', 'deepClone failed', err);
    // Fallback: structuredClone if available, else shallow copy.
    if (typeof structuredClone === 'function') {
      try { return structuredClone(value); } catch { /* fall through */ }
    }
    return value;
  }
}

// IDENTITY_SEAL: PART-1 | role=types+helpers | inputs=opts | outputs=regex+snippets

// ============================================================
// PART 2 — Scope filter + field enumerator
// ============================================================

/** World-level string fields in StoryConfig to scan. */
const WORLD_FIELDS: readonly string[] = [
  'setting', 'synopsis', 'corePremise', 'worldHistory',
  'socialSystem', 'economy', 'magicTechSystem', 'factionRelations',
  'survivalEnvironment', 'culture', 'religion', 'education',
  'lawOrder', 'taboo', 'dailyLife', 'travelComm', 'truthVsBeliefs',
  'powerStructure', 'currentConflict',
];

/**
 * Pick sessions matching scope (session / project / all).
 *
 * @param projects Known projects (used to resolve `scope: 'project'`).
 * @param sessions All sessions — filter applies here.
 * @param opts Rename options; `scope`, `currentSessionId`, `currentProjectId` read.
 * @returns Subset of `sessions` that the operation should touch.
 */
export function filterSessionsForScope(
  projects: Project[],
  sessions: ChatSession[],
  opts: RenameOptions,
): ChatSession[] {
  const scope = opts.scope ?? 'project';
  if (scope === 'all') return sessions;
  if (scope === 'session') {
    if (!opts.currentSessionId) return [];
    return sessions.filter(s => s.id === opts.currentSessionId);
  }
  // project: sessions belonging to currentProjectId
  if (!opts.currentProjectId) return sessions;
  const projectSessionIds = new Set<string>();
  for (const p of projects) {
    if (p.id === opts.currentProjectId) {
      for (const s of p.sessions ?? []) projectSessionIds.add(s.id);
    }
  }
  return sessions.filter(s => projectSessionIds.has(s.id));
}

/** Label helper — compact session tag for UI display. */
function sessionLabel(session: ChatSession): string {
  const ep = session.config?.episode;
  const title = session.config?.title || session.title || '';
  if (ep != null) return `EP.${ep}${title ? ` · ${title}` : ''}`;
  return title || session.id;
}

// IDENTITY_SEAL: PART-2 | role=scope-filter | inputs=projects,sessions,opts | outputs=ChatSession[]

// ============================================================
// PART 3 — previewRename + applyRename
// ============================================================

/** Scan a session for matches (non-mutating). Returns matches for this session. */
function scanSession(session: ChatSession, rx: RegExp, to: string): RenameMatch[] {
  const out: RenameMatch[] = [];
  const label = sessionLabel(session);

  // Session title
  if (session.title) {
    const n = countMatches(session.title, rx);
    if (n > 0) {
      const snap = buildSnippetPair(session.title, rx, to);
      out.push({
        path: `session[${session.id}].title`,
        label: `${label} · title`,
        before: snap.before,
        after: snap.after,
        matchCount: n,
      });
    }
  }

  const cfg = session.config;
  if (!cfg) return out;

  // Characters: name, role, traits
  const chars = cfg.characters ?? [];
  for (let i = 0; i < chars.length; i += 1) {
    const c = chars[i];
    const keys: ('name' | 'role' | 'traits')[] = ['name', 'role', 'traits'];
    for (const k of keys) {
      const v = c?.[k];
      if (typeof v !== 'string' || v.length === 0) continue;
      const n = countMatches(v, rx);
      if (n > 0) {
        const snap = buildSnippetPair(v, rx, to);
        out.push({
          path: `session[${session.id}].config.characters[${i}].${k}`,
          label: `${label} · characters[${c.name || i}].${k}`,
          before: snap.before,
          after: snap.after,
          matchCount: n,
        });
      }
    }
  }

  // Items: name, description
  const items = cfg.items ?? [];
  for (let i = 0; i < items.length; i += 1) {
    const it = items[i];
    const keys: ('name' | 'description')[] = ['name', 'description'];
    for (const k of keys) {
      const v = it?.[k];
      if (typeof v !== 'string' || v.length === 0) continue;
      const n = countMatches(v, rx);
      if (n > 0) {
        const snap = buildSnippetPair(v, rx, to);
        out.push({
          path: `session[${session.id}].config.items[${i}].${k}`,
          label: `${label} · items[${it.name || i}].${k}`,
          before: snap.before,
          after: snap.after,
          matchCount: n,
        });
      }
    }
  }

  // World fields
  const cfgRec = cfg as unknown as Record<string, unknown>;
  for (const key of WORLD_FIELDS) {
    const v = cfgRec[key];
    if (typeof v !== 'string' || v.length === 0) continue;
    const n = countMatches(v, rx);
    if (n > 0) {
      const snap = buildSnippetPair(v, rx, to);
      out.push({
        path: `session[${session.id}].config.${key}`,
        label: `${label} · config.${key}`,
        before: snap.before,
        after: snap.after,
        matchCount: n,
      });
    }
  }

  // Messages
  const messages = session.messages ?? [];
  for (let i = 0; i < messages.length; i += 1) {
    const m = messages[i];
    const v = m?.content;
    if (typeof v !== 'string' || v.length === 0) continue;
    const n = countMatches(v, rx);
    if (n > 0) {
      const snap = buildSnippetPair(v, rx, to);
      out.push({
        path: `session[${session.id}].messages[${i}].content`,
        label: `${label} · messages[${i}]`,
        before: snap.before,
        after: snap.after,
        matchCount: n,
      });
    }
  }

  // Episode scene sheets
  const sheets = cfg.episodeSceneSheets ?? [];
  for (let i = 0; i < sheets.length; i += 1) {
    const sh = sheets[i];
    if (sh?.title) {
      const n = countMatches(sh.title, rx);
      if (n > 0) {
        const snap = buildSnippetPair(sh.title, rx, to);
        out.push({
          path: `session[${session.id}].config.episodeSceneSheets[${i}].title`,
          label: `${label} · sceneSheet[${sh.episode ?? i}].title`,
          before: snap.before,
          after: snap.after,
          matchCount: n,
        });
      }
    }
    const scenes = sh?.scenes ?? [];
    for (let j = 0; j < scenes.length; j += 1) {
      const sc = scenes[j];
      const keys: ('sceneName' | 'summary' | 'keyDialogue' | 'emotionPoint' | 'characters' | 'tone' | 'nextScene')[] =
        ['sceneName', 'summary', 'keyDialogue', 'emotionPoint', 'characters', 'tone', 'nextScene'];
      for (const k of keys) {
        const v = sc?.[k];
        if (typeof v !== 'string' || v.length === 0) continue;
        const n = countMatches(v, rx);
        if (n > 0) {
          const snap = buildSnippetPair(v, rx, to);
          out.push({
            path: `session[${session.id}].config.episodeSceneSheets[${i}].scenes[${j}].${k}`,
            label: `${label} · sceneSheet[${sh.episode ?? i}].scenes[${sc.sceneId || j}].${k}`,
            before: snap.before,
            after: snap.after,
            matchCount: n,
          });
        }
      }
    }
  }

  return out;
}

/**
 * Non-destructive scan — returns a preview of matches without mutating.
 *
 * @param projects Known projects (used for scope resolution).
 * @param sessions All sessions to scan.
 * @param opts Rename options; empty `from` or `from === to` yields empty preview.
 * @returns {@link RenamePreview} with `totalMatches` and per-field `matches`.
 * @example
 * const preview = previewRename(projects, sessions, {
 *   from: '카이로스', to: '카이로르', scope: 'all',
 * });
 * console.log(preview.totalMatches); // → 42
 */
export function previewRename(
  projects: Project[],
  sessions: ChatSession[],
  opts: RenameOptions,
): RenamePreview {
  const rx = buildRenameRegex(opts);
  if (!rx || opts.from === opts.to) return { totalMatches: 0, matches: [] };
  const scoped = filterSessionsForScope(projects, sessions, opts);
  const matches: RenameMatch[] = [];
  let total = 0;
  for (const s of scoped) {
    const found = scanSession(s, rx, opts.to);
    for (const m of found) {
      matches.push(m);
      total += m.matchCount;
    }
  }
  return { totalMatches: total, matches };
}

/** Apply replacement to a single session (returns new session + count). */
function rewriteSession(session: ChatSession, rx: RegExp, to: string): { session: ChatSession; count: number } {
  let count = 0;
  const replaceStr = (v: string | undefined): string | undefined => {
    if (typeof v !== 'string' || v.length === 0) return v;
    const n = countMatches(v, rx);
    if (n === 0) return v;
    count += n;
    return v.replace(new RegExp(rx.source, rx.flags), to);
  };

  const next = deepClone(session);

  if (typeof next.title === 'string') {
    const r = replaceStr(next.title);
    if (typeof r === 'string') next.title = r;
  }

  if (next.config) {
    // Characters
    const chars = next.config.characters;
    if (Array.isArray(chars)) {
      for (const c of chars) {
        if (!c) continue;
        const name = replaceStr(c.name);
        if (typeof name === 'string') c.name = name;
        const role = replaceStr(c.role);
        if (typeof role === 'string') c.role = role;
        const traits = replaceStr(c.traits);
        if (typeof traits === 'string') c.traits = traits;
      }
    }
    // Items
    const items = next.config.items;
    if (Array.isArray(items)) {
      for (const it of items) {
        if (!it) continue;
        const name = replaceStr(it.name);
        if (typeof name === 'string') it.name = name;
        const desc = replaceStr(it.description);
        if (typeof desc === 'string') it.description = desc;
      }
    }
    // World fields
    const cfgRec = next.config as unknown as Record<string, unknown>;
    for (const key of WORLD_FIELDS) {
      const v = cfgRec[key];
      if (typeof v === 'string') {
        const r = replaceStr(v);
        if (typeof r === 'string') cfgRec[key] = r;
      }
    }
    // Episode scene sheets
    const sheets = next.config.episodeSceneSheets;
    if (Array.isArray(sheets)) {
      for (const sh of sheets) {
        if (!sh) continue;
        if (typeof sh.title === 'string') {
          const r = replaceStr(sh.title);
          if (typeof r === 'string') sh.title = r;
        }
        const scenes = sh.scenes;
        if (Array.isArray(scenes)) {
          for (const sc of scenes) {
            if (!sc) continue;
            const keys: ('sceneName' | 'summary' | 'keyDialogue' | 'emotionPoint' | 'characters' | 'tone' | 'nextScene')[] =
              ['sceneName', 'summary', 'keyDialogue', 'emotionPoint', 'characters', 'tone', 'nextScene'];
            for (const k of keys) {
              const v = sc[k];
              if (typeof v === 'string') {
                const r = replaceStr(v);
                if (typeof r === 'string') sc[k] = r;
              }
            }
          }
        }
      }
    }
  }

  // Messages
  const msgs = next.messages;
  if (Array.isArray(msgs)) {
    for (const m of msgs) {
      if (!m) continue;
      if (typeof m.content === 'string') {
        const r = replaceStr(m.content);
        if (typeof r === 'string') m.content = r;
      }
    }
  }

  return { session: next, count };
}

/**
 * Destructive-looking but pure: returns a new `projects` and `sessions` with
 * replacements applied. Original inputs are NOT mutated — a JSON deep-clone
 * is taken per rewritten session. Callers persist the returned arrays.
 *
 * @param projects Known projects (scoping + mirroring).
 * @param sessions All sessions.
 * @param opts Rename options.
 * @returns {@link RenameResult} with new arrays and `changedCount`.
 * @example
 * const { projects: next, sessions: nextSessions, changedCount } =
 *   applyRename(projects, sessions, { from: 'x', to: 'y', scope: 'project' });
 */
export function applyRename(
  projects: Project[],
  sessions: ChatSession[],
  opts: RenameOptions,
): RenameResult {
  const rx = buildRenameRegex(opts);
  if (!rx || opts.from === opts.to) {
    return { projects, sessions, changedCount: 0 };
  }
  const scoped = filterSessionsForScope(projects, sessions, opts);
  const scopedIds = new Set(scoped.map(s => s.id));

  let total = 0;
  const nextSessions: ChatSession[] = sessions.map((s) => {
    if (!scopedIds.has(s.id)) return s;
    const { session: updated, count } = rewriteSession(s, rx, opts.to);
    if (count === 0) return s;
    total += count;
    return updated;
  });

  // Mirror updated sessions into projects[].sessions[] by id.
  const sessionById = new Map<string, ChatSession>();
  for (const s of nextSessions) sessionById.set(s.id, s);
  const nextProjects: Project[] = projects.map((p) => {
    const inner = p.sessions ?? [];
    let mutated = false;
    const newInner = inner.map((s) => {
      const candidate = sessionById.get(s.id);
      if (candidate && candidate !== s) {
        mutated = true;
        return candidate;
      }
      return s;
    });
    if (!mutated) return p;
    return { ...p, sessions: newInner, lastUpdate: Date.now() };
  });

  return { projects: nextProjects, sessions: nextSessions, changedCount: total };
}

// IDENTITY_SEAL: PART-3 | role=preview+apply | inputs=projects,sessions,opts | outputs=RenamePreview|RenameResult
