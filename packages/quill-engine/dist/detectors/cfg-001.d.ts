import { RuleDetector } from '../registry';
/**
 * CFG-001: strict: false
 * Detects tsconfig.json-like files or code that sets compilerOptions.strict to false.
 * Also detects configuration objects where strict mode is explicitly disabled.
 */
export declare const cfg001Detector: RuleDetector;
