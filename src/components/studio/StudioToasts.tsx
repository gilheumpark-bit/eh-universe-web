"use client";

import { useState, useEffect, useCallback } from 'react';
import { Globe, Cloud, AlertTriangle, CheckCircle, Info, X, RefreshCw, Download, Scissors, Languages } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';
import { useLang } from '@/lib/LangContext';
import { ErrorToast } from './UXHelpers';

interface StudioToastsProps {
  language: AppLanguage;
  isKO: boolean;
  // Sync reminder
  showSyncReminder: boolean;
  setShowSyncReminder: (v: boolean) => void;
  user: { displayName: string | null } | null;
  lastSyncTime: number | null;
  handleSync: () => void;
  signInWithGoogle: () => void;
  // Storage
  storageFull: boolean;
  setStorageFull: (v: boolean) => void;
  exportAllJSON: () => void;
  // Fallback
  fallbackNotice: string | null;
  setFallbackNotice: (v: string | null) => void;
  // Export
  exportDoneFormat: string | null;
  setExportDoneFormat: (v: string | null) => void;
  // World import
  worldImportBanner: boolean;
  setWorldImportBanner: (v: boolean) => void;
  // Error
  uxError: { error: unknown; retry?: () => void } | null;
  setUxError: (v: { error: unknown; retry?: () => void } | null) => void;
}

