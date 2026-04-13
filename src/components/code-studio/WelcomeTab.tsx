"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useCallback, useMemo, useState } from "react";
import { FileText, FolderOpen, GitBranch, Lightbulb, Clock, Plus } from "lucide-react";
import { useCodeStudioT } from "@/lib/use-code-studio-translations";

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

// IDENTITY_SEAL: PART-2 | role=Tips | inputs=useCodeStudioT | outputs=string[]

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
  const t = useCodeStudioT();
  const tips = useMemo(
    () => [t.welcomeTip1, t.welcomeTip2, t.welcomeTip3, t.welcomeTip4, t.welcomeTip5, t.welcomeTip6, t.welcomeTip7],
    [t],
  );
  const [tipIndex] = useState(() => Math.floor(Math.random() * 7));

  const actions = [
    { icon: <Plus size={16} />, label: t.welcomeActionNewFile, onClick: onNewFile, accent: "text-green-400" },
    { icon: <FolderOpen size={16} />, label: t.welcomeActionOpenFolder, onClick: onOpenFolder, accent: "text-blue-400" },
    { icon: <GitBranch size={16} />, label: t.welcomeActionCloneRepo, onClick: onCloneRepo, accent: "text-amber-400" },
  ].filter((a) => a.onClick);

  const [now] = useState(() => Date.now());
  const formatTime = useCallback(
    (ts: number) => {
      const diff = now - ts;
      if (diff < 60_000) return t.timeJustNow;
      if (diff < 3_600_000) return t.timeMinAgo.replace("{n}", String(Math.floor(diff / 60_000)));
      if (diff < 86_400_000) return t.timeHourAgo.replace("{n}", String(Math.floor(diff / 3_600_000)));
      return t.timeDayAgo.replace("{n}", String(Math.floor(diff / 86_400_000)));
    },
    [now, t.timeJustNow, t.timeMinAgo, t.timeHourAgo, t.timeDayAgo],
  );

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <h1 className="mb-2 text-2xl font-bold text-white">{t.title}</h1>
      <p className="mb-8 text-sm text-gray-500">{t.subtitle}</p>

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
            <Clock size={12} /> {t.welcomeRecentFiles}
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
        <span>{tips[tipIndex]}</span>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=WelcomeTabUI | inputs=recentFiles,actions | outputs=JSX
