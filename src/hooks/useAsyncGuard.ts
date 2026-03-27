import { useRef, useCallback, useState } from 'react';

interface AsyncGuardOptions {
  timeoutMs?: number;
}

interface AsyncGuardReturn {
  /** 비동기 함수 실행. 이미 실행 중이면 무시. */
  execute: <T>(fn: (signal: AbortSignal) => Promise<T>, opts?: AsyncGuardOptions) => Promise<T | null>;
  /** 현재 실행 중 여부 */
  isRunning: boolean;
  /** 실행 중인 작업 취소 */
  cancel: () => void;
}

/**
 * 동시 실행 방지 + 타임아웃 훅.
 * 같은 가드에서 execute를 여러 번 호출하면 첫 번째만 실행되고 나머지는 무시.
 */
export function useAsyncGuard(): AsyncGuardReturn {
  const [isRunning, setIsRunning] = useState(false);
  const lockRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    lockRef.current = false;
    setIsRunning(false);
  }, []);

  const execute = useCallback(async <T>(
    fn: (signal: AbortSignal) => Promise<T>,
    opts?: AsyncGuardOptions,
  ): Promise<T | null> => {
    // 동기 잠금 — 더블클릭 방지
    if (lockRef.current) return null;
    lockRef.current = true;
    setIsRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // 타임아웃 설정
    const timeout = opts?.timeoutMs;
    if (timeout && timeout > 0) {
      timeoutRef.current = setTimeout(() => {
        controller.abort();
      }, timeout);
    }

    try {
      const result = await fn(controller.signal);
      return result;
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      abortRef.current = null;
      lockRef.current = false;
      setIsRunning(false);
    }
  }, []);

  return { execute, isRunning, cancel };
}
