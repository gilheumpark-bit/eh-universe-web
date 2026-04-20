// ============================================================
// Public API — save-engine
// ============================================================
//
// Phase 1.1 현재는 신규 엔진만 제공. 기존 경로(project-migration, indexeddb-backup,
// useProjectManager)는 건드리지 않음. Phase 1.5에서 useAutoSave 훅과 useProjectManager 연결.

export * from './types';
export { ulid, tickLocal, recvRemote, compareHLC, isConcurrent, getNodeId, zeroHLC } from './hlc';
export { sha256, canonicalJson, hashPayload, verifyChain } from './hash';
export { computePatch, applyPatch, buildDelta, replayDeltas } from './delta';
export { createSnapshot, restoreSnapshot, cleanupOldSnapshots, evaluateSnapshotTrigger, findLatestSnapshotEntry } from './snapshot';
export { detectAnomaly, countCharacters, ANOMALY_RATIO_THRESHOLD, ANOMALY_PREV_MIN } from './anomaly-detector';
export { appendEntry, appendInitEntry, readAllEntries, verifyJournal, getCurrentHLC } from './journal';
export { performAtomicAppend, estimateEntrySize, toSaveMeta } from './atomic-write';
export { routerAppendEntry, routerGetTip, routerListEntries, routerGetEntry, routerBootCleanup } from './storage-router';
export { migrateLegacyProjects, hasLegacyProjects, isAlreadyMigrated, rollbackMigrationMarker } from './migration';
export { runBootRecovery } from './recovery';
export {
  readBeacon,
  writeBeacon,
  clearBeacon,
  estimateCrash,
  evaluateBeaconStatus,
  markCleanShutdown,
  startHeartbeat,
  BEACON_CRASH_THRESHOLD_MS,
  BEACON_HEARTBEAT_INTERVAL_MS,
} from './beacon';
export type { BeaconStatus, BeaconPayload, CrashEstimate, HeartbeatHandle } from './beacon';
export { acquireLeaderController, isWebLocksSupported } from './leader-election';
export { WriterQueue, getDefaultWriterQueue } from './writer-queue';
export { compressToBytes, decompressFromBytes, isCompressionStreamSupported } from './compression';
