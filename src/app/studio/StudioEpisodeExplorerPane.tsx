"use client";

import dynamic from 'next/dynamic';
import type { AppLanguage, AppTab, ChatSession, StoryConfig } from '@/lib/studio-types';

const EpisodeExplorer = dynamic(() => import('@/components/studio/EpisodeExplorer'), { ssr: false });

type BooleanStateSetter = (value: boolean | ((previous: boolean) => boolean)) => void;

interface StudioEpisodeExplorerPaneProps {
  open: boolean;
  currentSession: ChatSession | null;
  language: AppLanguage;
  setConfig: (config: StoryConfig | ((previous: StoryConfig) => StoryConfig)) => void;
  handleTabChange: (tab: AppTab) => void;
  setEpisodeExplorerOpen: BooleanStateSetter;
  branches: string[];
  currentBranch?: string;
  gitConnected: boolean;
  onSwitchBranch: (branch: string) => void;
  onCreateBranch: (name: string) => void;
  onLoadBranchContent?: (branch: string, episode: number) => Promise<string>;
}

export function StudioEpisodeExplorerPane({
  open,
  currentSession,
  language,
  setConfig,
  handleTabChange,
  setEpisodeExplorerOpen,
  branches,
  currentBranch,
  gitConnected,
  onSwitchBranch,
  onCreateBranch,
  onLoadBranchContent,
}: StudioEpisodeExplorerPaneProps) {
  if (!open || !currentSession?.config) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setEpisodeExplorerOpen(false)} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[60vh] border-t border-border bg-bg-primary overflow-hidden rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200 md:static md:max-h-none md:rounded-none md:shadow-none md:z-auto md:w-[240px] md:shrink-0 md:border-t-0 md:border-r md:flex">
        <EpisodeExplorer
          config={currentSession.config}
          currentEpisode={currentSession.config.episode}
          language={language}
          onSelectEpisode={(episode) => {
            setConfig((previous) => ({ ...previous, episode }));
            handleTabChange('writing');
          }}
          onCreateEpisode={() => handleTabChange('manuscript')}
          onCreateVolume={() => handleTabChange('manuscript')}
          onClose={() => setEpisodeExplorerOpen(false)}
          onNavigateTab={(tab) => handleTabChange(tab as AppTab)}
          branches={branches}
          currentBranch={currentBranch}
          onSwitchBranch={onSwitchBranch}
          onCreateBranch={onCreateBranch}
          gitConnected={gitConnected}
          onLoadBranchContent={onLoadBranchContent}
          className="w-full"
        />
      </div>
    </>
  );
}
