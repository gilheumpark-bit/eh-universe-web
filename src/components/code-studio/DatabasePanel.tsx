"use client";

// ⚠️ SIMULATED PANEL — 실제 DB 연결 없음.
// 로컬 시뮬레이션 UI. WebContainer + SQLite 연동 시 실제 쿼리 실행으로 전환 가능.

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useCallback, useRef } from "react";
import { Database, Play, Clock, Table2, Settings, Loader2, AlertTriangle, ChevronRight, ChevronDown } from "lucide-react";

export interface DBConnection {
  id: string;
  name: string;
  type: "sqlite" | "postgresql" | "mysql" | "mongodb";
  connectionString: string;
  connected: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
  error?: string;
}

interface QueryHistoryEntry {
  id: string;
  query: string;
  timestamp: number;
  success: boolean;
}

interface DatabasePanelProps {
  connections: DBConnection[];
  onConnect: (conn: DBConnection) => Promise<boolean>;
  onExecuteQuery: (connectionId: string, query: string) => Promise<QueryResult>;
  tables?: string[];
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=DBConnection,QueryResult

// ============================================================
// PART 2 — Sidebar (Tables & History)
// ============================================================

function TableList({
  tables,
  onSelect,
}: {
  tables: string[];
  onSelect: (table: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1 px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-text-tertiary hover:text-text-primary"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Tables ({tables.length})
      </button>
      {expanded && (
        <div className="pb-1">
          {tables.map((t) => (
            <button
              key={t}
              onClick={() => onSelect(t)}
              className="flex w-full items-center gap-1.5 px-3 py-1 text-xs text-text-secondary hover:bg-bg-secondary/60 hover:text-text-primary"
            >
              <Table2 size={12} className="text-blue-400" />
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryList({
  history,
  onSelect,
}: {
  history: QueryHistoryEntry[];
  onSelect: (query: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1 px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-text-tertiary hover:text-text-primary"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        History ({history.length})
      </button>
      {expanded && (
        <div className="max-h-40 overflow-y-auto pb-1">
          {history.map((h) => (
            <button
              key={h.id}
              onClick={() => onSelect(h.query)}
              className={`flex w-full items-start gap-1.5 px-3 py-1 text-xs hover:bg-bg-secondary/60 ${
                h.success ? "text-text-secondary" : "text-red-400"
              }`}
            >
              <Clock size={10} className="mt-0.5 shrink-0" />
              <span className="truncate">{h.query}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=Sidebar | inputs=tables,history | outputs=JSX

// ============================================================
// PART 3 — Results Table
// ============================================================

function ResultsTable({ result }: { result: QueryResult | null }) {
  if (!result) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-tertiary">
        Run a query to see results
      </div>
    );
  }
  if (result.error) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-red-400">
        <AlertTriangle size={14} />
        {result.error}
      </div>
    );
  }
  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-bg-primary">
          <tr>
            {result.columns.map((col) => (
              <th key={col} className="border-b border-border px-3 py-1.5 text-left font-medium text-text-secondary">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-bg-secondary/60">
              {result.columns.map((col) => (
                <td key={col} className="border-b border-border px-3 py-1 text-text-primary">
                  {String(row[col] ?? "NULL")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-border px-3 py-1 text-[10px] text-text-tertiary">
        {result.rowCount} rows returned in {result.executionTime}ms
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=ResultsTable | inputs=QueryResult | outputs=JSX

// ============================================================
// PART 4 — Main Panel
// ============================================================

export default function DatabasePanel({
  connections,
  onConnect,
  onExecuteQuery,
  tables = [],
}: DatabasePanelProps) {
  // ⚠️ Simulation badge — no real DB connection
  const SIMULATION_BADGE = (
    <div className="flex items-center gap-1.5 border-b border-border/30 bg-amber-950/30 px-3 py-1">
      <Database size={12} className="text-amber-400" />
      <span className="text-[9px] font-medium text-amber-300">(시뮬레이션 / Simulated)</span>
    </div>
  );
  const [activeConn, setActiveConn] = useState<string>(connections[0]?.id ?? "");
  const [query, setQuery] = useState("SELECT * FROM ");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const execute = useCallback(async () => {
    if (!activeConn || !query.trim()) return;
    setRunning(true);
    try {
      const res = await onExecuteQuery(activeConn, query);
      setResult(res);
      setHistory((h) => [
        { id: `q-${Date.now()}`, query: query.trim(), timestamp: Date.now(), success: !res.error },
        ...h.slice(0, 49),
      ]);
    } catch (err) {
      setResult({ columns: [], rows: [], rowCount: 0, executionTime: 0, error: String(err) });
    } finally {
      setRunning(false);
    }
  }, [activeConn, query, onExecuteQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      execute();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {SIMULATION_BADGE}
      <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <div className="w-48 shrink-0 border-r border-border overflow-y-auto bg-bg-secondary/50">
        <div className="border-b border-border px-2 py-2">
          <select
            value={activeConn}
            onChange={(e) => setActiveConn(e.target.value)}
            className="w-full rounded bg-bg-secondary/40 px-2 py-1 text-xs text-text-primary border border-border outline-none"
          >
            {connections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <TableList tables={tables} onSelect={(t) => setQuery(`SELECT * FROM ${t} LIMIT 100;`)} />
        <HistoryList history={history} onSelect={setQuery} />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        {/* Query editor */}
        <div className="border-b border-border p-2">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            className="w-full resize-none rounded border border-border bg-bg-secondary/80 px-3 py-2 font-mono text-xs text-text-primary outline-none focus:border-accent-purple/50"
            placeholder="Enter SQL query... (Ctrl+Enter to execute)"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[10px] text-text-tertiary">Ctrl+Enter to execute</span>
            <button
              onClick={execute}
              disabled={running}
              className="flex items-center gap-1 rounded bg-accent-green px-3 py-1 text-xs text-bg-primary hover:bg-accent-green/80 disabled:opacity-50 transition-colors"
            >
              {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Execute
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-hidden">
          <ResultsTable result={result} />
        </div>
      </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=DatabasePanelUI | inputs=connections,onExecuteQuery | outputs=JSX
