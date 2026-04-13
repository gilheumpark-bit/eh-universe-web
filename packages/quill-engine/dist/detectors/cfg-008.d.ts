import { RuleDetector } from '../registry';
/**
 * CFG-008: devDeps vs deps 분류 오류 (devDependencies vs dependencies classification error)
 * Detects imports of packages that are typically devDependencies being used in
 * production source code, or production packages only in test files.
 */
export declare const cfg008Detector: RuleDetector;
