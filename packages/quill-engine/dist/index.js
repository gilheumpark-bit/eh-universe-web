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
// ============================================================
// PART 2 — Core engine surface
// ============================================================
export { runQuillEngine, analyzeWithProgram, analyzeWithEsquery, } from './engine';
// ============================================================
// PART 3 — Registry + catalog
// ============================================================
export { DetectorRegistry, detectorRegistry, } from './registry';
// ============================================================
// PART 4 — runVerify (high-level host entry)
// ============================================================
import { runQuillEngine } from './engine';
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
export function runVerify(content, options = {}) {
    const fileName = options.fileName ?? 'untitled.ts';
    const tier = options.tier ?? 'A';
    const t0 = Date.now();
    let result;
    try {
        result = runQuillEngine(content, fileName);
    }
    catch (err) {
        return {
            fileName,
            tier,
            findings: [
                {
                    ruleId: 'engine-error',
                    severity: 'P1',
                    line: 0,
                    col: 0,
                    message: `Quill engine threw: ${err.message}`,
                    evidence: [],
                    confidence: 'high',
                },
            ],
            durationMs: Date.now() - t0,
            enginesUsed: [],
            truncated: false,
        };
    }
    return {
        fileName,
        tier,
        findings: result.findings,
        durationMs: Date.now() - t0,
        enginesUsed: result.enginesUsed,
        truncated: result.findings.length >= 80,
    };
}
// ============================================================
// PART 5 — Engine version
// ============================================================
export const ENGINE_VERSION = '0.1.0';
