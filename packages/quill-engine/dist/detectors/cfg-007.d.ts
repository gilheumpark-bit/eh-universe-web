import { RuleDetector } from '../registry';
/**
 * CFG-007: 순환 의존성 (Circular dependency)
 * Detects potential circular import patterns within a single file:
 * - A file that imports from module X and also exports something imported by X
 * - Re-export barrels that import and re-export everything (index.ts patterns)
 * Also flags self-imports.
 */
export declare const cfg007Detector: RuleDetector;
