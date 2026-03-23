// @ts-nocheck
import React from 'react';
import { AppLanguage, StoryConfig, Message } from '@/lib/studio-types';
import ManuscriptView from '@/components/studio/ManuscriptView';

interface ManuscriptTabProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: (config: StoryConfig) => void;
  messages: Message[];
  onEditInStudio: (content: string) => void;
}

const ManuscriptTab: React.FC<ManuscriptTabProps> = ({
  language,
  config,
  setConfig,
  messages,
  onEditInStudio
}) => {
  return (
    <ManuscriptView
      language={language}
      config={config}
      setConfig={setConfig}
      messages={messages}
      onEditInStudio={onEditInStudio}
    />
  );
};

export default ManuscriptTab;
