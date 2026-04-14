"use client";

// ============================================================
// ToolNav — shared navigation header for standalone tools
// ============================================================

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, PenTool, ArrowRightLeft } from 'lucide-react';


interface Props {
  /** Current tool's display name */
  toolName: string;
  /** Related tools for cross-linking */
  relatedTools?: { href: string; label: string }[];
  /** Language */
  isKO?: boolean;
}

export default function ToolNav({ toolName, relatedTools, isKO = true }: Props) {
  return (
    <div className="flex flex-col gap-2 mb-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px]">
        <Link href="/studio" className="flex items-center gap-1 text-text-tertiary hover:text-white transition-colors">
          <ChevronLeft className="w-3 h-3" />
          {isKO ? 'NOA 스튜디오' : 'NOA Studio'}
        </Link>
        <span className="text-text-tertiary/50">/</span>
        <Link href="/tools" className="text-text-tertiary hover:text-white transition-colors">
          {isKO ? '도구' : 'Tools'}
        </Link>
        <span className="text-text-tertiary/50">/</span>
        <span className="text-white font-bold">{toolName}</span>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/studio"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold bg-accent-purple/10 border border-accent-purple/20 text-accent-purple hover:bg-accent-purple/20 transition-all"
        >
          <PenTool className="w-3 h-3" />
          {isKO ? '스튜디오에서 열기' : 'Open in Studio'}
        </Link>

        {/* Related tools */}
        {relatedTools && relatedTools.length > 0 && (
          <>
            <span className="text-text-tertiary/30">|</span>
            <ArrowRightLeft className="w-3 h-3 text-text-tertiary/50" />
            {relatedTools.map(tool => (
              <Link
                key={tool.href}
                href={tool.href}
                className="px-2 py-1 rounded-lg text-[9px] font-bold text-text-tertiary border border-border/30 hover:border-white/20 hover:text-white transition-all"
              >
                {tool.label}
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export { TOOL_LINKS } from '@/lib/tool-links';
