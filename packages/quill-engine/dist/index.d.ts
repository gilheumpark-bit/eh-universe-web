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
 *
 * PART 1 — Type re-exports from @eh/shared-types
 * PART 2 — Core verification surface
 * PART 3 — Detector registry + rule catalog
 * PART 4 — runVerify() — single high-level entry for hosts
 * PART 5 — Engine version
 */
export type { AppLanguage, Severity, VerifyIssue, VerifyFix, VerifyReport, AIProvider, AIChatRequest, AIChatChunk, ScopeLevel, ScopePolicy, ARIState, } from '@eh/shared-types';
export { runQuillEngine, analyzeWithProgram, analyzeWithEsquery, type Evidence, type EngineFinding, type ScopeNode, type EngineResult, } from './engine';
export { DetectorRegistry, detectorRegistry, type RuleFinding, type RuleDetector, } from './registry';
import { type EngineFinding } from './engine';
export interface VerifyOptions {
    /** Optional file name (used for diagnostics + extension routing). */
    fileName?: string;
    /** Tier A: single-file fast scan. B: include cross-file. C: deep. */
    tier?: 'A' | 'B' | 'C';
}
export interface VerifyOutcome {
    fileName: string;
    tier: 'A' | 'B' | 'C';
    findings: EngineFinding[];
    durationMs: number;
    enginesUsed: string[];
    truncated: boolean;
}
/**
 * runVerify — single high-level entry point for hosts.
 *
 * Pure: takes file content as a string, returns findings. The caller
 * is responsible for reading the file from disk (or memory) and for
 * any persistence of the result.
 *
 * Tier semantics:
 *   A — runQuillEngine (TS program + esquery + ts-morph)
 *   B — currently same as A (cross-file integration TODO)
 *   C — currently same as A (deep verify integration TODO)
 *
 * The IPC contract in apps/desktop/main/ipc/quill.ts already passes
 * a `tier` field through to here so the upgrade path is mechanical.
 */
export declare function runVerify(content: string, options?: VerifyOptions): VerifyOutcome;
export declare const ENGINE_VERSION = "0.1.0";
