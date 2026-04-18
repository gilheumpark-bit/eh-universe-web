'use client';

// ============================================================
// TabHeader — 모든 스튜디오 탭 공통 1줄 헤더
// 아이콘(이모지/Lucide) + 제목 + 설명 + 우측 액션 슬롯
// ============================================================

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface TabHeaderProps {
  /** 이모지 문자열(예: '✍️') 또는 Lucide 아이콘 컴포넌트 */
  icon?: LucideIcon | string;
  title: string;
  description?: string;
  /** 우측 CTA(버튼/링크/배지 등) */
  action?: React.ReactNode;
  className?: string;
}

export function TabHeader({ icon, title, description, action, className = '' }: TabHeaderProps) {
  // [C] icon prop 분기: string은 이모지, 함수는 Lucide. 둘 다 aria-hidden으로 SR 중복 발화 방지.
  let IconEl: React.ReactNode = null;
  if (typeof icon === 'string') {
    IconEl = (
      <span className="text-xl shrink-0" aria-hidden="true">
        {icon}
      </span>
    );
  } else if (icon) {
    // Lucide 아이콘은 함수 컴포넌트 — createElement로 className/aria 주입.
    IconEl = React.createElement(icon as LucideIcon, {
      className: 'w-5 h-5 text-text-tertiary shrink-0',
      'aria-hidden': 'true',
    });
  }

  return (
    <header
      className={`flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-bg-secondary/30 ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {IconEl}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text-primary truncate">{title}</h2>
          {description && (
            <p className="text-xs text-text-secondary truncate">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </header>
  );
}

export default TabHeader;
