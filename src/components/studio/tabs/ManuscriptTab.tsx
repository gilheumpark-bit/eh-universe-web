import React, { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Share2, Languages, Film, PenLine, Headphones, Download, Settings2, Plus } from 'lucide-react';
import { AppLanguage, StoryConfig, Message } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import ManuscriptView from '@/components/studio/ManuscriptView';
import AuthorDashboard from '@/components/studio/AuthorDashboard';
import EmotionArcChart from '@/components/studio/EmotionArcChart';
import FatigueDetector from '@/components/studio/FatigueDetector';
import ShareToNetwork from '@/components/studio/ShareToNetwork';
import TranslationPanel from '@/components/studio/TranslationPanel';
import { parseManuscript, generateVoiceMappings, exportScenesAsHTML } from '@/engine/scene-parser';
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
  const [showSceneProps, setShowSceneProps] = useState(false);
  const [editingSceneIdx, setEditingSceneIdx] = useState<number | null>(null);

  // 현재 선택된 에피소드 원고에서 장면 파싱
  const handleSceneMode = useCallback((mode: 'radio' | 'visual' | 'edit') => {
    // 같은 모드 재클릭 시 토글
    if (sceneMode === mode) { setSceneMode('off'); setParsedScenes([]); return; }

    const manuscripts = config.manuscripts ?? [];
    const latestMs = manuscripts[manuscripts.length - 1];
    if (!latestMs?.content) {
      // 원고 없어도 모드는 세팅 → 빈 상태 안내 UI 표시
      setParsedScenes([]);
      setSceneMode(mode);
      return;
    }

    const result = parseManuscript(latestMs.content, config.characters ?? []);
    setParsedScenes(result.scenes);
    setSceneMode(mode);
  }, [config.manuscripts, config.characters, sceneMode]);

  const voiceMappings = useMemo(
    () => generateVoiceMappings(config.characters ?? []),
    [config.characters],
  );

  const handleExportHTML = useCallback(() => {
    if (parsedScenes.length === 0) return;
    const title = config.title || '비주얼 노벨';
    const html = exportScenesAsHTML(parsedScenes, title);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_visual_novel.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [parsedScenes, config.title]);

  const updateSceneProp = useCallback((idx: number, key: 'location' | 'timeOfDay' | 'mood' | 'backgroundPrompt', value: string) => {
    setParsedScenes(prev => prev.map((s, i) => i === idx ? { ...s, [key]: value } : s));
  }, []);

  const handleAddEpisode = useCallback(() => {
    const manuscripts = config.manuscripts ?? [];
    const nextEpisode = manuscripts.length > 0
      ? Math.max(...manuscripts.map(m => m.episode)) + 1
      : 1;
    setConfig(prev => ({
      ...prev,
      manuscripts: [
        ...(prev.manuscripts ?? []),
        { episode: nextEpisode, title: `EP.${nextEpisode}`, content: '', charCount: 0, lastUpdate: Date.now() },
      ],
    }));
  }, [config.manuscripts, setConfig]);

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 pt-4 flex gap-2">
        <button onClick={() => setShowDashboard(!showDashboard)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border transition-[transform,opacity,background-color,border-color,color] ${
            showDashboard ? 'bg-accent-purple text-white border-accent-purple' : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
          }`}>
          📊 {language === 'KO' ? '작가 대시보드' : 'Author Dashboard'}
        </button>
        <button onClick={() => { setShowTranslation(!showTranslation); if (!showTranslation) setShowDashboard(false); }}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border transition-[transform,opacity,background-color,border-color,color] flex items-center gap-1.5 ${
            showTranslation ? 'bg-accent-green text-white border-accent-green' : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
          }`}>
          <Languages className="w-3 h-3" /> {language === 'KO' ? '번역' : 'Translate'}
        </button>
        <button onClick={() => setShowShare(true)}
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border bg-bg-secondary text-text-tertiary border-border hover:text-text-primary transition-colors flex items-center gap-1.5">
          <Share2 className="w-3 h-3" /> {language === 'KO' ? '네트워크 공유' : 'Share'}
        </button>
        <button onClick={() => handleSceneMode('edit')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border transition-[transform,opacity,background-color,border-color,color] flex items-center gap-1.5 ${
            sceneMode === 'edit' ? 'bg-accent-blue text-white border-accent-blue' : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
          }`}>
          <PenLine className="w-3 h-3" /> {language === 'KO' ? '① 편집' : '① Edit'}
        </button>
        <button onClick={() => handleSceneMode('radio')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border transition-[transform,opacity,background-color,border-color,color] flex items-center gap-1.5 ${
            sceneMode === 'radio' ? 'bg-accent-purple text-white border-accent-purple' : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
          }`}>
          <Headphones className="w-3 h-3" /> {language === 'KO' ? '② 라디오' : '② Radio'}
        </button>
        <button onClick={() => handleSceneMode('visual')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border transition-[transform,opacity,background-color,border-color,color] flex items-center gap-1.5 ${
            sceneMode === 'visual' ? 'bg-accent-amber text-white border-accent-amber' : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
          }`}>
          <Film className="w-3 h-3" /> {language === 'KO' ? '③ 비주얼 노벨' : '③ Visual Novel'}
        </button>
        <button onClick={handleAddEpisode}
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border bg-bg-secondary text-text-tertiary border-border hover:text-text-primary hover:border-accent-green transition-colors flex items-center gap-1.5"
          title={language === 'KO' ? '새 에피소드 추가' : 'Add new episode'}>
          <Plus className="w-3 h-3" /> {language === 'KO' ? '에피소드 추가' : 'Add Episode'}
        </button>
        {parsedScenes.length > 0 && (
          <>
            <button onClick={() => setShowSceneProps(!showSceneProps)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border transition-[transform,opacity,background-color,border-color,color] flex items-center gap-1.5 ${
                showSceneProps ? 'bg-accent-green text-white border-accent-green' : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
              }`}>
              <Settings2 className="w-3 h-3" /> {language === 'KO' ? '속성' : 'Props'}
            </button>
            <button onClick={handleExportHTML}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border bg-bg-secondary text-text-tertiary border-border hover:text-text-primary transition-colors flex items-center gap-1.5">
              <Download className="w-3 h-3" /> HTML
            </button>
          </>
        )}
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
      {/* 장면 속성 패널 */}
      {showSceneProps && parsedScenes.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="bg-bg-secondary/50 border border-border/30 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-mono font-semibold text-text-primary uppercase tracking-wider mb-2">
              {language === 'KO' ? '장면 속성 편집' : 'Scene Properties'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
              {parsedScenes.map((scene, idx) => (
                <div key={scene.id} className={`border rounded-lg p-3 space-y-2 transition-colors ${editingSceneIdx === idx ? 'border-accent-purple/50 bg-accent-purple/5' : 'border-border/20 bg-bg-primary/50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-text-primary">{scene.title}</span>
                    <button onClick={() => setEditingSceneIdx(editingSceneIdx === idx ? null : idx)} className="text-[9px] text-accent-purple">
                      {editingSceneIdx === idx ? (language === 'KO' ? '접기' : 'Close') : (language === 'KO' ? '편집' : 'Edit')}
                    </button>
                  </div>
                  {editingSceneIdx === idx && (
                    <div className="space-y-1.5">
                      <label className="block">
                        <span className="text-[9px] text-text-tertiary">{language === 'KO' ? '장소' : 'Location'}</span>
                        <input value={scene.location ?? ''} onChange={e => updateSceneProp(idx, 'location', e.target.value)} className="w-full bg-bg-tertiary border border-border/30 rounded px-2 py-1 text-[10px] text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple" placeholder={language === 'KO' ? '예: 왕궁 정원' : 'e.g. Royal Garden'} />
                      </label>
                      <label className="block">
                        <span className="text-[9px] text-text-tertiary">{language === 'KO' ? '시간대' : 'Time'}</span>
                        <select value={scene.timeOfDay ?? ''} onChange={e => updateSceneProp(idx, 'timeOfDay', e.target.value)} className="w-full bg-bg-tertiary border border-border/30 rounded px-2 py-1 text-[10px] text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50">
                          <option value="">-</option>
                          {['새벽','아침','낮','저녁','밤'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-[9px] text-text-tertiary">{language === 'KO' ? '분위기' : 'Mood'}</span>
                        <select value={scene.mood ?? ''} onChange={e => updateSceneProp(idx, 'mood', e.target.value)} className="w-full bg-bg-tertiary border border-border/30 rounded px-2 py-1 text-[10px] text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50">
                          <option value="">-</option>
                          {['dark','bright','rainy','snowy','misty','eerie','warm','cold','peaceful'].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-[9px] text-text-tertiary">{language === 'KO' ? '배경 이미지 프롬프트' : 'Background prompt'}</span>
                        <input value={scene.backgroundPrompt ?? ''} onChange={e => updateSceneProp(idx, 'backgroundPrompt', e.target.value)} className="w-full bg-bg-tertiary border border-border/30 rounded px-2 py-1 text-[10px] text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple" placeholder={language === 'KO' ? '이미지 생성용 프롬프트' : 'Prompt for image generation'} />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {sceneMode !== 'off' && !showTranslation && parsedScenes.length === 0 && (
        <div className="max-w-2xl mx-auto text-center py-16 px-4">
          <p className="text-text-tertiary text-sm mb-4">
            {language === 'KO' ? '원고를 먼저 작성해주세요.' : 'Please write a manuscript first.'}
          </p>
          <p className="text-text-tertiary text-xs">
            {language === 'KO' ? '집필 탭에서 에피소드를 생성하면 편집 · 라디오 · 비주얼 노벨 기능을 사용할 수 있습니다.' : 'Create an episode in the Writing tab to use edit, radio, and visual novel features.'}
          </p>
          <button onClick={() => setSceneMode('off')} className="mt-6 px-4 py-2 rounded-lg bg-bg-secondary border border-border text-text-tertiary text-xs hover:text-text-primary transition-colors min-h-[44px]">
            {L4(language, { ko: '← 돌아가기', en: '← Back', ja: '← 戻る', zh: '← 返回' })}
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
            onPlayFrom={(_si, _bi) => { setSceneMode('visual'); }}
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
