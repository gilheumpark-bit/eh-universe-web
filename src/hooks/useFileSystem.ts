"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  loadProjectFiles,
  buildFileTree,
  saveProjectTree,
  hasProject,
  saveFileVersion,
  getFileVersions,
  restoreFileVersion,
  trackRecentFile,
  getRecentFiles,
  switchProject,
  isBinaryFile,
  getBinaryData,
  type FileVersion,
  type RecentFileEntry,
} from "@/lib/fs-store";
import type { FileNode } from "@/lib/types";
import { leadingDebounce } from "@/lib/speed-optimizations";
import { FileSyncManager } from "@/lib/fs-sync";
import type { SyncStatus } from "@/lib/fs-sync";

const DEFAULT_PROJECT = "default";

const DEMO_FILES: FileNode[] = [
  {
    id: "1", name: "src", type: "folder", children: [
      {
        id: "2", name: "main.ts", type: "file",
        content: `// CSL IDE — Welcome!\n// Start coding or ask the AI assistant for help.\n\nfunction greet(name: string): string {\n  return \`Hello, \${name}! Welcome to CSL IDE.\`;\n}\n\nconsole.log(greet("Developer"));\n`,
      },
      {
        id: "3", name: "utils.ts", type: "file",
        content: `export function debounce<T extends (...args: unknown[]) => void>(\n  fn: T,\n  ms: number\n): T {\n  let timer: ReturnType<typeof setTimeout>;\n  return ((...args: unknown[]) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), ms);\n  }) as T;\n}\n`,
      },
      {
        id: "4", name: "api", type: "folder", children: [
          {
            id: "5", name: "client.ts", type: "file",
            content: `const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";\n\nexport async function fetchJSON<T>(path: string): Promise<T> {\n  const res = await fetch(\`\${API_BASE}\${path}\`);\n  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);\n  return res.json();\n}\n`,
          },
        ],
      },
      {
        id: "8", name: "components", type: "folder", children: [
          {
            id: "9", name: "App.tsx", type: "file",
            content: `import React from "react";\n\ninterface AppProps {\n  username?: string;\n}\n\nexport default function App({ username = "Developer" }: AppProps) {\n  return (\n    <div className="app">\n      <h1>Welcome, {username}!</h1>\n      <p>Start building something amazing.</p>\n    </div>\n  );\n}\n`,
          },
        ],
      },
      {
        id: "10", name: "styles", type: "folder", children: [
          {
            id: "11", name: "global.css", type: "file",
            content: `*, *::before, *::after {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\n:root {\n  --bg-primary: #0d1117;\n  --bg-secondary: #161b22;\n  --text-primary: #e6edf3;\n  --text-secondary: #8b949e;\n  --accent: #58a6ff;\n}\n\nbody {\n  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\n  background: var(--bg-primary);\n  color: var(--text-primary);\n}\n`,
          },
        ],
      },
    ],
  },
  { id: "6", name: "package.json", type: "file", content: `{\n  "name": "my-project",\n  "version": "1.0.0"\n}\n` },
  { id: "7", name: "README.md", type: "file", content: `# My Project\n\nBuilt with CSL IDE.\n` },
  {
    id: "12", name: "tsconfig.json", type: "file",
    content: `{\n  "compilerOptions": {\n    "target": "ES2020",\n    "module": "ESNext",\n    "moduleResolution": "bundler",\n    "jsx": "react-jsx",\n    "strict": true,\n    "esModuleInterop": true,\n    "skipLibCheck": true,\n    "outDir": "dist",\n    "rootDir": "src"\n  },\n  "include": ["src/**/*"]\n}\n`,
  },
  {
    id: "13", name: ".gitignore", type: "file",
    content: `node_modules/\ndist/\n.env\n.env.local\n*.log\n.DS_Store\ncoverage/\n.turbo/\n`,
  },
];

// ── Version save debounce (3s after last edit) ──
const VERSION_SAVE_DELAY = 3000;

