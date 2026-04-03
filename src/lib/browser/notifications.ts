// ============================================================
// Web Notifications — 배치 작업 완료 알림
// ============================================================
// 탭이 비활성일 때 AI 생성/검증/번역 완료를 데스크톱 알림으로

const APP_NAME = 'EH Universe';

/** 알림 권한 요청 (사용자 제스처 필요) */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** 알림 가능 여부 */
export function canNotify(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/** 알림 보내기 (탭 비활성일 때만) */
export function notify(title: string, body: string, options?: { icon?: string; tag?: string; onClick?: () => void }): void {
  if (!canNotify()) return;
  // 탭이 활성이면 알림 불필요
  if (document.visibilityState === 'visible') return;

  const notification = new Notification(`${APP_NAME} — ${title}`, {
    body,
    icon: options?.icon || '/icon',
    tag: options?.tag || 'eh-default',
    silent: false,
  });

  if (options?.onClick) {
    notification.onclick = () => {
      window.focus();
      options.onClick!();
      notification.close();
    };
  }

  // 5초 후 자동 닫기
  setTimeout(() => notification.close(), 5000);
}

// ── 스튜디오별 편의 함수 ──

export function notifyNovelComplete(episode: number, grade: string): void {
  notify('소설 생성 완료', `EP.${episode} — 등급: ${grade}`, { tag: 'novel-gen' });
}

export function notifyCodeVerifyComplete(agentCount: number, confidence: number): void {
  notify('코드 검증 완료', `${agentCount}개 에이전트, 신뢰도: ${confidence}%`, { tag: 'code-verify' });
}

export function notifyTranslationComplete(episodes: number, lang: string): void {
  notify('번역 완료', `${episodes}개 에피소드 → ${lang}`, { tag: 'translation' });
}

export function notifyBatchComplete(task: string): void {
  notify('배치 작업 완료', task, { tag: 'batch' });
}
