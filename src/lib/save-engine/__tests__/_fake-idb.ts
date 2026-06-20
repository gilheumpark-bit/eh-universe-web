// ============================================================
// PART 1 — Minimal in-memory IndexedDB shim (jest tests only)
// ============================================================
//
// jsdom에는 IndexedDB 없음. 외부 의존(fake-indexeddb)은 금지(프롬프트 제약).
// 따라서 save-engine 테스트에 필요한 최소 서브셋만 로컬 shim으로 제공.
//
// 지원 범위:
//   - indexedDB.open(name, version) + onupgradeneeded/onsuccess/onerror
//   - IDBDatabase.transaction(stores, mode, { durability })
//   - IDBObjectStore.put / get / delete / openCursor
//   - IDBKeyRange.bound / lowerBound / upperBound
//   - IDBIndex 단순 호출(더미 — 현 테스트에서 미사용)
//
// 미지원(의도적): onblocked, versionchange, 복합 key, 실시간 error propagation 복잡.

type Rec = { key: unknown; value: unknown };

// ============================================================
// PART 2 — Cursor / Request stubs
// ============================================================

class FakeCursor {
  public value: unknown;
  private index = 0;
  constructor(private readonly list: Rec[], private readonly onContinue: (cursor: FakeCursor | null) => void) {
    if (list.length === 0) this.value = undefined;
    else this.value = list[0].value;
  }
  continue() {
    this.index++;
    if (this.index >= this.list.length) {
      this.onContinue(null);
    } else {
      this.value = this.list[this.index].value;
      this.onContinue(this);
    }
  }
}

class FakeRequest<T = unknown> {
  public result: T | undefined;
  public error: Error | null = null;
  public onsuccess: ((ev: Event) => void) | null = null;
  public onerror: ((ev: Event) => void) | null = null;

  fire(result: T) {
    this.result = result;
    setTimeout(() => this.onsuccess?.(new Event('success')), 0);
  }
  fail(err: Error) {
    this.error = err;
    setTimeout(() => this.onerror?.(new Event('error')), 0);
  }
}

// ============================================================
// PART 3 — ObjectStore / Transaction
// ============================================================

class FakeObjectStore {
  constructor(
    private readonly data: Map<string, Map<unknown, unknown>>,
    private readonly storeName: string,
    private readonly keyPath: string,
  ) {
    if (!data.has(storeName)) data.set(storeName, new Map());
  }
  private rows(): Map<unknown, unknown> { return this.data.get(this.storeName)!; }

  put(value: Record<string, unknown>): FakeRequest<void> {
    const req = new FakeRequest<void>();
    try {
      const key = value[this.keyPath];
      this.rows().set(key, value);
      req.fire(undefined);
    } catch (err) {
      req.fail(err instanceof Error ? err : new Error(String(err)));
    }
    return req;
  }
  get(key: unknown): FakeRequest<unknown> {
    const req = new FakeRequest<unknown>();
    req.fire(this.rows().get(key));
    return req;
  }
  delete(key: unknown): FakeRequest<void> {
    const req = new FakeRequest<void>();
    this.rows().delete(key);
    req.fire(undefined);
    return req;
  }
  openCursor(range?: FakeKeyRange): FakeRequest<FakeCursor | null> {
    const req = new FakeRequest<FakeCursor | null>();
    const entries: Rec[] = Array.from(this.rows().entries())
      .filter(([k]) => !range || range.includes(k))
      .sort((a, b) => (a[0] as string < (b[0] as string) ? -1 : 1))
      .map(([k, v]) => ({ key: k, value: v }));
    if (entries.length === 0) {
      setTimeout(() => req.onsuccess?.(new Event('success')), 0);
      return req;
    }
    const cursor = new FakeCursor(entries, (nextCursor) => {
      req.result = nextCursor;
      setTimeout(() => req.onsuccess?.(new Event('success')), 0);
    });
    req.result = cursor;
    setTimeout(() => req.onsuccess?.(new Event('success')), 0);
    return req;
  }
  createIndex(_name: string, _keyPath: string, _opts?: object) {
    // 미구현 — 테스트에서 사용 안 함
    return { name: _name };
  }
}

