import { RuleDetector } from '../registry';
/**
 * CMX-016: 매직 문자열 반복
 * Detects string literals (length >= 3, non-import) that appear 3+ times in the file.
 */
export declare const cmx016Detector: RuleDetector;
