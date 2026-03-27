import React, { ReactNode } from 'react';

// ============================================================
// EmptyState — 재사용 빈 상태 컴포넌트
// ============================================================

interface EmptyStateProps {
  /** 아이콘 (lucide-react 또는 이모지) */
  icon?: ReactNode;
  /** 제목 */
  title: string;
  /** 설명 */
  description?: string;
  /** CTA 버튼 */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** 추가 클래스 */
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      {icon && (
        <div className="text-text-tertiary mb-3 opacity-40">
          {typeof icon === 'string' ? (
            <span className="text-3xl">{icon}</span>
          ) : (
            icon
          )}
        </div>
      )}
      <h3 className="text-sm font-bold text-text-secondary mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-[11px] text-text-tertiary max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-5 py-2 rounded-xl text-xs font-bold bg-accent-purple/20 border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/30 transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
