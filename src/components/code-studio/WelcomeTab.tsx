"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useEffect, useState } from "react";
import { FileText, FolderOpen, GitBranch, Lightbulb, Clock, Plus } from "lucide-react";

interface RecentFileInfo {
  fileId: string;
  fileName: string;
  timestamp: number;
}

interface WelcomeTabProps {
  recentFiles: RecentFileInfo[];
  onOpenFile: (fileId: string) => void;
  onNewFile: () => void;
  onOpenFolder?: () => void;
  onCloneRepo?: () => void;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=RecentFileInfo

// ============================================================
// PART 2 — Tips
// ============================================================

const TIPS = [
  "Press Ctrl+P to quickly open any file",
  "Use @filename in chat to reference a file",
  "Ctrl+Shift+P opens the command palette",
  "Type @ to search symbols across your project",
  "F1-F8 switches between open tabs",
  "Ctrl+I triggers AI inline suggestions",
  "Use the agent pipeline for multi-step code generation",
];

// IDENTITY_SEAL: PART-2 | role=Tips | inputs=none | outputs=string[]

// ============================================================
// PART 3 — Component
// ============================================================

export default function WelcomeTab({
  recentFiles,
  onOpenFile,
  onNewFile,
  onOpenFolder,
  onCloneRepo,
}: WelcomeTabProps) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    setTipIndex(Math.floor(Math.random() * TIPS.length));
  }, []);

  const actions = [
    { icon: <Plus size={16} />, label: "New File", onClick: onNewFile, accent: "text-green-400" },
    { icon: <FolderOpen size={16} />, label: "Open Folder", onClick: onOpenFolder, accent: "text-blue-400" },
    { icon: <GitBranch size={16} />, label: "Clone Repository", onClick: onCloneRepo, accent: "text-purple-400" },
  ].filter((a) => a.onClick);

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  };

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <h1 className="mb-2 text-2xl font-bold text-white">Code Studio</h1>
      <p className="mb-8 text-sm text-gray-500">AI-powered development environment</p>

      {/* Quick actions */}
      <div className="mb-8 flex gap-4">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
          >
            <span className={a.accent}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>

      {/* Recent files */}
      {recentFiles.length > 0 && (
        <div className="mb-8 w-full max-w-md">
          <h3 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            <Clock size={12} /> Recent Files
          </h3>
          <div className="space-y-1">
            {recentFiles.slice(0, 8).map((f) => (
              <button
                key={f.fileId}
                onClick={() => onOpenFile(f.fileId)}
                className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
              >
                <FileText size={14} className="text-blue-400" />
                <span className="truncate">{f.fileName}</span>
                <span className="ml-auto text-xs text-gray-600">{formatTime(f.timestamp)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tip */}
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <Lightbulb size={12} className="text-yellow-500" />
        <span>{TIPS[tipIndex]}</span>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=WelcomeTabUI | inputs=recentFiles,actions | outputs=JSX
