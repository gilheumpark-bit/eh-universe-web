import { RuleDetector } from '../registry';
/**
 * AIP-008: Exception swallowing
 * Detects empty catch blocks or catch blocks that only log without rethrowing,
 * effectively swallowing errors silently.
 */
export declare const aip008Detector: RuleDetector;
