"use client";

// ============================================================
// InputDockSection — 하단 입력 Dock (AI 모드 전용 Sticky, 구 PART 8)
// ============================================================

import React from 'react';
import { Send } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';

interface InputDockSectionProps {
  language: AppLanguage;
  input: string;
  setInput: (v: string) => void;
  handleSend: (customPrompt?: string, inputValue?: string, clearInput?: () => void) => void;
  isGenerating: boolean;
  showAiLock: boolean;
  handleSVIKeyDown: (e: React.KeyboardEvent) => void;
}

export function InputDockSection({
  language, input, setInput, handleSend, isGenerating, showAiLock, handleSVIKeyDown,
}: InputDockSectionProps) {
  const t = createT(language);

  return (
    <div className="p-3 md:p-6 bg-linear-to-t from-bg-primary via-bg-primary/95 to-transparent sticky bottom-0 z-20">
      {/* API lock banner removed — settings accessible via splash screen */}
      {/* Prompt example chips */}
      {!input.trim() && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {[
            { ko: '다음 장면을 이어 써줘', en: 'Continue the next scene', ja: '次のシーンを続けて', zh: '续写下一个场景' },
            { ko: '주인공이 적과 대면하는 장면', en: 'Hero confronts the enemy', ja: '主人公が敵と対峙する場面', zh: '主角与敌人对峙的场景' },
            { ko: '감정적인 대화 장면으로', en: 'An emotional dialogue scene', ja: '感情的な対話シーンで', zh: '一段感人的对话场景' },
          ].map((chip, i) => (
            <button key={i} type="button" onClick={() => setInput(L4(language, chip))}
              className="px-3 py-1.5 rounded-xl border border-border/60 bg-bg-tertiary/30 text-sm md:text-[13px] text-text-tertiary hover:text-text-secondary hover:border-accent-purple/30 hover:bg-accent-purple/5 transition-colors min-h-[44px]">
              {L4(language, chip)}
            </button>
          ))}
        </div>
      )}
      <div className="relative group bg-bg-secondary border border-border rounded-2xl shadow-2xl focus-within:border-accent-purple/30 transition-[transform,opacity,background-color,border-color,color] p-2 pl-3 md:pl-4 flex items-end gap-1 md:gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { handleSVIKeyDown(e); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!showAiLock) handleSend(); } }}
          placeholder={t('writing.inputPlaceholder')}
          /* text-base(16px) — iOS Safari auto-zoom 방지 (포커스 시 확대 금지) */
          className="flex-1 min-w-0 bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-3 text-base md:text-sm text-text-primary placeholder-text-secondary resize-none max-h-32 leading-relaxed"
          rows={1}
          disabled={isGenerating || showAiLock}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isGenerating || showAiLock}
          aria-label={L4(language, { ko: '전송', en: 'Send', ja: '送信', zh: '发送' })}
          className={`w-11 h-11 md:w-12 md:h-12 min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-[transform,opacity] shrink-0 ${input.trim() && !isGenerating && !showAiLock ? 'bg-accent-purple text-bg-primary shadow-lg hover:scale-[1.02] active:scale-95' : 'bg-bg-tertiary text-text-tertiary opacity-50'}`}
        >
          {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
      <p className="mt-2 text-[10px] text-text-tertiary text-center font-mono uppercase tracking-[0.2em] opacity-40 hidden sm:block">
        {L4(language, { ko: 'Narrative Origin Writer — 소설 생성 엔진', en: 'Narrative Origin Writer — Story Engine', ja: 'Narrative Origin Writer — 小説生成エンジン', zh: 'Narrative Origin Writer — 小说生成引擎' })}
      </p>
    </div>
  );
}
