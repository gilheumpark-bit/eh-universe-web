// @ts-nocheck
"use client";

// ============================================================
// PART 1 — Imports & Constants
// ============================================================

import { useState, useMemo, useCallback, useRef, useDeferredValue } from "react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import {
  Search, X, FileCode, ChevronDown, ChevronRight,
  Replace, History, Filter,
} from "lucide-react";
import type { FileNode } from "@eh/quill-engine/types";

const FILE_TYPE_FILTERS = [
  { label: "All Files", value: "" },
  { label: ".ts", value: ".ts" },
  { label: ".tsx", value: ".tsx" },
  { label: ".js", value: ".js" },
  { label: ".jsx", value: ".jsx" },
  { label: ".css", value: ".css" },
  { label: ".json", value: ".json" },
  { label: ".md", value: ".md" },
  { label: ".html", value: ".html" },
];

const SEARCH_HISTORY_KEY = "eh_code_search_history";
const MAX_HISTORY = 10;

function loadSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function saveSearchHistory(history: string[]): void {
  try { localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY))); }
  catch { /* localStorage unavailable */ }
}

// IDENTITY_SEAL: PART-1 | role=Constants | inputs=none | outputs=FILE_TYPE_FILTERS,history-helpers

// ============================================================
// PART 2 — Search Engine (built-in)
// ============================================================

interface SearchResult {
  filePath: string;
  fileName: string;
  line: number;
  snippet: string;
}

