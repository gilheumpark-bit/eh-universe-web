import { RuleDetector } from '../registry';
/**
 * AIP-002: 리팩터링 회피 — 중복 구현 (Refactoring avoidance — duplicate implementation)
 * Detects functions with very similar bodies (same structure, same statement count)
 * that could be refactored into a single parameterized function.
 */
export declare const aip002Detector: RuleDetector;
