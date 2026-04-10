import React, { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Share2, Languages, Film, PenLine, Headphones } from 'lucide-react';
import { AppLanguage, StoryConfig, Message } from '@/lib/studio-types';
import ManuscriptView from '@/components/studio/ManuscriptView';
import AuthorDashboard from '@/components/studio/AuthorDashboard';
import EmotionArcChart from '@/components/studio/EmotionArcChart';
import FatigueDetector from '@/components/studio/FatigueDetector';
import ShareToNetwork from '@/components/studio/ShareToNetwork';
import TranslationPanel from '@/components/studio/TranslationPanel';
import { parseManuscript, generateVoiceMappings } from '@/engine/scene-parser';
import type { ParsedScene } from '@/engine/scene-parser';

const ScenePlayer = dynamic(() => import('@/components/studio/ScenePlayer'), { ssr: false });
const SceneTimeline = dynamic(() => import('@/components/studio/SceneTimeline'), { ssr: false });

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
  const [showTranslation, setShowTranslation] = useState(false);
  const [sceneMode, setSceneMode] = useState<'off' | 'radio' | 'visual' | 'edit'>('off');
  const [parsedScenes, setParsedScenes] = useState<ParsedScene[]>([]);

  // 현재 선택된 에피소드 원고에서 장면 파싱
  const handleSceneMode = useCallback((mode: 'radio' | 'visual' | 'edit') => {
    const manuscripts = config.manuscripts ?? [];
    const latestMs = manuscripts[manuscripts.length - 1];
    if (!latestMs?.content) {
      setSceneMode('off');
      return;
    }

    const result = parseManuscript(latestMs.content, config.characters ?? []);
    setParsedScenes(result.scenes);
    setSceneMode(mode);
  }, [config.manuscripts, config.characters]);

  const voiceMappings = useMemo(
    () => generateVoiceMappings(config.characters ?? []),
    [config.characters],
  );

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 pt-4 flex gap-2">
        <button onClick={() => setShowDashboard(!showDashboard)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border transition-all ${
            showDashboard ? 'bg-accent-purple text-white border-accent-purple' : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
          }`}>
          📊 {language === 'KO' ? '작가 대시보드' : 'Author Dashboard'}
        </button>
        <button onClick={() => { setShowTranslation(!showTranslation); if (!showTranslation) setShowDashboard(false); }}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
            showTranslation ? 'bg-accent-green text-white border-accent-green' : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
          }`}>
          <Languages className="w-3 h-3" /> {language === 'KO' ? '번역' : 'Translate'}
        </button>
        <button onClick={() => setShowShare(true)}
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border bg-bg-secondary text-text-tertiary border-border hover:text-text-primary transition-all flex items-center gap-1.5">
          <Share2 className="w-3 h-3" /> {language === 'KO' ? '네트워크 공유' : 'Share'}
        </button>
        <button onClick={() => handleSceneMode('edit')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
            sceneMode === 'edit' ? 'bg-accent-blue text-white border-accent-blue' : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
          }`}>
          <PenLine className="w-3 h-3" /> {language === 'KO' ? '① 편집' : '① Edit'}
        </button>
        <button onClick={() => handleSceneMode('radio')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
            sceneMode === 'radio' ? 'bg-accent-purple text-white border-accent-purple' : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
          }`}>
          <Headphones className="w-3 h-3" /> {language === 'KO' ? '② 라디오' : '② Radio'}
        </button>
        <button onClick={() => handleSceneMode('visual')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
            sceneMode === 'visual' ? 'bg-accent-amber text-white border-accent-amber' : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
          }`}>
          <Film className="w-3 h-3" /> {language === 'KO' ? '③ 비주얼 노벨' : '③ Visual Novel'}
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
      {showTranslation && (
        <TranslationPanel language={language} config={config} setConfig={setConfig} />
      )}
      {sceneMode !== 'off' && !showTranslation && parsedScenes.length === 0 && (
        <div className="max-w-2xl mx-auto text-center py-16 px-4">
          <p className="text-text-tertiary text-sm mb-4">
            {language === 'KO' ? '원고를 먼저 작성해주세요.' : 'Please write a manuscript first.'}
          </p>
          <p className="text-text-tertiary text-xs">
            {language === 'KO' ? '집필 탭에서 에피소드를 생성하면 편집 · 라디오 · 비주얼 노벨 기능을 사용할 수 있습니다.' : 'Create an episode in the Writing tab to use edit, radio, and visual novel features.'}
          </p>
          <button onClick={() => setSceneMode('off')} className="mt-6 px-4 py-2 rounded-lg bg-bg-secondary border border-border text-text-secondary text-xs hover:text-text-primary transition-colors">
            {language === 'KO' ? '돌아가기' : 'Go back'}
          </button>
        </div>
      )}
      {sceneMode === 'radio' && parsedScenes.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black">
          <ScenePlayer
            scenes={parsedScenes}
            voiceMappings={voiceMappings}
            language={language}
            mode="radio"
            onClose={() => setSceneMode('off')}
            autoPlay
          />
        </div>
      )}
      {sceneMode === 'visual' && parsedScenes.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black">
          <ScenePlayer
            scenes={parsedScenes}
            voiceMappings={voiceMappings}
            language={language}
            mode="visual"
            onClose={() => setSceneMode('off')}
            showMetrics
          />
        </div>
      )}
      {sceneMode === 'edit' && parsedScenes.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 py-4" style={{ height: 'calc(100vh - 200px)' }}>
          <SceneTimeline
            scenes={parsedScenes}
            language={language}
            onScenesChange={setParsedScenes}
            onPlayFrom={(si, bi) => { setSceneMode('visual'); }}
            onExportText={(text) => {
              setConfig((prev) => {
                const manuscripts = [...(prev.manuscripts ?? [])];
                if (manuscripts.length > 0) {
                  manuscripts[manuscripts.length - 1] = { ...manuscripts[manuscripts.length - 1], content: text, charCount: text.length, lastUpdate: Date.now() };
                }
                return { ...prev, manuscripts };
              });
              setSceneMode('off');
            }}
          />
        </div>
      )}
      {sceneMode === 'off' && !showTranslation && (
        <ManuscriptView
          language={language}
          config={config}
          setConfig={setConfig}
          messages={messages}
          onEditInStudio={onEditInStudio}
        />
      )}
    </>
  );
};

export default ManuscriptTab;
