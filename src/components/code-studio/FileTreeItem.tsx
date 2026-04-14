"use client";

import React, { useState } from "react";
import { FileText, FolderOpen, Folder, Edit3, Trash2 } from "lucide-react";
import type { FileNode } from "@/lib/code-studio/core/types";
import { fileIconColor } from "@/lib/code-studio/core/types";

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  activeFileId: string | null;
  onSelect: (node: FileNode) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export const FileTreeItem = React.memo(function FileTreeItem({
  node, depth, activeFileId, onSelect, onDelete, onRename,
}: FileTreeItemProps) {
  const [open, setOpen] = useState(depth < 2);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const isFolder = node.type === "folder";
  const isActive = node.id === activeFileId;

  return (
    <div>
      <div
        className={`group flex w-full items-center gap-1.5 px-2 py-1 text-[12px] transition-colors hover:bg-white/6 ${
          isActive ? "bg-accent-green/10 text-accent-green" : "text-text-secondary"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <button
          onClick={() => { if (isFolder) setOpen(!open); else onSelect(node); }}
          className="flex flex-1 items-center gap-1.5 text-left min-w-0"
        >
          {isFolder ? (
            open ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-accent-amber" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-accent-amber" />
          ) : (
            <FileText className={`h-3.5 w-3.5 shrink-0 ${fileIconColor(node.name)}`} />
          )}
          {editing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => { setEditing(false); if (editName.trim()) onRename(node.id, editName.trim()); }}
              onKeyDown={(e) => { if (e.key === "Enter") { setEditing(false); if (editName.trim()) onRename(node.id, editName.trim()); } }}
              className="w-full bg-transparent text-[12px] font-mono outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 border-b border-accent-green"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate font-mono" title={node.name}>{node.name}</span>
          )}
        </button>
        {!isFolder && node.id !== "root" && (
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
            <button onClick={() => { setEditing(true); setEditName(node.name); }} className="rounded p-0.5 hover:bg-white/10"><Edit3 className="h-2.5 w-2.5" /></button>
            <button onClick={() => onDelete(node.id)} aria-label="Delete" className="rounded p-0.5 hover:bg-white/10 text-accent-red"><Trash2 className="h-2.5 w-2.5" /></button>
          </div>
        )}
      </div>
      {isFolder && open && node.children?.map((child) => (
        <FileTreeItem key={child.id} node={child} depth={depth + 1} activeFileId={activeFileId} onSelect={onSelect} onDelete={onDelete} onRename={onRename} />
      ))}
    </div>
  );
});
