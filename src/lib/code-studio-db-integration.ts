// ============================================================
// Code Studio — Database Integration Layer
// ============================================================

// ============================================================
// PART 1 — Types
// ============================================================

export type DBProvider = 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';

export interface DBConnectionConfig {
  id: string;
  name: string;
  provider: DBProvider;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
}

export interface TableSchema {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    isPrimaryKey: boolean;
    defaultValue?: string;
  }>;
  rowEstimate: number;
}

export interface DBSchema {
  tables: TableSchema[];
  views: string[];
  provider: DBProvider;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=DBConnectionConfig,QueryResult,DBSchema

// ============================================================
// PART 2 — Connection Manager (simulated)
// ============================================================

const STORAGE_KEY = 'eh_db_connections';

function loadConnections(): DBConnectionConfig[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DBConnectionConfig[]) : [];
  } catch {
    return [];
  }
}

function saveConnections(conns: DBConnectionConfig[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conns));
}

export function addConnection(config: Omit<DBConnectionConfig, 'id'>): DBConnectionConfig {
  const conn: DBConnectionConfig = {
    ...config,
    id: `db_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  };
  const conns = loadConnections();
  conns.push(conn);
  saveConnections(conns);
  return conn;
}

export function getConnections(): DBConnectionConfig[] {
  return loadConnections();
}

export function removeConnection(id: string): void {
  saveConnections(loadConnections().filter((c) => c.id !== id));
}

// IDENTITY_SEAL: PART-2 | role=connection manager | inputs=DBConnectionConfig | outputs=DBConnectionConfig[]

// ============================================================
// PART 3 — Query Execution (simulated for browser)
// ============================================================

/**
 * In a real environment this would connect via a backend proxy.
 * In the browser IDE, this provides a simulated query interface
 * that can be wired to a WebContainer-based DB or proxy API.
 */
export async function executeQuery(
  connectionId: string,
  sql: string,
  runCommand?: (cmd: string) => Promise<string>,
): Promise<QueryResult> {
  const start = Date.now();
  const conn = loadConnections().find((c) => c.id === connectionId);
  if (!conn) {
    return { columns: [], rows: [], rowCount: 0, executionTimeMs: 0, error: 'Connection not found' };
  }

  // If runCommand is available (WebContainer), proxy through it
  if (runCommand) {
    try {
      const result = await runCommand(`echo '${sql.replace(/'/g, "\\'")}' | node -e "process.stdin.resume(); process.stdin.on('data',d=>console.log(JSON.stringify({query:d.toString()})))"`);
      return {
        columns: ['result'],
        rows: [{ result }],
        rowCount: 1,
        executionTimeMs: Date.now() - start,
      };
    } catch (err) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Simulated response for demo
  return {
    columns: ['info'],
    rows: [{ info: `Query against ${conn.provider}://${conn.host}:${conn.port}/${conn.database}: ${sql.slice(0, 50)}...` }],
    rowCount: 1,
    executionTimeMs: Date.now() - start,
  };
}

// IDENTITY_SEAL: PART-3 | role=query execution | inputs=connectionId,sql | outputs=QueryResult

// ============================================================
// PART 4 — Schema Helpers
// ============================================================

export function generateConnectionSnippet(config: DBConnectionConfig): string {
  switch (config.provider) {
    case 'postgresql':
      return `import { Pool } from 'pg';\nconst pool = new Pool({\n  host: '${config.host}',\n  port: ${config.port},\n  database: '${config.database}',\n  user: '${config.username}',\n  ssl: ${config.ssl},\n});\nexport default pool;`;
    case 'mysql':
      return `import mysql from 'mysql2/promise';\nconst pool = mysql.createPool({\n  host: '${config.host}',\n  port: ${config.port},\n  database: '${config.database}',\n  user: '${config.username}',\n});\nexport default pool;`;
    case 'sqlite':
      return `import Database from 'better-sqlite3';\nconst db = new Database('${config.database}');\nexport default db;`;
    case 'mongodb':
      return `import { MongoClient } from 'mongodb';\nconst client = new MongoClient('mongodb://${config.host}:${config.port}');\nconst db = client.db('${config.database}');\nexport default db;`;
  }
}

export function getDefaultPort(provider: DBProvider): number {
  switch (provider) {
    case 'postgresql': return 5432;
    case 'mysql': return 3306;
    case 'sqlite': return 0;
    case 'mongodb': return 27017;
  }
}

// IDENTITY_SEAL: PART-4 | role=schema helpers | inputs=DBConnectionConfig | outputs=snippet,port
