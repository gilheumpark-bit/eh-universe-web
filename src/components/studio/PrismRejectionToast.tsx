"use client";

/**
 * PrismRejectionToast (2026-05-10 신설 — M-05 호출 측 통합 mount)
 *
 * geminiService 의 LLM 응답 받은 후 PRISM 거절 감지 시 사용자 친화 메시지 표시.
 *
 * 이벤트: noa:prism-rejection { message: string; level?: PrismLevel }
 *
 * 정책:
 *   - 10초 토스트 (사용자가 PRISM 등급 변경 결정 시간 충분)
 *   - 3초 dedup (연속 거절 시 1개만)
 *   - amber accent (경고 — 작가 주의)
 *
 * Mount: StudioShell root JSX (TokenBudgetToast / ContextTrimmedToast 와 함께)
 */

import { useEffect, useState, useCallback } from 'react';
import { ShieldAlert } from 'lucide-react';

interface RejectionEventDetail {
  message?: string;
  level?: string;
}

interface ToastEntry {
  id: string;
  message: string;
  level?: string;
  expiresAt: number;
}

const LABELS = {
  ko: { title: '노아 응답 거절 감지', dismiss: '닫기' },
  en: { title: 'Noa response declined', dismiss: 'Dismiss' },
  ja: { title: 'ノア応答の拒否を検出', dismiss: '閉じる' },
  zh: { title: '检测到诺亚响应被拒', dismiss: '关闭' },
} as const;

interface Props {
  language?: 'ko' | 'en' | 'ja' | 'zh';
  durationMs?: number;
}

export default function PrismRejectionToast({ language = 'ko', durationMs = 10000 }: Props) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const L = LABELS[language];

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      const ce = e as CustomEvent<RejectionEventDetail>;
      const detail = ce.detail;
      if (!detail?.message) return;
      const id = `prism-rej-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const entry: ToastEntry = {
        id,
        message: detail.message,
        level: detail.level,
        expiresAt: Date.now() + durationMs,
      };
      setToasts(prev => {
        // 3초 dedup — 같은 메시지 중복 방지
        const recent = prev.find(t => t.message === entry.message && t.expiresAt > Date.now() - 3000);
        if (recent) return prev;
        const next = [...prev, entry];
        return next.length > 3 ? next.slice(-3) : next;
      });
      setTimeout(() => dismiss(id), durationMs);
    };

    window.addEventListener('noa:prism-rejection', handler);
    return () => window.removeEventListener('noa:prism-rejection', handler);
  }, [dismiss, durationMs]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[var(--z-tooltip,9999)] flex flex-col gap-2 max-w-md pointer-events-none"
      aria-live="polite"
      role="alert"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto px-4 py-3 border border-accent-amber bg-bg-primary text-xs font-mono shadow-md"
          role="alert"
        >
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-accent-amber" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-text-primary">{L.title}</div>
              {t.level && (
                <div className="text-text-tertiary mt-0.5 text-[10px] uppercase tracking-wider">
                  {t.level}
                </div>
              )}
              <div className="text-text-secondary mt-1 text-[11px] leading-relaxed">
                {t.message}
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-tertiary hover:text-text-primary text-sm focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
              aria-label={L.dismiss}
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
