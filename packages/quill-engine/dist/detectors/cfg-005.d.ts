import { RuleDetector } from '../registry';
/**
 * CFG-005: moduleResolution 부재 (Missing moduleResolution)
 * Detects tsconfig files that lack a moduleResolution setting,
 * which can cause import resolution issues in monorepos and modern toolchains.
 */
export declare const cfg005Detector: RuleDetector;
