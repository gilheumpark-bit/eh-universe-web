"use client";

/**
 * TokenBudgetToast (2026-05-10 신설 — P-01 mount)
 *
 * `buildAgentSystemPrompt` 의 자동 token 측정 → CustomEvent 디스패치 →
 * 사용자에게 토스트 알림으로 표시.
 *
 * 이벤트 채널:
 *   noa:token-budget-info     (60% — 정보성)
 *   noa:token-budget-warning  (80% — 경고)
 *   noa:token-budget-critical (95% — 임박)
 *
 * 정책:
 *   - info: 표시 X (signal-to-noise 우선)
 *   - warning: 5초 토스트
 *   - critical: 10초 토스트, 더 강한 시각 강조
 *
 * Mount 위치 권장: StudioShell 의 root JSX (전역 listener)
 *
 * [C] 안전성: SSR/CustomEvent 미지원 fallback
 * [G] 성능: 단일 listener + 자동 dismiss timer
 * [K] 간결성: 컴포넌트 + 4언어 라벨
 */

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';

// ============================================================
// PART 1 — Types
// ============================================================

interface TokenPressureEventDetail {
  agentId?: string;
  measurement: {
    estimatedTokens: number;
    inputBudget: number;
    utilizationRatio: number;
    pressureLevel: 'safe' | 'info' | 'warn' | 'critical';
  };
  source: string;
}

interface ToastEntry {
  id: string;
  level: 'warn' | 'critical';
  agentId?: string;
  ratioPct: number;
  estimatedTokens: number;
  inputBudget: number;
  expiresAt: number;
}

// ============================================================
// PART 2 — 4언어 라벨
// ============================================================

const LABELS = {
  ko: {
    warn: '토큰 사용량 80% 도달',
    critical: '토큰 사용량 임박 (95%+)',
    of: '/',
    agent: '에이전트',
    dismiss: '닫기',
  },
  en: {
    warn: 'Token usage at 80%',
    critical: 'Token usage critical (95%+)',
    of: '/',
    agent: 'agent',
    dismiss: 'Dismiss',
  },
  ja: {
    warn: 'トークン使用 80%',
    critical: 'トークン使用 危険域 (95%+)',
    of: '/',
    agent: 'エージェント',
    dismiss: '閉じる',
  },
  zh: {
    warn: 'Token 使用 80%',
    critical: 'Token 使用 紧急 (95%+)',
    of: '/',
    agent: '代理',
    dismiss: '关闭',
  },
} as const;

// ============================================================
// PART 3 — Component
// ============================================================

interface Props {
  language?: 'ko' | 'en' | 'ja' | 'zh';
  /** 표시 timeout — warning 5초, critical 10초 (기본). */
  durationMs?: { warn?: number; critical?: number };
}

export default function TokenBudgetToast({ language = 'ko', durationMs }: Props) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const L = LABELS[language];
  const warnDuration = durationMs?.warn ?? 5000;
  const criticalDuration = durationMs?.critical ?? 10000;

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const makeHandler = (level: 'warn' | 'critical') => (e: Event) => {
      const ce = e as CustomEvent<TokenPressureEventDetail>;
      const detail = ce.detail;
      if (!detail?.measurement) return;
      const m = detail.measurement;
      const id = `tok-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const duration = level === 'critical' ? criticalDuration : warnDuration;
      const entry: ToastEntry = {
        id, level, agentId: detail.agentId,
        ratioPct: Math.round(m.utilizationRatio * 100),
        estimatedTokens: m.estimatedTokens,
        inputBudget: m.inputBudget,
        expiresAt: Date.now() + duration,
      };
      setToasts(prev => {
        // [F-03 — 2026-05-10] dedup 5초 → 1초 단축 (빠른 연속 호출 시 알림 누락 방지).
        // 동시에 max 3개 큐 — overflow 시 oldest 제거.
        const recent = prev.find(t =>
          t.agentId === entry.agentId && t.level === entry.level && t.expiresAt > Date.now() - 1000
        );
        if (recent) return prev;
        const next = [...prev, entry];
        return next.length > 3 ? next.slice(-3) : next;
      });
      setTimeout(() => dismiss(id), duration);
    };

    const warnHandler = makeHandler('warn');
    const criticalHandler = makeHandler('critical');
    window.addEventListener('noa:token-budget-warning', warnHandler);
    window.addEventListener('noa:token-budget-critical', criticalHandler);
    return () => {
      window.removeEventListener('noa:token-budget-warning', warnHandler);
      window.removeEventListener('noa:token-budget-critical', criticalHandler);
    };
  }, [dismiss, warnDuration, criticalDuration]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[var(--z-tooltip,9999)] flex flex-col gap-2 max-w-sm pointer-events-none"
      aria-live="polite"
      role="status"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto px-4 py-3 border bg-bg-primary text-xs font-mono shadow-md ${
            t.level === 'critical' ? 'border-accent-red text-accent-red' : 'border-accent-amber text-text-primary'
          }`}
          role={t.level === 'critical' ? 'alert' : 'status'}
        >
          <div className="flex items-start gap-2 mb-1">
            {t.level === 'critical' ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div className="flex-1">
              <div className="font-bold">
                {t.level === 'critical' ? L.critical : L.warn}
              </div>
              {t.agentId && (
                <div className="text-text-tertiary mt-0.5">
                  {L.agent}: {t.agentId}
                </div>
              )}
              <div className="text-text-secondary mt-1">
                {t.estimatedTokens.toLocaleString()} {L.of} {t.inputBudget.toLocaleString()} ({t.ratioPct}%)
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
