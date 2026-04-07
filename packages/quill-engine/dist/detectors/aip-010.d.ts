import { RuleDetector } from '../registry';
/**
 * AIP-010: Hallucinated API
 * AI sometimes generates calls to APIs/methods that don't exist.
 * Detects calls to known hallucinated patterns (e.g., Array.prototype methods that don't
 * exist, common misspellings, or fabricated Node/DOM APIs).
 */
export declare const aip010Detector: RuleDetector;
