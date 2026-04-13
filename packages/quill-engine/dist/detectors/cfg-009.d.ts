import { RuleDetector } from '../registry';
/**
 * CFG-009: peerDependencies 미선언 (Undeclared peerDependencies)
 * Detects packages imported via require/import that are commonly expected
 * as peerDependencies in library code but may not be declared.
 * Flags patterns in library-like source files.
 */
export declare const cfg009Detector: RuleDetector;
