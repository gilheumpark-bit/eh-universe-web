"use client";

// ============================================================
// StatusIndicator — 전역 상태 표시 (오프라인/모델/스토리지)
// ============================================================

import { useState, useEffect } from "react";
import { Wifi, WifiOff, HardDrive } from "lucide-react";
// HardDrive: StatusBadge 에서 사용. Wifi/WifiOff: 양쪽 모두 사용.

export function StatusIndicator() {
  // NOTE: storage percent/label 은 StatusBadge 쪽에서 담당. StatusIndicator 는 오프라인 토스트 전용.
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync initial online state on mount; no cascading risk
    setIsOffline(!navigator.onLine);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // 오프라인일 때만 눈에 띄게 표시
  if (isOffline) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-red/90 text-white text-xs font-mono font-bold shadow-lg animate-in fade-in slide-in-from-bottom-2">
        <WifiOff size={14} />
        <span>OFFLINE</span>
      </div>
    );
  }

  return null;
}

/** 소형 상태 뱃지 (헤더/사이드바에 삽입용) */
export function StatusBadge({ showStorage = false }: { showStorage?: boolean }) {
  const [isOffline, setIsOffline] = useState(false);
  const [storageLabel, setStorageLabel] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync initial online state on mount; no cascading risk
    setIsOffline(!navigator.onLine);
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);

    if (showStorage && navigator.storage?.estimate) {
      navigator.storage.estimate().then(({ usage = 0 }) => {
        setStorageLabel(`${(usage / 1e6).toFixed(0)}MB`);
      }).catch(() => {});
    }

    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [showStorage]);

  return (
    <div className="flex items-center gap-2 text-[10px] font-mono text-text-tertiary">
      {/* [a11y] 아이콘 가독성 — 10px → 14px. 비상호작용 표시 배지이므로 터치 타겟(44px)은 불필요. */}
      {isOffline ? (
        <span className="flex items-center gap-1 text-accent-red"><WifiOff size={14} /> offline</span>
      ) : (
        <span className="flex items-center gap-1"><Wifi size={14} className="text-accent-green" /></span>
      )}
      {showStorage && storageLabel && (
        <span className="flex items-center gap-1"><HardDrive size={14} /> {storageLabel}</span>
      )}
    </div>
  );
}
