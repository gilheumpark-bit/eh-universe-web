'use client';

import { Key, X } from 'lucide-react';

interface TranslatorConnectionKeyBannerProps {
  langKo: boolean;
  onOpenConnectionKeys: () => void;
  onDismiss: () => void;
}

export function TranslatorConnectionKeyBanner({
  langKo,
  onOpenConnectionKeys,
  onDismiss,
}: TranslatorConnectionKeyBannerProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-amber-700/40 bg-amber-900/25 px-3 py-1.5 text-amber-100">
      <Key className="hidden h-3.5 w-3.5 shrink-0 text-amber-300 sm:block" aria-hidden />
      <p className="min-w-0 flex-1 truncate text-[10px] leading-snug sm:[overflow:visible] sm:[text-overflow:unset] sm:[white-space:normal] sm:text-[11px]">
        {langKo ? '연결 키를 등록하세요.' : 'Add a connection key to start.'}
        <span className="hidden sm:inline">
          {langKo
            ? ' Loreguard 공통 키 저장소에서 연결 키를 등록하세요.'
            : ' Use the shared Loreguard key store to add a connection key.'}
        </span>
      </p>
      <button
        type="button"
        onClick={onOpenConnectionKeys}
        className="min-h-[44px] shrink-0 rounded-lg bg-amber-600/40 px-3 text-[10px] font-bold uppercase tracking-wide text-amber-50 hover:bg-amber-600/55 focus-visible:ring-2 focus-visible:ring-accent-blue"
      >
        {langKo ? '연결 키' : 'Connection keys'}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded text-amber-400/70 hover:bg-amber-800/30 hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-accent-blue"
        aria-label={langKo ? '배너 닫기' : 'Dismiss banner'}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
