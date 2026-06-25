'use client';

import React from 'react';
import {
  FileText,
  Users,
  Wand2,
  BookOpen,
  PenTool,
  Layers,
  FolderOpen,
  Sparkles,
  MessageSquare,
  Settings,
  Globe,
  type LucideIcon,
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
    glow: 'shadow-[0_0_60px_rgba(141,123,195,0.15)]',
  },
  projects: {
    icon: FolderOpen,
    gradient: 'from-accent-amber/20 to-accent-purple/10',
    glow: 'shadow-[0_0_60px_rgba(202,161,92,0.15)]',
  },
  manuscripts: {
    icon: FileText,
    gradient: 'from-accent-green/20 to-accent-blue/10',
    glow: 'shadow-[0_0_60px_rgba(47,155,131,0.15)]',
  },
  world: {
    icon: Globe,
    gradient: 'from-accent-blue/20 to-accent-purple/10',
    glow: 'shadow-[0_0_60px_rgba(92,143,214,0.15)]',
  },
  writing: {
    icon: PenTool,
    gradient: 'from-accent-purple/20 to-accent-amber/10',
    glow: 'shadow-[0_0_60px_rgba(141,123,195,0.15)]',
  },
  items: {
    icon: Layers,
    gradient: 'from-accent-amber/20 to-accent-green/10',
    glow: 'shadow-[0_0_60px_rgba(202,161,92,0.15)]',
  },
  documents: {
    icon: BookOpen,
    gradient: 'from-accent-blue/20 to-accent-green/10',
    glow: 'shadow-[0_0_60px_rgba(92,143,214,0.15)]',
  },
  comments: {
    icon: MessageSquare,
    gradient: 'from-accent-green/20 to-accent-blue/10',
    glow: 'shadow-[0_0_60px_rgba(47,155,131,0.15)]',
  },
  settings: {
    icon: Settings,
    gradient: 'from-bg-tertiary to-bg-secondary',
    glow: '',
  },
  network: {
    icon: Globe,
    gradient: 'from-accent-purple/20 to-accent-blue/10',
    glow: 'shadow-[0_0_60px_rgba(141,123,195,0.15)]',
  },
  generic: {
    icon: Sparkles,
    gradient: 'from-accent-purple/15 to-transparent',
    glow: '',
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
      <div className={`relative mb-6 ${config.glow}`}>
        <div className={`
          w-24 h-24 rounded-3xl bg-gradient-to-br ${config.gradient}
          border border-white/[0.08] backdrop-blur-sm
          flex items-center justify-center
          animate-in zoom-in-50 duration-500
        `}>
          <Icon className="w-10 h-10 text-text-secondary" strokeWidth={1.5} />
        </div>
        <div className="absolute inset-0 rounded-3xl border border-white/[0.04] scale-110 -z-10" />
        <div className="absolute inset-0 rounded-3xl border border-white/[0.02] scale-125 -z-20" />
      </div>

      <h3 className="text-lg font-bold text-text-primary mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-text-tertiary max-w-sm mb-6 leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
          {description}
        </p>
      )}

      {(actionLabel || secondaryLabel) && (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-5 py-2.5 bg-gradient-to-r from-accent-purple to-accent-purple/80 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-accent-purple/20 hover:-translate-y-0.5 transition-transform duration-200 flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondary && (
            <button
              onClick={onSecondary}
              className="px-5 py-2.5 bg-bg-secondary text-text-secondary text-sm font-medium rounded-xl border border-border hover:border-text-tertiary hover:text-text-primary transition-colors duration-200"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

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
