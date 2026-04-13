import { RuleDetector } from '../registry';
/**
 * AIP-009: Copy-paste coupling
 * Detects code blocks that appear to be copy-pasted with minimal changes.
 * Looks for adjacent similar statements (e.g., repeated property assignments
 * or method calls following the same pattern).
 */
export declare const aip009Detector: RuleDetector;
