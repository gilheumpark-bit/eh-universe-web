'use client';

// ============================================================
// PART 1 — Types & Imports
// ============================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Scissors, Expand, PenLine, Plus, Sparkles, X, Check, RotateCcw,
  ArrowDownToLine, Thermometer, Sword, MessageCircle
} from 'lucide-react';
import { AppLanguage } from '@/lib/studio-types';
import { streamChat, getApiKey, getActiveProvider } from '@/lib/ai-providers';
import type { ChatMsg } from '@/lib/ai-providers';
import { classifyError } from './UXHelpers';

interface InlineRewriterProps {
  content: string;
  language: AppLanguage;
  context?: string;
  onApply: (newContent: string) => void;
}

interface Selection {
  start: number;
  end: number;
  text: string;
}

type ActionType = 'rewrite' | 'expand' | 'compress' | 'insert_before' | 'insert_after' | 'custom';

interface QuickAction {
  id: ActionType | string;
  icon: React.ReactNode;
  labelKo: string;
  labelEn: string;
  promptKo: string;
  promptEn: string;
}

// ============================================================
// PART 2 — Quick Actions
// ============================================================

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'rewrite',
    icon: <PenLine className="w-3 h-3" />,
    labelKo: '다시 쓰기',
    labelEn: 'Rewrite',
    promptKo: '아래 선택된 텍스트를 같은 의미이지만 더 나은 문장으로 다시 써줘. 앞뒤 문맥에 자연스럽게 이어져야 함. 순수 소설 텍스트만 출력, 설명 없이.',
    promptEn: 'Rewrite the selected text with better prose while keeping the same meaning. Must flow naturally with surrounding context. Output only the rewritten text, no explanation.',
  },
  {
    id: 'expand',
    icon: <Expand className="w-3 h-3" />,
    labelKo: '살 붙이기',
    labelEn: 'Expand',
    promptKo: '아래 선택된 텍스트에 감각 묘사, 내면 독백, 환경 묘사를 추가해서 2~3배로 늘려줘. 원래 사건과 대사는 유지. 순수 소설 텍스트만 출력.',
    promptEn: 'Expand the selected text 2-3x by adding sensory details, inner monologue, and environmental description. Keep original events/dialogue. Output only the expanded text.',
  },
  {
    id: 'compress',
    icon: <Scissors className="w-3 h-3" />,
    labelKo: '압축',
    labelEn: 'Compress',
    promptKo: '아래 선택된 텍스트를 핵심만 남기고 절반 이하로 압축해줘. 불필요한 수식어, 반복, 과잉 묘사 제거. 순수 소설 텍스트만 출력.',
    promptEn: 'Compress the selected text to half or less. Remove unnecessary modifiers, repetition, and excessive description. Output only the compressed text.',
  },
  {
    id: 'tension',
    icon: <Thermometer className="w-3 h-3" />,
    labelKo: '긴장감 올리기',
    labelEn: 'Add tension',
    promptKo: '아래 선택된 텍스트의 긴장감을 높여줘. 짧은 문장, 급박한 호흡, 위기감 있는 묘사로. 원래 사건은 유지. 순수 소설 텍스트만 출력.',
    promptEn: 'Increase tension in the selected text. Use shorter sentences, urgent pacing, and crisis atmosphere. Keep original events. Output only the rewritten text.',
  },
  {
    id: 'action',
    icon: <Sword className="w-3 h-3" />,
    labelKo: '액션 강화',
    labelEn: 'More action',
    promptKo: '아래 선택된 텍스트의 액션/전투 묘사를 강화해줘. 동적인 동사, 타격감, 속도감 추가. 순수 소설 텍스트만 출력.',
    promptEn: 'Enhance action/combat in the selected text. Add dynamic verbs, impact, and speed. Output only the rewritten text.',
  },
  {
    id: 'dialogue',
    icon: <MessageCircle className="w-3 h-3" />,
    labelKo: '대사 다듬기',
    labelEn: 'Polish dialogue',
    promptKo: '아래 선택된 텍스트의 대사를 캐릭터 성격에 맞게 더 자연스럽고 개성있게 다듬어줘. 지문도 자연스럽게. 순수 소설 텍스트만 출력.',
    promptEn: 'Polish the dialogue in the selected text to be more natural and characteristic. Improve dialogue tags too. Output only the rewritten text.',
  },
  {
    id: 'insert_after',
    icon: <ArrowDownToLine className="w-3 h-3" />,
    labelKo: '뒤에 삽입',
    labelEn: 'Insert after',
    promptKo: '아래 선택된 텍스트 바로 뒤에 이어지는 전환 장면이나 묘사를 새로 써줘. 약 200~400자. 앞 내용에서 자연스럽게 이어져야 함. 순수 소설 텍스트만 출력.',
    promptEn: 'Write a new transition scene or description to follow the selected text. About 200-400 chars. Must flow naturally. Output only the new text.',
  },
];

