import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from '@/components/studio/ChatMessage';
import type { AppLanguage, Message } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import { Send, StopCircle, RefreshCcw } from 'lucide-react';

interface RightChatPanelProps {
  language: AppLanguage;
  messages: Message[]; // AI 채팅 전용 메시지들
  loading: boolean;
  onSend: (text: string) => void;
  onAbort: () => void;
  onClear: () => void;
}

/**
 * RightChatPanel - 집필 탭 오른쪽 사이드 AI 채팅 패널
 * 소설 본문 생성과 독립적으로 작동하며, 전용 입력창을 가짐.
 */
export const RightChatPanel: React.FC<RightChatPanelProps> = ({ 
  language, messages, loading, onSend, onAbort, onClear 
}) => {
  const t = createT(language);
  const [input, setInput] = useState('');
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // 메시지 추가 시 자동 스크롤
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="w-[320px] lg:w-[380px] border-l border-border bg-bg-secondary/40 backdrop-blur-md flex flex-col h-full animate-in fade-in slide-in-from-right duration-500">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-primary/50">
        <h3 className="text-xs font-black text-text-secondary uppercase tracking-widest font-mono">
          {t('writingMode.writingAiAssistant')}
        </h3>
        <button 
          onClick={onClear}
          className="p-1.5 text-text-tertiary hover:text-accent-red transition-colors"
          title={t('ui.clearChat')}
        >
          <RefreshCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages History */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40">
            <div className="w-12 h-12 rounded-full border border-dashed border-text-tertiary flex items-center justify-center">
              💬
            </div>
            <p className="text-[10px] text-text-tertiary font-medium">
              {language === 'KO' ? '생성 중인 소설에 대해 물어보세요!' : 'Ask questions about your draft!'}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="animate-in fade-in slide-in-from-bottom duration-300">
              <ChatMessage message={msg} language={language} isCompact />
            </div>
          ))
        )}
        <div ref={scrollEndRef} className="h-4" />
      </div>

      {/* Footer Input Area */}
      <div className="p-4 bg-bg-primary/80 border-t border-border">
        <div className="relative group flex items-end gap-2 bg-bg-secondary border border-border rounded-xl px-3 py-2.5 focus-within:border-accent-purple/50 transition-all shadow-inner">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={loading ? t('engine.thinking') : t('ui.askAnything')}
            className="flex-1 bg-transparent border-none outline-none text-xs text-text-primary placeholder-text-tertiary resize-none max-h-32 leading-relaxed font-mono"
            rows={1}
            disabled={loading}
          />
          
          {loading ? (
            <button 
              onClick={onAbort}
              className="w-8 h-8 rounded-lg bg-accent-red text-white flex items-center justify-center hover:opacity-80 transition-opacity shrink-0"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleSend}
              disabled={!input.trim()}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                input.trim() ? 'bg-accent-purple text-white' : 'bg-bg-tertiary text-text-tertiary opacity-50'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-[9px] text-text-tertiary text-center font-mono">
          {language === 'KO' ? '집필 로직과 독립적으로 대화합니다.' : 'AI Chat works independently from writing.'}
        </p>
      </div>
    </div>
  );
};
