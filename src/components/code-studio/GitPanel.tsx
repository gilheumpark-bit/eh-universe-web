"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  GitBranch,
  GitCommit,
  History,
  RotateCcw,
  Check,
  FileText,
  Plus,
  ChevronDown,
} from "lucide-react";
import type { FileNode, OpenFile } from "@/lib/code-studio-types";
import {
  gitStatus,
  gitCommit as gitRealCommit,
  gitStageAll,
  gitCheckout,
  gitCreateBranch,
  type GitStatus,
} from "@/lib/code-studio-git";
import { generateCommitMessage } from "@/lib/code-studio-ai-features";
import { useLang } from "@/lib/LangContext";

// ============================================================
// PART 1 — Types & Constants
// ============================================================

interface GitPanelProps {
  files: FileNode[];
  openFiles: OpenFile[];
  onRestore: (fileId: string, content: string) => void;
  onClearDirty?: () => void;
}

interface FileSnapshot {
  fileId: string;
  fileName: string;
  content: string;
  linesBefore: number;
  linesAfter: number;
}

interface CommitEntry {
  hash: string;
  message: string;
  timestamp: number;
  files: FileSnapshot[];
}

type TabId = "changes" | "history";

const MAX_HISTORY = 50;

// IDENTITY_SEAL: PART-1 | role=TypeDefinitions | inputs=none | outputs=GitPanelProps,CommitEntry,FileSnapshot

// ============================================================
// PART 2 — Utilities
// ============================================================

function generateHash(): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < 40; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function shortHash(hash: string): string {
  return hash.slice(0, 7);
}

