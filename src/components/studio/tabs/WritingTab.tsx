import React from 'react';
import dynamic from 'next/dynamic';
import { Sparkles, PenTool, StopCircle, Send } from 'lucide-react';
import { AppLanguage, AppTab, StoryConfig, ChatSession, Message } from '@/lib/studio-types';
import type { EngineReport } from '@/engine/types';
import type { DirectorReport } from '@/engine/director';
import type { HFCPState } from '@/engine/hfcp';
import type { AdvancedWritingSettings } from '@/components/studio/AdvancedWritingPanel';
import { createT } from '@/lib/i18n';
import { TRANSLATIONS } from '@/lib/studio-translations';

const ContinuityGraph = dynamic(() => import('@/components/studio/ContinuityGraph'), { ssr: false, loading: () => null });
const EngineStatusBar = dynamic(() => import('@/components/studio/EngineStatusBar'), { ssr: false, loading: () => null });
const ChatMessage = dynamic(() => import('@/components/studio/ChatMessage'), { ssr: false, loading: () => null });
const VersionDiff = dynamic(() => import('@/components/studio/VersionDiff'), { ssr: false, loading: () => null });
const TypoPanel = dynamic(() => import('@/components/studio/TypoPanel'), { ssr: false, loading: () => null });
const InlineRewriter = dynamic(() => import('@/components/studio/InlineRewriter'), { ssr: false, loading: () => null });
const AutoRefiner = dynamic(() => import('@/components/studio/AutoRefiner'), { ssr: false, loading: () => null });
const AdvancedWritingPanel = dynamic(() => import('@/components/studio/AdvancedWritingPanel'), { ssr: false, loading: () => null });
const DirectorPanel = dynamic(() => import('@/components/studio/DirectorPanel'), { ssr: false, loading: () => null });
const EngineDashboard = dynamic(() => import('@/components/studio/EngineDashboard'), { ssr: false, loading: () => null });
const EpisodeScenePanel = dynamic(() => import('@/components/studio/EpisodeScenePanel'), { ssr: false, loading: () => null });

