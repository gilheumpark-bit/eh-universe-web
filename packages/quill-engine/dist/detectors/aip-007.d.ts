import { RuleDetector } from '../registry';
/**
 * AIP-007: null 체크 불필요 위치 (Unnecessary null checks)
 * AI adds redundant null/undefined checks in positions where the value
 * is guaranteed to be non-null (e.g., immediately after assignment, inside
 * a block already guarded by a null check).
 */
export declare const aip007Detector: RuleDetector;
