'use client';

// ============================================================
// PART 1 — Confirm Modal (replaces window.confirm)
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
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
      <div className="bg-bg-primary border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
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
      title: L4(language, { ko: '서버 오류', en: 'Server Error', jp: 'サーバーエラー', cn: '服务器错误' }),
      message: L4(language, { ko: 'AI 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요.', en: 'AI server is temporarily unavailable. Please try again shortly.', jp: 'AIサーバーが一時的に応答していません。しばらくしてから再試行してください。', cn: 'AI服务器暂时无法响应，请稍后重试。' }),
    };
  }
  if (lower.includes('404') || lower.includes('not found')) {
    return {
      type: 'not_found',
      title: L4(language, { ko: '요청 경로 오류', en: 'Not Found', jp: 'リクエストパスエラー', cn: '请求路径错误' }),
      message: L4(language, { ko: '요청한 API 경로를 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.', en: 'API endpoint not found. Please refresh and try again.', jp: 'リクエストしたAPIパスが見つかりません。ページを更新してから再試行してください。', cn: '找不到请求的API路径，请刷新页面后重试。' }),
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
      className={`p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary/50 transition-colors ${className}`}
      title={t('uxHelpers.copy')}
      aria-label={L4(language, { ko: '복사', en: 'Copy', jp: 'コピー', cn: '复制' })}
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

// ============================================================
// PART 6 — Empty State Component
// ============================================================

import { 
  FileText, Users, Wand2, BookOpen, PenTool, Layers, 
  FolderOpen, Sparkles, MessageSquare, Settings, Globe,
  type LucideIcon 
} from 'lucide-react';

export type EmptyStateVariant = 
  | 'characters' 
  | 'projects' 
  | 'manuscripts' 
  | 'world' 
  | 'writing' 
  | 'items' 
  | 'documents' 
  | 'comments' 
  | 'settings'
  | 'network'
  | 'generic';

interface EmptyStateConfig {
  icon: LucideIcon;
  gradient: string;
  glow: string;
}

const EMPTY_STATE_CONFIGS: Record<EmptyStateVariant, EmptyStateConfig> = {
  characters: { 
    icon: Users, 
    gradient: 'from-accent-purple/20 to-accent-blue/10',
    glow: 'shadow-[0_0_60px_rgba(141,123,195,0.15)]'
  },
  projects: { 
    icon: FolderOpen, 
    gradient: 'from-accent-amber/20 to-accent-purple/10',
    glow: 'shadow-[0_0_60px_rgba(202,161,92,0.15)]'
  },
  manuscripts: { 
    icon: FileText, 
    gradient: 'from-accent-green/20 to-accent-blue/10',
    glow: 'shadow-[0_0_60px_rgba(47,155,131,0.15)]'
  },
  world: { 
    icon: Globe, 
    gradient: 'from-accent-blue/20 to-accent-purple/10',
    glow: 'shadow-[0_0_60px_rgba(92,143,214,0.15)]'
  },
  writing: { 
    icon: PenTool, 
    gradient: 'from-accent-purple/20 to-accent-amber/10',
    glow: 'shadow-[0_0_60px_rgba(141,123,195,0.15)]'
  },
  items: { 
    icon: Layers, 
    gradient: 'from-accent-amber/20 to-accent-green/10',
    glow: 'shadow-[0_0_60px_rgba(202,161,92,0.15)]'
  },
  documents: { 
    icon: BookOpen, 
    gradient: 'from-accent-blue/20 to-accent-green/10',
    glow: 'shadow-[0_0_60px_rgba(92,143,214,0.15)]'
  },
  comments: { 
    icon: MessageSquare, 
    gradient: 'from-accent-green/20 to-accent-blue/10',
    glow: 'shadow-[0_0_60px_rgba(47,155,131,0.15)]'
  },
  settings: { 
    icon: Settings, 
    gradient: 'from-bg-tertiary to-bg-secondary',
    glow: ''
  },
  network: { 
    icon: Globe, 
    gradient: 'from-accent-purple/20 to-accent-blue/10',
    glow: 'shadow-[0_0_60px_rgba(141,123,195,0.15)]'
  },
  generic: { 
    icon: Sparkles, 
    gradient: 'from-accent-purple/15 to-transparent',
    glow: ''
  },
};

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'generic',
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  className = '',
}) => {
  const config = EMPTY_STATE_CONFIGS[variant];
  const Icon = config.icon;

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      {/* Icon Container with Glow */}
      <div className={`relative mb-6 ${config.glow}`}>
        <div className={`
          w-24 h-24 rounded-3xl bg-gradient-to-br ${config.gradient}
          border border-white/[0.08] backdrop-blur-sm
          flex items-center justify-center
          animate-in zoom-in-50 duration-500
        `}>
          <Icon className="w-10 h-10 text-text-secondary" strokeWidth={1.5} />
        </div>
        {/* Decorative rings */}
        <div className="absolute inset-0 rounded-3xl border border-white/[0.04] scale-110 -z-10" />
        <div className="absolute inset-0 rounded-3xl border border-white/[0.02] scale-125 -z-20" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-text-primary mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-text-tertiary max-w-sm mb-6 leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
          {description}
        </p>
      )}

      {/* Actions */}
      {(actionLabel || secondaryLabel) && (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-5 py-2.5 bg-gradient-to-r from-accent-purple to-accent-purple/80 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-accent-purple/20 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondary && (
            <button
              onClick={onSecondary}
              className="px-5 py-2.5 bg-bg-secondary text-text-secondary text-sm font-medium rounded-xl border border-border hover:border-text-tertiary hover:text-text-primary transition-all duration-200"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/** Compact empty state for smaller areas */
export const EmptyStateCompact: React.FC<Omit<EmptyStateProps, 'secondaryLabel' | 'onSecondary'>> = ({
  variant = 'generic',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  const config = EMPTY_STATE_CONFIGS[variant];
  const Icon = config.icon;

  return (
    <div className={`flex flex-col items-center justify-center py-8 px-4 text-center ${className}`}>
      <div className={`
        w-14 h-14 rounded-2xl bg-gradient-to-br ${config.gradient}
        border border-white/[0.08] flex items-center justify-center mb-4
      `}>
        <Icon className="w-6 h-6 text-text-tertiary" strokeWidth={1.5} />
      </div>
      <h4 className="text-sm font-bold text-text-secondary mb-1">{title}</h4>
      {description && (
        <p className="text-xs text-text-tertiary max-w-[200px] mb-3">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-3 py-1.5 bg-accent-purple/20 text-accent-purple text-xs font-bold rounded-lg hover:bg-accent-purple/30 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

// ============================================================
// PART 7 — Progress Bar & Loading Indicators
// ============================================================

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  sublabel?: string;
  variant?: 'default' | 'gradient' | 'glow';
  size?: 'sm' | 'md' | 'lg';
  showPercent?: boolean;
  indeterminate?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  sublabel,
  variant = 'gradient',
  size = 'md',
  showPercent = true,
  indeterminate = false,
  className = '',
}) => {
  const percent = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;
  
  const heights = { sm: 'h-1', md: 'h-2', lg: 'h-3' };
  const height = heights[size];

  const gradients = {
    default: 'bg-accent-purple',
    gradient: 'bg-gradient-to-r from-accent-purple via-accent-blue to-accent-green',
    glow: 'bg-accent-purple shadow-[0_0_12px_rgba(141,123,195,0.5)]',
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercent) && (
        <div className="mb-2 flex items-center justify-between">
          <div>
            {label && <span className="text-xs font-medium text-text-secondary">{label}</span>}
            {sublabel && <span className="text-[10px] text-text-tertiary ml-2">{sublabel}</span>}
          </div>
          {showPercent && !indeterminate && (
            <span className="text-xs font-bold font-mono text-accent-purple">
              {Math.round(percent)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-white/[0.06] ${height}`}>
        {indeterminate ? (
          <div className={`${height} w-1/3 rounded-full ${gradients[variant]} animate-[progress-slide_1.5s_ease-in-out_infinite]`} />
        ) : (
          <div
            className={`${height} rounded-full transition-all duration-500 ease-out ${gradients[variant]}`}
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================
// PART 8 — Success/Error Feedback Components
// ============================================================

interface FeedbackBadgeProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  className?: string;
}

export const FeedbackBadge: React.FC<FeedbackBadgeProps> = ({ type, message, className = '' }) => {
  const styles = {
    success: 'bg-accent-green/15 border-accent-green/30 text-accent-green',
    error: 'bg-accent-red/15 border-accent-red/30 text-accent-red animate-error-shake',
    warning: 'bg-accent-amber/15 border-accent-amber/30 text-accent-amber',
    info: 'bg-accent-blue/15 border-accent-blue/30 text-accent-blue',
  };

  const icons = {
    success: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path className="animate-checkmark" d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    error: <span className="text-sm">!</span>,
    warning: <span className="text-sm">!</span>,
    info: <span className="text-sm">i</span>,
  };

  return (
    <div className={`
      inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium
      animate-in fade-in zoom-in-95 duration-200
      ${styles[type]} ${type === 'success' ? 'animate-success-pulse' : ''} ${className}
    `}>
      <span className="flex items-center justify-center w-4 h-4">{icons[type]}</span>
      {message}
    </div>
  );
};

/** Inline loading spinner with optional message */
export const LoadingSpinner: React.FC<{ message?: string; size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  message,
  size = 'md',
  className = '',
}) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${sizes[size]} border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin`} />
      {message && <span className="text-sm text-text-secondary animate-pulse">{message}</span>}
    </div>
  );
};

/** Save button with built-in success state */
export const SaveButton: React.FC<{
  onClick: () => void;
  saving?: boolean;
  saved?: boolean;
  label?: string;
  savedLabel?: string;
  className?: string;
}> = ({ onClick, saving, saved, label = 'Save', savedLabel = 'Saved', className = '' }) => {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`
        relative px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200
        ${saved 
          ? 'bg-accent-green text-white animate-save-success' 
          : saving
            ? 'bg-accent-purple/50 text-white cursor-wait'
            : 'bg-gradient-to-r from-accent-purple to-accent-purple/80 text-white hover:shadow-lg hover:shadow-accent-purple/20 hover:-translate-y-0.5 active:scale-95'
        }
        ${className}
      `}
    >
      {saving ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Saving...
        </span>
      ) : saved ? (
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path className="animate-checkmark" d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {savedLabel}
        </span>
      ) : (
        label
      )}
    </button>
  );
};
