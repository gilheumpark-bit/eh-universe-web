"use client";

/**
 * ContextTrimmedToast (2026-05-10 신설 — G-19 mount)
 *
 * `buildAgentSystemPrompt` 의 autoTrim 자동 절삭 발생 시 사용자에게 알림.
 *
 * 이벤트 채널:
 *   noa:context-trimmed { agentId, trimmedBlocks: ContextBlockId[], finalRatio }
 *
 * 정책:
 *   - 8초 토스트 (사용자가 어떤 정보가 빠졌는지 인지 충분 시간)
 *   - 같은 agentId 5초 dedup
 *   - 4언어 라벨 + 절삭된 contextBlock list 표시
 *   - 사용자 액션: 닫기 / 자세히 (다음 phase)
 *
 * Mount: StudioShell 의 root JSX (TokenBudgetToast 와 함께)
 *
 * [C] 안전성: SSR/CustomEvent 미지원 fallback
 * [G] 성능: dedup 으로 누적 방지
 * [K] 간결성: 단일 컴포넌트 + 4언어 라벨
 */

import { useEffect, useState, useCallback } from 'react';
import { Scissors } from 'lucide-react';

interface ContextTrimmedEventDetail {
  agentId?: string;
  trimmedBlocks?: string[];
  finalRatio?: number;
}

interface ToastEntry {
  id: string;
  agentId?: string;
  trimmedBlocks: string[];
  finalRatio: number;
  expiresAt: number;
}

const LABELS = {
  ko: {
    title: '컨텍스트 자동 절삭',
    agent: '에이전트',
    blocks: '제거된 영역',
    finalUtil: '최종 사용률',
    dismiss: '닫기',
  },
  en: {
    title: 'Context auto-trimmed',
    agent: 'Agent',
    blocks: 'Removed blocks',
    finalUtil: 'Final usage',
    dismiss: 'Dismiss',
  },
  ja: {
    title: 'コンテキスト自動圧縮',
    agent: 'エージェント',
    blocks: '削除ブロック',
    finalUtil: '最終使用率',
    dismiss: '閉じる',
  },
  zh: {
    title: '上下文自动压缩',
    agent: '代理',
    blocks: '移除块',
    finalUtil: '最终使用率',
    dismiss: '关闭',
  },
} as const;

interface Props {
  language?: 'ko' | 'en' | 'ja' | 'zh';
  durationMs?: number;
}

export default function ContextTrimmedToast({ language = 'ko', durationMs = 8000 }: Props) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const L = LABELS[language];

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      const ce = e as CustomEvent<ContextTrimmedEventDetail>;
      const detail = ce.detail;
      if (!detail) return;
      const id = `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const entry: ToastEntry = {
        id,
        agentId: detail.agentId,
        trimmedBlocks: detail.trimmedBlocks ?? [],
        finalRatio: detail.finalRatio ?? 0,
        expiresAt: Date.now() + durationMs,
      };
      setToasts(prev => {
        // 같은 agentId 5초 dedup
        const recent = prev.find(t =>
          t.agentId === entry.agentId && t.expiresAt > Date.now() - 5000,
        );
        if (recent) return prev;
        const next = [...prev, entry];
        return next.length > 3 ? next.slice(-3) : next;
      });
      setTimeout(() => dismiss(id), durationMs);
    };

    window.addEventListener('noa:context-trimmed', handler);
    return () => window.removeEventListener('noa:context-trimmed', handler);
  }, [dismiss, durationMs]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 left-4 z-[var(--z-tooltip,9999)] flex flex-col gap-2 max-w-sm pointer-events-none"
      aria-live="polite"
      role="status"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto px-4 py-3 border border-accent-blue/60 bg-bg-primary text-xs font-mono shadow-md"
          role="status"
        >
          <div className="flex items-start gap-2">
            <Scissors className="w-4 h-4 shrink-0 mt-0.5 text-accent-blue" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-text-primary">{L.title}</div>
              {t.agentId && (
                <div className="text-text-tertiary mt-0.5 text-[10px]">
                  {L.agent}: {t.agentId}
                </div>
              )}
              <div className="text-text-secondary mt-1 text-[11px]">
                {L.blocks}: {t.trimmedBlocks.join(', ')}
              </div>
              <div className="text-text-tertiary mt-0.5 text-[10px]">
                {L.finalUtil}: {Math.round(t.finalRatio * 100)}%
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
