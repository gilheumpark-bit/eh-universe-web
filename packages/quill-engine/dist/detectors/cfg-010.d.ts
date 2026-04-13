import { RuleDetector } from '../registry';
/**
 * CFG-010: .env git 추적 포함 (.env file tracked in git)
 * Detects code that reads from .env files without checking .gitignore,
 * and flags hardcoded secrets/credentials in source code that look like
 * they should be in .env files.
 */
export declare const cfg010Detector: RuleDetector;
