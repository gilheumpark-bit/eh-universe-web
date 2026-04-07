import { RuleDetector } from '../registry';
/**
 * CFG-002: noUnusedLocals: false
 * Detects tsconfig settings where noUnusedLocals is explicitly set to false,
 * allowing unused local variables to pass compilation.
 */
export declare const cfg002Detector: RuleDetector;
