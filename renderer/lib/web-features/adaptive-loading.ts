// ============================================================
// Adaptive Loading — 네트워크/기기 상태 기반 적응형 로딩
// ============================================================

export type ConnectionQuality = 'fast' | 'medium' | 'slow' | 'offline';

/** 현재 네트워크 품질 감지 */
export function getConnectionQuality(): ConnectionQuality {
  if (typeof navigator === 'undefined') return 'fast';
  if (!navigator.onLine) return 'offline';

  // Network Information API
  const conn = (navigator as unknown as { connection?: { effectiveType: string; saveData: boolean } }).connection;
  if (conn) {
    if (conn.saveData) return 'slow';
    switch (conn.effectiveType) {
      case '4g': return 'fast';
      case '3g': return 'medium';
      case '2g':
      case 'slow-2g': return 'slow';
    }
  }

  return 'fast';
}

/** 연결 품질별 설정 */
export function getAdaptiveConfig() {
  const quality = getConnectionQuality();
  return {
    /** 이미지 품질 (low/medium/high) */
    imageQuality: quality === 'slow' ? 'low' : quality === 'medium' ? 'medium' : 'high',
    /** AI 스트리밍 청크 크기 */
    streamBufferSize: quality === 'slow' ? 512 : 128,
    /** 프리페치 허용 */
    allowPrefetch: quality === 'fast',
    /** 애니메이션 비활성화 */
    reduceAnimations: quality === 'slow',
    /** 번역 배치 크기 */
    translationBatchSize: quality === 'slow' ? 1 : quality === 'medium' ? 3 : 5,
    quality,
  };
}

/** 네트워크 품질 변경 리스너 */
export function onConnectionChange(callback: (quality: ConnectionQuality) => void): () => void {
  const conn = (navigator as unknown as { connection?: EventTarget }).connection;
  if (conn) {
    const handler = () => callback(getConnectionQuality());
    conn.addEventListener('change', handler);
    return () => conn.removeEventListener('change', handler);
  }
  // fallback: online/offline
  const onOnline = () => callback(getConnectionQuality());
  const onOffline = () => callback('offline');
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/** 스토리지 영속성 요청 (브라우저가 데이터 삭제 안 하도록) */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** 스토리지 사용량 조회 */
export async function getStorageUsage(): Promise<{ used: string; total: string; percent: number }> {
  if (!navigator.storage?.estimate) return { used: '0', total: '0', percent: 0 };
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  const format = (bytes: number) => bytes > 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${(bytes / 1e3).toFixed(0)} KB`;
  return { used: format(usage), total: format(quota), percent: quota > 0 ? Math.round((usage / quota) * 100) : 0 };
}

/** Intersection 기반 프리페치 (호버/뷰포트 진입 시) */
export function prefetchOnVisible(urls: string[]): () => void {
  if (getConnectionQuality() !== 'fast') return () => {};
  const head = document.head;
  const added: HTMLLinkElement[] = [];

  for (const url of urls) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    link.as = url.endsWith('.js') ? 'script' : url.endsWith('.css') ? 'style' : 'document';
    head.appendChild(link);
    added.push(link);
  }

  return () => added.forEach(l => l.remove());
}
