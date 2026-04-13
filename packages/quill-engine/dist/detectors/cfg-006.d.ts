import { RuleDetector } from '../registry';
/**
 * CFG-006: paths alias 불일치 (Path alias mismatch)
 * Detects imports using path aliases (e.g., @/utils, ~/components) when
 * no tsconfig paths configuration is visible, or detects misconfigured aliases.
 */
export declare const cfg006Detector: RuleDetector;
