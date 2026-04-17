"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================
import React, { useState, useCallback, useRef } from 'react';
import {
  Languages,
  Loader2,
  Check,
  AlertCircle,
  Play,
  Download,
  Square,
} from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';

type BatchLang = 'EN' | 'JP' | 'CN';

type LangState = {
  enabled: boolean;
  status: 'idle' | 'running' | 'done' | 'error';
  progress: number;          // 0~100
  text: string;              // 누적 번역 결과
  error?: string;
  charCount: number;
};

const INITIAL_LANGS: Record<BatchLang, LangState> = {
  EN: { enabled: true, status: 'idle', progress: 0, text: '', charCount: 0 },
  JP: { enabled: false, status: 'idle', progress: 0, text: '', charCount: 0 },
  CN: { enabled: false, status: 'idle', progress: 0, text: '', charCount: 0 },
};

const LANG_LABEL: Record<BatchLang, { ko: string; en: string; flag: string }> = {
  EN: { ko: '영어', en: 'English', flag: '🇺🇸' },
  JP: { ko: '일본어', en: 'Japanese', flag: '🇯🇵' },
  CN: { ko: '중국어', en: 'Chinese', flag: '🇨🇳' },
};

// ============================================================
// PART 2 — Batch Translate Helper
// ============================================================

/**
 * /api/translate 직접 호출 (스트리밍). 각 청크를 onChunk로 전달.
 * stage=4 + mode='novel' 기본 (본 번역).
 */
async function streamTranslateOneLang(
  params: {
    source: string;
    from: string;
    to: BatchLang;
    provider: string;
    apiKey: string;
    onChunk: (accumulated: string, deltaLen: number) => void;
    signal: AbortSignal;
  },
): Promise<string> {
  const { source, from, to, provider, apiKey, onChunk, signal } = params;
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      source,
      from,
      to,
      provider,
      apiKey: apiKey || undefined,
      stage: 4,
      mode: 'novel',
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');
  const decoder = new TextDecoder();
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    text += chunk;
    onChunk(text, chunk.length);
  }
  return text;
}

// ============================================================
// PART 3 — Download Helper
// ============================================================
function downloadText(filename: string, content: string) {
  if (typeof window === 'undefined') return;
  try {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // no-op
  }
}

