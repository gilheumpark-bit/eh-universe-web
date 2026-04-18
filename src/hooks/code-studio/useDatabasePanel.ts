// ============================================================
// Code Studio — Database Panel Sub-hook
// Demo in-memory SQL executor + connection stubs.
// ============================================================

import { useCallback } from "react";
import type { DBConnection, QueryResult } from "@/components/code-studio/DatabasePanel";

const DEMO_DB_CONNECTIONS: DBConnection[] = [
  { id: "local-sqlite", name: "Local SQLite", type: "sqlite", connectionString: ":memory:", connected: true },
];

const DEMO_TABLES = ["users", "projects", "files", "sessions", "settings"];

interface DemoRow { [key: string]: unknown }

const DEMO_DATA: Record<string, { columns: string[]; rows: DemoRow[] }> = {
  users: {
    columns: ["id", "name", "email", "role", "created_at"],
    rows: [
      { id: 1, name: "admin", email: "admin@eh-universe.dev", role: "admin", created_at: "2025-01-01" },
      { id: 2, name: "developer", email: "dev@eh-universe.dev", role: "developer", created_at: "2025-03-15" },
      { id: 3, name: "reviewer", email: "review@eh-universe.dev", role: "reviewer", created_at: "2025-06-01" },
    ],
  },
  projects: {
    columns: ["id", "name", "status", "language", "file_count"],
    rows: [
      { id: 1, name: "eh-universe-web", status: "active", language: "TypeScript", file_count: 142 },
      { id: 2, name: "eh-api", status: "active", language: "Python", file_count: 56 },
      { id: 3, name: "eh-mobile", status: "paused", language: "Dart", file_count: 89 },
    ],
  },
  files: {
    columns: ["id", "project_id", "path", "size_kb", "last_modified"],
    rows: [
      { id: 1, project_id: 1, path: "src/index.ts", size_kb: 2, last_modified: "2026-03-28" },
      { id: 2, project_id: 1, path: "src/App.tsx", size_kb: 5, last_modified: "2026-03-29" },
      { id: 3, project_id: 2, path: "main.py", size_kb: 8, last_modified: "2026-03-27" },
    ],
  },
  sessions: {
    columns: ["id", "user_id", "start_time", "duration_min", "active"],
    rows: [
      { id: 1, user_id: 1, start_time: "2026-03-29 09:00", duration_min: 120, active: true },
      { id: 2, user_id: 2, start_time: "2026-03-29 10:30", duration_min: 45, active: false },
    ],
  },
  settings: {
    columns: ["key", "value", "type", "updated_at"],
    rows: [
      { key: "theme", value: "dark", type: "string", updated_at: "2026-03-29" },
      { key: "fontSize", value: "14", type: "number", updated_at: "2026-03-28" },
      { key: "autoSave", value: "true", type: "boolean", updated_at: "2026-03-27" },
    ],
  },
};

function executeLocalQuery(query: string): QueryResult {
  const start = performance.now();
  const trimmed = query.trim().toLowerCase();

  // SELECT * FROM <table>
  const selectMatch = trimmed.match(/^select\s+(.+?)\s+from\s+(\w+)(?:\s+where\s+(.+?))?(?:\s+limit\s+(\d+))?;?\s*$/i);
  if (selectMatch) {
    const tableName = selectMatch[2];
    const limit = selectMatch[4] ? parseInt(selectMatch[4]) : 100;
    const data = DEMO_DATA[tableName];
    if (!data) {
      return { columns: [], rows: [], rowCount: 0, executionTime: Math.round(performance.now() - start), error: `Table '${tableName}' not found. Available: ${DEMO_TABLES.join(", ")}` };
    }

    let rows = [...data.rows];

    // Basic WHERE support
    if (selectMatch[3]) {
      const whereClause = selectMatch[3];
      const eqMatch = whereClause.match(/(\w+)\s*=\s*['""]?(\w+)['""]?/);
      if (eqMatch) {
        const [, col, val] = eqMatch;
        rows = rows.filter((r) => String(r[col]) === val);
      }
    }

    rows = rows.slice(0, limit);

    // Column selection
    let columns = data.columns;
    if (selectMatch[1] !== "*") {
      columns = selectMatch[1].split(",").map((c) => c.trim());
      rows = rows.map((r) => {
        const filtered: DemoRow = {};
        for (const c of columns) { if (c in r) filtered[c] = r[c]; }
        return filtered;
      });
    }

    return { columns, rows, rowCount: rows.length, executionTime: Math.round(performance.now() - start) };
  }

  // SHOW TABLES
  if (trimmed.startsWith("show tables") || trimmed === "\\dt") {
    return {
      columns: ["table_name"],
      rows: DEMO_TABLES.map((t) => ({ table_name: t })),
      rowCount: DEMO_TABLES.length,
      executionTime: Math.round(performance.now() - start),
    };
  }

  // DESCRIBE <table>
  const descMatch = trimmed.match(/^(?:describe|desc)\s+(\w+)/i);
  if (descMatch) {
    const data = DEMO_DATA[descMatch[1]];
    if (!data) {
      return { columns: [], rows: [], rowCount: 0, executionTime: Math.round(performance.now() - start), error: `Table '${descMatch[1]}' not found` };
    }
    return {
      columns: ["column_name", "type"],
      rows: data.columns.map((c) => ({ column_name: c, type: "TEXT" })),
      rowCount: data.columns.length,
      executionTime: Math.round(performance.now() - start),
    };
  }

  // COUNT
  const countMatch = trimmed.match(/^select\s+count\(\*\)\s+from\s+(\w+)/i);
  if (countMatch) {
    const data = DEMO_DATA[countMatch[1]];
    if (!data) {
      return { columns: [], rows: [], rowCount: 0, executionTime: Math.round(performance.now() - start), error: `Table '${countMatch[1]}' not found` };
    }
    return { columns: ["count"], rows: [{ count: data.rows.length }], rowCount: 1, executionTime: Math.round(performance.now() - start) };
  }

  return {
    columns: [],
    rows: [],
    rowCount: 0,
    executionTime: Math.round(performance.now() - start),
    error: "Supported queries: SELECT * FROM <table> [WHERE col=val] [LIMIT n], SHOW TABLES, DESCRIBE <table>, SELECT COUNT(*) FROM <table>",
  };
}

/** Database panel — demo connection + SQL executor. */
export function useDatabasePanel() {
  const dbConnections = DEMO_DB_CONNECTIONS;
  const dbTables = DEMO_TABLES;

  const handleDbConnect = useCallback(async (_conn: DBConnection): Promise<boolean> => {
    return true; // Demo: always connected
  }, []);

  const handleDbQuery = useCallback(async (_connId: string, query: string): Promise<QueryResult> => {
    return executeLocalQuery(query);
  }, []);

  return {
    dbConnections,
    dbTables,
    handleDbConnect,
    handleDbQuery,
  };
}
