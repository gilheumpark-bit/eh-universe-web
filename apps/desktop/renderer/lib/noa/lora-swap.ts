// ============================================================
// NOA — LoRA Swap (Coding Mode Manager)
// ============================================================
// Controls the active coding mode which adjusts AI prompt
// personality and suggestion style:
//   - standard: 정석 코딩 (balanced)
//   - office:   직장인 모드 (copy-paste practical)
//   - architect: 설계 중심 (design-first)
//
// Also provides narrative depth accessor for the writing studio
// AI pipeline (used by useStudioAI via getNarrativeDepth).

import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Types
// ============================================================

export type CodingMode = 'standard' | 'office' | 'architect';

const STORAGE_KEY = 'eh_coding_mode';
const DEPTH_STORAGE_KEY = 'eh_narrative_depth';

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=CodingMode

// ============================================================
// PART 2 — Coding Mode Accessors
// ============================================================

let _currentMode: CodingMode = 'standard';

/**
 * Set the active coding mode.
 * Persists to localStorage for cross-session retention.
 */
export function setCodingMode(mode: CodingMode): void {
  _currentMode = mode;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  } catch (e) {
    logger.warn('[lora-swap] Failed to persist coding mode', e);
  }
}

/**
 * Get the current coding mode.
 * Reads from memory first, falls back to localStorage.
 */
export function getCodingMode(): CodingMode {
  if (_currentMode !== 'standard') return _currentMode;
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as CodingMode | null;
      if (stored && ['standard', 'office', 'architect'].includes(stored)) {
        _currentMode = stored;
        return stored;
      }
    }
  } catch {
    // SSR or storage error — use default
  }
  return _currentMode;
}

// IDENTITY_SEAL: PART-2 | role=mode accessors | inputs=CodingMode | outputs=CodingMode

// ============================================================
// PART 3 — Narrative Depth (Writing Studio Integration)
// ============================================================

/**
 * Get the narrative depth multiplier for the writing AI pipeline.
 * Range: 0.0 – 2.0 (default 1.0).
 * Used by useStudioAI to adjust generation intensity.
 */
export function getNarrativeDepth(): number {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(DEPTH_STORAGE_KEY);
      if (stored !== null) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val >= 0 && val <= 2) return val;
      }
    }
  } catch {
    // fallback
  }
  return 1.0;
}

/**
 * Set the narrative depth multiplier.
 */
export function setNarrativeDepth(depth: number): void {
  const clamped = Math.max(0, Math.min(2, depth));
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEPTH_STORAGE_KEY, String(clamped));
    }
  } catch (e) {
    logger.warn('[lora-swap] Failed to persist narrative depth', e);
  }
}

/**
 * Build a profile hint string based on current coding mode.
 * Used to prepend mode-specific instructions to AI prompts.
 */
export function buildProfileHint(): string {
  const mode = getCodingMode();
  switch (mode) {
    case 'office':
      return '[MODE:Office] 실용적이고 즉시 복붙 가능한 코드 위주로 생성. 설명 최소화.';
    case 'architect':
      return '[MODE:Architect] 설계 패턴, 인터페이스 분리, 확장성을 최우선으로 코드 생성.';
    default:
      return '';
  }
}

// IDENTITY_SEAL: PART-3 | role=narrative+profile | inputs=none | outputs=number,string
