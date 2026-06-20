/**
 * alert() 대체 — 커스텀 이벤트로 토스트 알림 발행
 * page.tsx에서 noa:alert 이벤트를 수신하여 UI 토스트로 표시
 */
export function showAlert(message: string, variant: 'error' | 'warning' | 'info' = 'warning'): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('noa:alert', { detail: { message, variant } }));
  }
}
