'use client';

// ============================================================
// PART 1 — Confirm Modal (replaces window.confirm)
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import { AlertTriangle, X, Copy, Check } from 'lucide-react';

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

export type ErrorType = 'network' | 'api_key' | 'rate_limit' | 'parse' | 'timeout' | 'unknown';

interface ErrorInfo {
  type: ErrorType;
  title: string;
  message: string;
  action?: string;
}

function classifyError(err: unknown, isKO: boolean): ErrorInfo {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('api_key') || lower.includes('401') || lower.includes('unauthorized')) {
    return {
      type: 'api_key',
      title: isKO ? 'API 키 오류' : 'API Key Error',
      message: isKO ? 'API 키가 없거나 만료되었습니다.' : 'API key is missing or expired.',
      action: isKO ? '설정 탭에서 API 키를 확인하세요' : 'Check your API key in Settings tab',
    };
  }
  if (lower.includes('429') || lower.includes('rate')) {
    return {
      type: 'rate_limit',
      title: isKO ? '요청 한도 초과' : 'Rate Limit',
      message: isKO ? 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' : 'API rate limit exceeded. Please wait and try again.',
    };
  }
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('econnrefused')) {
    return {
      type: 'network',
      title: isKO ? '네트워크 오류' : 'Network Error',
      message: isKO ? '서버에 연결할 수 없습니다. 인터넷 연결을 확인하세요.' : 'Cannot connect to server. Check your internet connection.',
    };
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return {
      type: 'timeout',
      title: isKO ? '시간 초과' : 'Timeout',
      message: isKO ? '응답 시간이 초과되었습니다. 다시 시도해주세요.' : 'Response timed out. Please try again.',
    };
  }
  if (lower.includes('json') || lower.includes('parse') || lower.includes('unexpected token')) {
    return {
      type: 'parse',
      title: isKO ? '응답 파싱 오류' : 'Parse Error',
      message: isKO ? 'AI 응답을 처리할 수 없습니다. 다시 시도해주세요.' : 'Cannot parse AI response. Please try again.',
    };
  }
  return {
    type: 'unknown',
    title: isKO ? '오류 발생' : 'Error',
    message: msg.slice(0, 200) || (isKO ? '알 수 없는 오류가 발생했습니다.' : 'An unknown error occurred.'),
  };
}

interface ErrorToastProps {
  error: unknown;
  isKO: boolean;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({ error, isKO, onDismiss, onRetry }) => {
  const info = classifyError(error, isKO);

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
          <button onClick={onDismiss} className="p-1 text-red-500/50 hover:text-red-400 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {onRetry && (
          <button onClick={onRetry} className="mt-3 w-full px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-300 hover:bg-red-500/30 transition-colors">
            {isKO ? '다시 시도' : 'Retry'}
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
  isKO: boolean;
  className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, isKO, className = '' }) => {
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
      title={isKO ? '복사' : 'Copy'}
      aria-label={isKO ? '복사' : 'Copy'}
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
  isKO: boolean;
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({ charCount, isKO }) => (
  <span className="inline-flex items-center gap-1.5 text-[10px] text-accent-purple font-mono">
    <span className="w-1.5 h-1.5 bg-accent-purple rounded-full animate-pulse" />
    {charCount > 0
      ? `${charCount.toLocaleString()}${isKO ? '자 생성 중...' : ' chars generating...'}`
      : (isKO ? '생성 중...' : 'Generating...')}
  </span>
);

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
