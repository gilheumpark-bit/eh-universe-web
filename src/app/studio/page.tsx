"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, Settings, Send,
  Sparkles, Menu, Globe, UserCircle,
  Zap, Ghost, X, PenTool, History, StopCircle
} from 'lucide-react';
import {
  Message, StoryConfig, Genre,
  AppLanguage, AppTab, PlatformType
} from '@/lib/studio-types';
import { TRANSLATIONS, ENGINE_VERSION } from '@/lib/studio-constants';
import { EngineReport } from '@/engine/types';
import ChatMessage from '@/components/studio/ChatMessage';
import PlanningView from '@/components/studio/PlanningView';
import ResourceView from '@/components/studio/ResourceView';
import SettingsView from '@/components/studio/SettingsView';
// RulebookView removed — available at /rulebook site-wide
import EngineDashboard from '@/components/studio/EngineDashboard';
import EngineStatusBar from '@/components/studio/EngineStatusBar';
import ApiKeyModal from '@/components/studio/ApiKeyModal';
import { generateStoryStream } from '@/services/geminiService';
import WorldSimulator from '@/components/WorldSimulator';
import Link from 'next/link';
import { Map } from 'lucide-react';
// BYOK provider info available via '@/lib/ai-providers'

const STORAGE_KEY_SESSIONS = 'noa_chat_sessions_v2';

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  config: StoryConfig;
  lastUpdate: number;
}

const INITIAL_CONFIG: StoryConfig = {
  genre: Genre.SYSTEM_HUNTER,
  povCharacter: "",
  setting: "",
  primaryEmotion: "",
  episode: 1,
  title: "",
  totalEpisodes: 25,
  guardrails: { min: 3000, max: 5000 },
  characters: [],
  platform: PlatformType.MOBILE,
};

