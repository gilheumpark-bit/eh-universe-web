import { RuleDetector } from '../registry';
/**
 * AIP-003: 엣지 케이스 과잉 명세 (Edge case over-specification)
 * AI code tends to add excessive defensive checks. Detects functions with
 * an unusually high density of if-statements checking for null/undefined/edge cases.
 */
export declare const aip003Detector: RuleDetector;
