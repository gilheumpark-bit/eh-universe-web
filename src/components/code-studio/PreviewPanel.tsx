"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  createWebContainer,
  type WebContainerInstance,
} from "@/lib/code-studio-webcontainer";
import { createHMRBridge, type HMRBridge, type HMREvent } from "@/lib/code-studio-preview-hmr";
import type { FileNode } from "@/lib/code-studio-types";

type PreviewState = "idle" | "booting" | "installing" | "starting" | "ready" | "error";
type DeviceMode = "responsive" | "mobile" | "tablet" | "desktop";

interface ConsoleEntry {
  id: string;
  type: "log" | "warn" | "error" | "info";
  message: string;
  timestamp: number;
}

interface PreviewPanelProps {
  files: FileNode[];
  visible: boolean;
}

const DEVICE_SIZES: Record<Exclude<DeviceMode, "responsive">, { width: number; label: string }> = {
  mobile: { width: 375, label: "Mobile 375px" },
  tablet: { width: 768, label: "Tablet 768px" },
  desktop: { width: 1280, label: "Desktop 1280px" },
};

// IDENTITY_SEAL: PART-1 | role=타입 정의 | inputs=none | outputs=PreviewState, DeviceMode, PreviewPanelProps

// ============================================================
// PART 2 — File Tree Utility
// ============================================================

function findFile(nodes: FileNode[], name: string): FileNode | null {
  for (const node of nodes) {
    if (node.type === "file" && node.name === name) return node;
    if (node.type === "folder" && node.children) {
      const found = findFile(node.children, name);
      if (found) return found;
    }
  }
  return null;
}

// IDENTITY_SEAL: PART-2 | role=파일 탐색 | inputs=FileNode[], name | outputs=FileNode | null

// ============================================================
// PART 3 — PreviewPanel Component
// ============================================================

