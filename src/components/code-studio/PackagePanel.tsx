"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useCallback, useRef, useEffect, startTransition } from "react";
import {
  Package, Search, Download, Trash2, Loader2,
  ChevronDown, ChevronRight, Terminal, ArrowUpCircle,
} from "lucide-react";
import type { FileNode } from "@/lib/code-studio/core/types";
import { useCodeStudioT } from "@/lib/use-code-studio-translations";

interface PackageInfo { name: string; version: string; description: string }

interface Props {
  files: FileNode[];
  onFilesChange?: () => void;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=PackageInfo,Props

// ============================================================
// PART 2 — Helpers
// ============================================================

function findPackageJson(nodes: FileNode[]): FileNode | null {
  for (const node of nodes) {
    if (node.type === "file" && node.name === "package.json") return node;
    if (node.children) { const found = findPackageJson(node.children); if (found) return found; }
  }
  return null;
}

function parsePackageJson(content: string): { deps: Record<string, string>; devDeps: Record<string, string> } | null {
  try {
    const pkg = JSON.parse(content);
    return { deps: pkg.dependencies ?? {}, devDeps: pkg.devDependencies ?? {} };
  } catch { return null; }
}

async function searchNpm(query: string): Promise<PackageInfo[]> {
  const res = await fetch(`/api/npm-search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    objects?: Array<{ package: { name: string; version: string; description?: string } }>;
  };
  return (data.objects ?? []).map((o) => ({
    name: o.package.name,
    version: o.package.version,
    description: (o.package.description ?? "").slice(0, 160),
  }));
}

/** Simple semver comparison — returns 'major' | 'minor' | 'patch' | null */
function compareVersions(installed: string, latest: string): 'major' | 'minor' | 'patch' | null {
  const clean = (v: string) => v.replace(/^[\^~>=<]*/g, '');
  const iParts = clean(installed).split('.').map(Number);
  const lParts = clean(latest).split('.').map(Number);
  if (iParts.length < 3 || lParts.length < 3) return null;
  if (isNaN(iParts[0]) || isNaN(lParts[0])) return null;
  if (lParts[0] > iParts[0]) return 'major';
  if (lParts[1] > iParts[1]) return 'minor';
  if (lParts[2] > iParts[2]) return 'patch';
  return null;
}

/** Simulate a "latest" version by bumping patch +1..+3 or minor +1 randomly */
function simulateLatest(version: string): string {
  const clean = version.replace(/^[\^~>=<]*/g, '');
  const parts = clean.split('.').map(Number);
  if (parts.length < 3 || isNaN(parts[0])) return clean;
  // Deterministic: hash the name chars to decide bump type
  const sum = clean.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const mod = sum % 10;
  if (mod < 3) return `${parts[0] + 1}.0.0`;               // major
  if (mod < 6) return `${parts[0]}.${parts[1] + 1}.0`;      // minor
  return `${parts[0]}.${parts[1]}.${parts[2] + 1 + (mod % 3)}`; // patch
}

const UPDATE_BADGE_COLORS: Record<string, string> = {
  major: 'bg-accent-red/20 text-accent-red',
  minor: 'bg-amber-500/20 text-amber-400',
  patch: 'bg-accent-blue/20 text-accent-blue',
};

// IDENTITY_SEAL: PART-2 | role=Helpers | inputs=FileNode[] | outputs=PackageInfo[]

// ============================================================
// PART 3 — Component
// ============================================================

export function PackagePanel({ files, onFilesChange }: Props) {
  const t = useCodeStudioT();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PackageInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [installed, setInstalled] = useState<{ deps: Record<string, string>; devDeps: Record<string, string> }>({ deps: {}, devDeps: {} });
  const [showInstalled, setShowInstalled] = useState(true);
  const [showResults, setShowResults] = useState(true);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [installing, setInstalling] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const refreshInstalled = useCallback(() => {
    const pkgFile = findPackageJson(files);
    if (pkgFile?.content) {
      const parsed = parsePackageJson(pkgFile.content);
      if (parsed) setInstalled(parsed);
    }
  }, [files]);

  useEffect(() => { startTransition(() => { refreshInstalled(); }); }, [refreshInstalled]);
  useEffect(() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight; }, [terminalOutput]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try { setSearchResults(await searchNpm(searchQuery.trim())); setShowResults(true); }
    catch { setSearchResults([]); }
    setSearching(false);
  };

  // [시뮬레이션] 실제 npm 설치 없음
  const handleInstall = async (name: string) => {
    setInstalling(name); setShowTerminal(true);
    setTerminalOutput((p) => [...p, `\n$ npm install ${name}\n`]);
    await new Promise((r) => setTimeout(r, 1000));
    setTerminalOutput((p) => [...p, `added ${name}@1.0.0\n`, "done\n"]);
    setInstalling(null); onFilesChange?.();
  };

  const handleUninstall = async (name: string) => {
    setInstalling(name); setShowTerminal(true);
    setTerminalOutput((p) => [...p, `\n$ npm uninstall ${name}\n`]);
    await new Promise((r) => setTimeout(r, 600));
    setTerminalOutput((p) => [...p, `removed ${name}\n`, "done\n"]);
    setInstalling(null); onFilesChange?.();
  };

  const allDeps = { ...installed.deps, ...installed.devDeps };
  const installedCount = Object.keys(allDeps).length;

  // Compute latest versions and update counts
  const latestVersions = Object.fromEntries(
    Object.entries(allDeps).map(([name, ver]) => [name, simulateLatest(ver)])
  );
  const updateEntries = Object.entries(allDeps)
    .map(([name, ver]) => ({ name, installed: ver, latest: latestVersions[name], diff: compareVersions(ver, latestVersions[name]) }))
    .filter((e) => e.diff !== null);
  const outdatedCount = updateEntries.length;

  return (
    <div className="flex flex-col h-full bg-[#0f1419] text-xs">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
        <span className="flex items-center gap-2 font-semibold text-white">
          <Package size={14} className="text-accent-red" /> Packages
          {installedCount > 0 && <span className="text-[10px] text-white/60">({installedCount})</span>}
        </span>
        <button onClick={() => setShowTerminal((v) => !v)} className="p-1 hover:bg-white/10 rounded text-white/60"><Terminal size={12} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        <div className="flex items-center gap-1">
          <div className="flex-1 relative">
            <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/50" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="npm 패키지 검색..."
              className="w-full bg-white/5 pl-6 pr-2 py-1.5 rounded text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 border border-white/8 focus:border-amber-700" />
          </div>
          <button onClick={handleSearch} disabled={searching || !searchQuery.trim()}
            className="px-2 py-1.5 bg-amber-900/30 text-amber-400 rounded hover:bg-amber-900/35 disabled:opacity-30">
            {searching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
          </button>
        </div>
        {searchResults.length > 0 && (
          <div>
            <button onClick={() => setShowResults((v) => !v)} className="flex items-center gap-1 text-white/50 hover:text-white text-xs">
              {showResults ? <ChevronDown size={10} /> : <ChevronRight size={10} />} 검색 결과 ({searchResults.length})
            </button>
            {showResults && (
              <div className="ml-2 mt-1 space-y-1">
                {searchResults.map((pkg) => (
                  <div key={pkg.name} className="flex items-start gap-2 p-1.5 rounded hover:bg-white/5 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-white">
                        <span className="font-semibold truncate">{pkg.name}</span>
                        <span className="text-[9px] px-1 py-0.5 rounded bg-amber-900/30 text-amber-400 flex-shrink-0">v{pkg.version}</span>
                      </div>
                      {pkg.description && <p className="text-[10px] text-white/60 truncate mt-0.5">{pkg.description}</p>}
                    </div>
                    <button onClick={() => handleInstall(pkg.name)} disabled={installing !== null}
                      className="p-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 disabled:opacity-30 flex-shrink-0">
                      {installing === pkg.name ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {installedCount > 0 && (
          <div>
            <div className="flex items-center justify-between">
              <button onClick={() => setShowInstalled((v) => !v)} className="flex items-center gap-1 text-white/50 hover:text-white text-xs">
                {showInstalled ? <ChevronDown size={10} /> : <ChevronRight size={10} />} 설치됨 ({installedCount})
              </button>
              {outdatedCount > 0 && (
                <button
                  onClick={() => setShowTerminal(true)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium bg-amber-900/30 text-amber-400 hover:bg-amber-900/40"
                >
                  <ArrowUpCircle size={10} />
                  Update All ({outdatedCount})
                </button>
              )}
            </div>
            {showInstalled && (
              <div className="ml-2 mt-1 space-y-0.5">
                {Object.entries(installed.deps).map(([name, version]) => {
                  const diff = compareVersions(version, latestVersions[name]);
                  return (
                    <div key={name} className="flex items-center gap-1 group py-0.5 text-white/70">
                      <Package size={10} className="text-white/50 flex-shrink-0" />
                      <span className="flex-1 truncate">{name}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-amber-900/30 text-amber-400">{version}</span>
                      {diff && (
                        <span className={`text-[9px] px-1 py-0.5 rounded ${UPDATE_BADGE_COLORS[diff]}`}>
                          {latestVersions[name]}
                        </span>
                      )}
                      <button onClick={() => handleUninstall(name)} disabled={installing !== null}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/5 rounded text-accent-red transition-opacity disabled:opacity-30">
                        {installing === name ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                      </button>
                    </div>
                  );
                })}
                {Object.entries(installed.devDeps).map(([name, version]) => {
                  const diff = compareVersions(version, latestVersions[name]);
                  return (
                    <div key={name} className="flex items-center gap-1 group py-0.5 text-white/70">
                      <Package size={10} className="text-white/50 flex-shrink-0" />
                      <span className="flex-1 truncate">{name}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-amber-900/30 text-amber-400">{version}</span>
                      {diff && (
                        <span className={`text-[9px] px-1 py-0.5 rounded ${UPDATE_BADGE_COLORS[diff]}`}>
                          {latestVersions[name]}
                        </span>
                      )}
                      <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">dev</span>
                      <button onClick={() => handleUninstall(name)} disabled={installing !== null}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/5 rounded text-accent-red transition-opacity disabled:opacity-30">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {installedCount === 0 && searchResults.length === 0 && (
          <p className="text-center text-white/50 py-4"><Package size={14} className="inline opacity-30" /> package.json을 찾을 수 없습니다</p>
        )}
      </div>
      {showTerminal && (
        <div className="border-t border-white/8">
          <div className="flex items-center justify-between px-2 py-1 bg-white/3">
            <span className="text-[10px] text-white/60 flex items-center gap-1"><Terminal size={10} /> {t.pkgOutput}</span>
            <button onClick={() => setTerminalOutput([])} className="text-[9px] text-white/50 hover:text-white">{t.pkgClear}</button>
          </div>
          <div ref={terminalRef} className="h-32 overflow-y-auto p-2 bg-[#0a0e17] font-mono text-[10px] text-green-400">
            {terminalOutput.map((line, i) => <div key={i} className="whitespace-pre-wrap leading-4">{line}</div>)}
            {terminalOutput.length === 0 && <span className="text-white/50">패키지 설치 출력이 여기에 표시됩니다...</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=Component | inputs=Props | outputs=JSX
