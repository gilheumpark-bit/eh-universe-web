import { RuleDetector } from '../registry';
/**
 * CFG-003: skipLibCheck: true
 * Detects when skipLibCheck is set to true. While sometimes necessary for performance,
 * it disables type checking of declaration files and can hide real type errors.
 */
export declare const cfg003Detector: RuleDetector;
