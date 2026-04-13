import { RuleDetector } from '../registry';
/**
 * CMX-015: 매직 넘버
 * Detects numeric literals used outside of variable/constant declarations,
 * enum members, default parameter values, and common harmless values (0, 1, -1, 2).
 */
export declare const cmx015Detector: RuleDetector;