export default function StudioPage() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
    return saved ? JSON.parse(saved) : [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.length > 0 ? parsed[0].id : null;
  });

  const [activeTab, setActiveTab] = useState<AppTab>('world');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [language, setLanguage] = useState<AppLanguage>('KO');
  const [input, setInput] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [lastReport, setLastReport] = useState<EngineReport | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentSession = sessions.find(s => s.id === currentSessionId) || null;
  const t = TRANSLATIONS[language] || TRANSLATIONS['KO'];

  useEffect(() => {
    setIsSidebarOpen(window.innerWidth >= 768);
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeTab === 'writing') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentSession?.messages, isGenerating, activeTab]);

  const createNewSession = () => {
    const sessionTitles: Record<AppLanguage, string> = { KO: "새로운 소설", EN: "New Story", JP: "新しい小説", CN: "新小说" };
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: sessionTitles[language],
      messages: [],
      config: { ...INITIAL_CONFIG },
      lastUpdate: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    setActiveTab('world');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const deleteSession = (sessionIdToDelete: string) => {
    const sessionToDelete = sessions.find(s => s.id === sessionIdToDelete);
    if (!sessionToDelete) return;
    const confirmMsg = ({ KO: `'${sessionToDelete.title}' 아카이브를 삭제하시겠습니까?`, EN: `Delete '${sessionToDelete.title}'?`, JP: `'${sessionToDelete.title}'を削除しますか？`, CN: `删除 '${sessionToDelete.title}'？` })[language];
    if (window.confirm(confirmMsg)) {
      const newSessions = sessions.filter(s => s.id !== sessionIdToDelete);
      setSessions(newSessions);
      if (currentSessionId === sessionIdToDelete) {
        setCurrentSessionId(newSessions.length > 0 ? newSessions[0].id : null);
        if (newSessions.length === 0) setActiveTab('world');
      }
    }
  };

  const clearAllSessions = () => {
    const confirmMsg = ({ KO: "모든 세션을 삭제하시겠습니까?", EN: "Delete all sessions?", JP: "すべてのセッションを削除しますか？", CN: "删除所有会话？" })[language];
    if (window.confirm(confirmMsg)) {
      setSessions([]);
      setCurrentSessionId(null);
      localStorage.removeItem(STORAGE_KEY_SESSIONS);
      setActiveTab('world');
    }
  };

  const updateCurrentSession = (updates: Partial<ChatSession>) => {
    if (!currentSessionId) return;
    setSessions(prev => prev.map(s =>
      s.id === currentSessionId ? { ...s, ...updates, lastUpdate: Date.now() } : s
    ));
  };

  const setConfig = (newConfig: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => {
    if (typeof newConfig === 'function') {
      updateCurrentSession({ config: newConfig(currentSession?.config || INITIAL_CONFIG) });
    } else {
      updateCurrentSession({ config: newConfig });
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  };

  const handleSend = async (customPrompt?: string) => {
    const text = customPrompt || input;
    if (!text.trim() || isGenerating || !currentSessionId) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text, timestamp: Date.now() };
    const aiMsgId = `a-${Date.now()}`;
    const initialAiMsg: Message = { id: aiMsgId, role: 'assistant', content: '', timestamp: Date.now() };
    const existingMessages = currentSession?.messages || [];
    const updatedMessages = [...existingMessages, userMsg, initialAiMsg];

    updateCurrentSession({
      messages: updatedMessages,
      title: existingMessages.length === 0 ? text.substring(0, 15) : currentSession?.title
    });
    setInput('');
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let fullContent = '';
      const result = await generateStoryStream(
        currentSession!.config, text,
        (chunk) => {
          fullContent += chunk;
          setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
              const msgs = s.messages.map(m => m.id === aiMsgId ? { ...m, content: fullContent } : m);
              return { ...s, messages: msgs };
            }
            return s;
          }));
        },
        { language, signal: controller.signal, platform: currentSession!.config.platform, history: existingMessages }
      );

      setLastReport(result.report);
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          const msgs = s.messages.map(m =>
            m.id === aiMsgId
              ? { ...m, content: fullContent, meta: { engineReport: result.report, grade: result.report.grade, eosScore: result.report.eosScore, metrics: result.report.metrics } }
              : m
          );
          return { ...s, messages: msgs };
        }
        return s;
      }));
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') console.error(error);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerate = async (assistantMsgId: string) => {
    if (isGenerating || !currentSessionId || !currentSession) return;
    const msgIndex = currentSession.messages.findIndex(m => m.id === assistantMsgId);
    if (msgIndex <= 0) return;
    const userMsg = currentSession.messages[msgIndex - 1];
    if (userMsg.role !== 'user') return;
    const historyMessages = currentSession.messages.slice(0, msgIndex - 1);

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const msgs = s.messages.map(m => m.id === assistantMsgId ? { ...m, content: '', meta: undefined } : m);
        return { ...s, messages: msgs };
      }
      return s;
    }));
    setIsGenerating(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let fullContent = '';
      const result = await generateStoryStream(
        currentSession.config, userMsg.content,
        (chunk) => {
          fullContent += chunk;
          setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
              const msgs = s.messages.map(m => m.id === assistantMsgId ? { ...m, content: fullContent } : m);
              return { ...s, messages: msgs };
            }
            return s;
          }));
        },
        { language, signal: controller.signal, platform: currentSession.config.platform, history: historyMessages }
      );

      setLastReport(result.report);
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          const msgs = s.messages.map(m =>
            m.id === assistantMsgId
              ? { ...m, content: fullContent, meta: { engineReport: result.report, grade: result.report.grade, eosScore: result.report.eosScore, metrics: result.report.metrics } }
              : m
          );
          return { ...s, messages: msgs };
        }
        return s;
      }));
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') console.error(error);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleNextEpisode = () => {
    if (!currentSession) return;
    const nextEp = Math.min(currentSession.config.episode + 1, currentSession.config.totalEpisodes);
    setConfig({ ...currentSession.config, episode: nextEp });
  };

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden" style={{ fontFamily: 'var(--font-sans)' }}>
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />}

      {/* Sidebar */}
      <aside className={`fixed md:relative inset-y-0 left-0 bg-bg-primary border-r border-border transition-transform md:transition-all duration-300 flex flex-col z-50 overflow-hidden ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-0'}`}>
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 mb-6 hover:opacity-80 transition-opacity">
            <Zap className="w-6 h-6 text-accent-purple" />
            <div>
              <h1 className="text-lg font-black italic tracking-tighter font-[family-name:var(--font-mono)]">NOA STUDIO</h1>
              <span className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] tracking-widest uppercase">← EH UNIVERSE</span>
            </div>
          </Link>
          <button onClick={createNewSession} className="w-full flex items-center justify-center gap-2 py-3 bg-bg-secondary rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-bg-tertiary transition-all mb-6 border border-border font-[family-name:var(--font-mono)]">
            <Plus className="w-4 h-4" /> {t.sidebar.newProject}
          </button>

          <nav className="space-y-1">
            {([
              { tab: 'world' as AppTab, icon: Globe, label: t.sidebar.worldBible },
              { tab: 'characters' as AppTab, icon: UserCircle, label: t.sidebar.characterStudio },
              { tab: 'writing' as AppTab, icon: PenTool, label: t.sidebar.writingMode },
              { tab: 'critique' as AppTab, icon: Map, label: language === 'KO' ? '세계관 시뮬레이터' : 'World Simulator' },
              { tab: 'history' as AppTab, icon: History, label: t.sidebar.archives },
            ]).map(({ tab, icon: Icon, label }) => (
              <button key={tab} onClick={() => handleTabChange(tab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all font-[family-name:var(--font-mono)] ${activeTab === tab ? 'bg-accent-purple/20 text-accent-purple shadow-lg' : 'text-text-tertiary hover:bg-bg-secondary'}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-border">
          <div className="flex gap-4 mb-4">
            {(['KO', 'EN', 'JP', 'CN'] as AppLanguage[]).map(l => (
              <button key={l} onClick={() => setLanguage(l)} className={`text-[10px] font-black font-[family-name:var(--font-mono)] ${language === l ? 'text-accent-purple' : 'text-text-tertiary'}`}>{l}</button>
            ))}
          </div>
          <button onClick={() => handleTabChange('settings')} className={`flex items-center gap-2 text-xs font-bold transition-colors font-[family-name:var(--font-mono)] ${activeTab === 'settings' ? 'text-accent-purple' : 'text-text-tertiary hover:text-text-primary'}`}>
            <Settings className="w-4 h-4" /> {t.sidebar.settings}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-bg-primary overflow-hidden">
        <header className="h-14 flex items-center justify-between px-4 md:px-8 border-b border-border bg-bg-primary/90 backdrop-blur-xl z-30 shrink-0">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-bg-secondary rounded-lg transition-colors">
              <Menu className="w-5 h-5 text-text-tertiary" />
            </button>
            <div className="text-sm font-black tracking-tighter uppercase flex items-center gap-2 min-w-0 font-[family-name:var(--font-mono)]">
              <span className="text-text-tertiary hidden sm:inline">{t.sidebar.activeProject}:</span>
              <span className="text-text-primary truncate">{currentSession?.title || t.engine.noStory}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {currentSession && (
              <div className="flex gap-2 md:gap-4">
                <div className="px-3 py-1 bg-bg-secondary rounded-full text-[10px] font-bold text-text-tertiary border border-border hidden sm:block font-[family-name:var(--font-mono)]">
                  {currentSession.config.genre}
                </div>
                <button
                  onClick={() => setShowDashboard(!showDashboard)}
                  className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all font-[family-name:var(--font-mono)] ${
                    showDashboard
                      ? 'bg-accent-purple/20 text-accent-purple border-accent-purple/30'
                      : 'bg-accent-purple/10 text-accent-purple border-accent-purple/20 hover:bg-accent-purple/20'
                  }`}
                >
                  ANS {ENGINE_VERSION}
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {!currentSessionId && !['settings', 'history'].includes(activeTab) ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <Ghost className="w-12 h-12 md:w-16 md:h-16 text-border mb-6" />
                <h2 className="text-xl md:text-2xl font-black mb-2 tracking-tighter uppercase font-[family-name:var(--font-mono)]">{t.engine.noActiveNarrative}</h2>
                <p className="text-text-tertiary text-sm mb-8">{t.engine.startPrompt}</p>
                <button onClick={createNewSession} className="px-8 py-3 md:px-10 md:py-4 bg-accent-purple text-white rounded-2xl font-black text-xs uppercase tracking-widest font-[family-name:var(--font-mono)]">{t.sidebar.newProject}</button>
              </div>
            ) : (
              <>
                {activeTab === 'world' && currentSession && (
                  <PlanningView language={language} config={currentSession.config} setConfig={setConfig} onStart={() => setActiveTab('writing')} />
                )}
                {activeTab === 'characters' && currentSession && (
                  <ResourceView language={language} config={currentSession.config} setConfig={setConfig} />
                )}
                {activeTab === 'settings' && (
                  <SettingsView language={language} onClearAll={clearAllSessions} onManageApiKey={() => setShowApiKeyModal(true)} />
                )}
                {activeTab === 'critique' && (
                  <div className="max-w-5xl mx-auto py-8 px-4 md:py-12 md:px-6">
                    <WorldSimulator lang={language === 'EN' ? 'en' : 'ko'} />
                  </div>
                )}
                {activeTab === 'writing' && currentSession && (
                  <div className="max-w-4xl mx-auto py-8 px-4 md:py-12 md:px-6 space-y-12">
                    <EngineStatusBar language={language} config={currentSession.config} report={lastReport} isGenerating={isGenerating} />
                    {currentSession.messages.length === 0 ? (
                      <div className="py-20 text-center space-y-4">
                        <Sparkles className="w-10 h-10 text-accent-purple/30 mx-auto" />
                        <p className="text-text-tertiary text-sm font-medium">{t.engine.startPrompt}</p>
                      </div>
                    ) : (
                      currentSession.messages.map(msg => (
                        <ChatMessage key={msg.id} message={msg} language={language} onRegenerate={msg.role === 'assistant' ? handleRegenerate : undefined} />
                      ))
                    )}
                    <div ref={messagesEndRef} className="h-32" />
                  </div>
                )}
                {activeTab === 'history' && (
                  <div className="p-4 md:p-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {sessions.length === 0 ? (
                      <div className="col-span-full py-20 text-center text-text-tertiary font-bold uppercase tracking-widest font-[family-name:var(--font-mono)]">{t.engine.noArchive}</div>
                    ) : (
                      sessions.map(s => (
                        <div
                          key={s.id}
                          onClick={() => { setCurrentSessionId(s.id); setActiveTab('writing'); }}
                          className={`relative group p-6 bg-bg-secondary border border-border rounded-2xl cursor-pointer hover:border-accent-purple transition-all ${currentSessionId === s.id ? 'border-accent-purple ring-1 ring-accent-purple' : ''}`}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                            className="absolute top-4 right-4 p-2 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:bg-accent-red/20 hover:text-accent-red transition-all opacity-0 group-hover:opacity-100 z-10"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <h4 className="font-black text-sm mb-2 pr-8 truncate">{s.title}</h4>
                          <div className="flex gap-2">
                            <span className="text-[9px] font-bold text-text-tertiary uppercase font-[family-name:var(--font-mono)]">{s.config.genre}</span>
                            <span className="text-[9px] font-bold text-text-tertiary uppercase font-[family-name:var(--font-mono)]">EP.{s.config.episode}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {showDashboard && activeTab === 'writing' && currentSession && (
            <EngineDashboard config={currentSession.config} report={lastReport} isGenerating={isGenerating} language={language} />
          )}
        </div>

        {/* Writing Input */}
        {activeTab === 'writing' && currentSessionId && (
          <div className="p-4 md:p-6 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent pt-8 md:pt-12 shrink-0">
            <div className="max-w-4xl mx-auto relative">
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 md:bottom-auto md:-top-10 md:left-4 md:translate-x-0 flex gap-2">
                <button onClick={() => handleSend(t.engine.nextChapterPrompt)} className="px-3 py-1.5 bg-bg-secondary border border-border rounded-full text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-all whitespace-nowrap font-[family-name:var(--font-mono)]">
                  {t.engine.nextChapter}
                </button>
                <button onClick={() => handleSend(t.engine.plotTwistPrompt)} className="px-3 py-1.5 bg-bg-secondary border border-border rounded-full text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-all whitespace-nowrap font-[family-name:var(--font-mono)]">
                  {t.engine.plotTwist}
                </button>
                {currentSession && currentSession.config.episode < currentSession.config.totalEpisodes && (
                  <button onClick={handleNextEpisode} className="px-3 py-1.5 bg-accent-purple/10 border border-accent-purple/20 rounded-full text-[10px] font-bold text-accent-purple hover:bg-accent-purple/20 transition-all whitespace-nowrap font-[family-name:var(--font-mono)]">
                    EP.{currentSession.config.episode} → {currentSession.config.episode + 1}
                  </button>
                )}
              </div>
              <div className="relative bg-bg-secondary border border-border rounded-2xl md:rounded-[2rem] shadow-2xl focus-within:border-accent-purple/30 transition-all p-2 pl-4 md:pl-6 flex items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={t.writing.inputPlaceholder}
                  className="flex-1 bg-transparent border-none outline-none py-3 md:py-4 text-sm md:text-[15px] text-text-primary placeholder-text-tertiary resize-none max-h-40 leading-relaxed"
                  rows={1}
                  disabled={isGenerating}
                />
                {isGenerating ? (
                  <button onClick={handleCancel} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center bg-accent-red text-white transition-all shrink-0 hover:opacity-80">
                    <StopCircle className="w-5 h-5" />
                  </button>
                ) : (
                  <button onClick={() => handleSend()} disabled={!input.trim()} className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shrink-0 ${input.trim() ? 'bg-accent-purple text-white' : 'bg-bg-tertiary text-text-tertiary'}`}>
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {showApiKeyModal && (
        <ApiKeyModal language={language} onClose={() => setShowApiKeyModal(false)} onSave={() => {}} />
      )}
    </div>
  );
}
