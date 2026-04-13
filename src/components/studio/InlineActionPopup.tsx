"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Expand, Shrink, Palette, Copy, X, Check, Loader2, Undo2 } from 'lucide-react';
import { streamChat, getApiKey, getActiveProvider } from '@/lib/ai-providers';

// ============================================================
// PART 1 — 타입
// ============================================================
interface StoryContext {
  genre?: string;
  characters?: Array<{ name: string; role: string; speechStyle?: string }>;
  tone?: string;
  narrativeIntensity?: string;
}

/** Selection info from Tiptap NovelEditor */
export interface EditorSelection {
  from: number;
  to: number;
  text: string;
  coords: { top: number; left: number; bottom: number } | null;
}

interface InlineActionPopupProps {
  /** Legacy textarea ref — ignored when editorSelection is provided */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  language: string;
  onReplace: (oldText: string, newText: string) => void;
  storyConfig?: StoryContext;
  /** Full text from the editor — used to extract surrounding context */
  fullText?: string;
  /** Selection info pushed from Tiptap NovelEditor */
  editorSelection?: EditorSelection | null;
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
export function InlineActionPopup({ textareaRef, language, onReplace, storyConfig, fullText: fullTextProp, editorSelection }: InlineActionPopupProps) {
  const isKO = language === 'KO';
  const [popup, setPopup] = useState<PopupState>({ visible: false, x: 0, y: 0, selectedText: '', selStart: 0, selEnd: 0 });
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** Tracks the last applied replacement so we can undo it */
  const [lastApplied, setLastApplied] = useState<{ original: string; replacement: string } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      abortRef.current?.abort();
    };
  }, []);

  // --- Tiptap path: react to editorSelection prop ---
  useEffect(() => {
    if (editorSelection === undefined) return; // not using Tiptap path
    if (!editorSelection || editorSelection.text.length < 2) {
      hideTimeout.current = setTimeout(() => {
        setPopup(p => ({ ...p, visible: false }));
        setResult(null);
      }, 200);
      return;
    }
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    const coords = editorSelection.coords;
    const x = coords ? coords.left : 200;
    const y = coords ? coords.top - 48 : 100;
    setPopup({
      visible: true,
      x: Math.max(80, x),
      y: Math.max(40, y),
      selectedText: editorSelection.text,
      selStart: editorSelection.from,
      selEnd: editorSelection.to,
    });
    setResult(null);
  }, [editorSelection]);

  // --- Legacy textarea path ---
  const checkSelection = useCallback(() => {
    if (editorSelection !== undefined) return;
    const ta = textareaRef?.current;
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
    const linesBefore = ta.value.slice(0, start).split('\n').length - 1;
    const lh = parseFloat(getComputedStyle(ta).lineHeight);
    const lineHeight = isNaN(lh) || lh < 10 ? 28 : lh;
    const paddingTop = parseInt(getComputedStyle(ta).paddingTop) || 0;
    const y = taRect.top + paddingTop + (linesBefore * lineHeight) - ta.scrollTop - 48;
    const x = taRect.left + Math.min(taRect.width / 2, 200);

    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setPopup({ visible: true, x: Math.max(80, x), y: Math.max(40, y), selectedText: text, selStart: start, selEnd: end });
    setResult(null);
  }, [textareaRef, editorSelection]);

  // Legacy textarea selection listeners
  useEffect(() => {
    if (editorSelection !== undefined) return;
    const ta = textareaRef?.current;
    if (!ta) return;
    const onMouseUp = () => requestAnimationFrame(checkSelection);
    const onKeyUp = (e: KeyboardEvent) => { if (e.shiftKey || e.key === 'Shift') requestAnimationFrame(checkSelection); };
    ta.addEventListener('mouseup', onMouseUp);
    ta.addEventListener('keyup', onKeyUp);
    return () => {
      ta.removeEventListener('mouseup', onMouseUp);
      ta.removeEventListener('keyup', onKeyUp);
    };
  }, [textareaRef, checkSelection, editorSelection]);

  // 외부 클릭 시 닫기 (cleanup 보장)
  useEffect(() => {
    if (!popup.visible) return;
    const onClick = (e: MouseEvent) => {
      if (popupRef.current?.contains(e.target as Node)) return;
      if (textareaRef?.current?.contains(e.target as Node)) return;
      // For Tiptap: check if click is inside .novel-editor-wrapper
      const target = e.target as HTMLElement;
      if (target.closest?.('.novel-editor-wrapper')) return;
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
    const provider = getActiveProvider();
    const key = getApiKey(provider);
    if (!key) {
      navigator.clipboard.writeText(popup.selectedText);
      return;
    }

    // 주변 문맥 추출 (±200자)
    const sourceText = fullTextProp ?? textareaRef?.current?.value ?? '';
    const CONTEXT_RADIUS = 200;
    const beforeText = sourceText.slice(Math.max(0, popup.selStart - CONTEXT_RADIUS), popup.selStart).trim();
    const afterText = sourceText.slice(popup.selEnd, popup.selEnd + CONTEXT_RADIUS).trim();

    // 스토리 컨텍스트 블록 구성
    const ctxParts: string[] = [];
    if (storyConfig?.genre) ctxParts.push(isKO ? `장르: ${storyConfig.genre}` : `Genre: ${storyConfig.genre}`);
    if (storyConfig?.tone) ctxParts.push(isKO ? `톤: ${storyConfig.tone}` : `Tone: ${storyConfig.tone}`);
    if (storyConfig?.narrativeIntensity) ctxParts.push(isKO ? `강도: ${storyConfig.narrativeIntensity}` : `Intensity: ${storyConfig.narrativeIntensity}`);
    if (storyConfig?.characters?.length) {
      const charList = storyConfig.characters.slice(0, 5).map(c => {
        const parts = [c.name, c.role];
        if (c.speechStyle) parts.push(c.speechStyle);
        return parts.join('/');
      }).join(', ');
      ctxParts.push(isKO ? `등장인물: ${charList}` : `Characters: ${charList}`);
    }
    const contextBlock = ctxParts.length > 0
      ? (isKO ? `[작품 설정] ${ctxParts.join(' | ')}\n\n` : `[Story Context] ${ctxParts.join(' | ')}\n\n`)
      : '';

    // 주변 문맥 블록
    const surroundingBlock = (beforeText || afterText)
      ? (isKO
          ? `[주변 문맥]\n...${beforeText}<<<선택된 텍스트>>>${afterText}...\n\n`
          : `[Surrounding]\n...${beforeText}<<<SELECTED>>>${afterText}...\n\n`)
      : '';

    const ctxAware = isKO
      ? '장르의 분위기와 캐릭터 말투를 유지하면서 '
      : 'While maintaining genre atmosphere and character voice, ';

    const prompts: Record<string, string> = {
      rewrite: isKO
        ? `${contextBlock}${surroundingBlock}${ctxAware}다음 문장을 리라이트해줘. 결과만 출력해. 설명 금지:\n\n${popup.selectedText}`
        : `${contextBlock}${surroundingBlock}${ctxAware}rewrite this text. Output only the result, no explanation:\n\n${popup.selectedText}`,
      expand: isKO
        ? `${contextBlock}${surroundingBlock}${ctxAware}다음 문장을 감각적 묘사로 확장해줘. 결과만 출력해:\n\n${popup.selectedText}`
        : `${contextBlock}${surroundingBlock}${ctxAware}expand this text with sensory detail. Output only the result:\n\n${popup.selectedText}`,
      compress: isKO
        ? `${contextBlock}${surroundingBlock}${ctxAware}다음 문장을 간결하게 축소해줘. 결과만 출력해:\n\n${popup.selectedText}`
        : `${contextBlock}${surroundingBlock}${ctxAware}compress this text to be more concise. Output only the result:\n\n${popup.selectedText}`,
      tone: isKO
        ? `${contextBlock}${surroundingBlock}${ctxAware}다음 문장의 톤을 더 문학적으로 바꿔줘. 결과만 출력해:\n\n${popup.selectedText}`
        : `${contextBlock}${surroundingBlock}${ctxAware}change the tone to be more literary. Output only the result:\n\n${popup.selectedText}`,
    };

    const prompt = prompts[action];
    if (!prompt) return;

    setLoading(true);
    setResult(null);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // 시스템 지시문에도 스토리 컨텍스트 포함
    const sysCtx = storyConfig?.genre
      ? (isKO ? ` 현재 장르: ${storyConfig.genre}.` : ` Current genre: ${storyConfig.genre}.`)
      : '';

    try {
      let accumulated = '';
      await streamChat({
        systemInstruction: isKO
          ? `당신은 소설 편집자입니다.${sysCtx} 요청된 작업만 수행하고 결과만 출력하세요. 설명이나 메타 텍스트는 금지입니다. 원문의 문체와 분위기를 유지하세요.`
          : `You are a novel editor.${sysCtx} Perform only the requested task and output only the result. No explanations or meta-text. Preserve the original style and atmosphere.`,
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
  }, [popup.selectedText, popup.selStart, popup.selEnd, isKO, storyConfig, fullTextProp, textareaRef]);

  const applyResult = useCallback(() => {
    if (!result) return;
    setLastApplied({ original: popup.selectedText, replacement: result });
    onReplace(popup.selectedText, result);
    setPopup(p => ({ ...p, visible: false }));
    setResult(null);
  }, [result, popup.selectedText, onReplace]);

  const handleUndo = useCallback(() => {
    if (!lastApplied) return;
    onReplace(lastApplied.replacement, lastApplied.original);
    setLastApplied(null);
  }, [lastApplied, onReplace]);

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
                {lastApplied && (
                  <button
                    onClick={handleUndo}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-accent-amber text-[11px] font-bold hover:bg-accent-amber/10 transition-colors"
                    title={isKO ? '이전으로 되돌리기' : 'Undo last change'}
                  >
                    <Undo2 className="w-3 h-3" />
                    {isKO ? '이전으로' : 'Undo'}
                  </button>
                )}
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
