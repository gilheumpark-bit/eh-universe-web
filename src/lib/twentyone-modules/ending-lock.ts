// ============================================================
// twentyone-modules/ending-lock.ts
// — M2 Ending Lock business logic.
//
// Responsibilities:
//   - createEndingLock(input):     attach validation_hash, ID, timestamps
//   - verifyEndingLock(lock):      detect tampering (hash mismatch)
//   - runEndingMatchCheck(...):    Compliance hook — emit finding if manuscript
//                                  contradicts a hard-locked ending
//
// Trade-secret guard: no rule pack data here — pure schema logic.
// Isolation §1: imports computeSha256Hex from creative-process (single-direction).
// ============================================================

import { computeSha256Hex } from '@/lib/creative-process/source-recorder';
import type { EndingLock } from './types';
import type { ComplianceFinding, Severity } from './severity-router';

// ============================================================
// PART 1 — ULID helper (no external dep, deterministic-ish)
// ============================================================

let ulidCounter = 0;
function makeUlid(): string {
  ulidCounter += 1;
  return `el-${Date.now().toString(36)}-${ulidCounter.toString(36).padStart(4, '0')}`;
}

// ============================================================
// PART 2 — Hash computation (canonical JSON form)
// ============================================================

/**
 * Canonical JSON of lock fields used for tamper-detection hash.
 * Excludes mutable runtime metadata (updated_at, locked_at, attestation_seal).
 */
function canonicalHashInput(lock: Omit<EndingLock, 'validation_hash'>): string {
  const stable = {
    work_id: lock.work_id,
    final_chapter_number: lock.final_chapter_number,
    final_image: lock.final_image,
    protagonist_final_state: lock.protagonist_final_state,
    world_final_state: lock.world_final_state,
    theme_resolution: lock.theme_resolution,
    must_payoffs: [...lock.must_payoffs].sort(),
    banned_reversals: [...lock.banned_reversals].sort(),
    lock_level: lock.lock_level,
    hea_guaranteed: lock.hea_guaranteed ?? null,
    hfn_guaranteed: lock.hfn_guaranteed ?? null,
    dark_ending_warning: lock.dark_ending_warning ?? null,
    cp_pairing_lock: lock.cp_pairing_lock ?? null,
    cultivation_realm_final: lock.cultivation_realm_final ?? null,
    isekai_purpose_achieved: lock.isekai_purpose_achieved ?? null,
  };
  return JSON.stringify(stable);
}

/** Compute SHA-256 validation hash for an EndingLock (excluding the hash field itself). */
export async function computeEndingLockHash(
  lock: Omit<EndingLock, 'validation_hash'>,
): Promise<string> {
  return computeSha256Hex(canonicalHashInput(lock));
}

// ============================================================
// PART 3 — Create / verify
// ============================================================

export interface CreateEndingLockInput {
  work_id: string;
  final_chapter_number: number | null;
  final_image: string;
  protagonist_final_state: EndingLock['protagonist_final_state'];
  world_final_state: string;
  theme_resolution: string;
  must_payoffs: string[];
  banned_reversals: string[];
  lock_level: 'soft' | 'hard';
  locked_by: 'author' | 'ai_suggested';

  // Optional Tier B
  hea_guaranteed?: boolean;
  hfn_guaranteed?: boolean;
  dark_ending_warning?: boolean;
  cp_pairing_lock?: EndingLock['cp_pairing_lock'];
  cultivation_realm_final?: string;
  isekai_purpose_achieved?: boolean;
  attestation_seal?: string;
}

/**
 * Build a complete EndingLock from input. Assigns ID, timestamps, computes hash.
 */
