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
import type { OpenFile } from "@/lib/code-studio/core/types";
import { LanguageSwitch } from "./LanguageSwitch";
import { L4 } from "@/lib/i18n";

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
      className="hidden sm:flex items-center justify-between px-3 bg-accent-purple text-[11px] leading-[11px] select-none overflow-x-auto shrink-0"
      style={{ height: 24, color: '#fff' }}
    >
      {/* ---- Left Section ---- */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Git branch */}
        <span className="flex items-center gap-1">
          <GitBranch size={12} /> {branch}
        </span>

        {SEPARATOR}

        {/* AI Provider (clickable) */}
        <button
          onClick={onSwitchProvider}
          className={`flex items-center gap-1 ${CLICKABLE}`}
          title={L4(lang || "ko", { ko: "AI 모델 변경", en: "Change AI Model", ja: "AIモデルを変更", zh: "更改 AI 模型" })}
          aria-label={L4(lang || "ko", { ko: "AI 모델 변경", en: "Change AI Model", ja: "AIモデルを変更", zh: "更改 AI 模型" })}
        >
          <Cpu size={10} />
          <span className="w-1.5 h-1.5 rounded-full bg-accent-purple shrink-0" />
          <span className="truncate max-w-[120px]">
            <Sparkles size={9} className="inline mr-0.5" />
            {L4(lang || "ko", { ko: "AI 제공자", en: "AI Provider", ja: "AIプロバイダー", zh: "AI 提供方" })}
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
              ? L4(lang || "ko", { ko: "미저장", en: "Unsaved", ja: "未保存", zh: "未保存" })
              : L4(lang || "ko", { ko: "저장됨", en: "Saved", ja: "保存済み", zh: "已保存" })}
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
            <div className="flex items-center gap-1 text-[10px] text-amber-300">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>AI</span>
            </div>
          </>
        )}
      </div>

      {/* ---- Right Section ---- */}
      <div className="flex items-center gap-3 shrink-0">
        <LanguageSwitch compact />
        {SEPARATOR}

        {activeFile && (
          <>
            {/* Cursor position */}
            {cursorLine != null && cursorColumn != null && (
              <span
                title={L4(lang || "ko", {
                  ko: `줄 ${cursorLine}, 열 ${cursorColumn}`,
                  en: `Ln ${cursorLine}, Col ${cursorColumn}`,
                  ja: `${cursorLine}行 ${cursorColumn}列`,
                  zh: `第 ${cursorLine} 行，第 ${cursorColumn} 列`,
                })}
              >
                {L4(lang || "ko", {
                  ko: `줄 ${cursorLine}, 열 ${cursorColumn}`,
                  en: `Ln ${cursorLine}, Col ${cursorColumn}`,
                  ja: `${cursorLine}行 ${cursorColumn}列`,
                  zh: `第 ${cursorLine} 行，第 ${cursorColumn} 列`,
                })}
              </span>
            )}

            {SEPARATOR}

            {/* Language */}
            <span
              title={L4(lang || "ko", {
                ko: `언어: ${activeFile.language}`,
                en: `Language: ${activeFile.language}`,
                ja: `言語: ${activeFile.language}`,
                zh: `语言: ${activeFile.language}`,
              })}
            >
              {activeFile.language}
            </span>

            {/* Line count */}
            <span className="hidden md:inline" title={L4(lang || "ko", { ko: "총 줄 수", en: "Total Lines", ja: "総行数", zh: "总行数" })}>
              {activeFile.content.split("\n").length}{" "}
              {L4(lang || "ko", { ko: "줄", en: "lines", ja: "行", zh: "行" })}
            </span>

            {/* File size */}
            <span className="hidden md:inline" title={L4(lang || "ko", { ko: "파일 크기", en: "File Size", ja: "ファイルサイズ", zh: "文件大小" })}>
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
