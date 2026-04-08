"use client";

// ============================================================
// PART 1 — Local runtime strip (Electron 전용 시인성)
// ============================================================

import React, { useCallback, useEffect, useState } from "react";
import { FolderOpen, Cpu } from "lucide-react";
import { hasBridge, desktopSystem, type LocalMachineSpec } from "@/lib/desktop-bridge";
import { L4 } from "@/lib/i18n";
import { useLang } from "@/lib/LangContext";

const LAST_PROJECT_KEY = "cs:last-project";
const POLL_MS = 12_000;

function fmtBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${Math.round(n)} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function truncatePath(p: string, max = 42): string {
  if (p.length <= max) return p;
  const head = Math.floor(max / 2) - 2;
  const tail = max - head - 3;
  return `${p.slice(0, head)}…${p.slice(-tail)}`;
}

export function LocalDesktopStatus() {
  const { lang } = useLang();
  const [spec, setSpec] = useState<LocalMachineSpec | null>(null);
  const [projectPath, setProjectPath] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!hasBridge()) return;
    try {
      const s = await desktopSystem.getLocalSpec();
      setSpec(s);
    } catch {
      setSpec(null);
    }
    try {
      const p = typeof window !== "undefined" ? window.localStorage.getItem(LAST_PROJECT_KEY) : null;
      setProjectPath(p && p.trim() ? p.trim() : null);
    } catch {
      setProjectPath(null);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refresh();
    }, 0);
    const id = window.setInterval(() => void refresh(), POLL_MS);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_PROJECT_KEY) void refresh();
    };
    window.addEventListener("storage", onStorage);
    const onSameTabProject = () => void refresh();
    window.addEventListener("cs-last-project", onSameTabProject);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(id);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cs-last-project", onSameTabProject);
    };
  }, [refresh]);

  const openProjectFolder = useCallback(async () => {
    if (!projectPath || !hasBridge()) return;
    await desktopSystem.openPath(projectPath);
  }, [projectPath]);

  if (!hasBridge()) return null;
  if (!spec) {
    return (
      <div
        className="shrink-0 flex items-center gap-2 border-t border-border bg-bg-secondary/80 px-3 py-1.5 text-[10px] text-text-tertiary font-mono"
        role="status"
      >
        <Cpu className="h-3.5 w-3.5 opacity-50 shrink-0" aria-hidden />
        <span>{L4(lang, { ko: "로컬 런타임 로드 중…", en: "Loading local runtime…" })}</span>
      </div>
    );
  }

  const memFreeRatio = spec.totalMem > 0 ? spec.freeMem / spec.totalMem : 0;
  const memLabel = `${fmtBytes(spec.freeMem)} / ${fmtBytes(spec.totalMem)}`;

  return (
    <div
      className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-bg-secondary/90 px-3 py-1.5 text-[10px] text-text-secondary font-mono"
      role="status"
      aria-label={L4(lang, { ko: "로컬 머신 및 프로젝트 경로", en: "Local machine and project path" })}
    >
      <span className="flex items-center gap-1.5 text-text-tertiary shrink-0">
        <Cpu className="h-3.5 w-3.5 text-accent-green/80" aria-hidden />
        <span className="text-text-primary/90">
          {spec.platform} · {spec.arch} · v{spec.appVersion}
        </span>
      </span>
      <span title={L4(lang, { ko: "논리 CPU 수", en: "Logical CPU count" })} className="shrink-0">
        {spec.cpus} CPU
      </span>
      <span
        title={L4(lang, { ko: "여유 / 전체 메모리", en: "Free / total RAM" })}
        className={`shrink-0 ${memFreeRatio < 0.08 ? "text-accent-red/90" : ""}`}
      >
        RAM {memLabel}
      </span>
      {projectPath ? (
        <button
          type="button"
          onClick={() => void openProjectFolder()}
          className="flex items-center gap-1 min-h-[28px] max-w-full rounded px-1.5 py-0.5 text-left text-text-tertiary hover:bg-white/6 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue shrink"
          title={L4(lang, { ko: "탐색기에서 폴더 열기", en: "Open folder in file manager" })}
        >
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-accent-amber/80" aria-hidden />
          <span className="truncate">{truncatePath(projectPath)}</span>
        </button>
      ) : (
        <span className="text-text-tertiary/70 shrink-0">
          {L4(lang, { ko: "로컬 폴더 미연결", en: "No local folder linked" })}
        </span>
      )}
    </div>
  );
}