// Premium Toast Card Component
function ToastCard({
  children,
  variant = 'info',
  onClose,
  autoDismissMs,
}: {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  onClose?: () => void;
  /** 설정 시 하단 진행바가 CSS 애니메이션으로 autoDismissMs 동안 drain (P-06 — JS 인터벌 제거). */
  autoDismissMs?: number;
}) {
  const variants = {
    info: {
      bg: 'from-accent-blue/20 to-accent-blue/5',
      border: 'border-accent-blue/30',
      icon: 'text-accent-blue',
      close: 'text-accent-blue/60 hover:text-accent-blue',
      progress: 'bg-accent-blue',
    },
    success: {
      bg: 'from-accent-green/20 to-accent-green/5',
      border: 'border-accent-green/30',
      icon: 'text-accent-green',
      close: 'text-accent-green/60 hover:text-accent-green',
      progress: 'bg-accent-green',
    },
    warning: {
      bg: 'from-accent-amber/20 to-accent-amber/5',
      border: 'border-accent-amber/30',
      icon: 'text-accent-amber',
      close: 'text-accent-amber/60 hover:text-accent-amber',
      progress: 'bg-accent-amber',
    },
    error: {
      bg: 'from-accent-red/20 to-accent-red/5',
      border: 'border-accent-red/30',
      icon: 'text-accent-red',
      close: 'text-accent-red/60 hover:text-accent-red',
      progress: 'bg-accent-red',
    },
  };
  const v = variants[variant];

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border ${v.border}
      bg-gradient-to-r ${v.bg} backdrop-blur-xl
      shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.05)]
      animate-in slide-in-from-top-2 fade-in duration-300
    `}>
      <div className="flex items-center gap-3 px-4 py-3">
        {children}
        {onClose && (
          <button 
            onClick={onClose} 
            className={`shrink-0 p-1 rounded-lg transition-colors ${v.close}`}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {autoDismissMs !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
          <div
            className={`h-full w-full ${v.progress} toast-drain-bar`}
            style={{ opacity: 0.6, animationDuration: `${autoDismissMs}ms` }}
          />
        </div>
      )}
    </div>
  );
}

// Auto-dismiss wrapper
function AutoDismissToast({ 
  children, 
  duration = 4000,
  onDismiss,
  variant,
}: {
  children: React.ReactNode;
  duration?: number;
  onDismiss: () => void;
  variant?: 'info' | 'success' | 'warning' | 'error';
}) {
  // [P-06 fix 2026-06-03] 진행바는 CSS 애니메이션(toast-drain)이 그린다 —
  // 기존 30ms setInterval + setProgress(≈33Hz 리렌더, 토스트 떠 있는 내내) 제거.
  // 수명은 단일 setTimeout 으로만 관리: duration 경과 시 onDismiss → 부모가 언마운트.
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <ToastCard variant={variant} onClose={onDismiss} autoDismissMs={duration}>
      {children}
    </ToastCard>
  );
}

/** 토큰 절삭 알림 — noa:token-truncated 이벤트 수신 */
function TokenTruncationToast({ isKO }: { isKO: boolean }) {
  const [show, setShow] = useState(false);
  const dismiss = useCallback(() => setShow(false), []);

  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener('noa:token-truncated', handler);
    window.addEventListener('noa:token-budget-warning', handler);
    return () => {
      window.removeEventListener('noa:token-truncated', handler);
      window.removeEventListener('noa:token-budget-warning', handler);
    };
  }, []);

  if (!show) return null;
  return (
    <AutoDismissToast variant="warning" duration={5000} onDismiss={dismiss}>
      <Scissors className="w-5 h-5 text-accent-amber shrink-0" />
      <p className="flex-1 text-sm font-medium text-text-primary">
        {isKO ? '컨텍스트가 길어 일부 메시지가 생략되었습니다' : 'Some messages were trimmed to fit context window'}
      </p>
    </AutoDismissToast>
  );
}

/** 창작→번역 파이프라인 CTA — 에피소드 3개 이상 완성 시 번역 유도 */
function TranslateCtaToast() {
  const { lang } = useLang();
  const [detail, setDetail] = useState<{ sessionId: string; episodeCount: number } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ sessionId: string; episodeCount: number }>;
      if (custom.detail) setDetail(custom.detail);
    };
    window.addEventListener('noa:translate-cta', handler);
    return () => window.removeEventListener('noa:translate-cta', handler);
  }, []);

  if (!detail) return null;
  return (
    <AutoDismissToast variant="info" duration={10000} onDismiss={() => setDetail(null)}>
      <Languages className="w-5 h-5 text-accent-amber shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text-primary">
          {L4(lang, {
            ko: `${detail.episodeCount}화까지 완성됐습니다`,
            en: `${detail.episodeCount} episodes completed`,
            ja: `${detail.episodeCount}話まで完成しました`,
            zh: `已完成 ${detail.episodeCount} 章`,
          })}
        </p>
        <p className="text-xs text-text-secondary">
          {L4(lang, {
            ko: '번역·현지화 작업실로 바로 가시겠어요?',
            en: 'Jump to translation and localization?',
            ja: '翻訳・ローカライズへ進みますか?',
            zh: '前往翻译·本地化?',
          })}
        </p>
      </div>
      <a
        href={`/translation-studio?from=${encodeURIComponent(detail.sessionId)}`}
        onClick={() => setDetail(null)}
        className="shrink-0 px-3 py-2 min-h-[44px] bg-accent-amber/20 hover:bg-accent-amber/30 border border-accent-amber/30 text-accent-amber text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
      >
        {L4(lang, { ko: '열기', en: 'Open', ja: '開く', zh: '打开' })}
      </a>
    </AutoDismissToast>
  );
}

export default function StudioToasts({
  language, isKO,
  showSyncReminder, setShowSyncReminder, user, lastSyncTime, handleSync, signInWithGoogle,
  storageFull, setStorageFull, exportAllJSON,
  fallbackNotice, setFallbackNotice,
  exportDoneFormat, setExportDoneFormat,
  worldImportBanner, setWorldImportBanner,
  uxError, setUxError,
}: StudioToastsProps) {
  const t = createT(language);

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[var(--z-modal)] flex flex-col gap-2 w-full max-w-md px-4">
      {/* Sync Reminder */}
      {showSyncReminder && (
        <ToastCard variant="info" onClose={() => setShowSyncReminder(false)}>
          <Cloud className="w-5 h-5 text-accent-blue shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {user
                ? `${t('syncReminder.lastSyncPrefix')}${lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString(language === 'KO' ? 'ko-KR' : language === 'JP' ? 'ja-JP' : language === 'CN' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : t('syncReminder.never')}${t('syncReminder.lastSyncSuffix')}`
                : t('syncReminder.browserOnly')}
            </p>
          </div>
          <button 
            onClick={() => {
              setShowSyncReminder(false);
              if (user) handleSync();
              else signInWithGoogle();
            }}
            className="shrink-0 px-3 py-1.5 bg-accent-blue/20 hover:bg-accent-blue/30 border border-accent-blue/30 text-accent-blue text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            {user ? t('syncReminder.sync') : t('syncReminder.signIn')}
          </button>
        </ToastCard>
      )}

      {/* Storage Full Warning */}
      {storageFull && (
        <ToastCard variant="warning" onClose={() => setStorageFull(false)}>
          <AlertTriangle className="w-5 h-5 text-accent-amber shrink-0" />
          <p className="flex-1 text-sm font-medium text-text-primary">{t('ui.storageFull')}</p>
          <button 
            onClick={exportAllJSON}
            className="shrink-0 px-3 py-1.5 bg-accent-amber/20 hover:bg-accent-amber/30 border border-accent-amber/30 text-accent-amber text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3 h-3" />
            {isKO ? '백업' : 'Backup'}
          </button>
        </ToastCard>
      )}

      {/* Fallback Notice */}
      {fallbackNotice && (
        <AutoDismissToast variant="info" duration={5000} onDismiss={() => setFallbackNotice(null)}>
          <Info className="w-5 h-5 text-accent-blue shrink-0" />
          <p className="flex-1 text-sm font-medium text-text-primary">
            {isKO ? `제공자 자동 전환: ${fallbackNotice}` : `Provider auto-switched: ${fallbackNotice}`}
          </p>
        </AutoDismissToast>
      )}

      {/* Export Complete */}
      {exportDoneFormat && (
        <AutoDismissToast variant="success" duration={3000} onDismiss={() => setExportDoneFormat(null)}>
          <CheckCircle className="w-5 h-5 text-accent-green shrink-0" />
          <p className="flex-1 text-sm font-medium text-text-primary">
            {exportDoneFormat} {isKO ? '내보내기 완료' : 'export complete'}
          </p>
        </AutoDismissToast>
      )}

      {/* World Import Banner */}
      {worldImportBanner && (
        <AutoDismissToast variant="success" duration={4000} onDismiss={() => setWorldImportBanner(false)}>
          <Globe className="w-5 h-5 text-accent-green shrink-0" />
          <p className="flex-1 text-sm font-medium text-text-primary">
            {isKO ? '불러온 세계관을 적용했습니다' : 'Imported world context applied'}
          </p>
        </AutoDismissToast>
      )}

      {/* Token Truncation Alert */}
      <TokenTruncationToast isKO={isKO} />

      {/* 창작→번역 파이프라인 CTA */}
      <TranslateCtaToast />

      {/* Error Toast */}
      {uxError && (
        <ErrorToast
          error={uxError.error}
          language={language}
          onDismiss={() => setUxError(null)}
          onRetry={uxError.retry ? () => { setUxError(null); uxError.retry?.(); } : undefined}
        />
      )}
    </div>
  );
}