interface WritingTabProps {
  language: AppLanguage;
  currentSession: ChatSession;
  currentSessionId: string | null;
  updateCurrentSession: (data: Partial<ChatSession>) => void;
  setConfig: (config: StoryConfig) => void;
  writingMode: 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced';
  setWritingMode: (mode: 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced') => void;
  editDraft: string;
  setEditDraft: (val: string) => void;
  canvasContent: string;
  setCanvasContent: (val: string) => void;
  canvasPass: number;
  setCanvasPass: (val: number) => void;
  promptDirective: string;
  setPromptDirective: (val: string) => void;
  isGenerating: boolean;
  lastReport: EngineReport | null;
  handleSend: (customPrompt?: string) => void;
  handleCancel: () => void;
  handleRegenerate: (msgId: string) => void;
  handleVersionSwitch: (msgId: string, idx: number) => void;
  handleTypoFix: (msgId: string, idx: number, orig: string, sug: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  searchQuery: string;
  filteredMessages: Message[];
  searchMatchesEditDraft: boolean;
  hasApiKey: boolean;
  setShowApiKeyModal: (show: boolean) => void;
  setActiveTab: (tab: AppTab) => void;
  advancedSettings: AdvancedWritingSettings;
  setAdvancedSettings: (settings: AdvancedWritingSettings) => void;
  input: string;
  setInput: (val: string) => void;
  showDashboard: boolean;
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
  directorReport: DirectorReport | null;
  hfcpState: HFCPState;
  handleNextEpisode: () => void;
  editDraftRef?: React.RefObject<HTMLTextAreaElement | null>;
  showAiLock?: boolean;
  hostedProviders?: Partial<Record<string, boolean>>;
  advancedOutputMode?: string;
  setAdvancedOutputMode?: (mode: string) => void;
  saveFlash?: boolean;
  triggerSave?: () => void;
}

const WritingTab: React.FC<WritingTabProps> = ({
  language, currentSession, currentSessionId, updateCurrentSession, setConfig,
  writingMode, setWritingMode,
  editDraft, setEditDraft,
  canvasContent, setCanvasContent,
  canvasPass, setCanvasPass,
  promptDirective, setPromptDirective,
  isGenerating, lastReport,
  handleSend, handleCancel, handleRegenerate, handleVersionSwitch, handleTypoFix,
  messagesEndRef,
  searchQuery, filteredMessages, searchMatchesEditDraft: _searchMatchesEditDraft,
  hasApiKey, setShowApiKeyModal, setActiveTab,
  advancedSettings, setAdvancedSettings,
  input, setInput,
  showDashboard,
  rightPanelOpen, setRightPanelOpen,
  directorReport, hfcpState: _hfcpState,
  handleNextEpisode
}: WritingTabProps) => {
  const t = createT(language);
  const tObj = TRANSLATIONS[language] || TRANSLATIONS['KO'];
  const handleApplyEdit = React.useCallback(() => {
    if (!editDraft.trim()) return;
    const now = Date.now();
    const editMsg: Message = { id: `edit-${now}`, role: 'assistant', content: editDraft, timestamp: now };
    updateCurrentSession({
      messages: [...currentSession.messages, { id: `u-edit-${now + 1}`, role: 'user', content: t('writingMode.inlineEditComplete'), timestamp: now + 1 }, editMsg],
      title: currentSession.messages.length === 0 ? editDraft.substring(0, 15) : currentSession.title,
    });
    if (hasApiKey) setWritingMode('ai');
    setEditDraft('');
  }, [editDraft, currentSession, updateCurrentSession, t, hasApiKey, setWritingMode, setEditDraft]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className={`max-w-6xl w-full mx-auto px-4 md:px-8 lg:px-12 flex flex-col ${currentSession.messages.length === 0 && writingMode === 'ai' ? 'h-full justify-center items-center' : 'py-6 md:py-8 space-y-6 min-h-full'}`}>
            
            {/* Continuity Tracker Graph */}
            {(currentSession.messages.length > 0 || writingMode !== 'ai') && (
              <ContinuityGraph language={language} config={currentSession.config} />
            )}

            {/* Applied Settings Summary */}
            {(currentSession.messages.length > 0 || writingMode !== 'ai') && (
            <details className="group border border-border rounded-xl bg-bg-secondary/50 overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg-secondary transition-colors">
                <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider text-text-tertiary">
                  {t('applied.appliedSettings')}
                </span>
                <span className="text-[9px] text-text-tertiary group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-4 pb-4 space-y-3 text-[10px] border-t border-border pt-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-text-tertiary font-bold uppercase w-16">{t('applied.genre')}</span>
                  <span className="text-accent-purple font-bold">{currentSession.config.genre}</span>
                  <span className="text-text-tertiary">EP.{currentSession.config.episode}/{currentSession.config.totalEpisodes}</span>
                  {currentSession.config.setting && <span className="text-text-secondary">📍 {currentSession.config.setting}</span>}
                </div>
                {currentSession.config.characters.length > 0 && (
                  <div>
                    <span className="text-text-tertiary font-bold uppercase">{t('applied.characters')}</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {currentSession.config.characters.map(c => (
                        <span key={c.id} className="px-2 py-0.5 bg-bg-primary border border-border rounded text-[9px]">
                          <span className="font-bold text-text-primary">{c.name}</span>
                          <span className="text-text-tertiary ml-1">({c.role})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setActiveTab('world')} className="px-2 py-1 bg-bg-primary border border-border rounded text-[8px] font-bold text-text-tertiary hover:text-accent-purple transition-colors">{t('applied.editWorld')}</button>
                  <button onClick={() => setActiveTab('characters')} className="px-2 py-1 bg-bg-primary border border-border rounded text-[8px] font-bold text-text-tertiary hover:text-accent-purple transition-colors">{t('applied.editCharacters')}</button>
                  <button onClick={() => setActiveTab('rulebook')} className="px-2 py-1 bg-bg-primary border border-border rounded text-[8px] font-bold text-text-tertiary hover:text-accent-purple transition-colors">{t('applied.editDirection')}</button>
                </div>
              </div>
            </details>
            )}

            {/* Writing Modes */}
            {(currentSession.messages.length > 0 || writingMode !== 'ai' || !hasApiKey) && (<>
            <div className="flex gap-1 items-center flex-wrap">
              <button onClick={() => { if (!hasApiKey) { setShowApiKeyModal(true); return; } setWritingMode('ai'); }} className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${writingMode === 'ai' ? 'bg-accent-purple text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'} ${!hasApiKey && writingMode !== 'ai' ? 'opacity-50' : ''}`}>🤖 {t('writingMode.draftGen')}{!hasApiKey && ' 🔒'}</button>
              <button onClick={() => { setWritingMode('edit'); if (!editDraft && currentSession.messages.length > 0) { const allText = currentSession.messages.filter(m => m.role === 'assistant' && m.content).map(m => m.content.replace(/```json\n[\s\S]*?\n```/g, '').trim()).join('\n\n---\n\n'); setEditDraft(allText); } }} className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${writingMode === 'edit' ? 'bg-accent-purple text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'}`}>✏️ {t('writingMode.manualEdit')}</button>
              <button onClick={() => { if (!hasApiKey) { setShowApiKeyModal(true); return; } setWritingMode('canvas'); if (!canvasContent) setCanvasPass(0); }} className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${writingMode === 'canvas' ? 'bg-accent-green text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'} ${!hasApiKey && writingMode !== 'canvas' ? 'opacity-50' : ''}`}>🎨 {t('writingMode.threeStep')}{!hasApiKey && ' 🔒'}</button>
              <button onClick={() => { if (!hasApiKey) { setShowApiKeyModal(true); return; } setWritingMode('refine'); if (!editDraft && currentSession.messages.length > 0) { const allText = currentSession.messages.filter(m => m.role === 'assistant' && m.content).map(m => m.content.replace(/```json\n[\s\S]*?\n```/g, '').trim()).join('\n\n---\n\n'); setEditDraft(allText); } }} className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${writingMode === 'refine' ? 'bg-gradient-to-r from-accent-purple to-blue-600 text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'} ${!hasApiKey && writingMode !== 'refine' ? 'opacity-50' : ''}`}>⚡ {t('writingMode.auto30')}{!hasApiKey && ' 🔒'}</button>
              <button onClick={() => { if (!hasApiKey) { setShowApiKeyModal(true); return; } setWritingMode('advanced'); }} className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${writingMode === 'advanced' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'} ${!hasApiKey && writingMode !== 'advanced' ? 'opacity-50' : ''}`}>🎯 {t('writingMode.advanced')}{!hasApiKey && ' 🔒'}</button>
              {writingMode === 'edit' && (<>
                <button onClick={handleApplyEdit} disabled={!editDraft.trim()} className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider hover:opacity-80 transition-opacity disabled:opacity-30 shrink-0">📋 {t('writingMode.applyToManuscript')}</button>
                <span className="text-[9px] text-text-tertiary ml-auto">{editDraft.length}{language === 'KO' ? '자' : ' chars'}</span>
              </>)}
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase tracking-wider shrink-0">💡 {t('writingMode.directive')}</span>
              <input value={promptDirective} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPromptDirective(e.target.value)} placeholder={t('writingMode.directivePlaceholder')} className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-[10px] outline-none focus:border-accent-purple transition-colors font-[family-name:var(--font-mono)]" />
            </div>
            </>)}

            {writingMode === 'ai' && (
              <>
                <EngineStatusBar language={language} config={currentSession.config} report={lastReport} isGenerating={isGenerating} />
                {currentSession.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <Sparkles className="w-14 h-14 text-accent-purple/20 mx-auto" />
                    <p className="text-text-tertiary text-base font-medium">{t('engine.startPrompt')}</p>
                    <div className="flex flex-wrap gap-2 justify-center pt-2 max-w-2xl">
                      {(tObj.presets as string[]).map((preset: string, i: number) => (
                        <button key={i} onClick={() => handleSend(preset)} className="px-3 py-1.5 bg-bg-secondary/80 border border-border rounded-full text-[10px] text-text-tertiary hover:text-accent-purple transition-all">{preset}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  (searchQuery ? filteredMessages : currentSession.messages).map(msg => (
                    <div key={msg.id}>
                      <ChatMessage message={msg} language={language} onRegenerate={msg.role === 'assistant' ? handleRegenerate : undefined} />
                      {msg.role === 'assistant' && msg.versions && msg.versions.length > 1 && (
                        <div className="ml-11 md:ml-12"><VersionDiff versions={msg.versions} currentIndex={msg.currentVersionIndex ?? msg.versions.length - 1} language={language} onSwitch={(idx) => handleVersionSwitch(msg.id, idx)} /></div>
                      )}
                      {msg.role === 'assistant' && msg.content && (
                        <div className="ml-11 md:ml-12"><TypoPanel text={msg.content} language={language} onApplyFix={(idx, orig, sug) => handleTypoFix(msg.id, idx, orig, sug)} /></div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} className="h-32" />
              </>
            )}

            {writingMode === 'edit' && (
              <div className="space-y-4">
                {!editDraft.trim() ? (
                  <div className="text-center py-16 space-y-4">
                    <PenTool className="w-8 h-8 text-text-tertiary mx-auto opacity-50" />
                    <textarea value={editDraft} onChange={e => setEditDraft(e.target.value)} placeholder={t('writingMode.typeManuscript')} className="w-full min-h-[300px] bg-bg-primary border border-border rounded-xl p-4 text-sm text-left outline-none focus:border-accent-purple transition-colors font-[family-name:var(--font-mono)] resize-y" />
                  </div>
                ) : (
                  <InlineRewriter content={editDraft} language={language} context={currentSession.config.genre ? `${currentSession.config.genre} | ${currentSession.config.title || ''}` : undefined} onApply={(newContent: string) => setEditDraft(newContent)} />
                )}
              </div>
            )}

            {writingMode === 'refine' && editDraft && (
              <AutoRefiner content={editDraft} language={language} context={currentSession.config.genre ? `${currentSession.config.genre} | ${currentSession.config.title || ''} | EP.${currentSession.config.episode}` : undefined} onApply={(newContent) => { setEditDraft(newContent); const editMsg: Message = { id: `refine-${Date.now()}`, role: 'assistant', content: newContent, timestamp: Date.now() }; updateCurrentSession({ messages: [...currentSession.messages, { id: `u-refine-${Date.now()}`, role: 'user', content: t('writingMode.autoRefineComplete'), timestamp: Date.now() }, editMsg] }); setWritingMode('ai'); }} />
            )}

            {writingMode === 'canvas' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${canvasPass >= 1 ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-bg-secondary text-text-tertiary'}`}>🦴 {t('canvas.skeleton')}</div>
                  <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${canvasPass >= 2 ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'bg-bg-secondary text-text-tertiary'}`}>💓 {t('canvas.emotion')}</div>
                  <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${canvasPass >= 3 ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'bg-bg-secondary text-text-tertiary'}`}>👁 {t('canvas.sensory')}</div>
                </div>
                <textarea value={canvasContent} onChange={e => setCanvasContent(e.target.value)} className="w-full min-h-[50vh] bg-bg-primary border border-border rounded-xl p-6 text-sm leading-[2] font-serif outline-none focus:border-accent-purple transition-colors resize-y" />
              </div>
            )}
            
            {writingMode === 'advanced' && (
              <div className="space-y-4">
                <AdvancedWritingPanel language={language} config={currentSession.config} settings={advancedSettings} onSettingsChange={setAdvancedSettings} />
              </div>
            )}
          </div>
        </div>

        {/* Dashboards & Panels */}
        {showDashboard && writingMode === 'ai' && (
          <EngineDashboard config={currentSession.config} report={lastReport} isGenerating={isGenerating} language={language} />
        )}

        {writingMode === 'ai' && !showDashboard && (
          <aside className={`hidden lg:flex shrink-0 flex-col border-l border-border bg-bg-primary transition-all duration-300 ${rightPanelOpen ? 'w-80' : 'w-10'}`}>
            <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className="w-full py-2 text-[10px] text-text-tertiary hover:text-text-primary border-b border-border">{rightPanelOpen ? '▶' : '◀'}</button>
            {rightPanelOpen && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <DirectorPanel report={directorReport} language={language} />
                <details className="group" open>
                  <summary className="text-xs font-bold text-text-tertiary cursor-pointer hover:text-text-secondary">👤 {t('panel.chars')} ({currentSession.config.characters.length})</summary>
                  <div className="mt-2 space-y-1.5">
                    {currentSession.config.characters.map(c => <div key={c.id} className="text-[10px] text-text-secondary font-bold break-words">{c.name} ({c.role})</div>)}
                  </div>
                </details>
                <details className="group">
                  <summary className="text-xs font-bold text-text-tertiary cursor-pointer hover:text-text-secondary">📋 {t('panel.episodeScenes')}</summary>
                  <div className="mt-2 pl-2">
                    <EpisodeScenePanel
                      lang={language}
                      currentEpisode={currentSession.config.episode}
                      episodeSceneSheets={currentSession.config.episodeSceneSheets ?? []}
                      onSave={(sheet) => {
                        const existing = currentSession.config.episodeSceneSheets ?? [];
                        const filtered = existing.filter(s => s.episode !== sheet.episode);
                        setConfig({ ...currentSession.config, episodeSceneSheets: [...filtered, sheet].sort((a, b) => a.episode - b.episode) });
                      }}
                      onUpdate={(sheet) => {
                        const existing = currentSession.config.episodeSceneSheets ?? [];
                        const filtered = existing.filter(s => s.episode !== sheet.episode);
                        setConfig({ ...currentSession.config, episodeSceneSheets: [...filtered, sheet].sort((a, b) => a.episode - b.episode) });
                      }}
                      onDelete={(ep) => {
                        setConfig({ ...currentSession.config, episodeSceneSheets: (currentSession.config.episodeSceneSheets ?? []).filter(s => s.episode !== ep) });
                      }}
                    />
                  </div>
                </details>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Bottom Input Area */}
      {currentSessionId && (
        <div className="px-4 md:px-6 pb-4 md:pb-6 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent pt-8 md:pt-12 shrink-0">
          <div className="max-w-6xl mx-auto relative px-0">
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 md:bottom-auto md:-top-10 md:left-4 md:translate-x-0 flex gap-2 items-center">
              <button onClick={() => { if (!hasApiKey) { setShowApiKeyModal(true); return; } handleSend(t('engine.nextChapterPrompt')); }} className={`px-3 py-1.5 bg-bg-secondary border border-border rounded-full text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-all whitespace-nowrap font-[family-name:var(--font-mono)] ${!hasApiKey ? 'opacity-50' : ''}`}>{t('engine.nextChapter')}</button>
              <button onClick={() => { if (!hasApiKey) { setShowApiKeyModal(true); return; } handleSend(t('engine.plotTwistPrompt')); }} className={`px-3 py-1.5 bg-bg-secondary border border-border rounded-full text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-all whitespace-nowrap font-[family-name:var(--font-mono)] ${!hasApiKey ? 'opacity-50' : ''}`}>{t('engine.plotTwist')}</button>
              {currentSession.config.episode < currentSession.config.totalEpisodes && (
                <button onClick={handleNextEpisode} className="px-3 py-1.5 bg-accent-purple/10 border border-accent-purple/20 rounded-full text-[10px] font-bold text-accent-purple">EP.{currentSession.config.episode} → {currentSession.config.episode + 1}</button>
              )}
            </div>
            <div className="relative bg-bg-secondary border border-border rounded-2xl md:rounded-[2rem] shadow-2xl p-2 pl-4 md:pl-6 flex items-end">
              <textarea
                value={input}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.nativeEvent.isComposing || e.keyCode === 229) return; if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={!hasApiKey ? t('writingMode.apiKeyPlaceholder') : t('writing.inputPlaceholder')}
                className={`flex-1 bg-transparent border-none outline-none py-3 md:py-4 text-sm md:text-[15px] text-text-primary placeholder-text-tertiary resize-none max-h-40 leading-relaxed ${!hasApiKey ? 'cursor-not-allowed opacity-60' : ''}`}
                rows={1}
                disabled={isGenerating || !hasApiKey}
              />
              {isGenerating ? (
                <button onClick={handleCancel} aria-label="생성 중지" className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center bg-accent-red text-white shrink-0"><StopCircle className="w-5 h-5" /></button>
              ) : (
                <button onClick={() => handleSend()} disabled={!input.trim()} aria-label="전송" className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shrink-0 ${input.trim() ? 'bg-accent-purple text-white' : 'bg-bg-tertiary text-text-tertiary'}`}><Send className="w-5 h-5" /></button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WritingTab;
