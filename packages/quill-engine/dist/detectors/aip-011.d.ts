import { RuleDetector } from '../registry';
/**
 * AIP-011: 구형 패턴 고집 (Legacy pattern insistence)
 * AI uses outdated JavaScript/TypeScript patterns when modern equivalents exist.
 * Detects: var usage, function keyword for callbacks, require() in TS, etc.
 */
export declare const aip011Detector: RuleDetector;
