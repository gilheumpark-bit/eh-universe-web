// ============================================================
// twentyone-modules/glossary-extractor.ts
// — M4 Glossary Index business logic.
//
// Responsibilities:
//   - createGlossaryEntry:        attach ID, timestamps, status='candidate'
//   - findCollisions:              detect name/alias overlap with existing entries
//   - approveCandidate:            status: candidate → approved
//   - runGlossarySurfaceFormCheck: Compliance hook — forbidden surface form scan
//   - extractCandidates:           deterministic marker extractor (concrete NER deferred to Phase 4 / R2)
//
// Phase 2 Step 1 scope: schema + pure logic + deterministic marker extraction.
// Phase 4 (R2 research): replace marker extractor with KoBERT fine-tuned classifier.
// ============================================================

import type {
  GlossaryEntry,
  GlossaryEntityType,
  SpoilerTier,
  ExtractionResult,
} from './types';
import type { ComplianceFinding, Severity } from './severity-router';

// ============================================================
// PART 1 — ULID helper
// ============================================================

let ulidCounter = 0;
function makeUlid(): string {
  ulidCounter += 1;
  return `gl-${Date.now().toString(36)}-${ulidCounter.toString(36).padStart(4, '0')}`;
}

// ============================================================
// PART 2 — Create candidate
// ============================================================

export interface CreateGlossaryEntryInput {
  work_id: string;
  canonical_name: string;
  aliases?: string[];
  entity_type: GlossaryEntityType;
  source: 'auto_extracted' | 'manual' | 'imported';
  confidence?: number;
  spoiler_tier?: SpoilerTier;
  first_appearance_planned?: number | null;
}

export function createGlossaryEntry(input: CreateGlossaryEntryInput): GlossaryEntry {
  const now = new Date().toISOString();
  return {
    id: makeUlid(),
    work_id: input.work_id,
    schema_version: '1.0.0',
    created_at: now,
    updated_at: now,
    canonical_name: input.canonical_name,
    aliases: input.aliases ?? [],
    entity_type: input.entity_type,
    status: 'candidate',
    source: input.source,
    confidence: input.confidence ?? (input.source === 'manual' ? 1 : 0),
    spoiler_tier: input.spoiler_tier ?? 'public',
    first_appearance_planned: input.first_appearance_planned ?? null,
    first_appearance_actual: null,
    occurrence_count: 0,
    last_seen_episode: null,
    forbidden_surface_forms: [],
    approved_at: null,
    approved_by: null,
  };
}

// ============================================================
// PART 3 — Collision detection
// ============================================================

export interface Collision {
  existing: GlossaryEntry;
  new: Partial<GlossaryEntry>;
  similarity: number;
}

/**
 * Simple name/alias overlap detection.
 *
 * similarity heuristic:
 *   1.0 — canonical_name exact match (ignoring case)
 *   0.8 — canonical_name appears in existing aliases (or vice-versa)
 *   0.5 — any alias overlap
 *   < threshold: not considered a collision
 */
export function findCollisions(
  candidate: Partial<GlossaryEntry>,
  existing: readonly GlossaryEntry[],
  threshold = 0.5,
): Collision[] {
  if (!candidate.canonical_name) return [];
  const candName = candidate.canonical_name.toLowerCase();
  const candAliases = new Set((candidate.aliases ?? []).map((a) => a.toLowerCase()));

  const collisions: Collision[] = [];
  for (const existing_entry of existing) {
    const exName = existing_entry.canonical_name.toLowerCase();
    const exAliases = new Set(existing_entry.aliases.map((a) => a.toLowerCase()));

    let similarity = 0;
    if (exName === candName) {
      similarity = 1.0;
    } else if (exAliases.has(candName) || candAliases.has(exName)) {
      similarity = 0.8;
    } else {
      // Alias overlap
      const overlap = [...candAliases].filter((a) => exAliases.has(a));
      if (overlap.length > 0) similarity = 0.5;
    }

    if (similarity >= threshold) {
      collisions.push({ existing: existing_entry, new: candidate, similarity });
    }
  }
  return collisions;
}

