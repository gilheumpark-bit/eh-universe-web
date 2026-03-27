import React, { useState } from 'react';
import { AppLanguage, StoryConfig, Message } from '@/lib/studio-types';
import ManuscriptView from '@/components/studio/ManuscriptView';
import AuthorDashboard from '@/components/studio/AuthorDashboard';
import EmotionArcChart from '@/components/studio/EmotionArcChart';
import FatigueDetector from '@/components/studio/FatigueDetector';

interface ManuscriptTabProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: (c: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;
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
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <button onClick={() => setShowDashboard(!showDashboard)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider border transition-all ${
            showDashboard ? 'bg-accent-purple text-white border-accent-purple' : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
          }`}>
          📊 {language === 'KO' ? '작가 대시보드' : 'Author Dashboard'}
        </button>
      </div>
      {showDashboard && (
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
          <AuthorDashboard messages={messages} language={language} />
          <EmotionArcChart messages={messages} language={language} />
          <FatigueDetector messages={messages} language={language} />
        </div>
      )}
      <ManuscriptView
        language={language}
        config={config}
        setConfig={setConfig}
        messages={messages}
        onEditInStudio={onEditInStudio}
      />
    </>
  );
};

export default ManuscriptTab;