export function useFileSystem() {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string>(DEFAULT_PROJECT);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFileEntry[]>([]);

  const syncManagerRef = useRef<FileSyncManager | null>(null);
  const versionTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── Load project from IndexedDB on mount ──
  useEffect(() => {
    (async () => {
      try {
        const exists = await hasProject(projectId);
        if (exists) {
          const stored = await loadProjectFiles(projectId);
          const tree = buildFileTree(stored);
          setFiles(tree.length > 0 ? tree : DEMO_FILES);
        } else {
          await saveProjectTree(projectId, DEMO_FILES);
          setFiles(DEMO_FILES);
        }

        // Load recent files
        const recent = await getRecentFiles(projectId);
        setRecentFiles(recent);
      } catch {
        setFiles(DEMO_FILES);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  // ── Sync manager lifecycle ──
  useEffect(() => {
    const manager = new FileSyncManager(2000);
    syncManagerRef.current = manager;

    const unsub = manager.subscribe((status) => {
      setSyncStatus(status);
    });

    manager.start();

    return () => {
      unsub();
      manager.stop();
      syncManagerRef.current = null;
    };
  }, [projectId]);

  // ── Leading-edge debounced save ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saveToDb = useCallback(
    leadingDebounce(((tree: FileNode[]) => {
      saveProjectTree(projectId, tree).catch((e) => {
        console.error("Failed to save to IndexedDB:", e);
      });
    }) as (...args: unknown[]) => void, 500) as (tree: FileNode[]) => void,
    [projectId],
  );

  // ── Debounced version save ──
  const scheduleVersionSave = useCallback(
    (fileId: string, content: string) => {
      const timers = versionTimersRef.current;
      const existing = timers.get(fileId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        saveFileVersion(fileId, projectId, content, "user").catch((e) => {
          console.error("Failed to save file version:", e);
        });
        timers.delete(fileId);
      }, VERSION_SAVE_DELAY);

      timers.set(fileId, timer);
    },
    [projectId],
  );

  // Cleanup version timers on unmount
  useEffect(() => {
    const timers = versionTimersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  const updateFiles = useCallback(
    (updater: (prev: FileNode[]) => FileNode[]) => {
      setFiles((prev) => {
        const next = updater(prev);
        saveToDb(next);
        return next;
      });
    },
    [saveToDb],
  );

  // ── Update a single file's content with version tracking ──
  const updateFileContent = useCallback(
    (id: string, content: string) => {
      updateFiles((prev) => updateNodeContent(prev, id, content));
      scheduleVersionSave(id, content);
    },
    [updateFiles, scheduleVersionSave],
  );

  // ── Version history API ──
  const getVersionHistory = useCallback(
    async (fileId: string): Promise<FileVersion[]> => {
      return getFileVersions(fileId);
    },
    [],
  );

  const restoreVersion = useCallback(
    async (fileId: string, versionId: string): Promise<string> => {
      const content = await restoreFileVersion(fileId, versionId);
      updateFiles((prev) => updateNodeContent(prev, fileId, content));
      return content;
    },
    [updateFiles],
  );

  // ── Recent file tracking ──
  const trackFileOpen = useCallback(
    async (fileId: string, fileName: string, filePath: string) => {
      await trackRecentFile(projectId, fileId, fileName, filePath);
      const recent = await getRecentFiles(projectId);
      setRecentFiles(recent);
    },
    [projectId],
  );

  // ── Project switching ──
  const switchToProject = useCallback(
    async (newProjectId: string) => {
      // Flush pending version saves
      for (const timer of versionTimersRef.current.values()) {
        clearTimeout(timer);
      }
      versionTimersRef.current.clear();

      await switchProject(newProjectId);
      setProjectId(newProjectId);
      setLoading(true);
    },
    [],
  );

  // ── Binary file reading ──
  const readBinaryAsBase64 = useCallback(
    async (fileId: string): Promise<string | null> => {
      const data = await getBinaryData(fileId);
      if (!data) return null;

      const bytes = new Uint8Array(data);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    },
    [],
  );

  // ── Force sync to WebContainer ──
  const syncToWebContainer = useCallback(async () => {
    if (syncManagerRef.current) {
      await syncManagerRef.current.forceSyncToWebContainer(files);
    }
  }, [files]);

  return {
    files,
    loading,
    projectId,
    syncStatus,
    recentFiles,
    updateFiles,
    updateFileContent,
    setFiles,
    // Version history
    getVersionHistory,
    restoreVersion,
    // Recent files
    trackFileOpen,
    // Project management
    switchToProject,
    // Binary files
    readBinaryAsBase64,
    isBinaryFile,
    // Sync
    syncToWebContainer,
  };
}

// ── Helpers ──

function updateNodeContent(
  nodes: FileNode[],
  id: string,
  content: string,
): FileNode[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, content };
    if (node.children)
      return { ...node, children: updateNodeContent(node.children, id, content) };
    return node;
  });
}
