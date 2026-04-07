// ============================================================
// PWA Install Prompt — 앱 설치 유도
// ============================================================

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/** PWA 설치 프롬프트 감지 시작 */
export function initInstallPrompt(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

/** 설치 가능 여부 */
export function canInstall(): boolean {
  return deferredPrompt !== null;
}

/** 이미 설치되었는지 (standalone 모드) */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: window-controls-overlay)').matches
    || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone);
}

/** 설치 프롬프트 표시 */
export async function showInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome;
}

/** 설치 상태 변경 리스너 */
export function onInstallStateChange(callback: (installed: boolean) => void): () => void {
  const mq = window.matchMedia('(display-mode: standalone)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
