"use client";

// ============================================================
// WritingTabInline — page.tsx writing 탭 인라인 코드 그대로 추출
// ============================================================

import { showAlert } from '@/lib/show-alert';
import React from 'react';
import dynamic from 'next/dynamic';
import { Sparkles, PenTool } from 'lucide-react';
import type { AppLanguage, AppTab, StoryConfig, ChatSession, Message } from '@/lib/studio-types';
import type { EngineReport } from '@/engine/types';
import type { DirectorReport } from '@/engine/director';
import type { HFCPState } from '@/engine/hfcp';
import type { AdvancedWritingSettings } from '@/components/studio/AdvancedWritingPanel';
import { createT } from '@/lib/i18n';
import { TRANSLATIONS } from '@/lib/studio-translations';
import { INITIAL_CONFIG } from '@/hooks/useProjectManager';

const ContinuityGraph = dynamic(() => import('@/components/studio/ContinuityGraph'), { ssr: false });
const EngineStatusBar = dynamic(() => import('@/components/studio/EngineStatusBar'), { ssr: false });
const ChatMessage = dynamic(() => import('@/components/studio/ChatMessage'), { ssr: false });
const VersionDiff = dynamic(() => import('@/components/studio/VersionDiff'), { ssr: false });
const TypoPanel = dynamic(() => import('@/components/studio/TypoPanel'), { ssr: false });
const InlineRewriter = dynamic(() => import('@/components/studio/InlineRewriter'), { ssr: false });
const AutoRefiner = dynamic(() => import('@/components/studio/AutoRefiner'), { ssr: false });
const AdvancedWritingPanel = dynamic(() => import('@/components/studio/AdvancedWritingPanel'), { ssr: false });
const DirectorPanel = dynamic(() => import('@/components/studio/DirectorPanel'), { ssr: false });
const EpisodeScenePanel = dynamic(() => import('@/components/studio/EpisodeScenePanel'), { ssr: false });
const WritingToolbar = dynamic(() => import('@/components/studio/WritingToolbar').then(m => ({ default: m.WritingToolbar })), { ssr: false });
const EditReferencePanel = dynamic(() => import('@/components/studio/EditReferencePanel'), { ssr: false });

