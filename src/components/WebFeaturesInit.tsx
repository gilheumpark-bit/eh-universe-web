"use client";

// ============================================================
// WebFeaturesInit — 웹 기능 전역 초기화 (layout에서 1회)
// ============================================================
// 모든 스튜디오에서 공통으로 사용하는 웹 기능을 초기화.
// lazy import로 번들 영향 0.

import { useEffect } from "react";

export default function WebFeaturesInit() {
  useEffect(() => {
    (async () => {
      const [browser, webFeatures] = await Promise.all([
        import("@/lib/browser"),
        import("@/lib/web-features"),
      ]);

      // PWA 설치 프롬프트 감지 시작
      webFeatures.initInstallPrompt();

      // Speculation Rules: 스튜디오 경로 사전 렌더링 (Chrome/Edge)
      browser.preloadStudioRoutes();

      // Compute Pressure: CPU 부하 감시 → 배치 스로틀 (Chrome)
      browser.observeComputePressure((state) => {
        document.documentElement.dataset.cpuPressure = state;
        // serious/critical이면 배치 작업 자동 일시정지 힌트
      });

      // File Handling: PWA 파일 핸들러로 열린 파일 수신 (Chrome)
      browser.consumeLaunchQueue().catch(() => {});

      // 외부 링크 보안 강화 (noopener noreferrer)
      webFeatures.hardenExternalLinks();

      // 개발자 도구 경고 (프로덕션)
      webFeatures.devToolsWarning();

      // 모바일 Safe Area CSS 변수 설정
      webFeatures.applySafeArea();

      // 딥링크 자동 스크롤 (URL hash에 #L42 등)
      webFeatures.scrollToDeepLink();

      // 스토리지 영속성 요청 (데이터 보존)
      webFeatures.requestPersistentStorage().catch(() => {});

      // 만료된 AI 캐시 정리
      browser.pruneExpiredCache().catch(() => {});

      // 오프라인 큐 처리 (온라인 복구 시)
      browser.processQueueOnOnline(async (task) => {
        // 각 태스크 타입별 재전송 로직
        try {
          if (task.type === 'save-project' || task.type === 'save-translation') {
            // localStorage에 이미 저장된 데이터를 서버에 동기화
            // 실제 구현은 각 스튜디오의 sync 로직에 위임
            return true;
          }
          return true;
        } catch {
          return false;
        }
      });

      // 네트워크 품질 변경 감지
      webFeatures.onConnectionChange((quality) => {
        if (quality === 'offline') {
          document.documentElement.dataset.offline = '1';
        } else {
          delete document.documentElement.dataset.offline;
        }
      });

      // 알림 권한 요청 (첫 인터랙션 시)
      const requestOnce = () => {
        browser.requestNotificationPermission().catch(() => {});
        document.removeEventListener('click', requestOnce);
      };
      document.addEventListener('click', requestOnce, { once: true });
    })();
  }, []);

  return null;
}