class FakeTransaction {
  public oncomplete: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public onabort: (() => void) | null = null;
  public error: Error | null = null;
  private stores: Map<string, FakeObjectStore>;
  private completed = false;
  constructor(
    storeNames: string[],
    private readonly data: Map<string, Map<unknown, unknown>>,
    private readonly keyPaths: Map<string, string>,
  ) {
    this.stores = new Map();
    for (const name of storeNames) {
      this.stores.set(name, new FakeObjectStore(data, name, keyPaths.get(name) ?? 'id'));
    }
    // 마이크로태스크 후 complete
    setTimeout(() => {
      if (!this.completed && !this.error) {
        this.completed = true;
        this.oncomplete?.();
      }
    }, 5);
  }
  objectStore(name: string): FakeObjectStore {
    const s = this.stores.get(name);
    if (!s) throw new Error(`store ${name} not in tx`);
    return s;
  }
  abort() {
    this.error = new Error('aborted');
    setTimeout(() => this.onabort?.(), 0);
  }
}

// ============================================================
// PART 4 — Database / KeyRange / Factory
// ============================================================

class FakeDatabase {
  public objectStoreNames: { contains(name: string): boolean; toArray: string[] };
  public onversionchange: (() => void) | null = null;
  private data = new Map<string, Map<unknown, unknown>>();
  private keyPaths = new Map<string, string>();

  constructor(public name: string, public version: number) {
    this.objectStoreNames = {
      toArray: [],
      contains: (n: string) => this.objectStoreNames.toArray.includes(n),
    };
  }

  createObjectStore(name: string, opts: { keyPath: string }) {
    this.objectStoreNames.toArray.push(name);
    this.keyPaths.set(name, opts.keyPath);
    if (!this.data.has(name)) this.data.set(name, new Map());
    // Return object w/ createIndex
    return new FakeObjectStore(this.data, name, opts.keyPath);
  }

  transaction(storeNames: string[] | string, _mode: string, _opts?: object): FakeTransaction {
    const arr = Array.isArray(storeNames) ? storeNames : [storeNames];
    return new FakeTransaction(arr, this.data, this.keyPaths);
  }

  close() { /* noop */ }

  // Test helper (non-standard)
  __reset() {
    this.data.clear();
  }
}

class FakeKeyRange {
  constructor(
    public lower: unknown,
    public upper: unknown,
    public lowerOpen: boolean,
    public upperOpen: boolean,
  ) {}
  includes(key: unknown): boolean {
    const k = key as string;
    if (this.lower !== undefined && this.lower !== null) {
      if (this.lowerOpen ? !(k > (this.lower as string)) : !(k >= (this.lower as string))) return false;
    }
    if (this.upper !== undefined && this.upper !== null) {
      if (this.upperOpen ? !(k < (this.upper as string)) : !(k <= (this.upper as string))) return false;
    }
    return true;
  }
  static bound(l: unknown, u: unknown, lo = false, uo = false) { return new FakeKeyRange(l, u, lo, uo); }
  static lowerBound(l: unknown, open = false) { return new FakeKeyRange(l, null, open, false); }
  static upperBound(u: unknown, open = false) { return new FakeKeyRange(null, u, false, open); }
}

const dbs = new Map<string, FakeDatabase>();

const fakeIndexedDB = {
  open(name: string, version: number) {
    const req = new FakeRequest<FakeDatabase>();
    setTimeout(() => {
      let db = dbs.get(name);
      if (!db || db.version < version) {
        const fresh = new FakeDatabase(name, version);
        const oldDb = db;
        dbs.set(name, fresh);
        db = fresh;
        // onupgradeneeded
        const upgReq = req as unknown as { onupgradeneeded: ((ev: IDBVersionChangeEvent) => void) | null; result: FakeDatabase };
        upgReq.result = fresh;
        if (upgReq.onupgradeneeded) {
          upgReq.onupgradeneeded({ oldVersion: oldDb?.version ?? 0, newVersion: version } as IDBVersionChangeEvent);
        }
      }
      req.fire(db!);
    }, 0);
    return req;
  },
  deleteDatabase(name: string) {
    dbs.delete(name);
    const req = new FakeRequest<void>();
    req.fire(undefined);
    return req;
  },
};

// ============================================================
// PART 5 — Install on globalThis (jest test scope)
// ============================================================

export function installFakeIndexedDB(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  g.indexedDB = fakeIndexedDB;
  g.IDBKeyRange = FakeKeyRange;
}

export function resetFakeIndexedDB(): void {
  dbs.clear();
}
