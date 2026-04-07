/**
 * @eh/quill-engine — public API
 *
 * Pure-TS verification engine. NO Node API imports allowed
 * (no `fs`, `child_process`, `path`, `os`). Callers inject IO.
 *
 * Used by:
 *   - apps/desktop/main (Electron main process)
 *   - packages/quill-cli (CLI binary)
 *   - apps/desktop/renderer (browser, optional lightweight scans)
 */
export type { AppLanguage, Severity, VerifyIssue, VerifyFix, VerifyReport, AIProvider, AIChatRequest, AIChatChunk, ScopeLevel, ScopePolicy, ARIState, } from '@eh/shared-types';
export declare const ENGINE_VERSION = "0.1.0";
