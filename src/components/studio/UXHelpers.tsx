'use client';

// ============================================================
// PART 1 — Confirm Modal (replaces window.confirm)
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import { AlertTriangle, X, Copy, Check } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';

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
  if (!open) return null;

  const colors = {
    danger: 'bg-red-500/10 border-red-500/30 text-red-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };
  const btnColors = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-amber-600 hover:bg-amber-700',
    info: 'bg-blue-600 hover:bg-blue-700',
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div className="bg-bg-primary border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className={`flex items-start gap-3 p-3 rounded-lg mb-4 ${colors[variant]}`}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">{title}</h3>
            <p className="text-xs mt-1 opacity-80">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-xs text-text-tertiary border border-border rounded-lg hover:bg-bg-secondary transition-colors">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-xs text-white rounded-lg transition-colors ${btnColors[variant]}`}>
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
      title: language === 'KO' ? '서버 오류' : 'Server Error',
      message: language === 'KO' ? 'AI 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요.' : 'AI server is temporarily unavailable. Please try again shortly.',
    };
  }
  if (lower.includes('404') || lower.includes('not found')) {
    return {
      type: 'not_found',
      title: language === 'KO' ? '요청 경로 오류' : 'Not Found',
      message: language === 'KO' ? '요청한 API 경로를 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.' : 'API endpoint not found. Please refresh and try again.',
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
  try {
    const { classifyAsStudioError, getErrorMessage } = require('@/lib/errors');
    const studioErr = classifyAsStudioError(error);
    const msg = getErrorMessage(studioErr.code, language);
    info = { title: msg.title, message: msg.message, action: msg.action, retryable: studioErr.retryable };
  } catch {
    info = classifyError(error, language);
  }

  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-4 right-4 z-[9990] max-w-sm w-full mx-4 animate-in slide-in-from-bottom-4">
      <div className="bg-red-950/90 border border-red-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h4 className="text-sm font-bold text-red-400">{info.title}</h4>
            <p className="text-xs text-red-300/80 mt-1">{info.message}</p>
            {info.action && (
              <p className="text-[10px] text-amber-400/70 mt-2 font-mono">{info.action}</p>
            )}
          </div>
          <button onClick={onDismiss} aria-label="닫기" className="p-1 text-red-500/50 hover:text-red-400 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {onRetry && (info.retryable !== false) && (
          <button onClick={onRetry} className="mt-3 w-full px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-300 hover:bg-red-500/30 transition-colors">
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
      className={`p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors ${className}`}
      title={t('uxHelpers.copy')}
      aria-label={language === 'KO' ? '복사' : 'Copy'}
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

export function useUnsavedWarning(hasUnsaved: boolean) {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsaved) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsaved]);
}

export { classifyError };
