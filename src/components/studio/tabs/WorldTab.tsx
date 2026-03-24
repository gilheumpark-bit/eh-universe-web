import React from 'react';
import dynamic from 'next/dynamic';
import { AppLanguage, StoryConfig, ChatSession } from '@/lib/studio-types';

const WorldStudioView = dynamic(() => import('@/components/studio/WorldStudioView'), { 
  ssr: false, 
  loading: () => <div className="text-center py-12 text-text-tertiary text-xs">Loading World Studio...</div> 
});

interface WorldTabProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  onStart: () => void;
  onSave: () => void;
  saveFlash: boolean;
  updateCurrentSession: (data: Partial<ChatSession>) => void;
  currentSessionId: string | null;
}

const WorldTab: React.FC<WorldTabProps> = ({
  language,
  config,
  setConfig,
  onStart,
  onSave,
  saveFlash,
  updateCurrentSession,
  currentSessionId
}) => {
  return (
    <WorldStudioView
      language={language}
      config={config}
      setConfig={setConfig}
      onStart={onStart}
      onSave={onSave}
      saveFlash={saveFlash}
      handleWorldSimChange={(data) => {
        if (!currentSessionId) return;
        updateCurrentSession({
          config: {
            ...config,
            worldSimData: {
              civs: data.civs.map((c: { name: string; era: string; color: string; traits: string[] }) => ({
                name: c.name,
                era: c.era,
                color: c.color,
                traits: c.traits
              })),
              relations: data.relations.map((r: { from: string; to: string; type: string }) => {
                const from = data.civs.find((c: { id: string; name: string }) => c.id === r.from)?.name || '';
                const to = data.civs.find((c: { id: string; name: string }) => c.id === r.to)?.name || '';
                return { fromName: from, toName: to, type: r.type };
              }),
              transitions: data.transitions,
              selectedGenre: data.selectedGenre,
              selectedLevel: data.selectedLevel,
              genreSelections: data.genreSelections,
              ruleLevel: data.ruleLevel,
            },
          },
        });
      }}
    />
  );
};

export default WorldTab;
