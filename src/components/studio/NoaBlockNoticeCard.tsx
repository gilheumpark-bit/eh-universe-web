"use client";

/**
 * NoaBlockNoticeCard (2026-06-11 신설 — N4 차단 고지 의무)
 *
 * NOA 정책 차단 발생 시 채팅/생성 표면 위에 표시되는 안내 카드.
 * 사일런트 차단 금지 — 무엇이 중단됐는지 + 해결 경로(등급 변경/표현 조정)를 정직하게 안내.
 *
 * 이벤트: noa:block-notice { message, gradeRequired, surface } (block-notice.ts 발화)
 *
 * 정책:
 *   - 12초 표시 (등급 변경 결정 시간 — PrismRejectionToast 10초보다 길게: 행동 유도 카드)
 *   - 동일 메시지 dedup 은 발화 측(block-notice.ts 3초) 책임 — 카드는 수신분 전부 표시(최대 2)
 *   - red accent (차단 — 경고보다 강함), role="alert"
 *
 * Mount: StudioShell root JSX (PrismRejectionToast 와 동일 위치)
 */

import { useEffect, useState, useCallback } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { BlockNoticeDetail } from '@/lib/noa/block-notice';

interface CardEntry {
  id: string;
  message: string;
  surface: string;
}

const LABELS = {
  ko: { title: '생성이 중단되었습니다', dismiss: '닫기' },
  en: { title: 'Generation stopped', dismiss: 'Dismiss' },
  ja: { title: '生成を中断しました', dismiss: '閉じる' },
  zh: { title: '已中止生成', dismiss: '关闭' },
} as const;

interface Props {
  language?: 'ko' | 'en' | 'ja' | 'zh';
  durationMs?: number;
}

export default function NoaBlockNoticeCard({ language = 'ko', durationMs = 12000 }: Props) {
  const [cards, setCards] = useState<CardEntry[]>([]);
  const L = LABELS[language];

  const dismiss = useCallback((id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<BlockNoticeDetail>).detail;
      if (!detail?.message) return;
      const id = `noa-block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setCards(prev => {
        const next = [...prev, { id, message: detail.message, surface: detail.surface }];
        return next.length > 2 ? next.slice(-2) : next;
      });
      setTimeout(() => dismiss(id), durationMs);
    };

    window.addEventListener('noa:block-notice', handler);
    return () => window.removeEventListener('noa:block-notice', handler);
  }, [dismiss, durationMs]);

  if (cards.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[var(--z-tooltip,9999)] flex flex-col gap-2 w-[min(36rem,calc(100vw-2rem))] pointer-events-none"
      aria-live="assertive"
    >
      {cards.map(c => (
        <div
          key={c.id}
          role="alert"
          className="pointer-events-auto px-4 py-3 border border-accent-red bg-bg-primary text-xs font-mono shadow-lg"
        >
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-accent-red" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-text-primary">{L.title}</div>
              <div className="text-text-secondary mt-1 text-[11px] leading-relaxed">
                {c.message}
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismiss(c.id)}
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
