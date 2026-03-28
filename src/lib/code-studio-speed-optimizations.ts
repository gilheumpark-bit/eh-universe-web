// ============================================================
// Code Studio — Performance Utilities
// ============================================================
// debounce, throttle, memoize, lazy init, batch updates, requestIdleCallback 래퍼.

/** Debounce: delay execution until no calls for `ms` milliseconds */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: unknown[]) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn(...args); }, ms);
  }) as T & { cancel: () => void };

  debounced.cancel = () => { if (timer !== null) { clearTimeout(timer); timer = null; } };
  return debounced;
}

/** Throttle: execute at most once per `ms` milliseconds */
export function throttle<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return ((...args: unknown[]) => {
    const now = Date.now();
    const remaining = ms - (now - lastCall);

    if (remaining <= 0) {
      if (timer !== null) { clearTimeout(timer); timer = null; }
      lastCall = now;
      fn(...args);
    } else if (timer === null) {
      timer = setTimeout(() => {
        lastCall = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  }) as T;
}

/** Memoize: cache function results by first argument */
export function memoize<A, R>(fn: (arg: A) => R, maxSize = 100): (arg: A) => R {
  const cache = new Map<A, R>();

  return (arg: A): R => {
    if (cache.has(arg)) return cache.get(arg)!;

    const result = fn(arg);
    cache.set(arg, result);

    if (cache.size > maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }

    return result;
  };
}

/** Lazy init: compute value on first access, cache thereafter */
export function lazy<T>(factory: () => T): () => T {
  let value: T;
  let initialized = false;

  return () => {
    if (!initialized) {
      value = factory();
      initialized = true;
    }
    return value;
  };
}

/** Batch updates: collect calls and flush together */
export function batchUpdates<T>(
  flush: (items: T[]) => void,
  delayMs = 16,
): (item: T) => void {
  let batch: T[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (item: T) => {
    batch.push(item);
    if (timer === null) {
      timer = setTimeout(() => {
        const items = batch;
        batch = [];
        timer = null;
        flush(items);
      }, delayMs);
    }
  };
}

/** requestIdleCallback wrapper with fallback */
export function onIdle(callback: () => void, timeout = 5000): void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 1);
  }
}

/** Measure execution time of a function */
export function measureTime<T>(label: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const elapsed = performance.now() - start;
  if (elapsed > 16) {
    console.warn(`[perf] ${label}: ${elapsed.toFixed(1)}ms`);
  }
  return result;
}

/** Async version of measureTime */
export async function measureTimeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const elapsed = performance.now() - start;
  if (elapsed > 100) {
    console.warn(`[perf] ${label}: ${elapsed.toFixed(1)}ms`);
  }
  return result;
}

// IDENTITY_SEAL: role=SpeedOptimizations | inputs=fn,ms | outputs=debounced/throttled/memoized functions
