import { RuleDetector } from '../registry';
/**
 * CFG-011: devDeps 프로덕션 빌드 포함 (devDependencies included in production build)
 * Detects when development-only modules are imported in production entry points
 * or bundler configs that would cause them to be included in the production bundle.
 */
export declare const cfg011Detector: RuleDetector;
