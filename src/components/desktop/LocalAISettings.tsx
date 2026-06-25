'use client';

// ============================================================
// 로컬 AI 설정 — 최대 3슬롯 편집 (OpenAI 호환 엔드포인트)
// claude3 a11y 표준: role=dialog·aria-modal·aria-label·focus-visible·ESC 닫기.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { X, Check } from 'lucide-react';
import { loadLocalAISlots, saveLocalAISlots, validateSlot, type LocalAISlot } from '@/lib/local-ai/local-ai-config';

export default function LocalAISettings({ onClose }: { onClose: () => void }) {
  const [slots, setSlots] = useState<LocalAISlot[]>(() => loadLocalAISlots());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = useCallback((id: number, patch: Partial<LocalAISlot>) => {
    setSlots((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const save = useCallback(() => {
    saveLocalAISlots(slots);
    onClose();
  }, [slots, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="로컬 AI 연결 설정"
      className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
      style={{ zIndex: 'var(--z-modal)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-bg-primary p-[var(--sp-lg)] shadow-[var(--shadow-luxury)]">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">로컬 AI 연결 (최대 3)</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-md p-1 text-text-secondary hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mb-3 text-xs text-text-tertiary">OpenAI 호환 엔드포인트 (vLLM · Ollama · llama.cpp · LM Studio). 예: <code className="break-all font-mono">http://localhost:11434/v1</code></p>

        <div className="space-y-3">
          {slots.map((s) => {
            const errs = validateSlot(s);
            return (
              <div key={s.id} className="rounded-xl border border-border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={(e) => update(s.id, { enabled: e.target.checked })}
                    aria-label={`슬롯 ${s.id} 사용`}
                    className="h-4 w-4 accent-accent-amber"
                  />
                  <input
                    value={s.label}
                    onChange={(e) => update(s.id, { label: e.target.value })}
                    aria-label={`슬롯 ${s.id} 이름`}
                    className="flex-1 rounded-md border border-border bg-bg-secondary px-2 py-1 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={s.baseUrl}
                    onChange={(e) => update(s.id, { baseUrl: e.target.value })}
                    placeholder="http://localhost:11434/v1"
                    aria-label={`슬롯 ${s.id} baseUrl`}
                    className="rounded-md border border-border bg-bg-secondary px-2 py-1 font-mono text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                  />
                  <input
                    value={s.model}
                    onChange={(e) => update(s.id, { model: e.target.value })}
                    placeholder="qwen2.5:14b"
                    aria-label={`슬롯 ${s.id} 모델`}
                    className="rounded-md border border-border bg-bg-secondary px-2 py-1 font-mono text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                  />
                </div>
                {errs.length > 0 && <p className="mt-1 text-[11px] text-accent-amber">⚠ {errs.join(' · ')}</p>}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={save}
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-accent-amber px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
        >
          <Check className="h-4 w-4" aria-hidden /> 저장
        </button>
        <p className="mt-2 text-center text-[11px] text-text-tertiary">활성 슬롯이 있으면 chat→form 을 실 AI 가 채웁니다. 없으면 로컬 결정론 초안.</p>
      </div>
    </div>
  );
}
