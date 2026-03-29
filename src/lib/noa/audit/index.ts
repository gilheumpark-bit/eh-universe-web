// ============================================================
// NOA Audit — Manager (Hash Chain + HMAC)
// Source: NOA v42.6/v43 Zero-Gravity
// ============================================================

import type { AuditEntry, AuditChainState, AuditVerification, AuditManager } from "../types";
import { canonicalJson, computeHash } from "./chain";
import { signHmac } from "./hmac";
import { verifyChainIntegrity } from "./verify";

/**
 * 감사 체인 매니저를 생성한다.
 * 모든 NOA 판정을 해시 체인으로 기록하여 위변조를 방지.
 *
 * @param hmacSecret - HMAC 서명 키 (세션별 생성)
 * @returns AuditManager 인스턴스
 *
 * Phase 2: IndexedDB 영속 저장 + v43 디스크 플러시 적용 완료
 */

// ── IndexedDB persistence helpers ──

const IDB_NAME = "noa-audit-db";
const IDB_STORE = "entries";
const IDB_VERSION = 1;

function openAuditDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function idbPut(db: IDBDatabase, entry: AuditEntry): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function idbLoadAll(db: IDBDatabase): Promise<AuditEntry[]> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

function idbClear(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function createAuditManager(hmacSecret: string = "noa-default-secret"): AuditManager {
  const entries: AuditEntry[] = [];
  let latestHash = "GENESIS_NOA_V1";
  let idCounter = 0;
  let _db: IDBDatabase | null = null;
  let _dbReady: Promise<void> | null = null;

  // Lazy-init IndexedDB and restore persisted entries
  function ensureDb(): Promise<void> {
    if (_dbReady) return _dbReady;
    _dbReady = openAuditDb().then(async (db) => {
      _db = db;
      if (db && entries.length === 0) {
        const stored = await idbLoadAll(db);
        if (stored.length > 0) {
          // Sort by id (timestamp embedded) and restore
          stored.sort((a, b) => a.id.localeCompare(b.id));
          entries.push(...stored);
          latestHash = stored[stored.length - 1].hash;
          idCounter = stored.length;
        }
      }
    });
    return _dbReady;
  }

  return {
    async append(partial) {
      await ensureDb();
      const id = `NOA-${++idCounter}-${Date.now()}`;
      const prevHash = latestHash;

      const payload = canonicalJson({
        id,
        timestamp: partial.timestamp,
        layer: partial.layer,
        input: partial.input,
        output: partial.output,
        verdict: partial.verdict,
        prevHash,
      });

      const hash = await computeHash(payload);
      const hmacSignature = await signHmac(hash, hmacSecret);

      const entry: AuditEntry = {
        id,
        timestamp: partial.timestamp,
        layer: partial.layer,
        input: partial.input,
        output: partial.output,
        verdict: partial.verdict,
        prevHash,
        hash,
        hmacSignature,
      };

      entries.push(entry);
      latestHash = hash;

      // Persist to IndexedDB (fire-and-forget)
      if (_db) {
        idbPut(_db, entry);
      }

      // 메모리 관리: 최대 1000건 유지 (v43 방식)
      if (entries.length > 1000) {
        entries.splice(0, entries.length - 500);
        // Rebuild IDB from trimmed in-memory set
        if (_db) {
          idbClear(_db).then(() => {
            for (const e of entries) {
              if (_db) idbPut(_db, e);
            }
          });
        }
      }

      return entry;
    },

    async verify(): Promise<AuditVerification> {
      await ensureDb();
      return verifyChainIntegrity(entries, hmacSecret);
    },

    getChain(): AuditChainState {
      return {
        entries: [...entries],
        latestHash,
        chainLength: entries.length,
      };
    },
  };
}
