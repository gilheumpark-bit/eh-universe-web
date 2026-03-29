"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import {
  GitBranch,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Cpu,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { OpenFile } from "@/lib/code-studio-types";

interface StatusBarProps {
  activeFile: OpenFile | null;
  pipelineScore?: number | null;
  cursorLine?: number;
  cursorColumn?: number;
  fontSize?: number;
  gitBranch?: string;
  onSwitchProvider?: () => void;
  isDirty?: boolean;
  verificationScore?: number | null;
  isGenerating?: boolean;
  lang?: string;
}

export type { StatusBarProps };

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=StatusBarProps

// ============================================================
// PART 2 — Helper Functions
// ============================================================

function getScoreBadgeClasses(score: number): string {
  if (score >= 80) return "bg-green-500/30 text-green-300";
  if (score >= 50) return "bg-yellow-500/30 text-yellow-300";
  return "bg-red-500/30 text-red-300";
}

function getScoreIcon(score: number) {
  if (score >= 80) return <CheckCircle size={10} className="text-green-300" />;
  if (score >= 50) return <AlertTriangle size={10} className="text-yellow-300" />;
  return <XCircle size={10} className="text-red-300" />;
}

function computeFileSize(content: string): string {
  const bytes = new TextEncoder().encode(content).length;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// IDENTITY_SEAL: PART-2 | role=Helpers | inputs=score,content | outputs=classes,icon,size

// ============================================================
// PART 3 — StatusBar Component
// ============================================================

const SEPARATOR = <span className="w-px h-3 bg-white/20" />;
const CLICKABLE = "hover:bg-white/20 rounded px-1.5 py-0.5 transition-colors duration-150";

export function StatusBar({
  activeFile,
  pipelineScore,
  cursorLine,
  cursorColumn,
  fontSize,
  gitBranch,
  onSwitchProvider,
  isDirty,
  verificationScore,
  isGenerating,
  lang,
}: StatusBarProps) {
  const branch = gitBranch ?? "main";

  return (
    <div
      className="hidden sm:flex items-center justify-between px-3 bg-accent-purple text-white text-[11px] leading-[11px] select-none overflow-x-auto flex-shrink-0"
      style={{ height: 24 }}
    >
      {/* ---- Left Section ---- */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Git branch */}
        <span className="flex items-center gap-1">
          <GitBranch size={12} /> {branch}
        </span>

        {SEPARATOR}

        {/* AI Provider (clickable) */}
        <button
          onClick={onSwitchProvider}
          className={`flex items-center gap-1 ${CLICKABLE}`}
          title="AI 모델 변경"
          aria-label="AI 모델 변경"
        >
          <Cpu size={10} />
          <span className="w-1.5 h-1.5 rounded-full bg-accent-purple flex-shrink-0" />
          <span className="truncate max-w-[120px]">
            <Sparkles size={9} className="inline mr-0.5" />
            AI Provider
          </span>
        </button>

        {SEPARATOR}

        {/* Pipeline score badge */}
        {pipelineScore != null && (
          <span
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${getScoreBadgeClasses(pipelineScore)}`}
          >
            {getScoreIcon(pipelineScore)}
            {pipelineScore}/100
          </span>
        )}

        {SEPARATOR}

        {/* Save indicator */}
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${isDirty ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`} />
          <span className="text-[10px]">
            {isDirty
              ? (lang === 'ko' ? '미저장' : 'Unsaved')
              : (lang === 'ko' ? '저장됨' : 'Saved')}
          </span>
        </div>

        {/* Verification score badge */}
        {verificationScore != null && (
          <>
            {SEPARATOR}
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
              verificationScore >= 77 ? 'bg-green-500/15 text-green-300' :
              verificationScore >= 60 ? 'bg-amber-500/15 text-amber-300' :
              'bg-red-500/15 text-red-300'
            }`}>
              {verificationScore}/100
            </div>
          </>
        )}

        {/* AI generating indicator */}
        {isGenerating && (
          <>
            {SEPARATOR}
            <div className="flex items-center gap-1 text-[10px] text-purple-300">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>AI</span>
            </div>
          </>
        )}
      </div>

      {/* ---- Right Section ---- */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {activeFile && (
          <>
            {/* Cursor position */}
            {cursorLine != null && cursorColumn != null && (
              <span title={`줄 ${cursorLine}, 열 ${cursorColumn}`}>
                Ln {cursorLine}, Col {cursorColumn}
              </span>
            )}

            {SEPARATOR}

            {/* Language */}
            <span title={`언어: ${activeFile.language}`}>
              {activeFile.language}
            </span>

            {/* Line count */}
            <span className="hidden md:inline" title="총 줄 수">
              {activeFile.content.split("\n").length} lines
            </span>

            {/* File size */}
            <span className="hidden md:inline" title="파일 크기">
              {computeFileSize(activeFile.content)}
            </span>
          </>
        )}

        {SEPARATOR}

        {/* Font size indicator */}
        {fontSize != null && (
          <span className="opacity-70">{fontSize}px</span>
        )}

        <span className="opacity-60">EH Studio</span>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=StatusBar | inputs=StatusBarProps | outputs=JSX
