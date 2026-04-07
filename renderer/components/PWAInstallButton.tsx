"use client";

// ============================================================
// PWAInstallButton — PWA 앱 설치 버튼
// ============================================================
// Header 또는 사이드바에 배치. beforeinstallprompt 이벤트를 통해
// 설치 가능 시에만 표시됨.

import React from 'react';
import { Download } from 'lucide-react';
import { canInstall, showInstallPrompt, isInstalled } from '@/lib/web-features/pwa-install';

interface Props {
  isKO?: boolean;
  compact?: boolean;
  className?: string;
}

export default function PWAInstallButton({ isKO = true, compact = false, className = '' }: Props) {
  const [available, setAvailable] = React.useState(false);
  const [installed, setInstalled] = React.useState(false);

  React.useEffect(() => {
    // 정기적으로 설치 가능 여부 확인
    const check = () => setAvailable(canInstall());
    check();
    const timer = setInterval(check, 2000);

    // standalone 모드면 이미 설치됨
    if (isInstalled()) {
      setInstalled(true);
    }

    return () => clearInterval(timer);
  }, []);

  const handleInstall = async () => {
    const result = await showInstallPrompt();
    if (result) setInstalled(true);
  };

  // 이미 설치됐거나 설치 불가면 숨김
  if (installed || !available) return null;

  if (compact) {
    return (
      <button
        onClick={handleInstall}
        className={`p-1.5 rounded-lg hover:bg-white/5 text-text-tertiary hover:text-accent-purple transition-all active:scale-90 ${className}`}
        title={isKO ? '앱 설치' : 'Install App'}
      >
        <Download className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={handleInstall}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold 
        bg-accent-purple/10 border border-accent-purple/30 text-accent-purple 
        hover:bg-accent-purple/20 transition-all active:scale-95 ${className}`}
    >
      <Download className="w-3.5 h-3.5" />
      {isKO ? '앱 설치' : 'Install App'}
    </button>
  );
}
