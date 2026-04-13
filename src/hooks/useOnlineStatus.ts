"use client";

import { useState, useEffect, useRef } from 'react';

/** 네트워크 온/오프라인 상태 감지 훅 (1초 디바운스로 빠른 깜빡임 방지) */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const handler = (online: boolean) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setIsOnline(online), 1000);
    };

    const handleOnline = () => handler(true);
    const handleOffline = () => handler(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearTimeout(timer.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
