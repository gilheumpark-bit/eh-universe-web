'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, Check, CheckCircle2, Info } from 'lucide-react';
import { ProgressFill } from '@/components/studio/ProgressFill';

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
          <ProgressFill
            value={percent}
            className={`${height} rounded-full transition-[transform,opacity,background-color,border-color,color] duration-500 ease-out ${gradients[variant]}`}
          />
        )}
      </div>
    </div>
  );
};

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
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };
  const Icon = icons[type];

  return (
    <div className={`
      inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium
      animate-in fade-in zoom-in-95 duration-200
      ${styles[type]} ${type === 'success' ? 'animate-success-pulse' : ''} ${className}
    `}>
      <span className="flex items-center justify-center w-4 h-4">
        <Icon className="w-4 h-4" />
      </span>
      {message}
    </div>
  );
};

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
        relative px-5 py-2.5 rounded-xl font-bold text-sm transition-[transform,opacity,background-color,border-color,color] duration-200
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
          <Check className="w-4 h-4 animate-checkmark" />
          {savedLabel}
        </span>
      ) : (
        label
      )}
    </button>
  );
};