// ============================================================
// PART 3 — Component
// ============================================================

const InlineRewriter: React.FC<InlineRewriterProps> = ({ content, language, context, onApply }) => {
  const isKO = language === 'KO';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editableContent, setEditableContent] = useState(content);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showActions, setShowActions] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Sync external content changes
  useEffect(() => {
    if (!isStreaming) setEditableContent(content);
  }, [content, isStreaming]);

  const handleSelect = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      setSelection(null);
      setShowActions(false);
      return;
    }
    setSelection({ start, end, text: editableContent.slice(start, end) });
    setShowActions(true);
    setPreview(null);
  }, [editableContent]);

  const executeAction = useCallback(async (action: QuickAction) => {
    if (!selection || isStreaming) return;

    const apiKey = getApiKey(getActiveProvider());
    if (!apiKey) {
      setPreview(isKO ? '⚠️ API 키가 설정되지 않았습니다.\n설정(Settings) 탭에서 API 키를 입력해주세요.' : '⚠️ API key not set.\nGo to Settings tab to enter your key.');
      return;
    }

    const before = editableContent.slice(Math.max(0, selection.start - 300), selection.start);
    const after = editableContent.slice(selection.end, selection.end + 300);
    const prompt = isKO ? action.promptKo : action.promptEn;

    const systemPrompt = isKO
      ? '당신은 소설 텍스트 리라이터입니다. 지시에 따라 선택된 부분만 수정하세요. 설명, 코멘트, 따옴표 없이 순수 소설 텍스트만 출력하세요.'
      : 'You are a fiction text rewriter. Modify only the selected part as instructed. Output pure fiction text only, no explanations or quotes.';

    const userMsg = `${prompt}\n\n[앞 문맥]\n${before}\n\n[선택된 텍스트]\n${selection.text}\n\n[뒤 문맥]\n${after}${context ? `\n\n[작품 정보] ${context}` : ''}`;

    const messages: ChatMsg[] = [{ role: 'user', content: userMsg }];

    setIsStreaming(true);
    setPreview('');
    const controller = new AbortController();
    abortRef.current = controller;

    let result = '';
    try {
      await streamChat({
        systemInstruction: systemPrompt,
        messages,
        temperature: 0.85,
        signal: controller.signal,
        onChunk: (chunk) => {
          result += chunk;
          setPreview(result);
        },
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') { /* cancelled */ }
      else {
        const info = classifyError(err, isKO);
        setPreview(`⚠️ ${info.title}\n${info.message}${info.action ? `\n\n💡 ${info.action}` : ''}`);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [selection, isStreaming, editableContent, context, language, isKO]);

  const handleCustomAction = useCallback(() => {
    if (!customPrompt.trim() || !selection) return;
    executeAction({
      id: 'custom',
      icon: <Sparkles className="w-3 h-3" />,
      labelKo: '커스텀',
      labelEn: 'Custom',
      promptKo: customPrompt,
      promptEn: customPrompt,
    });
    setCustomPrompt('');
  }, [customPrompt, selection, executeAction]);

  const [showApplyConfirm, setShowApplyConfirm] = useState(false);

  const applyPreview = useCallback(() => {
    if (preview == null || !selection) return;
    // Show confirmation for non-trivial replacements
    if (selection.text.length > 50 && !showApplyConfirm) {
      setShowApplyConfirm(true);
      return;
    }
    setShowApplyConfirm(false);
    const isInsertAfter = preview && !selection.text;
    let newContent: string;
    if (isInsertAfter) {
      newContent = editableContent.slice(0, selection.end) + '\n' + preview + editableContent.slice(selection.end);
    } else {
      newContent = editableContent.slice(0, selection.start) + preview + editableContent.slice(selection.end);
    }
    setEditableContent(newContent);
    setPreview(null);
    setSelection(null);
    setShowActions(false);
    onApply(newContent);
  }, [preview, selection, editableContent, onApply, showApplyConfirm]);

  const cancelPreview = () => {
    abortRef.current?.abort();
    setPreview(null);
    setIsStreaming(false);
  };

  return (
    <div className="space-y-3">
      {/* Action toolbar */}
      {showActions && selection && (
        <div className="bg-zinc-900/80 border border-zinc-700/50 rounded-xl p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-accent-purple font-[family-name:var(--font-mono)]">
              {isKO ? `선택: ${selection.text.length}자` : `Selected: ${selection.text.length} chars`}
            </span>
            <button onClick={() => { setShowActions(false); setPreview(null); }} className="p-1 hover:bg-zinc-800 rounded text-zinc-600 hover:text-zinc-400">
              <X className="w-3 h-3" />
            </button>
          </div>
          {/* Quick action buttons */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => executeAction(action)}
                disabled={isStreaming}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800/80 border border-zinc-700/50 rounded-lg text-[9px] font-bold text-zinc-400 hover:text-white hover:border-accent-purple/40 disabled:opacity-30 transition-colors font-[family-name:var(--font-mono)]"
              >
                {action.icon}
                {isKO ? action.labelKo : action.labelEn}
              </button>
            ))}
          </div>
          {/* Custom instruction */}
          <div className="flex gap-1.5">
            <input
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCustomAction(); }}
              placeholder={isKO ? '커스텀 지시 (예: "이 부분 더 슬프게")' : 'Custom instruction (e.g. "make this sadder")'}
              className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-1.5 text-[10px] text-text-primary placeholder-zinc-600 outline-none focus:border-accent-purple/30 font-[family-name:var(--font-mono)]"
              disabled={isStreaming}
            />
            <button onClick={handleCustomAction} disabled={isStreaming || !customPrompt.trim()} className="px-3 py-1.5 bg-accent-purple text-white rounded-lg text-[9px] font-bold disabled:opacity-30 font-[family-name:var(--font-mono)]">
              <Sparkles className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview !== null && (
        <div className="bg-zinc-950 border border-blue-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 font-[family-name:var(--font-mono)]">
              {isStreaming ? (isKO ? '생성 중...' : 'Generating...') : (isKO ? '미리보기' : 'Preview')}
            </span>
            <div className="flex gap-1.5">
              {!isStreaming && preview && !showApplyConfirm && (
                <button onClick={applyPreview} className="flex items-center gap-1 px-2.5 py-1 bg-green-600/20 border border-green-500/30 rounded-lg text-[9px] font-bold text-green-400 hover:bg-green-600/30 font-[family-name:var(--font-mono)]">
                  <Check className="w-3 h-3" /> {isKO ? '적용' : 'Apply'}
                </button>
              )}
              {showApplyConfirm && (
                <span className="flex items-center gap-1.5">
                  <span className="text-[8px] text-amber-400 font-[family-name:var(--font-mono)]">{isKO ? '교체할까요?' : 'Replace?'}</span>
                  <button onClick={applyPreview} className="px-2 py-1 bg-green-600/30 border border-green-500/40 rounded text-[9px] font-bold text-green-400 hover:bg-green-600/40">
                    {isKO ? '확인' : 'Yes'}
                  </button>
                  <button onClick={() => setShowApplyConfirm(false)} className="px-2 py-1 bg-zinc-700/30 border border-zinc-600/40 rounded text-[9px] text-zinc-400 hover:bg-zinc-700/50">
                    {isKO ? '취소' : 'No'}
                  </button>
                </span>
              )}
              <button onClick={cancelPreview} className="flex items-center gap-1 px-2.5 py-1 bg-red-600/10 border border-red-500/20 rounded-lg text-[9px] font-bold text-red-400 hover:bg-red-600/20 font-[family-name:var(--font-mono)]">
                {isStreaming ? <X className="w-3 h-3" /> : <RotateCcw className="w-3 h-3" />}
                {isStreaming ? (isKO ? '중단' : 'Stop') : (isKO ? '취소' : 'Cancel')}
              </button>
            </div>
          </div>
          <p className="text-[12px] leading-relaxed text-zinc-300 font-serif whitespace-pre-wrap">{preview || '...'}</p>
        </div>
      )}

      {/* Main editor */}
      <textarea
        ref={textareaRef}
        value={editableContent}
        onChange={e => {
          setEditableContent(e.target.value);
          setSelection(null);
          setShowActions(false);
        }}
        onSelect={handleSelect}
        className="w-full min-h-[40vh] sm:min-h-[55vh] bg-bg-primary border border-border rounded-xl p-4 sm:p-6 text-sm leading-[2] font-serif text-text-primary outline-none focus:border-accent-purple/30 transition-colors resize-y"
        placeholder={isKO ? '텍스트를 드래그해서 선택 → 액션 선택' : 'Select text by dragging → choose action'}
      />

      {/* Footer info */}
      <div className="flex justify-between items-center text-[9px] text-text-tertiary font-[family-name:var(--font-mono)]">
        <span>{editableContent.length.toLocaleString()}{isKO ? '자' : ' chars'}</span>
        <span className="text-zinc-600">{isKO ? '💡 텍스트 선택 → 리라이트 액션' : '💡 Select text → Rewrite action'}</span>
      </div>
    </div>
  );
};

export default InlineRewriter;