interface Props {
  language: AppLanguage;
  currentSession: ChatSession;
  currentSessionId: string | null;
  updateCurrentSession: (data: Partial<ChatSession>) => void;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  writingMode: 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced';
  setWritingMode: (mode: 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced') => void;
  editDraft: string;
  setEditDraft: (val: string) => void;
  editDraftRef: React.RefObject<HTMLTextAreaElement | null>;
  canvasContent: string;
  setCanvasContent: (val: string) => void;
  canvasPass: number;
  setCanvasPass: (val: number | ((p: number) => number)) => void;
  promptDirective: string;
  setPromptDirective: (val: string) => void;
  isGenerating: boolean;
  lastReport: EngineReport | null;
  handleSend: (customPrompt?: string, inputValue?: string, clearInput?: () => void) => void;
  handleCancel: () => void;
  handleRegenerate: (msgId: string) => void;
  handleVersionSwitch: (msgId: string, idx: number) => void;
  handleTypoFix: (msgId: string, idx: number, orig: string, sug: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  searchQuery: string;
  filteredMessages: Message[];
  hasApiKey: boolean;
  setShowApiKeyModal: (show: boolean) => void;
  setActiveTab: (tab: AppTab) => void;
  advancedSettings: AdvancedWritingSettings;
  setAdvancedSettings: (s: AdvancedWritingSettings) => void;
  advancedOutputMode: string;
  setAdvancedOutputMode: (m: string) => void;
  showDashboard: boolean;
  rightPanelOpen: boolean;
  setRightPanelOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  directorReport: DirectorReport | null;
  hfcpState: HFCPState;
  handleNextEpisode: () => void;
  showAiLock: boolean;
  hostedProviders: Partial<Record<string, boolean>>;
  saveFlash: boolean;
  triggerSave: () => void;
  writingColumnShell: string;
  input: string;
  setInput: (v: string) => void;
}

export default function WritingTabInline(props: Props) {
  const {
    language, currentSession, currentSessionId, updateCurrentSession,
    writingMode, setWritingMode,
    editDraft, setEditDraft, editDraftRef,
    canvasContent, setCanvasContent, canvasPass, setCanvasPass,
    promptDirective, setPromptDirective,
    isGenerating, lastReport,
    handleSend, handleCancel, handleRegenerate, handleVersionSwitch, handleTypoFix,
    messagesEndRef, searchQuery, filteredMessages,
    hasApiKey, setShowApiKeyModal, setActiveTab,
    advancedSettings, setAdvancedSettings,
    advancedOutputMode, setAdvancedOutputMode,
    showDashboard, rightPanelOpen, setRightPanelOpen,
    directorReport, hfcpState, handleNextEpisode,
    showAiLock, hostedProviders,
    saveFlash, triggerSave, writingColumnShell,
    input, setInput,
  } = props;

  const t = createT(language);
  const isKO = language === 'KO';
  const tObj = TRANSLATIONS[language].writingMode;
  const showAiLockBanner = showAiLock;
  const showApiLockBanner = showAiLock;

  const handleApplyEdit = () => {
    if (!editDraft.trim()) return;
    const editMsg: Message = { id: `edit-${Date.now()}`, role: 'assistant', content: editDraft, timestamp: Date.now() };
    updateCurrentSession({
      messages: [...currentSession.messages, { id: `u-edit-${Date.now()}`, role: 'user', content: t('writingMode.inlineEditComplete'), timestamp: Date.now() }, editMsg],
      title: currentSession.messages.length === 0 ? editDraft.substring(0, 15) : currentSession.title,
    });
    if (currentSessionId) localStorage.removeItem(`noa_editdraft_${currentSessionId}`);
    if (!showAiLock) setWritingMode('ai');
    setEditDraft('');
  };

  const searchMatchesEditDraft = !!(searchQuery && editDraft && editDraft.toLowerCase().includes(searchQuery.toLowerCase()));
  const doHandleSend = handleSend;

  return (
                  <div className={`${writingColumnShell} flex flex-col ${currentSession.messages.length === 0 && writingMode === 'ai' ? 'h-full justify-center items-center' : 'py-6 md:py-8 space-y-6 min-h-full'}`}>
                    {/* Continuity Tracker Graph — 맥락 추적 */}
                    {(currentSession.messages.length > 0 || writingMode !== 'ai') && (
                      <ContinuityGraph language={language} config={currentSession.config} />
                    )}

                    {/* Applied Settings Summary — hide when empty */}
                    {(currentSession.messages.length > 0 || writingMode !== 'ai') && (
                    <details className="group border border-border rounded-xl bg-bg-secondary/50 overflow-hidden">
                      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg-secondary transition-colors">
                        <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider text-text-tertiary">
                          {t('applied.appliedSettings')}
                        </span>
                        <span className="text-[11px] text-text-tertiary group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="px-4 pb-4 space-y-3 text-[10px] border-t border-border pt-3">
                        {/* World */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span className="text-text-tertiary font-bold uppercase w-16">{t('applied.genre')}</span>
                          <span className="text-accent-purple font-bold">{currentSession.config.genre}</span>
                          <span className="text-text-tertiary">EP.{currentSession.config.episode}/{currentSession.config.totalEpisodes}</span>
                          {currentSession.config.setting && <span className="text-text-secondary">📍 {currentSession.config.setting}</span>}
                          {currentSession.config.primaryEmotion && <span className="text-text-secondary">💓 {currentSession.config.primaryEmotion}</span>}
                        </div>
                        {/* Characters */}
                        {currentSession.config.characters.length > 0 && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{t('applied.characters')}</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {currentSession.config.characters.map(c => (
                                <span key={c.id} className="px-2 py-0.5 bg-bg-primary border border-border rounded text-[11px]">
                                  <span className="font-bold text-text-primary">{c.name}</span>
                                  <span className="text-text-tertiary ml-1">({c.role})</span>
                                  {c.speechStyle && <span className="text-accent-blue ml-1">🗣️{c.speechStyle}</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Relations */}
                        {currentSession.config.charRelations && currentSession.config.charRelations.length > 0 && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{t('applied.relations')}</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {currentSession.config.charRelations.map((r, i) => {
                                const from = currentSession.config.characters.find(c => c.id === r.from)?.name || '?';
                                const to = currentSession.config.characters.find(c => c.id === r.to)?.name || '?';
                                return (
                                  <span key={i} className="px-2 py-0.5 bg-bg-primary border border-border rounded text-[11px]">
                                    {from} ⇄ {to} <span className="text-accent-purple">[{r.type}]</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {/* Synopsis preview */}
                        {currentSession.config.synopsis && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{t('applied.synopsis')}</span>
                            <p className="text-text-secondary text-[11px] mt-0.5 line-clamp-2 italic">{currentSession.config.synopsis}</p>
                          </div>
                        )}
                        {/* Scene Direction */}
                        {currentSession.config.sceneDirection && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{t('applied.direction')}</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {currentSession.config.sceneDirection.hooks && currentSession.config.sceneDirection.hooks.length > 0 && (
                                <span className="px-2 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[11px] font-bold">
                                  🪝 {t('applied.hook')} {currentSession.config.sceneDirection.hooks.length}
                                </span>
                              )}
                              {currentSession.config.sceneDirection.goguma && currentSession.config.sceneDirection.goguma.length > 0 && (
                                <span className="px-2 py-0.5 bg-accent-amber/10 text-accent-amber rounded text-[11px] font-bold">
                                  🍠 {currentSession.config.sceneDirection.goguma.filter(g => g.type === 'goguma').length} / 🥤 {currentSession.config.sceneDirection.goguma.filter(g => g.type === 'cider').length}
                                </span>
                              )}
                              {currentSession.config.sceneDirection.cliffhanger && (
                                <span className="px-2 py-0.5 bg-accent-red/10 text-accent-red rounded text-[11px] font-bold">
                                  🔚 {currentSession.config.sceneDirection.cliffhanger.cliffType}
                                </span>
                              )}
                              {currentSession.config.sceneDirection.emotionTargets && currentSession.config.sceneDirection.emotionTargets.length > 0 && (
                                <span className="px-2 py-0.5 bg-bg-primary border border-border rounded text-[11px]">
                                  💓 {currentSession.config.sceneDirection.emotionTargets.map(e => e.emotion).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Simulator Ref */}
                        {currentSession.config.simulatorRef && Object.values(currentSession.config.simulatorRef).some(Boolean) && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{t('applied.simulator')}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {currentSession.config.simulatorRef.worldConsistency && <span className="px-1.5 py-0.5 bg-accent-green/10 text-accent-green rounded text-[10px] font-bold">✓ {t('applied.consistency')}</span>}
                              {currentSession.config.simulatorRef.civRelations && <span className="px-1.5 py-0.5 bg-accent-blue/10 text-accent-blue rounded text-[10px] font-bold">✓ {t('applied.relationsMap')}</span>}
                              {currentSession.config.simulatorRef.timeline && <span className="px-1.5 py-0.5 bg-accent-amber/10 text-accent-amber rounded text-[10px] font-bold">✓ {t('applied.timeline')}</span>}
                              {currentSession.config.simulatorRef.territoryMap && <span className="px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[10px] font-bold">✓ {t('applied.map')}</span>}
                              {currentSession.config.simulatorRef.languageSystem && <span className="px-1.5 py-0.5 bg-accent-blue/10 text-accent-blue rounded text-[10px] font-bold">✓ {t('applied.language')}</span>}
                              {currentSession.config.simulatorRef.genreLevel && <span className="px-1.5 py-0.5 bg-accent-red/10 text-accent-red rounded text-[10px] font-bold">✓ {t('applied.genreLv')}</span>}
                            </div>
                          </div>
                        )}
                        {/* Quick nav */}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => setActiveTab('world')} className="px-2 py-1 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-tertiary hover:text-accent-purple transition-colors">
                            {t('applied.editWorld')}
                          </button>
                          <button onClick={() => setActiveTab('characters')} className="px-2 py-1 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-tertiary hover:text-accent-purple transition-colors">
                            {t('applied.editCharacters')}
                          </button>
                          <button onClick={() => setActiveTab('rulebook')} className="px-2 py-1 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-tertiary hover:text-accent-purple transition-colors">
                            {t('applied.editDirection')}
                          </button>
                        </div>
                      </div>
                    </details>
                    )}

                    {/* AI / Edit sub-tabs — API 없을 때는 edit 탭만 표시 */}
                    {(currentSession.messages.length > 0 || writingMode !== 'ai' || showAiLock) && (<>
                    <div className="flex flex-wrap gap-1 items-center">
                      {!showAiLock && (
                        <button onClick={() => setWritingMode('ai')}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                            writingMode === 'ai' ? 'bg-accent-purple text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                          }`}>
                          🤖 {t('writingMode.draftGen')}
                        </button>
                      )}
                      <button onClick={() => {
                        setWritingMode('edit');
                        if (!editDraft && currentSession.messages.length > 0) {
                          const allText = currentSession.messages
                            .filter(m => m.role === 'assistant' && m.content)
                            .map(m => m.content.replace(/```json\n[\s\S]*?\n```/g, '').trim())
                            .join('\n\n---\n\n');
                          setEditDraft(allText);
                        }
                      }}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                          writingMode === 'edit' ? 'bg-accent-purple text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                        }`}>
                        ✏️ {t('writingMode.manualEdit')}
                      </button>
                      {!showAiLock && (<>
                        <button onClick={() => { setWritingMode('canvas'); if (!canvasContent) setCanvasPass(0); }}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                            writingMode === 'canvas' ? 'bg-accent-green text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                          }`}>
                          🎨 {t('writingMode.threeStep')}
                        </button>
                        <button onClick={() => {
                          setWritingMode('refine');
                          if (!editDraft && currentSession.messages.length > 0) {
                            const allText = currentSession.messages
                              .filter(m => m.role === 'assistant' && m.content)
                              .map(m => m.content.replace(/```json\n[\s\S]*?\n```/g, '').trim())
                              .join('\n\n---\n\n');
                            setEditDraft(allText);
                          }
                        }}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                            writingMode === 'refine' ? 'bg-gradient-to-r from-accent-purple to-blue-600 text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                          }`}>
                          ⚡ {t('writingMode.auto30')}
                        </button>
                        <button onClick={() => setWritingMode('advanced')}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                            writingMode === 'advanced' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                          }`}>
                          🎯 {t('writingMode.advanced')}
                        </button>
                      </>)}
                      {writingMode === 'edit' && (
                        <button onClick={() => {
                            if (!editDraft.trim()) return;
                            const editMsg: Message = { id: `edit-${Date.now()}`, role: 'assistant', content: editDraft, timestamp: Date.now() };
                            updateCurrentSession({
                              messages: [...currentSession.messages, { id: `u-edit-${Date.now()}`, role: 'user', content: t('writingMode.inlineEditComplete'), timestamp: Date.now() }, editMsg],
                              title: currentSession.messages.length === 0 ? editDraft.substring(0, 15) : currentSession.title
                            });
                            if (currentSessionId) localStorage.removeItem(`noa_editdraft_${currentSessionId}`);
                            if (!showAiLock) setWritingMode('ai');
                            setEditDraft('');
                          }}
                          disabled={!editDraft.trim()}
                          className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider hover:opacity-80 transition-opacity disabled:opacity-30 shrink-0">
                          📋 {t('writingMode.applyToManuscript')}
                        </button>
                      )}
                      <span className="text-[11px] text-text-tertiary font-[family-name:var(--font-mono)] ml-auto">
                        {writingMode === 'edit' ? `${editDraft.length.toLocaleString()}${t('writingMode.chars')}` : ''}
                      </span>
                    </div>

                    {/* Prompt Directive — AI 있을 때만 표시 */}
                    {!showAiLock && (
                    <div className="flex gap-2 items-center">
                      <span className="text-[11px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase tracking-wider shrink-0">
                        💡 {t('writingMode.directive')}
                      </span>
                      <input
                        value={promptDirective}
                        onChange={e => setPromptDirective(e.target.value)}
                        placeholder={t('writingMode.directivePlaceholder')}
                        className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-[10px] outline-none focus:border-accent-purple transition-colors font-[family-name:var(--font-mono)] placeholder-text-tertiary"
                      />
                      {promptDirective && (
                        <button onClick={() => setPromptDirective('')} className="text-text-tertiary hover:text-accent-red text-xs">✕</button>
                      )}
                    </div>
                    )}
                    </>)}

                    {writingMode === 'ai' && (
                      <>
                        <EngineStatusBar language={language} config={currentSession.config} report={lastReport} isGenerating={isGenerating} />
                        {currentSession.messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <Sparkles className="w-14 h-14 text-accent-purple/20 mx-auto" />
                            <p className="text-text-tertiary text-base font-medium">{t('engine.startPrompt')}</p>
                            <p className="text-text-tertiary/40 text-xs font-[family-name:var(--font-mono)] max-w-sm">
                              {t('writingMode.describeFirstScene')}
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center pt-2 max-w-2xl">
                              {(tObj.presets as string[]).map((preset: string, i: number) => (
                                <button key={i} onClick={() => handleSend(preset)}
                                  className="px-3 py-1.5 bg-bg-secondary/80 border border-border rounded-full text-[10px] text-text-tertiary hover:text-accent-purple hover:border-accent-purple/50 transition-all font-[family-name:var(--font-mono)]">
                                  {preset}
                                </button>
                              ))}
                            </div>
                            {showAiLock && (
                              <div className="mt-6 pt-4 border-t border-border/30">
                                <p className="text-text-tertiary/60 text-[10px] font-[family-name:var(--font-mono)] mb-2">
                                  {t('writingMode.noApiKeyStart')}
                                </p>
                                <button onClick={() => setWritingMode('edit')}
                                  className="px-4 py-2 bg-bg-secondary border border-accent-purple/30 rounded-xl text-[10px] font-bold text-accent-purple hover:bg-accent-purple/10 transition-all font-[family-name:var(--font-mono)]">
                                  ✏️ {t('writingMode.startManualEdit')}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                          {/* AI 메시지 — 최신 생성 결과만 중앙에 표시, 이전 대화는 우측 패널로 */}
                          {(() => {
                            const msgs = searchQuery ? filteredMessages : currentSession.messages;
                            const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant' && m.content);
                            const lastUser = [...msgs].reverse().find(m => m.role === 'user');
                            const recentMsgs = [lastUser, lastAssistant].filter(Boolean) as typeof msgs;
                            return recentMsgs.map(msg => (
                            <div key={msg.id}>
                              <ChatMessage message={msg} language={language} onRegenerate={msg.role === 'assistant' ? handleRegenerate : undefined} onAutoFix={msg.role === 'assistant' ? async (messageId: string) => {
                                const target = currentSession.messages.find(m => m.id === messageId);
                                if (!target) return;
                                const { applyFormattingRules } = await import('@/engine/validator');
                                const { formatted } = applyFormattingRules(target.content);
                                updateCurrentSession({
                                  messages: currentSession.messages.map(m => m.id === messageId ? { ...m, content: formatted } : m)
                                });
                              } : undefined} />
                              {msg.role === 'assistant' && msg.versions && msg.versions.length > 1 && (
                                <div className="ml-11 md:ml-12">
                                  <VersionDiff
                                    versions={msg.versions}
                                    currentIndex={msg.currentVersionIndex ?? msg.versions.length - 1}
                                    language={language}
                                    onSwitch={(idx) => handleVersionSwitch(msg.id, idx)}
                                  />
                                </div>
                              )}
                              {msg.role === 'assistant' && msg.content && (
                                <div className="ml-11 md:ml-12">
                                  <TypoPanel
                                    text={msg.content}
                                    language={language}
                                    onApplyFix={(idx, orig, sug) => handleTypoFix(msg.id, idx, orig, sug)}
                                  />
                                </div>
                              )}
                            </div>
                          ));
                          })()}
                          {currentSession.messages.length > 2 && (
                            <p className="text-[10px] text-text-tertiary text-center py-2 font-[family-name:var(--font-mono)]">
                              {language === 'KO'
                                ? `이전 대화 ${currentSession.messages.length - 2}건은 우측 패널에서 확인`
                                : `${currentSession.messages.length - 2} older messages in right panel`}
                            </p>
                          )}
                          </>
                        )}
                        <div ref={messagesEndRef} className="h-32" />
                      </>
                    )}

                    {writingMode === 'edit' && (
                      /* ====== INLINE REWRITE MODE + SPLIT VIEW ====== */
                      <div className="flex gap-4 items-stretch">
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* 서식 툴바 + 찾기/바꾸기 + 통계 */}
                        <WritingToolbar
                          textareaRef={editDraftRef}
                          value={editDraft}
                          onChange={setEditDraft}
                          language={language}
                          targetMin={currentSession.config.guardrails.min}
                          targetMax={currentSession.config.guardrails.max}
                        />

                        {!editDraft.trim() ? (
                          /* ====== EMPTY EDIT ONBOARDING ====== */
                          <div className="space-y-3">
                            <div className="text-center py-6 space-y-2">
                              <PenTool className="w-6 h-6 text-text-tertiary mx-auto opacity-40" />
                              <p className="text-sm text-text-secondary font-[family-name:var(--font-mono)]">
                                {t('writingMode.writeManuscript')}
                              </p>
                              <p className="text-[10px] text-text-tertiary max-w-md mx-auto">
                                {t('writingMode.writeManuscriptDesc')}
                              </p>
                            </div>
                            <textarea
                              ref={editDraftRef}
                              value={editDraft}
                              onChange={e => setEditDraft(e.target.value)}
                              placeholder={t('writingMode.typeManuscript')}
                              className="w-full min-h-[50vh] bg-bg-primary border border-border rounded-xl p-5 text-sm text-left outline-none focus:border-accent-purple transition-colors font-serif leading-relaxed resize-y"
                            />
                          </div>
                        ) : (
                          <InlineRewriter
                            content={editDraft}
                            language={language}
                            context={currentSession.config.genre ? `${currentSession.config.genre} | ${currentSession.config.title || ''}` : undefined}
                            onApply={(newContent) => setEditDraft(newContent)}
                            onChange={(newContent) => setEditDraft(newContent)}
                            externalRef={editDraftRef}
                          />
                        )}
                      </div>
                      {/* 우측 참조 패널 (데스크톱만) */}
                      <EditReferencePanel
                        config={currentSession.config}
                        manuscripts={currentSession.config.manuscripts || []}
                        language={language}
                        isOpen={rightPanelOpen}
                        onToggle={() => setRightPanelOpen(p => !p)}
                        sessionId={currentSessionId || undefined}
                      />
                      </div>
                    )}

                    {/* ====== AUTO 30% REFINE MODE ====== */}
                    {writingMode === 'refine' && editDraft && (
                      <div className="space-y-4">
                        <AutoRefiner
                          content={editDraft}
                          language={language}
                          context={currentSession.config.genre ? `${currentSession.config.genre} | ${currentSession.config.title || ''} | EP.${currentSession.config.episode}` : undefined}
                          onApply={(newContent) => {
                            setEditDraft(newContent);
                            const editMsg: Message = { id: `refine-${Date.now()}`, role: 'assistant', content: newContent, timestamp: Date.now() };
                            updateCurrentSession({ messages: [...currentSession.messages, { id: `u-refine-${Date.now()}`, role: 'user', content: t('writingMode.autoRefineComplete'), timestamp: Date.now() }, editMsg] });
                            setWritingMode('ai');
                          }}
                        />
                        <div className="text-[11px] text-zinc-600 font-[family-name:var(--font-mono)]">
                          {t('writingMode.autoRefineGuide')}
                        </div>
                      </div>
                    )}

                    {/* ====== 3-PASS CANVAS MODE ====== */}
                    {writingMode === 'canvas' && (
                      <div className="space-y-4">
                        {/* Pass progress */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] ${canvasPass >= 1 ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-bg-secondary text-text-tertiary border border-border'}`}>
                            🦴 {canvasPass >= 1 ? '✓' : '1'} {t('canvas.skeleton')}
                          </div>
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] ${canvasPass >= 2 ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'bg-bg-secondary text-text-tertiary border border-border'}`}>
                            💓 {canvasPass >= 2 ? '✓' : '2'} {t('canvas.emotion')}
                          </div>
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] ${canvasPass >= 3 ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'bg-bg-secondary text-text-tertiary border border-border'}`}>
                            👁 {canvasPass >= 3 ? '✓' : '3'} {t('canvas.sensory')}
                          </div>
                          <span className="text-[11px] text-text-tertiary font-[family-name:var(--font-mono)]">
                            {canvasContent.length.toLocaleString()}{t('writingMode.chars')}
                          </span>
                          {isGenerating && <span className="text-[11px] text-accent-purple animate-pulse font-[family-name:var(--font-mono)]">{t('canvas.generating')}</span>}
                        </div>

                        {/* Custom prompt input */}
                        <div className="flex gap-2">
                          <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { handleSend(); } }}
                            placeholder={t('canvas.customInstruction')}
                            className="flex-1 bg-bg-primary border border-border rounded-lg px-4 py-2.5 text-xs outline-none focus:border-accent-purple transition-colors font-[family-name:var(--font-mono)] placeholder-text-tertiary"
                            disabled={isGenerating}
                          />
                          <button onClick={() => { if (input.trim()) handleSend(); }} disabled={isGenerating || !input.trim()}
                            className="px-4 py-2.5 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] hover:opacity-80 transition-opacity disabled:opacity-30 shrink-0">
                            {t('canvas.send')}
                          </button>
                        </div>

                        {/* Canvas textarea */}
                        <textarea
                          value={canvasContent}
                          onChange={e => setCanvasContent(e.target.value)}
                          className="w-full min-h-[50vh] bg-bg-primary border border-border rounded-xl p-6 text-sm leading-[2] font-serif text-text-primary outline-none focus:border-accent-purple transition-colors resize-y"
                          placeholder={t('canvas.canvasPlaceholder')}
                        />

                        {/* Pass action buttons */}
                        <div className="flex gap-2 flex-wrap items-center">
                          <button disabled={isGenerating} onClick={() => {
                            setCanvasPass(1);
                            setCanvasContent('');
                            setTimeout(() => {
                              handleSend(isKO
                                ? '[1단계 — 뼈대] 씬시트/연출표를 기반으로 초안을 작성하세요. 사건과 대사만. 감정 묘사 없이 골격만. 약 1,000토큰(2,000자). 중요: JSON 코드블록, 분석 리포트, grade, metrics 등 절대 출력하지 마세요. 순수 소설 본문만 출력하세요.'
                                : '[Pass 1 — Skeleton] Scene sheet based. Events and dialogue only. ~1,000 tokens. Story text only, no JSON.'
                              );
                            }, 100);
                          }}
                            className="px-4 py-2.5 bg-blue-600/10 border border-blue-500/30 rounded-lg text-[10px] font-bold text-blue-400 hover:bg-blue-600/20 transition-all font-[family-name:var(--font-mono)] disabled:opacity-30">
                            🦴 {t('canvas.pass1')}
                          </button>
                          <button disabled={isGenerating || canvasPass < 1} onClick={() => {
                            const lastAI = currentSession?.messages.filter(m => m.role === 'assistant' && m.content).pop();
                            const draft = lastAI?.content.replace(/```json[\s\S]*?```/g, '').trim() || '';
                            if (!draft) { showAlert(t('canvas.noPass1')); return; }
                            setCanvasContent(draft);
                            setCanvasPass(2);
                            setTimeout(() => {
                              handleSend(isKO
                                ? `[2단계 — 감정선] 아래 초안을 전체 다시 써주세요. 인물 내면, 감정 밀도, 문장 리듬 강화. 고구마/사이다 타이밍. 약 1,000토큰 추가. JSON/리포트/grade/metrics 절대 출력 금지. 소설 본문만.\n\n---초안---\n${draft.slice(0, 4000)}`
                                : `[Pass 2 — Emotion] Rewrite fully with inner thoughts, emotional density, pacing. +1,000 tokens. Full output.\n\n---Draft---\n${draft.slice(0, 4000)}`
                              );
                            }, 100);
                          }}
                            className="px-4 py-2.5 bg-pink-600/10 border border-pink-500/30 rounded-lg text-[10px] font-bold text-pink-400 hover:bg-pink-600/20 transition-all font-[family-name:var(--font-mono)] disabled:opacity-30">
                            💓 {t('canvas.pass2')}
                          </button>
                          <button disabled={isGenerating || canvasPass < 2} onClick={() => {
                            const lastAI = currentSession?.messages.filter(m => m.role === 'assistant' && m.content).pop();
                            const ms = lastAI?.content.replace(/```json[\s\S]*?```/g, '').trim() || '';
                            if (!ms) { showAlert(t('canvas.noPass2')); return; }
                            setCanvasContent(ms);
                            setCanvasPass(3);
                            setTimeout(() => {
                              handleSend(isKO
                                ? `[3단계 — 감각 묘사] 아래 원고를 전체 다시 써주세요. 물성/시각/청각/촉각 묘사 추가. 클리프행어 마무리. 약 1,000토큰 추가. JSON/리포트/grade/metrics 절대 출력 금지. 소설 본문만.\n\n---원고---\n${ms.slice(0, 5000)}`
                                : `[Pass 3 — Sensory] Rewrite with physical/visual/auditory descriptions. Cliffhanger. +1,000 tokens. Full output.\n\n---Manuscript---\n${ms.slice(0, 5000)}`
                              );
                            }, 100);
                          }}
                            className="px-4 py-2.5 bg-amber-600/10 border border-amber-500/30 rounded-lg text-[10px] font-bold text-amber-400 hover:bg-amber-600/20 transition-all font-[family-name:var(--font-mono)] disabled:opacity-30">
                            👁 {t('canvas.pass3')}
                          </button>
                          <span className="text-border mx-1">|</span>
                          <button onClick={() => {
                            const lastAI = currentSession?.messages.filter(m => m.role === 'assistant' && m.content).pop();
                            const text = lastAI?.content.replace(/```json[\s\S]*?```/g, '').trim() || '';
                            if (text) { setCanvasContent(text); setWritingMode('canvas'); }
                          }}
                            className="px-3 py-2.5 bg-bg-secondary border border-border rounded-lg text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-all font-[family-name:var(--font-mono)]">
                            📋 {t('canvas.pullToCanvas')}
                          </button>
                          <button disabled={!canvasContent} onClick={() => {
                            const editMsg: Message = { id: `canvas-${Date.now()}`, role: 'assistant', content: canvasContent, timestamp: Date.now() };
                            updateCurrentSession({ messages: [...(currentSession?.messages || []), { id: `u-canvas-${Date.now()}`, role: 'user', content: `[${t('canvas.threePassComplete')} — ${canvasContent.length}${t('writingMode.chars')}]`, timestamp: Date.now() }, editMsg] });
                            setWritingMode('ai');
                          }}
                            className="px-3 py-2.5 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] hover:opacity-80 transition-opacity disabled:opacity-30">
                            💾 {t('canvas.saveManuscript')}
                          </button>
                        </div>
                        <p className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)]">
                          {t('canvas.canvasGuide')}
                        </p>
                      </div>
                    )}

                    {/* ====== ADVANCED WRITING MODE ====== */}
                    {writingMode === 'advanced' && currentSession && (
                      <div className="space-y-4">
                        <AdvancedWritingPanel
                          language={language}
                          config={currentSession.config}
                          settings={advancedSettings}
                          onSettingsChange={setAdvancedSettings}
                        />
                        <div className="flex gap-2 items-center">
                          <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { handleSend(); } }}
                            placeholder={t('writingMode.preciseInstruction')}
                            className="flex-1 bg-bg-primary border border-border rounded-lg px-4 py-2.5 text-xs outline-none focus:border-amber-500 transition-colors font-[family-name:var(--font-mono)] placeholder-text-tertiary"
                            disabled={isGenerating}
                          />
                          <button onClick={() => { if (input.trim()) handleSend(); }} disabled={isGenerating || !input.trim()}
                            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] hover:opacity-80 transition-opacity disabled:opacity-30 shrink-0">
                            {t('writingMode.preciseGenerate')}
                          </button>
                        </div>
                        <p className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)]">
                          {t('writingMode.advancedGuide')}
                        </p>
                      </div>
                    )}
                  </div>
  );
}