// ============================================================
// PART 4 — Approve candidate
// ============================================================

/**
 * Approve a candidate entry — sets status='approved' and approval metadata.
 * Returns a new entry (immutable) — does not mutate input.
 */
export function approveCandidate(entry: GlossaryEntry, approvedBy: 'author' = 'author'): GlossaryEntry {
  if (entry.status !== 'candidate') {
    throw new Error(`Cannot approve entry with status='${entry.status}'`);
  }
  const now = new Date().toISOString();
  return {
    ...entry,
    status: 'approved',
    approved_at: now,
    approved_by: approvedBy,
    updated_at: now,
  };
}

// ============================================================
// PART 5 — Compliance hook: glossary-surface-form
// ============================================================

export interface GlossarySurfaceFormCheckInput {
  manuscript: string;
  entries: readonly GlossaryEntry[];
  current_episode: number;
}

/**
 * Scan manuscript for forbidden surface forms (typos, non-canonical variants).
 * Emits warning per match — but only for approved entries.
 */
export function runGlossarySurfaceFormCheck(
  input: GlossarySurfaceFormCheckInput,
): ComplianceFinding[] {
  const { manuscript, entries, current_episode } = input;
  const findings: ComplianceFinding[] = [];

  for (const entry of entries) {
    if (entry.status !== 'approved' && entry.status !== 'locked') continue;
    for (const forbidden of entry.forbidden_surface_forms) {
      if (forbidden.length === 0) continue;
      if (manuscript.includes(forbidden)) {
        findings.push({
          hook_id: 'glossary-surface-form',
          module_id: 'M4',
          severity: 'warning' as Severity,
          message: `Forbidden surface form "${forbidden}" appears in episode ${current_episode}. Canonical: "${entry.canonical_name}"`,
          evidence: { forbidden, canonical: entry.canonical_name, entry_id: entry.id },
          suggested_fix: `Replace "${forbidden}" with "${entry.canonical_name}".`,
          episode: current_episode,
        });
      }
    }
  }
  return findings;
}

// ============================================================
// PART 6 — Candidate extraction (Phase 4 / R2 research replacement target)
// ============================================================

/**
 * Extract glossary candidates from manuscript via deterministic inline markers.
 *
 * Phase 2 Step 1: recognizes [[CanonicalName]] or [[Name|alias1|alias2]] markers.
 * Phase 4 (R2 research): replaced with KoBERT fine-tuned NER + Aho-Corasick.
 *
 * Always returns a valid ExtractionResult shape so downstream UI is unblocked.
 */
export async function extractCandidates(
  manuscript: string,
  _existing: readonly GlossaryEntry[],
): Promise<ExtractionResult> {
  const start = Date.now();
  // Phase 4 (R2): replace this marker extractor with actual NER pipeline.
  // For now: detect simple bracket-marker patterns so UI can be exercised
  // end-to-end without DGX RPC.
  //
  // Pattern: [[CanonicalName]] or [[Name|alias1|alias2]]
  const re = /\[\[([^\]|]{1,60})(?:\|([^\]]{1,200}))?\]\]/g;
  const candidates: GlossaryEntry[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(manuscript)) !== null) {
    const name = match[1].trim();
    if (seen.has(name) || name.length === 0) continue;
    seen.add(name);
    const aliases = match[2] ? match[2].split('|').map((a) => a.trim()).filter(Boolean) : [];
    candidates.push(createGlossaryEntry({
      work_id: '',  // caller sets work_id at registration
      canonical_name: name,
      aliases,
      entity_type: 'person',  // default; auto-classifier in Phase 4
      source: 'auto_extracted',
      confidence: 0.6,
    }));
  }

  return {
    candidates,
    collisions: [],  // populated by findCollisions at registration time
    total_scanned_chars: manuscript.length,
    duration_ms: Date.now() - start,
  };
}
