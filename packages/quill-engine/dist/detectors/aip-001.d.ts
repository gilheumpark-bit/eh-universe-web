import { RuleDetector } from '../registry';
/**
 * AIP-001: 과도한 인라인 주석 (Excessive inline comments)
 * AI-generated code often has too many inline comments explaining obvious logic.
 * Detects functions where comment-to-code ratio is excessively high.
 */
export declare const aip001Detector: RuleDetector;