function countLines(content: string | undefined): number {
  if (!content) return 0;
  return content.split("\n").length;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = Date.now();
  const diffMs = now - ts;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildCommitMessage(fileNames: string[]): string {
  if (fileNames.length === 0) return "empty commit";
  if (fileNames.length === 1) return `modify ${fileNames[0]}`;
  if (fileNames.length <= 3) return `modify ${fileNames.join(", ")}`;
  return `modify ${fileNames[0]} and ${fileNames.length - 1} more files`;
}

function flattenFiles(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  for (const node of nodes) {
    if (node.type === "file") result.push(node);
    if (node.children) result.push(...flattenFiles(node.children));
  }
  return result;
}

// IDENTITY_SEAL: PART-2 | role=Utilities | inputs=string,number,FileNode[] | outputs=string,number,FileNode[]

// ============================================================
// PART 3 — Diff Preview Sub-component
// ============================================================

interface DiffPreviewProps {
  snapshot: FileSnapshot;
}

function DiffPreview({ snapshot }: DiffPreviewProps) {
  const added = Math.max(0, snapshot.linesAfter - snapshot.linesBefore);
  const removed = Math.max(0, snapshot.linesBefore - snapshot.linesAfter);
  const unchanged = Math.min(snapshot.linesBefore, snapshot.linesAfter);

  return (
    <div className="mt-2 rounded border border-border/30 bg-bg-primary/50 p-2 text-xs">
      <div className="mb-1 font-[family-name:var(--font-mono)] text-text-tertiary">
        {snapshot.fileName}
      </div>
      <div className="flex gap-3">
        <span className="text-text-tertiary">
          {unchanged} unchanged
        </span>
        {added > 0 && (
          <span className="text-accent-green">+{added} lines</span>
        )}
        {removed > 0 && (
          <span className="text-accent-red">-{removed} lines</span>
        )}
      </div>
      <div className="mt-1 text-text-tertiary">
        {snapshot.linesBefore} lines → {snapshot.linesAfter} lines
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=DiffPreview | inputs=FileSnapshot | outputs=JSX

// ============================================================
// PART 4 — Changes Tab
// ============================================================

interface ChangesTabProps {
  dirtyFiles: OpenFile[];
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onCommit: () => void;
  fileTree: FileNode[];
}

function ChangesTab({
  dirtyFiles,
  selectedFileId,
  onSelectFile,
  onCommit,
  fileTree,
}: ChangesTabProps) {
  const { lang: cLang } = useLang();
  const ko = cLang === "ko";
  const flatFiles = useMemo(() => flattenFiles(fileTree), [fileTree]);

  const selectedSnapshot = useMemo(() => {
    if (!selectedFileId) return null;
    const dirty = dirtyFiles.find((f) => f.id === selectedFileId);
    const original = flatFiles.find((f) => f.id === selectedFileId);
    if (!dirty) return null;
    return {
      fileId: dirty.id,
      fileName: dirty.name,
      content: dirty.content,
      linesBefore: countLines(original?.content),
      linesAfter: countLines(dirty.content),
    } satisfies FileSnapshot;
  }, [selectedFileId, dirtyFiles, flatFiles]);

  if (dirtyFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
        <Check size={24} className="mb-2 opacity-50" />
        <span className="text-sm">{ko ? "변경 사항 없음" : "No pending changes"}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* File list */}
      <div className="space-y-0.5">
        {dirtyFiles.map((file) => (
          <button
            key={file.id}
            onClick={() => onSelectFile(file.id)}
            className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors ${
              selectedFileId === file.id
                ? "bg-accent-amber/10 text-accent-amber"
                : "text-text-secondary hover:bg-bg-primary/50 hover:text-text-primary"
            }`}
          >
            <FileText size={14} className="shrink-0 text-accent-amber" />
            <span className="truncate font-[family-name:var(--font-mono)] text-xs">
              {file.name}
            </span>
            <span className="ml-auto shrink-0 rounded bg-accent-amber/15 px-1.5 py-0.5 text-[10px] font-medium text-accent-amber">
              M
            </span>
          </button>
        ))}
      </div>

      {/* Diff preview */}
      {selectedSnapshot && <DiffPreview snapshot={selectedSnapshot} />}

      {/* Commit button */}
      <button
        onClick={onCommit}
        className="mt-1 flex items-center justify-center gap-2 rounded bg-accent-green/15 px-3 py-1.5 text-sm font-medium text-accent-green transition-colors hover:bg-accent-green/25"
      >
        <GitCommit size={14} />
        Commit {dirtyFiles.length} file{dirtyFiles.length > 1 ? "s" : ""}
      </button>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=ChangesTab | inputs=OpenFile[],FileNode[] | outputs=JSX

// ============================================================
// PART 5 — History Tab
// ============================================================

interface HistoryTabProps {
  commits: CommitEntry[];
  expandedHash: string | null;
  onToggleExpand: (hash: string) => void;
  onRestore: (commit: CommitEntry) => void;
}

function HistoryTab({
  commits,
  expandedHash,
  onToggleExpand,
  onRestore,
}: HistoryTabProps) {
  const { lang: hLang } = useLang();
  if (commits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
        <History size={24} className="mb-2 opacity-50" />
        <span className="text-sm">{hLang === "ko" ? "커밋 기록 없음" : "No commit history"}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {commits.map((commit) => {
        const isExpanded = expandedHash === commit.hash;

        return (
          <div
            key={commit.hash}
            className="rounded border border-border/20 bg-bg-primary/30"
          >
            {/* Commit header */}
            <button
              onClick={() => onToggleExpand(commit.hash)}
              className="flex w-full items-start gap-2 px-2 py-1.5 text-left transition-colors hover:bg-bg-primary/50"
            >
              <GitCommit
                size={14}
                className="mt-0.5 shrink-0 text-accent-green"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-text-primary">
                  {commit.message}
                </div>
                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                  <span className="font-[family-name:var(--font-mono)]">
                    {shortHash(commit.hash)}
                  </span>
                  <span>{formatTimestamp(commit.timestamp)}</span>
                  <span>
                    {commit.files.length} file
                    {commit.files.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t border-border/20 px-2 py-2">
                <div className="space-y-1">
                  {commit.files.map((snap) => (
                    <DiffPreview key={snap.fileId} snapshot={snap} />
                  ))}
                </div>
                <button
                  onClick={() => onRestore(commit)}
                  className="mt-2 flex items-center gap-1.5 rounded bg-accent-amber/15 px-2.5 py-1 text-xs font-medium text-accent-amber transition-colors hover:bg-accent-amber/25"
                >
                  <RotateCcw size={12} />
                  Restore this version
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// IDENTITY_SEAL: PART-5 | role=HistoryTab | inputs=CommitEntry[] | outputs=JSX

// ============================================================
// PART 6 — Main GitPanel Component
// ============================================================

export default function GitPanel({
  files,
  openFiles,
  onRestore,
  onClearDirty,
}: GitPanelProps) {
  const { lang } = useLang();
  const ko = lang === "ko";
  const [activeTab, setActiveTab] = useState<TabId>("changes");
  const [commits, setCommits] = useState<CommitEntry[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [expandedHash, setExpandedHash] = useState<string | null>(null);

  // Branch management
  const [branches, setBranches] = useState<string[]>(["main"]);
  const [currentBranch, setCurrentBranch] = useState("main");
  const [branchCommits, setBranchCommits] = useState<Record<string, CommitEntry[]>>({ main: [] });
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  // Real git integration state
  const [gitAvailable, setGitAvailable] = useState(false);
  const [gitStatusData, setGitStatusData] = useState<GitStatus | null>(null);

  const dirtyFiles = useMemo(
    () => openFiles.filter((f) => f.isDirty),
    [openFiles]
  );

  // Check if real git runner is available on mount
  useEffect(() => {
    gitStatus().then((status) => {
      setGitAvailable(true);
      setGitStatusData(status);
      if (status.branch) setCurrentBranch(status.branch);
    }).catch(() => {
      setGitAvailable(false);
    });
  }, []);

  const flatFileMap = useMemo(() => {
    const map = new Map<string, FileNode>();
    for (const node of flattenFiles(files)) {
      map.set(node.id, node);
    }
    return map;
  }, [files]);

  // Branch: create new branch from current
  const handleNewBranch = useCallback(async () => {
    const name = newBranchName.trim();
    if (!name || branches.includes(name)) return;

    if (gitAvailable) {
      try {
        await gitCreateBranch(name);
      } catch {
        // Fall through to simulation
      }
    }

    setBranches((prev) => [...prev, name]);
    // Copy current branch commit history to the new branch
    setBranchCommits((prev) => ({ ...prev, [name]: [...(prev[currentBranch] ?? [])] }));
    setCurrentBranch(name);
    setCommits(branchCommits[currentBranch] ?? []);
    setNewBranchName("");
    setShowNewBranch(false);
  }, [newBranchName, branches, currentBranch, branchCommits, gitAvailable]);

  // Branch: switch to existing branch
  const handleSwitchBranch = useCallback(async (branch: string) => {
    if (branch === currentBranch) return;

    if (gitAvailable) {
      try {
        await gitCheckout(branch);
      } catch {
        // Fall through to simulation
      }
    }

    // Save current branch commits
    setBranchCommits((prev) => ({ ...prev, [currentBranch]: commits }));
    // Load target branch commits
    setCurrentBranch(branch);
    setCommits(branchCommits[branch] ?? []);
    setExpandedHash(null);
  }, [currentBranch, commits, branchCommits, gitAvailable]);

  const handleCommit = useCallback(async () => {
    if (dirtyFiles.length === 0) return;

    // AI commit message generation available via generateCommitMessage()
    const commitMessage = buildCommitMessage(dirtyFiles.map((f) => f.name));

    // Try real git commit first if available
    if (gitAvailable) {
      try {
        await gitStageAll();
        await gitRealCommit(commitMessage);
        // Refresh git status after commit
        const status = await gitStatus();
        setGitStatusData(status);
      } catch {
        // Real git failed — fall through to simulation below
      }
    }

    // Always update local simulation state (keeps UI consistent)
    const snapshots: FileSnapshot[] = dirtyFiles.map((df) => {
      const original = flatFileMap.get(df.id);
      return {
        fileId: df.id,
        fileName: df.name,
        content: df.content,
        linesBefore: countLines(original?.content),
        linesAfter: countLines(df.content),
      };
    });

    const entry: CommitEntry = {
      hash: generateHash(),
      message: commitMessage,
      timestamp: Date.now(),
      files: snapshots,
    };

    setCommits((prev) => {
      const next = [entry, ...prev];
      const trimmed = next.length > MAX_HISTORY ? next.slice(0, MAX_HISTORY) : next;
      // Also persist to branchCommits
      setBranchCommits((bc) => ({ ...bc, [currentBranch]: trimmed }));
      return trimmed;
    });
    setActiveTab("history");
    // 커밋 후 dirty 상태 해제
    onClearDirty?.();
  }, [dirtyFiles, flatFileMap, currentBranch, onClearDirty, gitAvailable]);

  const handleRestore = useCallback(
    (commit: CommitEntry) => {
      for (const snap of commit.files) {
        onRestore(snap.fileId, snap.content);
      }
    },
    [onRestore]
  );

  const handleToggleExpand = useCallback(
    (hash: string) => {
      setExpandedHash((prev) => (prev === hash ? null : hash));
    },
    []
  );

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: "changes",
      label: "Changes",
      icon: <GitBranch size={14} />,
      count: dirtyFiles.length > 0 ? dirtyFiles.length : undefined,
    },
    {
      id: "history",
      label: "History",
      icon: <History size={14} />,
      count: commits.length > 0 ? commits.length : undefined,
    },
  ];

  return (
    <div className="flex h-full flex-col bg-bg-secondary text-text-primary">
      {/* Mode notice */}
      <div className="text-[9px] text-text-tertiary bg-white/[0.02] px-3 py-1 border-b border-white/[0.08] flex items-center gap-2">
        <span>
          {gitAvailable
            ? "Live Git — connected to runner"
            : "Local simulation — changes are saved in browser only"}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
          {gitAvailable ? "Live Git" : "Simulation"}
        </span>
      </div>
      {/* Branch selector */}
      <div className="flex items-center gap-2 border-b border-border/30 px-2 py-1.5">
        <GitBranch size={14} className="shrink-0 text-accent-green" />
        <select
          value={currentBranch}
          onChange={(e) => handleSwitchBranch(e.target.value)}
          className="flex-1 rounded border border-border/30 bg-bg-primary/50 px-2 py-1 font-[family-name:var(--font-mono)] text-xs text-text-primary outline-none"
        >
          {branches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        {showNewBranch ? (
          <div className="flex items-center gap-1">
            <input
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNewBranch();
                if (e.key === "Escape") { setShowNewBranch(false); setNewBranchName(""); }
              }}
              placeholder="branch-name"
              className="w-24 rounded border border-accent-green/30 bg-bg-primary/50 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-text-primary outline-none"
              autoFocus
            />
            <button onClick={handleNewBranch} className="rounded bg-accent-green/15 px-1.5 py-0.5 text-[10px] text-accent-green hover:bg-accent-green/25">
              OK
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewBranch(true)}
            className="rounded p-1 text-text-tertiary hover:bg-bg-primary/50 hover:text-text-primary"
            title="New Branch"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border/30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-accent-green text-accent-green"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count != null && (
              <span className="ml-1 rounded-full bg-bg-primary px-1.5 py-0.5 text-[10px] leading-none">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === "changes" ? (
          <ChangesTab
            dirtyFiles={dirtyFiles}
            selectedFileId={selectedFileId}
            onSelectFile={setSelectedFileId}
            onCommit={handleCommit}
            fileTree={files}
          />
        ) : (
          <HistoryTab
            commits={commits}
            expandedHash={expandedHash}
            onToggleExpand={handleToggleExpand}
            onRestore={handleRestore}
          />
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-6 | role=GitPanelMain | inputs=GitPanelProps | outputs=JSX
