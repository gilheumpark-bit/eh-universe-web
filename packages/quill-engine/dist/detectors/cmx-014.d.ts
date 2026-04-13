import { RuleDetector } from '../registry';
/**
 * CMX-014: 동일 로직 3회+ 복붙
 * Detects duplicated code blocks: function/method bodies with identical normalized text
 * appearing 3 or more times in the same file.
 */
export declare const cmx014Detector: RuleDetector;
