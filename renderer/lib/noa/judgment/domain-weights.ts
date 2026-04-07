// ============================================================
// NOA Judgment — Domain Weights
// Source: NOA v35 Judgement Core (domain_weights)
// ============================================================

import type { DomainType } from "../types";
import { DEFAULT_DOMAIN_WEIGHTS } from "../config";

const WEIGHT_MAP = new Map(
  DEFAULT_DOMAIN_WEIGHTS.map((w) => [w.domain, w.multiplier])
);

/**
 * 도메인별 리스크 가중치를 반환한다.
 * 의료(1.9배), 법률(1.8배), 금융(1.7배), 교육(1.3배), 일반/코드(1.0배)
 *
 * @param domain - 도메인 유형
 * @returns 가중치 배수
 */
export function getDomainMultiplier(domain: DomainType): number {
  return WEIGHT_MAP.get(domain) ?? 1.0;
}

export { DEFAULT_DOMAIN_WEIGHTS as DOMAIN_WEIGHTS };
