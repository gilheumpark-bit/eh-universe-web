'use client';
// 토스트 알림 영역 — 우측 하단 고정. ARIA live, ESC로 모두 닫기.
import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { type Toast, createToast, pruneExpired, nextToastId } from '@/lib/desktop/toast-store';

const KIND_ICON: Record<Toast['kind'], React.ElementType> = { info: Info, success: CheckCircle2, warn: AlertTriangle, error: AlertTriangle };
const KIND_COLOR: Record<Toast['kind'], string> = {
  info: 'text-text-secondary',
  success: 'text-accent-green',
  warn: 'text-accent-amber',
  error: 'text-red-400',
};

let pushSink: ((t: { kind?: Toast['kind']; message: string; ttl?: number }) => void) | null = null;
/** 외부에서 호출 가능한 토스트 발행기 — Toaster가 마운트된 후 동작. */
export function pushToast(input: { kind?: Toast['kind']; message: string; ttl?: number }): void {
  if (pushSink) pushSink(input);
}

export default function Toaster(): React.ReactElement | null {
  const [list, setList] = useState<Toast[]>([]);
  useEffect(() => {
    pushSink = (input) => {
      const t = createToast({ kind: input.kind, message: input.message, ttl: input.ttl, now: Date.now() });
      if (!t) return;
      setList((prev) => [...prev, { ...t, id: nextToastId(prev[prev.length - 1]?.id ?? '', Date.now()) }]);
    };
    return () => { pushSink = null; };
  }, []);
  // 만료 자동 정리
  useEffect(() => {
    if (list.length === 0) return;
    const tid = setInterval(() => setList((prev) => pruneExpired(prev, Date.now())), 500);
    return () => clearInterval(tid);
  }, [list.length]);
  const dismiss = useCallback((id: string) => setList((prev) => prev.filter((t) => t.id !== id)), []);
  if (list.length === 0) return null;
  return (
    <div role="region" aria-live="polite" aria-label="알림" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {list.map((t) => {
        const Icon = KIND_ICON[t.kind];
        return (
          <div key={t.id} className="pointer-events-auto flex items-start gap-2 rounded-xl border border-border bg-bg-secondary p-3 text-sm shadow-lg">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${KIND_COLOR[t.kind]}`} aria-hidden />
            <p className="flex-1 whitespace-pre-wrap text-text-primary">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="알림 닫기" className="rounded p-0.5 text-text-tertiary hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