export default function PreviewPanel({ files, visible }: PreviewPanelProps) {
  const [state, setState] = useState<PreviewState>("idle");
  const [previewUrl, setPreviewUrl] = useState("");
  const [displayUrl, setDisplayUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<WebContainerInstance | null>(null);
  const serverReadyRef = useRef(false);

  const [deviceMode, setDeviceMode] = useState<DeviceMode>("responsive");
  const [showConsole, setShowConsole] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [navIndex, setNavIndex] = useState(-1);

  const hmrBridgeRef = useRef<HMRBridge | null>(null);

  // Auto-detect framework
  const detectedFramework = useMemo(() => {
    const pkgFile = findFile(files, "package.json");
    if (pkgFile?.content) {
      try {
        const pkg = JSON.parse(pkgFile.content);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (allDeps["next"]) return "Next.js";
        if (allDeps["react"]) return "React";
        if (allDeps["vue"]) return "Vue";
        if (allDeps["svelte"]) return "Svelte";
      } catch { /* ignore */ }
    }
    if (findFile(files, "index.html")) return "HTML";
    return null;
  }, [files]);

  const errorCount = useMemo(
    () => consoleEntries.filter((e) => e.type === "error").length,
    [consoleEntries],
  );

  // ── Boot & start dev server ──
  const startPreview = useCallback(async () => {
    try {
      setState("booting");
      const wc = await createWebContainer();
      containerRef.current = wc;

      setState("installing");

      // Write all project files to the container
      for (const file of flattenFiles(files)) {
        await wc.writeFile(file.path, file.content);
      }

      if (wc.isAvailable) {
        await wc.installDependencies();
      }

      setState("starting");
      const url = await wc.startDevServer(3000);
      serverReadyRef.current = true;
      setPreviewUrl(url);
      setDisplayUrl(url);
      setState("ready");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }, [files]);

  // ── Auto-refresh on file changes ──
  useEffect(() => {
    if (!visible || !serverReadyRef.current || !containerRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const wc = containerRef.current;
        if (!wc) return;
        for (const file of flattenFiles(files)) {
          await wc.writeFile(file.path, file.content);
        }
        if (iframeRef.current && previewUrl) {
          iframeRef.current.src = previewUrl;
        }
      } catch { /* silent */ }
    }, 1000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [files, visible, previewUrl]);

  // ── Initialize HMR Bridge when iframe is ready ──
  useEffect(() => {
    if (state !== "ready" || !iframeRef.current) return;
    if (hmrBridgeRef.current) { hmrBridgeRef.current.dispose(); hmrBridgeRef.current = null; }
    const bridge = createHMRBridge(iframeRef.current, { debounceMs: 300 });
    bridge.on("client-error", (event: HMREvent) => {
      if (event.error) {
        setConsoleEntries((prev) => [...prev, {
          id: crypto.randomUUID(), type: "error", message: `[HMR] ${event.error}`, timestamp: Date.now(),
        }]);
      }
    });
    bridge.on("hmr-fail-full-reload", () => {
      if (iframeRef.current && previewUrl) iframeRef.current.src = previewUrl;
    });
    hmrBridgeRef.current = bridge;
    return () => { hmrBridgeRef.current?.dispose(); hmrBridgeRef.current = null; };
  }, [state, previewUrl]);

  // ── Notify HMR bridge on file changes ──
  useEffect(() => {
    if (!hmrBridgeRef.current || state !== "ready") return;
    for (const file of files) {
      if (file.type === "file" && file.content != null) {
        hmrBridgeRef.current.fileChanged(file.name, file.content);
      }
    }
  }, [files, state]);

  // ── Start on first visible ──
  useEffect(() => {
    if (visible && state === "idle") {
      const id = requestAnimationFrame(() => startPreview());
      return () => cancelAnimationFrame(id);
    }
  }, [visible, state, startPreview]);

  // ── Console capture from iframe ──
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
      if (event.data?.__eh_console) {
        const { type, args } = event.data.__eh_console as { type: string; args: string[] };
        setConsoleEntries((prev) => [...prev.slice(-200), {
          id: crypto.randomUUID(), type: (type as ConsoleEntry["type"]) || "log",
          message: args.join(" "), timestamp: Date.now(),
        }]);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ── Navigation ──
  const handleRefresh = useCallback(() => {
    if (iframeRef.current && previewUrl) iframeRef.current.src = previewUrl;
  }, [previewUrl]);

  const handleOpenExternal = useCallback(() => {
    if (previewUrl) window.open(previewUrl, "_blank", "noopener,noreferrer");
  }, [previewUrl]);

  const handleNavBack = useCallback(() => {
    if (navIndex > 0) { const ni = navIndex - 1; setNavIndex(ni); if (iframeRef.current) iframeRef.current.src = navHistory[ni]; }
  }, [navIndex, navHistory]);

  const handleNavForward = useCallback(() => {
    if (navIndex < navHistory.length - 1) { const ni = navIndex + 1; setNavIndex(ni); if (iframeRef.current) iframeRef.current.src = navHistory[ni]; }
  }, [navIndex, navHistory]);

  // Track iframe navigation
  useEffect(() => {
    if (!iframeRef.current || state !== "ready") return;
    const iframe = iframeRef.current;
    const onLoad = () => {
      setIsLoading(false);
      try {
        const currentUrl = iframe.contentWindow?.location.href;
        if (currentUrl && currentUrl !== "about:blank") {
          setNavIndex((prev) => { setNavHistory((h) => [...h.slice(0, prev + 1), currentUrl]); return prev + 1; });
        }
      } catch { /* cross-origin */ }
    };
    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [state]);

  if (!visible) return null;

  // ── Render ──
  return (
    <div className="flex flex-col h-full bg-[#0a0e17] text-text-secondary">
      {/* Toolbar Row 1 — URL Bar */}
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-white/8 bg-[#0d1117] min-h-[36px]">
        <ToolbarBtn onClick={handleNavBack} disabled={navIndex <= 0} title="Back">&larr;</ToolbarBtn>
        <ToolbarBtn onClick={handleNavForward} disabled={navIndex >= navHistory.length - 1} title="Forward">&rarr;</ToolbarBtn>
        <ToolbarBtn onClick={handleRefresh} disabled={state !== "ready"} title="Refresh">&#x21bb;</ToolbarBtn>

        {isLoading && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-purple-400 rounded-full animate-spin shrink-0" />}

        <input
          type="text" value={displayUrl} readOnly
          className="flex-1 bg-[#0a0e17] border border-white/10 rounded px-2 py-0.5 text-xs font-mono text-text-secondary"
          placeholder="URL"
        />

        <ToolbarBtn onClick={handleOpenExternal} disabled={state !== "ready"} title="Open in new tab">&#x2197;</ToolbarBtn>
      </div>

      {/* Toolbar Row 2 — Device simulation, console toggle */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-white/8 bg-[#0d1117] flex-wrap">
        {detectedFramework && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-purple-500/40 bg-purple-500/10 text-purple-400">
            {detectedFramework}
          </span>
        )}
        {errorCount > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-red-500/40 bg-red-500/10 text-red-400">
            {errorCount} error{errorCount > 1 ? "s" : ""}
          </span>
        )}

        <div className="w-px h-4 bg-white/8 mx-1" />

        {(["responsive", "mobile", "tablet", "desktop"] as DeviceMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setDeviceMode(mode)}
            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
              deviceMode === mode
                ? "border-purple-500/60 bg-purple-500/20 text-purple-300"
                : "border-white/10 bg-transparent text-text-tertiary hover:bg-white/5"
            }`}
          >
            {mode === "responsive" ? "Responsive" : `${DEVICE_SIZES[mode].width}px`}
          </button>
        ))}

        <div className="w-px h-4 bg-white/8 mx-1" />

        <button
          onClick={() => setShowConsole(!showConsole)}
          className={`ml-auto px-2 py-0.5 text-[10px] rounded border transition-colors ${
            showConsole ? "border-white/20 bg-white/10 text-text-primary" : "border-white/10 bg-transparent text-text-tertiary"
          }`}
        >
          Console {consoleEntries.length > 0 && <span className="ml-1 bg-white/10 rounded-full px-1">{consoleEntries.length}</span>}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative flex flex-col min-h-0">
        {/* Loading states */}
        {state !== "ready" && state !== "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-[#0a0e17]">
            <div className="w-8 h-8 border-3 border-white/20 border-t-purple-400 rounded-full animate-spin" />
            <span className="text-xs text-text-secondary">
              {state === "idle" && "Preparing..."}
              {state === "booting" && "Booting WebContainer..."}
              {state === "installing" && "Installing packages..."}
              {state === "starting" && "Starting dev server..."}
            </span>
          </div>
        )}

        {/* Error state */}
        {state === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 bg-[#0a0e17]">
            <span className="text-2xl">&#x26A0;</span>
            <span className="text-xs text-red-400 text-center max-w-md">{errorMsg}</span>
            <button
              onClick={() => { setState("idle"); setErrorMsg(""); startPreview(); }}
              className="mt-2 px-4 py-1.5 text-xs rounded border border-white/20 bg-white/5 hover:bg-white/10 text-text-primary"
            >
              Retry
            </button>
          </div>
        )}

        {/* iframe with device simulation */}
        <div className={`${showConsole ? "flex-[1_1_60%]" : "flex-1"} overflow-auto flex justify-center ${
          deviceMode === "responsive" ? "items-stretch" : "items-start bg-[#060a12] py-2"
        } min-h-0`}>
          {previewUrl && (
            <iframe
              ref={iframeRef} src={previewUrl} title="Live Preview"
              style={{
                width: deviceMode === "responsive" ? "100%" : DEVICE_SIZES[deviceMode].width,
                maxWidth: "100%", height: "100%",
                border: deviceMode === "responsive" ? "none" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: deviceMode === "responsive" ? 0 : 6,
                background: "#fff", transition: "width 0.2s ease",
              }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
          )}
        </div>

        {/* Device mode indicator */}
        {deviceMode !== "responsive" && state === "ready" && (
          <div className="absolute top-2 right-2 bg-[#0d1117]/90 border border-white/10 rounded px-2 py-0.5 text-[10px] text-text-tertiary z-5">
            {DEVICE_SIZES[deviceMode].label}
          </div>
        )}

        {/* Console panel */}
        {showConsole && (
          <div className="flex-[0_0_35%] min-h-[80px] max-h-[250px] border-t border-white/8 bg-[#060a12] flex flex-col">
            <div className="flex items-center justify-between px-2 py-1 bg-[#0d1117] border-b border-white/8 text-[11px] text-text-tertiary">
              <span>Console ({consoleEntries.length})</span>
              <button
                onClick={() => setConsoleEntries([])}
                className="px-1.5 py-0.5 text-[10px] rounded border border-white/10 hover:bg-white/5"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-1 font-mono text-[11px]">
              {consoleEntries.length === 0 && (
                <div className="text-text-tertiary text-center py-4">Console output appears here.</div>
              )}
              {consoleEntries.map((entry) => (
                <div key={entry.id} className="py-px border-b border-white/5" style={{
                  color: entry.type === "error" ? "#f85149" : entry.type === "warn" ? "#d29922" : entry.type === "info" ? "#58a6ff" : "#ccc",
                }}>
                  <span className="text-text-tertiary mr-1.5">
                    {new Date(entry.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  [{entry.type}] {entry.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=프리뷰 패널 UI | inputs=PreviewPanelProps | outputs=JSX.Element

// ============================================================
// PART 4 — Sub-components & Utilities
// ============================================================

function ToolbarBtn({ onClick, disabled, title, children }: {
  onClick: () => void; disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      className="px-1.5 py-0.5 text-sm rounded border border-white/10 bg-transparent text-text-secondary hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function flattenFiles(nodes: FileNode[], prefix = ""): Array<{ path: string; content: string }> {
  const result: Array<{ path: string; content: string }> = [];
  for (const node of nodes) {
    const fullPath = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === "file" && node.content != null) {
      result.push({ path: fullPath, content: node.content });
    }
    if (node.children) {
      result.push(...flattenFiles(node.children, fullPath));
    }
  }
  return result;
}

// IDENTITY_SEAL: PART-4 | role=서브 컴포넌트 및 유틸 | inputs=FileNode[] | outputs=ToolbarBtn, flattenFiles
