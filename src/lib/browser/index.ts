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

// AI Response Cache (같은 질문 → 캐시 히트 → 토큰 비용 0)
export { getCachedResponse, cacheResponse, cacheStats, pruneExpiredCache, clearAICache } from './ai-cache';

// View Transitions (부드러운 패널/탭 전환)
export { supportsViewTransitions, withViewTransition, morphTransition, tabTransition } from './view-transitions';

// Background Sync (오프라인 큐 → 온라인 복구 시 자동 재전송)
export { enqueueSync, loadQueue, dequeueSync, clearSyncQueue, syncQueueSize, processQueueOnOnline, isOffline, onConnectivityChange, type SyncTask } from './background-sync';

// PWA Badging (앱 아이콘 뱃지)
export { canBadge, setBadge, clearBadge, incrementBadge, resetBadge, setBadgeCount } from './pwa-badge';

// Keyboard Layout (키보드 배열 감지)
export { detectKeyboardLayout, formatShortcut, type KeyboardLayoutInfo } from './keyboard-layout';

// Advanced APIs (5대 브라우저 최대 활용)
export { detectTextFromImage, detectBarcode, getLocalFonts, pickColorFromScreen, startScreenRecording, stopScreenRecording, isRecording, addSpeculationRules, preloadStudioRoutes, getBrowserCapabilities, type OCRResult, type LocalFont, type ScreenRecording } from './advanced-apis';

// Platform-Exclusive APIs (브라우저별 특화)
export { consumeLaunchQueue, supportsFileHandling, getTitleBarArea, supportsWindowControlsOverlay, onTitleBarChange, openDocumentPiP, supportsDocumentPiP, observeComputePressure, getScreens, isMultiScreen, requestInkPresenter, supportsInk, getPlatformCapabilities, type LaunchedFile, type TitleBarArea, type PiPWindow, type PressureState, type ScreenInfo } from './platform-exclusive';
