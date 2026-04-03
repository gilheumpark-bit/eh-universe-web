// ============================================================
// Browser APIs Module — 무료 브라우저 내장 기능 통합
// ============================================================
// 모든 API는 브라우저 내장 → 서버 비용 0원
// dynamic import로 필요할 때만 로드

// IndexedDB (localStorage 한계 돌파 — 5MB → 디스크 50%)
export { idbGet, idbPut, idbDelete, idbGetAll, idbCount, idbClear, idbPutBatch, idbGetByIndex, idbEstimateSize, migrateFromLocalStorage, STORES } from './idb-store';

// Web Worker (무거운 연산 백그라운드 처리)
export { runInWorker, terminateWorker, scoreTextInBackground, validateInBackground, fuzzyMatchInBackground, extractTermsInBackground, type WorkerTask, type WorkerResult } from './pipeline-worker';

// Web Notifications (배치 완료 알림)
export { requestNotificationPermission, canNotify, notify, notifyNovelComplete, notifyCodeVerifyComplete, notifyTranslationComplete, notifyBatchComplete } from './notifications';

// Web Share API (모바일/데스크톱 공유)
export { canShare, canShareFiles, shareText, shareFile, shareTranslation, shareVerifyReport, shareManuscript } from './web-share';

// Screen Wake Lock (화면 꺼짐 방지)
export { canWakeLock, acquireWakeLock, releaseWakeLock, isWakeLockActive, withWakeLock } from './wake-lock';
