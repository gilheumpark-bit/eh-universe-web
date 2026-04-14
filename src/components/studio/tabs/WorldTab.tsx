import React from 'react';
import dynamic from 'next/dynamic';
import { AppLanguage, StoryConfig, ChatSession } from '@/lib/studio-types';

const WorldStudioView = dynamic(() => import('@/components/studio/WorldStudioView'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4 p-8 animate-pulse">
      <div className="h-10 bg-bg-secondary rounded-2xl w-2/5" />
      <div className="h-48 bg-bg-secondary rounded-2xl" />
      <div className="h-32 bg-bg-secondary rounded-2xl" />
    </div>
  ),
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
  hostedProviders?: Record<string, boolean>;
}

const WorldTab: React.FC<WorldTabProps> = ({
  language,
  config,
  setConfig,
  onStart,
  onSave,
  saveFlash,
  updateCurrentSession,
  currentSessionId,
  hostedProviders = {},
}) => {
  return (
    <WorldStudioView
      language={language}
      config={config}
      setConfig={setConfig}
      onStart={onStart}
      onSave={onSave}
      saveFlash={saveFlash}
      hostedProviders={hostedProviders}
      handleWorldSimChange={(data: Record<string, unknown>) => {
        if (!currentSessionId) return;
        const civs = Array.isArray(data.civs) ? data.civs as { id?: string; name: string; era: string; color: string; traits: string[] }[] : [];
        const relations = Array.isArray(data.relations) ? data.relations as { from: string; to: string; type: string }[] : [];
        const simUpdate = data as unknown as import('@/lib/studio-types').WorldSimData;
        updateCurrentSession({
          config: {
            ...config,
            worldSimData: {
              ...config.worldSimData,
              civs: civs.map(c => ({
                name: c.name,
                era: c.era,
                color: c.color,
                traits: c.traits
              })),
              relations: relations.map(r => {
                const from = civs.find(c => c.id === r.from)?.name || '';
                const to = civs.find(c => c.id === r.to)?.name || '';
                return { fromName: from, toName: to, type: r.type };
              }),
              transitions: simUpdate.transitions,
              selectedGenre: simUpdate.selectedGenre,
              selectedLevel: simUpdate.selectedLevel,
              genreSelections: simUpdate.genreSelections,
              ruleLevel: simUpdate.ruleLevel,
              phonemes: simUpdate.phonemes,
              words: simUpdate.words,
              hexMap: simUpdate.hexMap,
            },
          },
        });
      }}
    />
  );
};

export default WorldTab;
