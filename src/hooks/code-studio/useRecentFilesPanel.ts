// ============================================================
// Code Studio — Recent Files Panel Sub-hook
// Tracks file open history (LRU cap 30)
// ============================================================

import { useState, useCallback } from "react";

/** Recent file entry for the RecentFiles panel */
export interface RecentFileEntry {
  fileId: string;
  fileName: string;
  timestamp: number;
}

/** State + handlers for RecentFiles panel. */
export function useRecentFilesPanel() {
  const [recentFiles, setRecentFiles] = useState<RecentFileEntry[]>([]);

  const trackFileOpen = useCallback((fileId: string, fileName: string) => {
    setRecentFiles((prev) => {
      const filtered = prev.filter((f) => f.fileId !== fileId);
      return [{ fileId, fileName, timestamp: Date.now() }, ...filtered].slice(0, 30);
    });
  }, []);

  const clearRecentFiles = useCallback(() => setRecentFiles([]), []);

  return { recentFiles, trackFileOpen, clearRecentFiles };
}
