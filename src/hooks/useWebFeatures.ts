// ============================================================
// useWebFeatures — 스튜디오 서브 컴포넌트용 웹 기능 훅
// ============================================================
// 각 컴포넌트에서 필요한 웹 기능을 lazy import로 제공.
// 사용: const web = useWebFeatures();
//       web.share('novel', '제목', '내용');
//       web.deepLink('line', 42);
//       web.print('element-id');

import { useCallback, useRef, useEffect, useState } from 'react';

export function useWebFeatures() {
  const modRef = useRef<{
    browser: typeof import('@/lib/browser') | null;
    web: typeof import('@/lib/web-features') | null;
  }>({ browser: null, web: null });
  const [isOffline, setIsOffline] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<string>('fast');

  // Lazy load modules on first use
  const ensureLoaded = useCallback(async () => {
    if (!modRef.current.browser) {
      const [browser, web] = await Promise.all([
        import('@/lib/browser'),
        import('@/lib/web-features'),
      ]);
      modRef.current = { browser, web };
    }
    return modRef.current as { browser: Awaited<typeof import('@/lib/browser')>; web: Awaited<typeof import('@/lib/web-features')> };
  }, []);

  // 네트워크 상태 실시간 추적
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    import('@/lib/web-features').then(({ onConnectionChange, getConnectionQuality }) => {
      setConnectionQuality(getConnectionQuality());
      cleanup = onConnectionChange((q) => {
        setConnectionQuality(q);
        setIsOffline(q === 'offline');
      });
    }).catch(() => {});
    return () => cleanup?.();
  }, []);

  // ── 공유 ──
  const share = useCallback(async (type: string, title: string, content: string) => {
    const { web } = await ensureLoaded();
    const result = await web.createShareLink({ type: type as 'novel', title, content });
    await web.copyShareLink(result.url);
    return result.url;
  }, [ensureLoaded]);

  // ── 딥링크 ──
  const copyDeepLink = useCallback(async (type: 'line' | 'segment' | 'paragraph' | 'chapter', index: number) => {
    const { web } = await ensureLoaded();
    return web.copyDeepLink({ type, index });
  }, [ensureLoaded]);

  // ── 인쇄 ──
  const print = useCallback(async (elementId?: string) => {
    const { web } = await ensureLoaded();
    web.printContent(elementId);
  }, [ensureLoaded]);

  // ── 입력 정제 ──
  const sanitize = useCallback(async (input: string) => {
    const { web } = await ensureLoaded();
    return web.sanitizeInput(input);
  }, [ensureLoaded]);

  // ── 임베드 코드 복사 ──
  const copyEmbed = useCallback(async (type: string, id: string, theme?: 'light' | 'dark') => {
    const { web } = await ensureLoaded();
    return web.copyEmbedCode({ type: type as 'world-doc', id, theme });
  }, [ensureLoaded]);

  // ── 적응형 설정 ──
  const getAdaptive = useCallback(async () => {
    const { web } = await ensureLoaded();
    return web.getAdaptiveConfig();
  }, [ensureLoaded]);

  // ── 스토리지 사용량 ──
  const getStorage = useCallback(async () => {
    const { web } = await ensureLoaded();
    return web.getStorageUsage();
  }, [ensureLoaded]);

  // ── AI 캐시 통계 ──
  const getCacheStats = useCallback(async () => {
    const { browser } = await ensureLoaded();
    return browser.cacheStats();
  }, [ensureLoaded]);

  // ── 텍스트 분할 (Intl.Segmenter) ──
  const segmentText = useCallback(async (text: string, locale?: string) => {
    const { web } = await ensureLoaded();
    return web.segmentSentences(text, locale);
  }, [ensureLoaded]);

  // ── 날짜 포맷 ──
  const formatDate = useCallback(async (date: Date | number, locale?: string) => {
    const { web } = await ensureLoaded();
    return web.formatDate(date, locale);
  }, [ensureLoaded]);

  // ── 상대 시간 ──
  const formatRelative = useCallback(async (timestamp: number, locale?: string) => {
    const { web } = await ensureLoaded();
    return web.formatRelativeTime(timestamp, locale);
  }, [ensureLoaded]);

  return {
    share,
    copyDeepLink,
    print,
    sanitize,
    copyEmbed,
    getAdaptive,
    getStorage,
    getCacheStats,
    segmentText,
    formatDate,
    formatRelative,
    isOffline,
    connectionQuality,
  };
}
