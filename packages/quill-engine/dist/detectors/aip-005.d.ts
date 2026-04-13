import { RuleDetector } from '../registry';
/**
 * AIP-005: Phantom Bug 처리 (Phantom Bug handling)
 * AI inserts try-catch or error handling for scenarios that cannot actually occur.
 * Detects catch blocks that handle errors which the try body cannot plausibly throw.
 */
export declare const aip005Detector: RuleDetector;
