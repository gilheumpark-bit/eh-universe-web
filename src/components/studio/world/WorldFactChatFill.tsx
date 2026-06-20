'use client';

// ============================================================
// WorldFactChatFill — "노아 설정 가이드 → 양식 초안 → 작가 검토 → 커밋" 패널
// worldgraph/fill 엔진 사용. Design System v8.0 정합(08-디자인시스템-신규surface spec).
// 현재 fill = 로컬 초안(키 없이 동작). 노아 연결 키 준비 시 generateJsonViaSpark(buildFillPrompt)로 교체.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Check, FileText, AlertCircle } from 'lucide-react';
import { localFillDraft, commitAsCanon } from '@/lib/worldgraph/fill';
import { validateWorldFact } from '@/lib/worldgraph/validate';
import { hasStoredApiKey, hasDgxService, type ProviderId } from '@/lib/ai-providers';
import type { WorldFactEntry } from '@/lib/worldgraph/types';

/** [P1 low/functional 2026-06-09] 라벨-동작 일치: 노아 연결 가용성 동기 체크.
 *  하나라도 연결되면 '노아', 아니면 '로컬 초안' 으로 라벨 표기 → 사용자 기만 0. */
const NOA_PROVIDER_IDS: ReadonlyArray<ProviderId> = ['gemini', 'openai', 'claude', 'groq', 'mistral', 'ollama', 'lmstudio'];

function detectNoaAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  if (hasDgxService()) return true;
  return NOA_PROVIDER_IDS.some((id) => hasStoredApiKey(id));
}

interface Props {
  workId?: string;
  onCommit?: (entry: WorldFactEntry) => void;
}

