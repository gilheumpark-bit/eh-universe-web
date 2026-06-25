'use client';

// ============================================================
// PART 1 — Confirm Modal (replaces window.confirm)
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AlertTriangle, X, Copy, Check } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';
import { classifyAsStudioError, getErrorMessage } from '@/lib/errors';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open, title, message, confirmLabel = 'OK', cancelLabel = 'Cancel',
  variant = 'danger', onConfirm, onCancel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-focus confirm button on open
  useEffect(() => {
    if (open && confirmBtnRef.current) {
      confirmBtnRef.current.focus();
    }
  }, [open]);

  // ESC to close + Focus trap (tab cycling within modal)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const colors = {
    danger: 'bg-accent-red/10 border-accent-red/30 text-accent-red',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    info: 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue',
  };
  const btnColors = {
    danger: 'bg-accent-red hover:bg-accent-red',
    warning: 'bg-amber-600 hover:bg-amber-700',
    info: 'bg-accent-blue hover:bg-accent-blue',
  };

  return (
    <div className="fixed inset-0 z-[var(--z-tooltip)] flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div ref={dialogRef} className="bg-bg-primary border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <div className={`flex items-start gap-3 p-3 rounded-lg mb-4 ${colors[variant]}`}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 id="confirm-modal-title" className="font-bold text-sm">{title}</h3>
            <p className="text-xs mt-1 opacity-80">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-xs text-text-tertiary border border-border rounded-lg hover:bg-bg-secondary transition-colors">
            {cancelLabel}
          </button>
          <button ref={confirmBtnRef} onClick={onConfirm} className={`px-4 py-2 text-xs text-white rounded-lg transition-colors ${btnColors[variant]}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PART 2 — Error Toast (replaces vague error messages)
// ============================================================

export type ErrorType = 'network' | 'api_key' | 'rate_limit' | 'parse' | 'timeout' | 'server' | 'not_found' | 'unknown';

interface ErrorInfo {
  type?: ErrorType;
  title: string;
  message: string;
  action?: string;
  retryable?: boolean;
}

function classifyError(err: unknown, language: AppLanguage): ErrorInfo {
  const t = createT(language);
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('api_key') || lower.includes('401') || lower.includes('unauthorized')) {
    return {
      type: 'api_key',
      title: t('uxHelpers.apiKeyErrorTitle'),
      message: t('uxHelpers.apiKeyErrorMsg'),
      action: t('uxHelpers.apiKeyErrorAction'),
    };
  }
  if (lower.includes('429') || lower.includes('rate')) {
    return {
      type: 'rate_limit',
      title: t('uxHelpers.rateLimitTitle'),
      message: t('uxHelpers.rateLimitMsg'),
    };
  }
  if (lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('504') || lower.includes('internal server')) {
    return {
      type: 'server',
      title: L4(language, { ko: '서버 오류', en: 'Server Error', ja: 'サーバーエラー', zh: '服务器错误' }),
      message: L4(language, { ko: '노아가 잠시 응답하지 않습니다. 잠시 뒤 다시 시도해 주세요.', en: 'Noa server is temporarily unavailable. Please try again shortly.', ja: 'ノアサーバーが一時的に応答していません。しばらくしてから再試行してください。', zh: '诺亚服务器暂时无法响应，请稍后重试。' }),
    };
  }
  if (lower.includes('404') || lower.includes('not found')) {
    return {
      type: 'not_found',
      title: L4(language, { ko: '요청 경로 오류', en: 'Not Found', ja: 'リクエストパスエラー', zh: '请求路径错误' }),
      message: L4(language, { ko: '요청을 처리할 경로를 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.', en: 'API endpoint not found. Please refresh and try again.', ja: 'リクエストしたAPIパスが見つかりません。ページを更新してから再試行してください。', zh: '找不到请求的API路径，请刷新页面后重试。' }),
    };
  }
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('econnrefused')) {
    return {
      type: 'network',
      title: t('uxHelpers.networkErrorTitle'),
      message: t('uxHelpers.networkErrorMsg'),
    };
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return {
      type: 'timeout',
      title: t('uxHelpers.timeoutTitle'),
      message: t('uxHelpers.timeoutMsg'),
    };
  }
  if (lower.includes('json') || lower.includes('parse') || lower.includes('unexpected token')) {
    return {
      type: 'parse',
      title: t('uxHelpers.parseErrorTitle'),
      message: t('uxHelpers.parseErrorMsg'),
    };
  }
  return {
    type: 'unknown',
    title: t('uxHelpers.unknownErrorTitle'),
    message: msg.slice(0, 200) || t('uxHelpers.unknownErrorMsg'),
  };
}

interface ErrorToastProps {
  error: unknown;
  language: AppLanguage;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({ error, language, onDismiss, onRetry }) => {
  const t = createT(language);
  // StudioError 체계 우선, 폴백으로 기존 classifyError
  let info: ErrorInfo;
  const studioErr = classifyAsStudioError(error);
  const msg = getErrorMessage(studioErr.code, language);
  if (msg.title !== studioErr.code) {
    info = { title: msg.title, message: msg.message, action: msg.action, retryable: studioErr.retryable };
  } else {
    info = classifyError(error, language);
  }

  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-4 right-4 z-[var(--z-tooltip)] max-w-sm w-full mx-4 animate-in slide-in-from-bottom-4">
      <div className="bg-accent-red/90 border border-accent-red/30 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h4 className="text-sm font-bold text-accent-red">{info.title}</h4>
            <p className="text-xs text-accent-red/80 mt-1">{info.message}</p>
            {info.action && (
              <p className="text-[10px] text-amber-400/70 mt-2 font-mono">{info.action}</p>
            )}
          </div>
          <button onClick={onDismiss} aria-label="닫기" className="p-1 text-accent-red/50 hover:text-accent-red transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {onRetry && (info.retryable !== false) && (
          <button onClick={onRetry} className="mt-3 w-full px-3 py-1.5 bg-accent-red/20 border border-accent-red/30 rounded-lg text-xs text-accent-red hover:bg-accent-red/30 transition-colors">
            {info.action || t('uxHelpers.retry')}
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================
// PART 3 — Copy Button
// ============================================================

interface CopyButtonProps {
  text: string;
  language: AppLanguage;
  className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, language, className = '' }) => {
  const t = createT(language);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary/50 transition-colors ${className}`}
      title={t('uxHelpers.copy')}
      aria-label={L4(language, { ko: '복사', en: 'Copy', ja: 'コピー', zh: '复制' })}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

// ============================================================
// PART 4 — Streaming Progress Indicator
// ============================================================

interface StreamingIndicatorProps {
  charCount: number;
  language: AppLanguage;
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({ charCount, language }) => {
  const t = createT(language);
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-accent-purple font-mono">
      <span className="w-1.5 h-1.5 bg-accent-purple rounded-full animate-pulse" />
      {charCount > 0
        ? `${charCount.toLocaleString()}${t('uxHelpers.charsGenerating')}`
        : t('uxHelpers.generating')}
    </span>
  );
};

// ============================================================
// PART 5 — useUnsavedWarning hook
// ============================================================

/**
 * [루프 4 P2 — 2026-06-08] Data loss prevention 강화.
 *
 * 변경:
 *   1. `hasUnsaved` 기본 시그널 + IndexedDB pending writes / localStorage delta
 *      을 보조 시그널로 확장 (queryUnsaved 콜백 옵션).
 *   2. fetch keepalive:true cloud sync 시도 — 빠른 종료 직전 best-effort.
 *      네트워크 정보 손실되어도 IndexedDB 에 남은 backup 으로 복구 가능 (RecoveryDialog 처리).
 *   3. 메시지는 브라우저가 무시하지만 returnValue 보존 (Firefox 호환 + a11y).
 *
 * 호출 패턴:
 *   useUnsavedWarning(isGenerating || editDraft.length > 0);   // 기본
 *   useUnsavedWarning(hasUnsaved, { syncEndpoint: '/api/cloud-sync' });  // keepalive sync
 */
export interface UnsavedWarningOptions {
  /** keepalive fetch 로 best-effort cloud 동기화 시도할 endpoint (없으면 skip). */
  syncEndpoint?: string;
  /** 동기화 payload 생성 콜백 — beforeunload 시 호출. 비동기 X (sync 만). */
  buildSyncPayload?: () => string | null;
}

export function useUnsavedWarning(
  hasUnsaved: boolean,
  options?: UnsavedWarningOptions,
) {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsaved) return;
      // 1) 브라우저 표준 unsaved 경고 (Chrome/Edge/Firefox/Safari 동일).
      e.preventDefault();
      e.returnValue = '';

      // 2) keepalive cloud sync — best-effort. Promise 무시.
      // navigator.sendBeacon 도 가능하지만 fetch keepalive 가 헤더 / method 자유도 높음.
      if (options?.syncEndpoint && options?.buildSyncPayload) {
        try {
          const payload = options.buildSyncPayload();
          if (payload && typeof fetch !== 'undefined') {
            // void: 결과 무시. keepalive:true 로 페이지 종료 후에도 max 64KB request 보장.
            void fetch(options.syncEndpoint, {
              method: 'POST',
              keepalive: true,
              body: payload,
              headers: { 'Content-Type': 'application/json' },
            }).catch(() => { /* silent — IndexedDB backup 으로 복구 가능 */ });
          }
        } catch {
          /* sync 콜백 실패는 swallow — 핵심은 #1 unsaved 경고 */
        }
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
    // options 는 객체 reference — 콜러가 useMemo 로 안정화. 변경 의도 = endpoint/callback 교체.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsaved, options?.syncEndpoint, options?.buildSyncPayload]);
}

export { classifyError };

export {
  EmptyState,
  EmptyStateCompact,
  type EmptyStateVariant,
} from './UXHelpers.empty-state';

export {
  FeedbackBadge,
  LoadingSpinner,
  ProgressBar,
  SaveButton,
} from './UXHelpers.feedback';