// ============================================================
// PART 4 — Main Panel
// ============================================================
export function MultiLangBatchPanel() {
  const { source, from, provider, getEffectiveApiKeyForProvider } = useTranslator();

  const [langs, setLangs] = useState<Record<BatchLang, LangState>>(INITIAL_LANGS);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const toggleLang = useCallback((lang: BatchLang) => {
    if (running) return;
    setLangs(prev => ({ ...prev, [lang]: { ...prev[lang], enabled: !prev[lang].enabled } }));
  }, [running]);

  const resetResults = useCallback(() => {
    setLangs(prev => {
      const next = { ...prev };
      (Object.keys(next) as BatchLang[]).forEach(l => {
        next[l] = { ...next[l], status: 'idle', progress: 0, text: '', error: undefined, charCount: 0 };
      });
      return next;
    });
  }, []);

  const handleStart = useCallback(async () => {
    if (running) return;
    const selected = (Object.keys(langs) as BatchLang[]).filter(l => langs[l].enabled);
    if (selected.length === 0) return;
    if (!source || source.trim().length < 20) return;

    const apiKey = getEffectiveApiKeyForProvider(provider);
    const ac = new AbortController();
    abortRef.current = ac;
    setRunning(true);
    resetResults();

    try {
      for (const lang of selected) {
        if (ac.signal.aborted) break;

        setLangs(prev => ({ ...prev, [lang]: { ...prev[lang], status: 'running', progress: 5 } }));
        try {
          const sourceLen = source.length;
          await streamTranslateOneLang({
            source,
            from,
            to: lang,
            provider,
            apiKey,
            signal: ac.signal,
            onChunk: (accumulated) => {
              // 대략적 진행률: 번역 누적 / 원문 기대치 (언어별 비율 대략)
              const expected = lang === 'EN' ? sourceLen * 1.3 : sourceLen * 0.85;
              const pct = Math.min(95, Math.round((accumulated.length / Math.max(100, expected)) * 100));
              setLangs(prev => ({
                ...prev,
                [lang]: { ...prev[lang], progress: pct, text: accumulated, charCount: accumulated.length },
              }));
            },
          });
          setLangs(prev => ({
            ...prev,
            [lang]: { ...prev[lang], status: 'done', progress: 100, charCount: prev[lang].text.length },
          }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setLangs(prev => ({
            ...prev,
            [lang]: { ...prev[lang], status: 'error', error: msg.slice(0, 120) },
          }));
        }
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [running, langs, source, from, provider, getEffectiveApiKeyForProvider, resetResults]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleDownloadOne = useCallback((lang: BatchLang) => {
    const text = langs[lang].text;
    if (!text) return;
    downloadText(`translation-${lang.toLowerCase()}.txt`, text);
  }, [langs]);

  const handleDownloadAll = useCallback(() => {
    const completed = (Object.keys(langs) as BatchLang[]).filter(l => langs[l].status === 'done' && langs[l].text);
    completed.forEach(l => downloadText(`translation-${l.toLowerCase()}.txt`, langs[l].text));
  }, [langs]);

  const selectedCount = (Object.keys(langs) as BatchLang[]).filter(l => langs[l].enabled).length;
  const completedCount = (Object.keys(langs) as BatchLang[]).filter(l => langs[l].status === 'done').length;
  const canStart = selectedCount > 0 && source.trim().length >= 20 && !running;

  return (
    <div className="flex h-full flex-col font-sans">
      {/* Header */}
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-2 text-text-secondary">
          <Languages className="w-4 h-4 text-accent-purple" />
          <span className="text-[13px] font-medium">다국어 배치 번역</span>
        </div>
        <p className="text-[10px] text-text-tertiary mt-2 leading-snug">
          현재 원문({from.toUpperCase()}, {source.length.toLocaleString()}자)을 선택한 언어로 순차 번역합니다. 각 언어별 결과를 별도 파일로 받을 수 있습니다.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* 언어 체크박스 */}
        <div className="space-y-2">
          {(Object.keys(langs) as BatchLang[]).map(lang => {
            const state = langs[lang];
            const isTarget = state.enabled;
            return (
              <div
                key={lang}
                className={`rounded-lg border p-3 transition-colors ${
                  isTarget ? 'border-accent-purple/30 bg-accent-purple/5' : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleLang(lang)}
                    disabled={running}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left disabled:cursor-not-allowed"
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isTarget ? 'bg-accent-purple border-accent-purple' : 'border-white/20'
                      }`}
                    >
                      {isTarget && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </span>
                    <span className="text-sm shrink-0">{LANG_LABEL[lang].flag}</span>
                    <span className="text-[13px] font-medium text-text-primary">{LANG_LABEL[lang].ko}</span>
                    <span className="text-[10px] text-text-tertiary font-mono">{lang}</span>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    {state.status === 'running' && <Loader2 className="w-3.5 h-3.5 text-accent-amber animate-spin" />}
                    {state.status === 'done' && <Check className="w-3.5 h-3.5 text-accent-green" />}
                    {state.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                    {state.status === 'done' && state.text && (
                      <button
                        type="button"
                        onClick={() => handleDownloadOne(lang)}
                        className="p-1 rounded hover:bg-white/10 text-text-tertiary hover:text-accent-green transition-colors"
                        title={`${LANG_LABEL[lang].ko} 결과 다운로드`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Progress bar */}
                {(state.status === 'running' || state.status === 'done') && (
                  <div className="mt-2">
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full transition-[width] duration-300 ${state.status === 'done' ? 'bg-accent-green' : 'bg-accent-purple'}`}
                        style={{ width: `${state.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[9px] text-text-tertiary font-mono">{state.progress}%</span>
                      {state.charCount > 0 && (
                        <span className="text-[9px] text-text-tertiary font-mono">{state.charCount.toLocaleString()}자</span>
                      )}
                    </div>
                  </div>
                )}
                {/* Error */}
                {state.status === 'error' && state.error && (
                  <div className="mt-2 text-[10px] text-red-400 bg-red-500/5 rounded px-2 py-1 border border-red-500/20">
                    {state.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="pt-2 space-y-2">
          {!running ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={!canStart}
              className="w-full min-h-[40px] rounded-md bg-accent-purple/20 hover:bg-accent-purple/30 text-accent-purple border border-accent-purple/40 text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              title={canStart ? '선택한 언어로 순차 번역 시작' : source.trim().length < 20 ? '원문 20자 이상 필요' : '언어를 1개 이상 선택'}
            >
              <Play className="w-3.5 h-3.5" />
              배치 시작 ({selectedCount}개 언어)
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStop}
              className="w-full min-h-[40px] rounded-md bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5" />
              중지
            </button>
          )}

          {completedCount >= 2 && (
            <button
              type="button"
              onClick={handleDownloadAll}
              className="w-full min-h-[32px] rounded-md bg-accent-green/10 hover:bg-accent-green/20 text-accent-green border border-accent-green/30 text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5"
              title="완료된 언어를 모두 파일로 다운로드"
            >
              <Download className="w-3.5 h-3.5" />
              전체 다운로드 ({completedCount}개)
            </button>
          )}
        </div>

        {/* 미리보기 (마지막 완료 언어) */}
        {completedCount > 0 && (
          <div className="pt-2 border-t border-white/5">
            <p className="text-[10px] text-text-tertiary mb-1">완료된 번역 미리보기</p>
            <div className="space-y-2">
              {(Object.keys(langs) as BatchLang[]).filter(l => langs[l].status === 'done' && langs[l].text).map(lang => (
                <details key={lang} className="rounded border border-white/10 bg-white/[0.02]">
                  <summary className="cursor-pointer px-2 py-1.5 text-[11px] text-text-secondary hover:bg-white/[0.03] flex items-center gap-1.5">
                    {LANG_LABEL[lang].flag} {LANG_LABEL[lang].ko} — {langs[lang].charCount.toLocaleString()}자
                  </summary>
                  <div className="px-2 py-2 text-[11px] text-text-secondary whitespace-pre-wrap max-h-40 overflow-y-auto border-t border-white/5">
                    {langs[lang].text.slice(0, 800)}
                    {langs[lang].text.length > 800 ? '…' : ''}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {source.trim().length < 20 && (
          <div className="text-[10px] text-text-tertiary italic text-center pt-4">
            원문이 20자 이상일 때 배치를 시작할 수 있습니다.
          </div>
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: MultiLangBatchPanel | role=multi-lang batch translate | inputs=source,from,provider | outputs=UI(checkbox+progress+results)