export async function createEndingLock(input: CreateEndingLockInput): Promise<EndingLock> {
  const now = new Date().toISOString();
  const base = {
    id: makeUlid(),
    work_id: input.work_id,
    schema_version: '1.0.0' as const,
    created_at: now,
    updated_at: now,
    final_chapter_number: input.final_chapter_number,
    final_image: input.final_image,
    protagonist_final_state: input.protagonist_final_state,
    world_final_state: input.world_final_state,
    theme_resolution: input.theme_resolution,
    must_payoffs: input.must_payoffs,
    banned_reversals: input.banned_reversals,
    hea_guaranteed: input.hea_guaranteed,
    hfn_guaranteed: input.hfn_guaranteed,
    dark_ending_warning: input.dark_ending_warning,
    cp_pairing_lock: input.cp_pairing_lock,
    cultivation_realm_final: input.cultivation_realm_final,
    isekai_purpose_achieved: input.isekai_purpose_achieved,
    lock_level: input.lock_level,
    locked_at: now,
    locked_by: input.locked_by,
    attestation_seal: input.attestation_seal,
  };
  const validation_hash = await computeEndingLockHash(base);
  return { ...base, validation_hash };
}

/**
 * Verify an EndingLock's validation_hash matches its content.
 * Returns true if untampered, false otherwise.
 */
export async function verifyEndingLock(lock: EndingLock): Promise<boolean> {
  const { validation_hash, ...rest } = lock;
  const expected = await computeEndingLockHash(rest);
  return expected === validation_hash;
}

// ============================================================
// PART 4 — Compliance hook: ending-match-check
// ============================================================

export interface EndingMatchCheckInput {
  lock: EndingLock;
  /** Manuscript content of the final episode (or latest episode if generating ending). */
  final_episode_manuscript: string;
  /** Current episode index. */
  current_episode: number;
}

/**
 * Run the M2 ending-match-check Compliance hook.
 *
 * Severity logic:
 *   - hard lock + final_image substring missing from manuscript at ≥ final_chapter_number
 *     → blocker
 *   - hard lock + banned_reversal phrase appears in manuscript
 *     → blocker
 *   - soft lock + final_image substring missing
 *     → warning
 *   - lock_level not set (placeholder)
 *     → trace (no UI)
 */
export function runEndingMatchCheck(input: EndingMatchCheckInput): ComplianceFinding[] {
  const { lock, final_episode_manuscript, current_episode } = input;
  const findings: ComplianceFinding[] = [];

  if (!lock || !lock.lock_level) {
    return [{
      hook_id: 'ending-match-check',
      module_id: 'M2',
      severity: 'trace' as Severity,
      message: 'No ending lock set — running ending generation without anchor.',
    }];
  }

  // Banned reversals — always blocker if hard locked
  for (const banned of lock.banned_reversals) {
    if (banned.length === 0) continue;
    if (final_episode_manuscript.includes(banned)) {
      findings.push({
        hook_id: 'ending-match-check',
        module_id: 'M2',
        severity: lock.lock_level === 'hard' ? 'blocker' : 'warning',
        message: `Banned reversal detected: "${banned.slice(0, 80)}${banned.length > 80 ? '…' : ''}"`,
        evidence: { banned, lock_level: lock.lock_level },
        suggested_fix: 'Revise the final episode to remove the banned reversal, or change lock_level to soft.',
        episode: current_episode,
      });
    }
  }

  // Final image — only check when we're at or past the planned final chapter
  if (
    lock.final_chapter_number !== null
    && current_episode >= lock.final_chapter_number
    && lock.final_image.length > 0
  ) {
    // Heuristic: ≥ 30% of meaningful (length ≥ 5) tokens from final_image should appear.
    // length ≥ 5 excludes English stopwords ("the", "and", "to") and Korean particles.
    const tokens = lock.final_image
      .split(/\s+/)
      .filter((t) => t.length >= 5);
    if (tokens.length > 0) {
      const matchedCount = tokens.filter((tok) =>
        final_episode_manuscript.includes(tok),
      ).length;
      const ratio = matchedCount / tokens.length;
      const matched = ratio >= 0.3;
      if (!matched) {
        findings.push({
          hook_id: 'ending-match-check',
          module_id: 'M2',
          severity: lock.lock_level === 'hard' ? 'blocker' : 'warning',
          message: 'Final image not reflected in the closing manuscript.',
          evidence: {
            final_image: lock.final_image.slice(0, 200),
            lock_level: lock.lock_level,
            match_ratio: Number(ratio.toFixed(2)),
          },
          suggested_fix: 'Include the planned final image, or revise the lock.',
          episode: current_episode,
        });
      }
    }
  }

  return findings;
}
