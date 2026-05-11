"use client";

// ============================================================
// useTwentyOneModuleFlag — 21-module feature-flag tier hook
// ============================================================
//
// Persists user's chosen tier in localStorage. Maps UserRole to default tier.
//
// Tier escalation (cumulative):
//   off       — default, only 12 covered modules visible (alpha-safe)
//   essential — + Tier A gaps (M2 / M4 / M18) = 15 modules
//   standard  — + Tier B gaps (M5 / M6 / M11) = 18 modules
//   pro       — + enhancements (M8 / M9 / M12) = 21 modules
//
// UserRole → default tier mapping:
//   explorer / writer  → 'off'
//   publisher          → 'essential'
//   translator         → 'essential' (M18 platform-aware)
//   developer          → 'pro'
//
// Event: `noa:21module-tier-changed` (detail.tier) — other components subscribe.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import type { FeatureFlagTier } from '@/lib/twentyone-modules';
import { useUserRoleSafe } from '@/contexts/UserRoleContext';

// ============================================================
// PART 1 — Constants
// ============================================================

const STORAGE_KEY = 'loreguard-21module-tier';
const DEFAULT_TIER: FeatureFlagTier = 'off';
const EVENT = 'noa:21module-tier-changed';

const VALID_TIERS: readonly FeatureFlagTier[] = ['off', 'essential', 'standard', 'pro'] as const;

function isValidTier(value: unknown): value is FeatureFlagTier {
  return typeof value === 'string' && (VALID_TIERS as readonly string[]).includes(value);
}

// ============================================================
// PART 2 — Role → default tier mapping (pure function)
// ============================================================

/**
 * Default 21-module tier for a given UserRole, when the user has not
 * explicitly chosen one. Pure function — no side effects.
 */
export function defaultTierForRole(
  role: 'writer' | 'translator' | 'publisher' | 'developer' | 'explorer' | null | undefined,
): FeatureFlagTier {
  switch (role) {
    case 'publisher':
      return 'essential';
    case 'translator':
      return 'essential';
    case 'developer':
      return 'pro';
    case 'writer':
    case 'explorer':
    case null:
    case undefined:
    default:
      return 'off';
  }
}

// ============================================================
// PART 3 — Hook
// ============================================================

export interface UseTwentyOneModuleFlagResult {
  /** Current effective tier. */
  tier: FeatureFlagTier;
  /** Set tier explicitly (persists to localStorage). */
  setTier: (tier: FeatureFlagTier) => void;
  /** True if user has explicitly chosen a tier (vs. role-default). */
  isExplicit: boolean;
  /** Reset to role-default. */
  reset: () => void;
}

export function useTwentyOneModuleFlag(): UseTwentyOneModuleFlagResult {
  const userRole = useUserRoleSafe();
  const [tier, setTierState] = useState<FeatureFlagTier>(DEFAULT_TIER);
  const [isExplicit, setExplicit] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isValidTier(stored)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTierState(stored);
        setExplicit(true);
      } else {
        // Use role default
        const fallback = defaultTierForRole(userRole?.role);
        setTierState(fallback);
        setExplicit(false);
      }
    } catch {
      /* private mode — silent */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for tier changes from other tabs / components
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tier?: unknown }>).detail;
      if (detail && isValidTier(detail.tier)) {
        setTierState(detail.tier);
      }
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const setTier = useCallback((next: FeatureFlagTier) => {
    setTierState(next);
    setExplicit(true);
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* quota / private — silent */
    }
    try {
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { tier: next } }));
    } catch {
      /* CustomEvent unsupported — silent */
    }
  }, []);

  const reset = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* silent */
    }
    const fallback = defaultTierForRole(userRole?.role);
    setTierState(fallback);
    setExplicit(false);
    try {
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { tier: fallback } }));
    } catch {
      /* silent */
    }
  }, [userRole?.role]);

  return { tier, setTier, isExplicit, reset };
}
