import React from 'react';
import ChatMessage from '@/components/studio/ChatMessage';
import type { AppLanguage, Message } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';

interface RightChatPanelProps {
  language: AppLanguage;
  messages: Message[]; // older messages to display
}

export const RightChatPanel: React.FC<RightChatPanelProps> = ({ language, messages }) => {
  const t = createT(language);
  if (!messages || messages.length === 0) return null;
  return (
    <div className="w-1/3 max-w-xs overflow-y-auto border-l border-border bg-bg-secondary/30 p-2">
      <h3 className="text-sm font-bold text-text-tertiary mb-2">{t('writingMode.previousMessages')}</h3>
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} language={language} />
      ))}
    </div>
  );
};
