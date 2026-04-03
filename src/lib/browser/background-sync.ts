// ============================================================
// Background Sync — 오프라인 저장 큐
// ============================================================
// 네트워크 끊긴 상태에서 저장/동기화 요청을 큐에 쌓고,
// 네트워크 복구 시 자동 재전송.

const SYNC_QUEUE_KEY = 'eh-sync-queue';

export interface SyncTask {
  id: string;
  type: 'save-project' | 'save-translation' | 'save-glossary' | 'sync-drive' | 'export';
  payload: string; // JSON serialized
  createdAt: number;
  retryCount: number;
}

/** 큐에 작업 추가 */
export function enqueueSync(type: SyncTask['type'], payload: unknown): void {
  const queue = loadQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    payload: JSON.stringify(payload),
    createdAt: Date.now(),
    retryCount: 0,
  });
  saveQueue(queue);
  // Background Sync API 지원 시 등록
  registerBackgroundSync();
}

/** 큐 조회 */
export function loadQueue(): SyncTask[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: SyncTask[]): void {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

/** 큐에서 완료된 작업 제거 */
export function dequeueSync(id: string): void {
  const queue = loadQueue().filter(t => t.id !== id);
  saveQueue(queue);
}

/** 큐 비우기 */
export function clearSyncQueue(): void {
  localStorage.removeItem(SYNC_QUEUE_KEY);
}

/** 큐 크기 */
export function syncQueueSize(): number {
  return loadQueue().length;
}

/** Background Sync API 등록 (SW에서 처리) */
async function registerBackgroundSync(): Promise<void> {
  try {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await (reg as any).sync.register('eh-sync-queue');
    }
  } catch { /* Background Sync 미지원 — 수동 재시도 fallback */ }
}

/**
 * 온라인 복구 시 큐 처리.
 * Background Sync 미지원 브라우저를 위한 수동 fallback.
 */
export function processQueueOnOnline(
  handler: (task: SyncTask) => Promise<boolean>,
): () => void {
  const process = async () => {
    const queue = loadQueue();
    for (const task of queue) {
      try {
        const success = await handler(task);
        if (success) {
          dequeueSync(task.id);
        } else {
          task.retryCount++;
          if (task.retryCount >= 5) dequeueSync(task.id); // 5회 실패 시 포기
        }
      } catch {
        task.retryCount++;
      }
    }
    saveQueue(loadQueue());
  };

  window.addEventListener('online', process);
  // 마운트 시 즉시 체크
  if (navigator.onLine && loadQueue().length > 0) process();

  return () => window.removeEventListener('online', process);
}

/** 오프라인 감지 */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/** 온/오프라인 상태 변화 리스너 */
export function onConnectivityChange(
  callback: (online: boolean) => void,
): () => void {
  const onOnline = () => callback(true);
  const onOffline = () => callback(false);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
