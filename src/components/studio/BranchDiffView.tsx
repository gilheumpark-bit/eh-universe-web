"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React from 'react';
import { GitBranch, ArrowLeftRight } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

export interface BranchDiffViewProps {
  leftBranch: string;
  rightBranch: string;
  leftContent: string;
  rightContent: string;
  episode: number;
  language: AppLanguage;
}

/** Assign a stable color class based on branch name */
function branchBadgeClass(branch: string): string {
  if (branch === 'main') return 'bg-accent-blue/15 text-accent-blue border-accent-blue/30';
  if (branch.startsWith('universe/')) return 'bg-accent-amber/15 text-accent-amber border-accent-amber/30';
  return 'bg-accent-green/15 text-accent-green border-accent-green/30';
}

// ============================================================
// PART 2 — Content Column
// ============================================================

interface ContentColumnProps {
  branch: string;
  content: string;
  side: 'left' | 'right';
  language: AppLanguage;
}

const ContentColumn: React.FC<ContentColumnProps> = ({
  branch,
  content,
  side,
  language,
}) => {
  const badgeClass = branchBadgeClass(branch);
  const paragraphs = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div
      className={`flex-1 min-w-0 flex flex-col ${
        side === 'left' ? 'border-r border-border' : ''
      }`}
    >
      {/* Branch header badge */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border min-h-[44px]">
        <GitBranch className="w-3.5 h-3.5 shrink-0" />
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px]
            font-mono border ${badgeClass}`}
        >
          {branch}
        </span>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
        {paragraphs.length > 0 ? (
          paragraphs.map((para, idx) => (
            <p
              key={idx}
              className="text-xs font-serif text-text-primary leading-relaxed mb-3
                last:mb-0"
            >
              {para}
            </p>
          ))
        ) : (
          <div className="flex items-center justify-center py-8 text-text-tertiary">
            <span className="text-xs font-serif">
              {L4(language, {
                ko: '이 브랜치에 해당 에피소드가 없습니다',
                en: 'No content for this episode on this branch',
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// PART 3 — BranchDiffView Main Component
// ============================================================

const BranchDiffView: React.FC<BranchDiffViewProps> = ({
  leftBranch,
  rightBranch,
  leftContent,
  rightContent,
  episode,
  language,
}) => {
  return (
    <div className="flex flex-col h-full bg-bg-primary border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border
        bg-bg-secondary/50 min-h-[44px]">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-accent-amber shrink-0" />
          <span className="text-xs font-serif font-semibold text-text-primary">
            {L4(language, {
              ko: `${episode}화 비교`,
              en: `Episode ${episode} Comparison`,
            })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px]
              font-mono border ${branchBadgeClass(leftBranch)}`}
          >
            {leftBranch}
          </span>
          <ArrowLeftRight className="w-3 h-3 text-text-tertiary" />
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px]
              font-mono border ${branchBadgeClass(rightBranch)}`}
          >
            {rightBranch}
          </span>
        </div>
      </div>

      {/* Side-by-side columns */}
      <div className="flex flex-1 min-h-0">
        <ContentColumn
          branch={leftBranch}
          content={leftContent}
          side="left"
          language={language}
        />
        <ContentColumn
          branch={rightBranch}
          content={rightContent}
          side="right"
          language={language}
        />
      </div>
    </div>
  );
};

export default BranchDiffView;
