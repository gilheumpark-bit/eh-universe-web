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
// Engine surface — populated in Phase B-2 by extracting from
// renderer/cli/core/* and renderer/lib/code-studio/{audit,pipeline,core}/*
//
// Planned exports:
//   export { runVerify } from './engine';
//   export { detectorRegistry } from './registry';
//   export { ruleCatalog } from './catalog';
//   export { runDeepVerify } from './deep-verify';
//   export { ARICircuitBreaker } from './ari';
//   export { resolveScopePolicy } from './scope-policy';
export const ENGINE_VERSION = '0.1.0';
