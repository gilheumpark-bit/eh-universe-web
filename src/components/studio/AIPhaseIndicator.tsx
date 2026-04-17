'use client';

// ============================================================
// AIPhaseIndicator — DGX 생성 단계 상태 표시 (floating pill)
// ============================================================
// 'noa:ai-phase' CustomEvent를 수신해서 하단에 얇은 pill로 표시.
// phase='done' 또는 1.5초간 이벤트 없으면 자동 숨김.
// ============================================================

import { useEffect, useState, useRef } from 'react';

interface PhaseEvent {
  phase: 'search' | 'prepare' | 'writing' | 'continue' | 'done';
  status: string;
}

export function AIPhaseIndicator() {
  const [status, setStatus] = useState<string>('');
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onPhase(e: Event) {
      const detail = (e as CustomEvent<PhaseEvent>).detail;
      if (!detail) return;

      if (hideTimer.current) clearTimeout(hideTimer.current);

      if (detail.phase === 'done' || !detail.status) {
        // 완료 — 페이드 아웃
        hideTimer.current = setTimeout(() => {
          setVisible(false);
          setStatus('');
        }, 400);
        return;
      }

      setStatus(detail.status);
      setVisible(true);

      // 안전장치: 30초간 다음 이벤트 없으면 자동 숨김 (stuck 방지)
      hideTimer.current = setTimeout(() => {
        setVisible(false);
        setStatus('');
      }, 30_000);
    }

    window.addEventListener('noa:ai-phase', onPhase as EventListener);
    return () => {
      window.removeEventListener('noa:ai-phase', onPhase as EventListener);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!visible || !status) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[var(--z-overlay)] pointer-events-none"
    >
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-bg-elevated/95 backdrop-blur-sm border border-border shadow-lg text-sm text-text-primary animate-fade-in">
        <span className="inline-block w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
        <span>{status}</span>
      </div>
    </div>
  );
}