/** Simple codebase search: scans all file content for query matches */
function searchCodebase(
  query: string,
  files: FileNode[],
  options: { caseSensitive: boolean; useRegex: boolean; maxResults?: number },
  prefix = "",
): SearchResult[] {
  const results: SearchResult[] = [];
  const max = options.maxResults ?? 100;

  for (const node of files) {
    if (results.length >= max) break;
    const path = prefix ? `${prefix}/${node.name}` : node.name;

    if (node.type === "file" && node.content) {
      const lines = node.content.split("\n");
      let pattern: RegExp;
      try {
        const flags = options.caseSensitive ? "g" : "gi";
        pattern = options.useRegex ? new RegExp(query, flags) : new RegExp(escapeRegex(query), flags);
      } catch {
        // Invalid regex — fall back to literal
        pattern = new RegExp(escapeRegex(query), options.caseSensitive ? "g" : "gi");
      }

      for (let i = 0; i < lines.length && results.length < max; i++) {
        if (pattern.test(lines[i])) {
          results.push({ filePath: path, fileName: node.name, line: i + 1, snippet: lines[i].trim() });
        }
        pattern.lastIndex = 0; // reset for global regex
      }
    }

    if (node.children) {
      results.push(...searchCodebase(query, node.children, options, path));
    }
  }

  return results.slice(0, max);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// IDENTITY_SEAL: PART-2 | role=SearchEngine | inputs=query,FileNode[] | outputs=SearchResult[]

// ============================================================
// PART 3 — File Group (collapsible result section)
// ============================================================

function FileGroup({
  filePath, results, onOpenFile, showReplace, onReplace, lang
}: FileGroupProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-1 px-3 py-1 hover:bg-white/5 text-text-tertiary"
      >
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <FileCode size={10} className="text-amber-400" />
        <span className="flex-1 text-left truncate text-text-primary">{filePath}</span>
        <span className="text-[9px] text-text-tertiary">{results.length}</span>
      </button>
      {expanded && results.map((r, i) => (
        <div key={i} className="group">
          <button
            onClick={() => onOpenFile(r.fileName, r.line)}
            className="w-full text-left px-6 py-0.5 hover:bg-white/5 truncate flex items-center text-xs"
          >
            <span className="text-text-tertiary">{r.line ? `L${r.line}: ` : ""}</span>
            <span className="flex-1 truncate text-text-primary">{r.snippet}</span>
            {showReplace && r.line && (
              <span
                onClick={(e) => { e.stopPropagation(); onReplace?.(r.fileName, r.line); }}
                className="text-[8px] px-1 py-0.5 rounded bg-amber-900/30 text-amber-400 opacity-0 group-hover:opacity-100 ml-1 shrink-0 cursor-pointer hover:bg-amber-900/35"
              >
                {L4(lang, { ko: "바꾸기", en: "Replace" })}</span>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=FileGroupRenderer | inputs=filePath,SearchResult[] | outputs=collapsible-results-JSX

// ============================================================
// PART 4 — SearchPanel Main Component
// ============================================================

interface FileGroupProps {
  lang: string;
  filePath: string;
  results: SearchResult[];
  onOpenFile: (name: string, line?: number) => void;
  showReplace?: boolean;
  onReplace?: (fileName: string, line: number) => void;
}

interface Props {
  files: FileNode[];
  onOpenFile: (name: string, line?: number) => void;
  onClose: () => void;
  onReplaceInFile?: (fileName: string, line: number, searchText: string, replaceText: string) => void;
  onReplaceAll?: (searchText: string, replaceText: string, fileTypeFilter?: string) => void;
}

export function SearchPanel({ files, onOpenFile, onClose, onReplaceInFile, onReplaceAll }: Props) {
  const { lang } = useLang();
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState("");
  const [showFileTypeDropdown, setShowFileTypeDropdown] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => loadSearchHistory());
  const [showHistory, setShowHistory] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Deferred for responsiveness
  const deferredQuery = useDeferredValue(query);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.length >= 2) {
      const updated = [...searchHistory.filter((h) => h !== query), query].slice(-MAX_HISTORY);
      setSearchHistory(updated);
      saveSearchHistory(updated);
      setShowHistory(false);
    }
  }, [query, searchHistory]);

  const handleSelectHistory = useCallback((item: string) => {
    setQuery(item);
    setShowHistory(false);
    searchInputRef.current?.focus();
  }, []);

  const handleReplace = useCallback((fileName: string, line: number) => {
    onReplaceInFile?.(fileName, line, query, replaceText);
  }, [query, replaceText, onReplaceInFile]);

  const handleReplaceAll = useCallback(() => {
    if (query && replaceText !== undefined) {
      onReplaceAll?.(query, replaceText, fileTypeFilter || undefined);
    }
  }, [query, replaceText, fileTypeFilter, onReplaceAll]);

  const results = useMemo(() => {
    if (deferredQuery.length < 2) return [];
    let res = searchCodebase(deferredQuery, files, { caseSensitive, useRegex, maxResults: 100 });
    if (fileTypeFilter) {
      res = res.filter((r) => r.fileName.endsWith(fileTypeFilter));
    }
    return res.slice(0, 30);
  }, [deferredQuery, files, fileTypeFilter, caseSensitive, useRegex]);

  const matchSummary = useMemo(() => {
    const total = results.length;
    const fileCount = new Set(results.map((r) => r.filePath)).size;
    return L4(lang, { ko: `${total}개의 결과 (${fileCount}개 파일)`, en: `${total} result${total !== 1 ? "s" : ""} in ${fileCount} file${fileCount !== 1 ? "s" : ""}` });
  }, [results, lang]);

  // Group by file
  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
      const list = map.get(r.filePath) ?? [];
      list.push(r);
      map.set(r.filePath, list);
    }
    return map;
  }, [results]);

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
        <span className="text-xs font-semibold flex items-center gap-1 text-text-primary">
          <Search size={12} />{L4(lang, { ko: "검색", en: "Search" })}</span>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary" aria-label={L4(lang, { ko: "검색 닫기", en: "Close search" })}>
          <X size={12} />
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 py-2 border-b border-white/8">
        <div className="relative">
          <div className="flex items-center gap-1 bg-white/5 rounded px-2 py-1">
            <Search size={12} className="text-text-tertiary" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => searchHistory.length > 0 && setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 200)}
              placeholder={L4(lang, { ko: "검색...", en: "Search..." })}
              className="flex-1 bg-transparent text-xs outline-none text-text-primary placeholder:text-text-tertiary"
              autoFocus
            />
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="text-text-tertiary hover:text-text-primary"
              title={L4(lang, { ko: "검색 기록", en: "Search history" })}
            >
              <History size={10} />
            </button>
            <button
              onClick={() => setShowReplace((v) => !v)}
              className={`text-text-tertiary hover:text-text-primary ${showReplace ? "text-amber-400" : ""}`}
              title={L4(lang, { ko: "바꾸기 전환", en: "Toggle replace" })}
            >
              <Replace size={10} />
            </button>
          </div>

          {/* History dropdown */}
          {showHistory && searchHistory.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 bg-bg-primary border border-white/8 rounded mt-0.5 shadow-lg max-h-32 overflow-y-auto">
              {searchHistory.slice().reverse().map((item, i) => (
                <button
                  key={i}
                  onMouseDown={() => handleSelectHistory(item)}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-white/5 truncate flex items-center gap-1 text-text-primary"
                >
                  <History size={8} className="text-text-tertiary shrink-0" />
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Replace input */}
        {showReplace && (
          <div className="flex items-center gap-1 bg-white/5 rounded px-2 py-1 mt-1">
            <Replace size={12} className="text-text-tertiary" />
            <input
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder={L4(lang, { ko: "바꿀 내용...", en: "Replace with..." })}
              className="flex-1 bg-transparent text-xs outline-none text-text-primary placeholder:text-text-tertiary"
            />
            <button
              onClick={handleReplaceAll}
              className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 hover:bg-amber-900/35"
            >{L4(lang, { ko: "모두 바꾸기", en: "Replace All" })}</button>
          </div>
        )}

        {/* Toggle buttons + file filter */}
        <div className="flex gap-2 mt-1 flex-wrap items-center">
          <button
            onClick={() => setCaseSensitive((v) => !v)}
            aria-label={L4(lang, { ko: "대소문자 구분", en: "Case sensitive" })}
            aria-pressed={caseSensitive}
            className={`text-[9px] px-1.5 py-0.5 rounded transition-colors
              ${caseSensitive ? "bg-amber-900/30 text-amber-400" : "text-text-tertiary hover:text-text-primary"}`}
          >
            Aa
          </button>
          <button
            onClick={() => setUseRegex((v) => !v)}
            aria-label={L4(lang, { ko: "정규식 사용", en: "Use regular expression" })}
            aria-pressed={useRegex}
            className={`text-[9px] px-1.5 py-0.5 rounded transition-colors
              ${useRegex ? "bg-amber-900/30 text-amber-400" : "text-text-tertiary hover:text-text-primary"}`}
          >
            .*
          </button>

          <div className="relative ml-auto">
            <button
              onClick={() => setShowFileTypeDropdown((v) => !v)}
              className={`flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded transition-colors
                ${fileTypeFilter ? "bg-amber-500/20 text-amber-400" : "text-text-tertiary hover:text-text-primary"}`}
              title={L4(lang, { ko: "파일 형식 필터", en: "File type filter" })}
            >
              <Filter size={8} /> {fileTypeFilter || L4(lang, { ko: "모든 파일", en: "All Files" })}
            </button>
            {showFileTypeDropdown && (
              <div className="absolute right-0 top-full z-50 bg-bg-primary border border-white/8 rounded mt-0.5 shadow-lg">
                {FILE_TYPE_FILTERS.map((ft) => (
                  <button
                    key={ft.value}
                    onClick={() => { setFileTypeFilter(ft.value); setShowFileTypeDropdown(false); }}
                    className={`w-full text-left px-3 py-1 text-[9px] hover:bg-white/5 ${fileTypeFilter === ft.value ? "text-amber-400" : "text-text-primary"}`}
                  >
                    {ft.value === "" ? L4(lang, { ko: "모든 파일", en: "All Files" }) : ft.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {query.length >= 2 && (
          <div className="text-[9px] text-text-tertiary mt-1">{matchSummary}</div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto text-xs">
        {query.length < 2 ? (
          <p className="text-center text-text-tertiary py-8">{L4(lang, { ko: "2글자 이상 입력하세요", en: "Type at least 2 characters" })}</p>
        ) : results.length === 0 ? (
          <p className="text-center text-text-tertiary py-8">{L4(lang, { ko: "일치하는 결과 없음", en: "No matching results" })}</p>
        ) : (
          Array.from(grouped).map(([filePath, items]) => (
            <FileGroup
              key={filePath}
              lang={lang}
              filePath={filePath}
              results={items}
              onOpenFile={onOpenFile}
              showReplace={showReplace}
              onReplace={handleReplace}
            />
          ))
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=SearchPanelRoot | inputs=files,onOpenFile,onClose | outputs=search-UI-with-replace
