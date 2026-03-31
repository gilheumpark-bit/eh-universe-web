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
              phonemes: data.phonemes,
              words: data.words,
              hexMap: data.hexMap,
            },
          },
        });
      }}
    />
  );
};

export default WorldTab;
