"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Expand, Shrink, Palette, Copy, X, Check, Loader2 } from 'lucide-react';
import { streamChat, getApiKey } from '@/lib/ai-providers';

// ============================================================
// PART 1 — 타입
// ============================================================
interface InlineActionPopupProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  language: string;
  onReplace: (oldText: string, newText: string) => void;
}

interface PopupState {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  selStart: number;
  selEnd: number;
}

// ============================================================
// PART 2 — 컴포넌트
// ============================================================
export function InlineActionPopup({ textareaRef, language, onReplace }: InlineActionPopupProps) {
  const isKO = language === 'KO';
  const [popup, setPopup] = useState<PopupState>({ visible: false, x: 0, y: 0, selectedText: '', selStart: 0, selEnd: 0 });
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);

  const checkSelection = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value.slice(start, end).trim();

    if (text.length < 2) {
      hideTimeout.current = setTimeout(() => {
        setPopup(p => ({ ...p, visible: false }));
        setResult(null);
      }, 200);
      return;
    }

    const taRect = ta.getBoundingClientRect();
    const lines = ta.value.slice(0, start).split('\n');
    const lineNum = lines.length - 1;
    const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 28;
    const scrollTop = ta.scrollTop;
    const y = taRect.top + (lineNum * lineHeight) - scrollTop - 48;
    const x = taRect.left + Math.min(taRect.width / 2, 200);

    clearTimeout(hideTimeout.current);
    setPopup({ visible: true, x: Math.max(80, x), y: Math.max(40, y), selectedText: text, selStart: start, selEnd: end });
    setResult(null);
  }, [textareaRef]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const onMouseUp = () => setTimeout(checkSelection, 50);
    const onKeyUp = (e: KeyboardEvent) => { if (e.shiftKey) setTimeout(checkSelection, 50); };
    ta.addEventListener('mouseup', onMouseUp);
    ta.addEventListener('keyup', onKeyUp);
    return () => { ta.removeEventListener('mouseup', onMouseUp); ta.removeEventListener('keyup', onKeyUp); };
  }, [textareaRef, checkSelection]);

  useEffect(() => {
    if (!popup.visible) return;
    const onClick = (e: MouseEvent) => {
      if (popupRef.current?.contains(e.target as Node)) return;
      if (textareaRef.current?.contains(e.target as Node)) return;
      setPopup(p => ({ ...p, visible: false }));
      setResult(null);
      abortRef.current?.abort();
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [popup.visible, textareaRef]);

  // ============================================================
  // PART 3 — AI 호출 + 자동 교체
  // ============================================================
  const handleAction = useCallback(async (action: string) => {
    const key = getApiKey();
    if (!key) {
      // No API key — fallback to copy
      navigator.clipboard.writeText(popup.selectedText);
      return;
    }

    const prompts: Record<string, string> = {
      rewrite: isKO
        ? `다음 문장을 리라이트해줘. 결과만 출력해. 설명 금지:\n\n${popup.selectedText}`
        : `Rewrite this text. Output only the result, no explanation:\n\n${popup.selectedText}`,
      expand: isKO
        ? `다음 문장을 더 풍부하게 확장해줘. 결과만 출력해:\n\n${popup.selectedText}`
        : `Expand this text with more detail. Output only the result:\n\n${popup.selectedText}`,
      compress: isKO
        ? `다음 문장을 간결하게 축소해줘. 결과만 출력해:\n\n${popup.selectedText}`
        : `Compress this text to be more concise. Output only the result:\n\n${popup.selectedText}`,
      tone: isKO
        ? `다음 문장의 톤을 더 문학적으로 바꿔줘. 결과만 출력해:\n\n${popup.selectedText}`
        : `Change the tone to be more literary. Output only the result:\n\n${popup.selectedText}`,
    };

    const prompt = prompts[action];
    if (!prompt) return;

    setLoading(true);
    setResult(null);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      let accumulated = '';
      await streamChat({
        systemInstruction: isKO
          ? '당신은 소설 편집자입니다. 요청된 작업만 수행하고 결과만 출력하세요. 설명이나 메타 텍스트는 금지입니다.'
          : 'You are a novel editor. Perform only the requested task and output only the result. No explanations or meta-text.',
        messages: [{ role: 'user', content: prompt }],
        onChunk: (chunk) => { accumulated += chunk; setResult(accumulated); },
        signal: ctrl.signal,
      });
      setResult(accumulated.trim());
    } catch {
      if (!ctrl.signal.aborted) setResult(isKO ? '(생성 실패)' : '(Generation failed)');
    } finally {
      setLoading(false);
    }
  }, [popup.selectedText, isKO]);

  const applyResult = useCallback(() => {
    if (!result || !textareaRef.current) return;
    onReplace(popup.selectedText, result);
    setPopup(p => ({ ...p, visible: false }));
    setResult(null);
  }, [result, popup.selectedText, onReplace, textareaRef]);

  if (!popup.visible) return null;

  const actions = [
    { id: 'rewrite', icon: RefreshCw, label: isKO ? '리라이트' : 'Rewrite', color: 'text-accent-purple' },
    { id: 'expand', icon: Expand, label: isKO ? '확장' : 'Expand', color: 'text-accent-green' },
    { id: 'compress', icon: Shrink, label: isKO ? '축소' : 'Compress', color: 'text-accent-amber' },
    { id: 'tone', icon: Palette, label: isKO ? '톤 변경' : 'Tone', color: 'text-accent-blue' },
    { id: 'copy', icon: Copy, label: isKO ? '복사' : 'Copy', color: 'text-text-secondary' },
  ];

  return (
    <div
      ref={popupRef}
      className="fixed z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{ left: popup.x, top: popup.y, transform: 'translateX(-50%)' }}
    >
      {/* Action buttons */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-bg-primary/95 backdrop-blur-xl border border-border shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        {actions.map(a => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              onClick={() => a.id === 'copy' ? navigator.clipboard.writeText(popup.selectedText) : handleAction(a.id)}
              disabled={loading}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${a.color} hover:bg-bg-secondary transition-colors whitespace-nowrap disabled:opacity-40`}
              title={a.label}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{a.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => { setPopup(p => ({ ...p, visible: false })); setResult(null); abortRef.current?.abort(); }}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors ml-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Result preview + apply */}
      {(loading || result) && (
        <div className="mt-1.5 max-w-md rounded-xl bg-bg-primary/95 backdrop-blur-xl border border-border shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-3">
          {loading && !result && (
            <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {isKO ? '생성 중...' : 'Generating...'}
            </div>
          )}
          {result && (
            <>
              <p className="text-xs text-text-primary leading-relaxed font-serif max-h-32 overflow-y-auto">{result}</p>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40">
                <button
                  onClick={applyResult}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-purple text-white text-[11px] font-bold hover:bg-accent-purple/80 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  {isKO ? '적용' : 'Apply'}
                </button>
                <button
                  onClick={() => { setResult(null); abortRef.current?.abort(); }}
                  className="px-3 py-1.5 rounded-lg text-text-tertiary text-[11px] font-bold hover:bg-bg-secondary transition-colors"
                >
                  {isKO ? '취소' : 'Cancel'}
                </button>
                <span className="ml-auto text-[9px] text-text-tertiary">
                  {result.length}{isKO ? '자' : 'ch'}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Selection info */}
      {!result && !loading && (
        <div className="text-center mt-0.5">
          <span className="text-[9px] text-text-tertiary font-mono">
            {popup.selectedText.length}{isKO ? '자 선택' : ' selected'}
          </span>
        </div>
      )}
    </div>
  );
}
