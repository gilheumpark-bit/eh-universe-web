import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { AppLanguage, StoryConfig, Message } from '@/lib/studio-types';
import ManuscriptView from '@/components/studio/ManuscriptView';
import AuthorDashboard from '@/components/studio/AuthorDashboard';
import EmotionArcChart from '@/components/studio/EmotionArcChart';
import FatigueDetector from '@/components/studio/FatigueDetector';
import ShareToNetwork from '@/components/studio/ShareToNetwork';

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
  const [showShare, setShowShare] = useState(false);

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 pt-4 flex gap-2">
        <button onClick={() => setShowDashboard(!showDashboard)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider border transition-all ${
            showDashboard ? 'bg-accent-purple text-white border-accent-purple' : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
          }`}>
          📊 {language === 'KO' ? '작가 대시보드' : 'Author Dashboard'}
        </button>
        <button onClick={() => setShowShare(true)}
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider border bg-bg-secondary text-text-tertiary border-border hover:text-text-primary transition-all flex items-center gap-1.5">
          <Share2 className="w-3 h-3" /> {language === 'KO' ? '네트워크 공유' : 'Share'}
        </button>
      </div>
      {showShare && (
        <ShareToNetwork
          language={language}
          config={config}
          messages={messages}
          onClose={() => setShowShare(false)}
        />
      )}
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
