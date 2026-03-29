// ============================================================
// NOA Judgment — Source Trust Tiers
// Source: NOA v35/v40 (source_modifiers)
// ============================================================

import type { SourceTier } from "../types";
import { DEFAULT_SOURCE_TIERS } from "../config";

const TIER_MAP = new Map(
  DEFAULT_SOURCE_TIERS.map((t) => [t.tier, t.riskMultiplier])
);

/**
 * 출처 신뢰도에 따른 리스크 배수를 반환한다.
 * Tier1 (FDA, WHO): 0.3배 (70% 리스크 감쇄)
 * Tier2 (PubMed, 정부): 0.7배 (30% 감쇄)
 * Tier3 (블로그, SNS): 1.8배 (80% 증폭)
 *
 * @param tier - 출처 등급
 * @returns 리스크 배수
 */
export function getSourceMultiplier(tier: SourceTier): number {
  return TIER_MAP.get(tier) ?? 1.0;
}

export { DEFAULT_SOURCE_TIERS as SOURCE_TRUST_TIERS };