export default function WorldFactChatFill({ workId, onCommit }: Props) {
  const [chat, setChat] = useState('');
  const [draft, setDraft] = useState<WorldFactEntry | null>(null);
  const [committed, setCommitted] = useState(false);
  // [P1 low/functional 2026-06-09] SSR-safe: 마운트 후 키 가용성 측정 (hydration mismatch 방어).
  const [noaAvailable, setNoaAvailable] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe: 마운트 후 키 가용성 측정(hydration mismatch 방어)
  useEffect(() => { setNoaAvailable(detectNoaAvailable()); }, []);

  const handleFill = useCallback(() => {
    const text = chat.trim();
    if (!text) return;
    // [노아 경로] 키 연결 시: generateJsonViaSpark(buildFillPrompt(text)) → parseAIFill(raw, text).
    // 현재(키 미연결): 로컬 결정론 초안으로 흐름 시연.
    setDraft(localFillDraft(text, { workId }));
    setCommitted(false);
  }, [chat, workId]);

  const handleCommit = useCallback(() => {
    if (!draft) return;
    const c = commitAsCanon(draft);
    setDraft(c);
    setCommitted(true);
    onCommit?.(c);
  }, [draft, onCommit]);

  const updateField = (key: 'fact' | 'category', value: string) => {
    setDraft((d) =>
      d ? { ...d, frontMatter: { ...d.frontMatter, [key]: value }, provenance: { ...(d.provenance ?? { origin: 'USER', createdAt: 0 }), origin: 'USER' } } : d,
    );
    setCommitted(false);
  };

  const validation = draft ? validateWorldFact(draft) : null;
  const origin = draft?.provenance?.origin ?? 'ENGINE_DRAFT';
  const conflictCount = draft?.frontMatter.conflictsWith?.length ?? 0;
  const sourceCount = draft?.frontMatter.sourceSentenceIds?.length ?? 0;
  const arcsStatus = draft?.frontMatter.arcsStatus ?? 'HOLD';
  const sourceLabel = origin === 'USER' ? '작가 수정' : noaAvailable ? '노아 운영' : '로컬 초안';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--sp-md)] rounded-xl border border-border bg-bg-secondary/60 p-[var(--sp-md)]">
      {/* ── 좌: 채팅 brainstorm ── */}
      <div className="flex flex-col gap-[var(--sp-sm)]">
        <label htmlFor="wf-chat" className="text-xs font-mono uppercase tracking-widest text-text-tertiary">
          채팅 · 세계관 브레인스토밍
        </label>
        <textarea
          id="wf-chat"
          value={chat}
          onChange={(e) => setChat(e.target.value)}
          placeholder="세계관 fact 를 자유롭게 설명하세요. 예: 마법은 시전자의 마나를 소비하며, 고갈 시 발동 불가하다."
          className="min-h-[160px] resize-y rounded-lg border border-border bg-bg-primary p-[var(--sp-sm)] text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
        />
        <button
          type="button"
          onClick={handleFill}
          disabled={!chat.trim()}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-accent-amber px-4 text-sm font-semibold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {noaAvailable ? '노아가 양식 채우기' : '노아가 양식 채우기 (로컬 초안)'}
        </button>
        <p className="text-[11px] text-text-tertiary">
          {noaAvailable
            ? '현재 단계는 결정론 로컬 초안으로 즉시 채웁니다. 연결된 노아는 후속 실 제안 경로에서 사용합니다.'
            : '현재 로컬 초안(키 미연결). 노아 연결 키 준비 시 실 제안 경로로 확장됩니다.'}
        </p>
      </div>

      {/* ── 우: 채워진 WorldFact 양식 (검토·수정·커밋) ── */}
      <div className="flex flex-col gap-[var(--sp-sm)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-widest text-text-tertiary">WorldFact 양식</span>
          {draft &&
            (origin === 'USER' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-green/15 px-2 py-0.5 text-[11px] font-semibold text-accent-green">
                <Check className="h-3 w-3" aria-hidden /> 작가 확정 (canon)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-amber/15 px-2 py-0.5 text-[11px] font-semibold text-accent-amber">
                <Sparkles className="h-3 w-3" aria-hidden /> 노아 초안 · 검토 필요
              </span>
            ))}
        </div>

        {!draft ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
            <FileText className="h-6 w-6 text-text-tertiary" aria-hidden />
            <p className="text-sm text-text-secondary">내용 작성 후 [노아가 양식 채우기]를 누르면 양식이 채워집니다.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-[var(--sp-sm)] rounded-lg border border-border bg-bg-primary p-[var(--sp-sm)]">
            <Field label="fact (1문장 단언)">
              <input
                value={draft.frontMatter.fact}
                onChange={(e) => updateField('fact', e.target.value)}
                className="w-full rounded-md border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              />
            </Field>
            <div className="grid grid-cols-2 gap-[var(--sp-sm)]">
              <Field label="category">
                <input
                  value={draft.frontMatter.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full rounded-md border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                />
              </Field>
              <Field label="tier">
                <div className="px-2 py-1.5 text-sm text-text-secondary">{draft.frontMatter.tier} (표면)</div>
              </Field>
            </div>
            <Field label={`confidence 게이트: ${validation?.confidenceGate ?? '—'}`}>
              <div className="flex items-center gap-1.5 text-sm">
                {validation?.confidenceGate === 'PASS' ? (
                  <span className="inline-flex items-center gap-1 text-accent-green"><Check className="h-3.5 w-3.5" aria-hidden /> 통과</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-accent-amber"><AlertCircle className="h-3.5 w-3.5" aria-hidden /> {validation?.confidenceGate === 'DISCARD' ? '폐기 영역' : '작가 확인 필요 (HOLD)'}</span>
                )}
              </div>
            </Field>
            <Field label="출처 · ARCS · 충돌">
              <div className="flex flex-wrap gap-1.5 text-xs text-text-secondary">
                <span className="rounded-full bg-bg-secondary px-2 py-0.5">출처 {sourceLabel}</span>
                <span className="rounded-full bg-bg-secondary px-2 py-0.5">ARCS {arcsStatus}</span>
                <span className="rounded-full bg-bg-secondary px-2 py-0.5">충돌 {conflictCount}</span>
                <span className="rounded-full bg-bg-secondary px-2 py-0.5">근거문장 {sourceCount}</span>
              </div>
            </Field>

            <button
              type="button"
              onClick={handleCommit}
              disabled={committed}
              className="mt-1 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-accent-green/40 bg-accent-green/10 px-4 text-sm font-semibold text-accent-green disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              <Check className="h-4 w-4" aria-hidden /> {committed ? '확정됨 (canon)' : '확정 — canon 커밋'}
            </button>
            <p className="text-[11px] text-text-tertiary">
              확정 = provenance origin → USER (M4 Origin Tag). 신규 lockHistory 없이 editedBy[]에 기록.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary">{label}</span>
      {children}
    </div>
  );
}
