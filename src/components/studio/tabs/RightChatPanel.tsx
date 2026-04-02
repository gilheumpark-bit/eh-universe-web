import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { 
  AppLanguage, Message, ChatSession, ProactiveSuggestion, PipelineStageResult, AppTab 
} from '@/lib/studio-types';
import type { HFCPState as HFCPStateType } from '@/engine/hfcp';
import type { DirectorReport } from '@/engine/director';
import { createT } from '@/lib/i18n';
import { useStudioBackendLabel } from '@/lib/studio-ai-backend-label';
import { Send, StopCircle, RefreshCcw, BookOpen, ChevronDown, User, Clapperboard, Layers, ClipboardList } from 'lucide-react';
import DirectorPanel from '@/components/studio/DirectorPanel';

const DynSkeleton = () => <div className="h-20 w-full animate-pulse bg-white/5 rounded-lg mb-2" />;
const EpisodeScenePanel = dynamic(() => import('@/components/studio/EpisodeScenePanel'), { ssr: false, loading: DynSkeleton });
const SuggestionPanel = dynamic(() => import('@/components/studio/SuggestionPanel'), { ssr: false, loading: DynSkeleton });
const PipelineProgress = dynamic(() => import('@/components/studio/PipelineProgress'), { ssr: false, loading: DynSkeleton });
const ChatMessage = dynamic(() => import('@/components/studio/ChatMessage'), { ssr: false, loading: () => null });

interface RightChatPanelProps {
  language: AppLanguage;
  currentSession: ChatSession;
  messages: Message[];
  loading: boolean;
  onSend: (text: string) => void;
  onAbort: () => void;
  onClear: () => void;
  // External control props extracted from original sidebar
  directorReport: DirectorReport | null;
  hfcpState: HFCPStateType;
  suggestions: ProactiveSuggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<ProactiveSuggestion[]>>;
  pipelineResult: { stages: PipelineStageResult[]; finalStatus: 'completed' | 'failed' | 'partial' | 'running' } | null;
  setConfig: (config: ChatSession['config']) => void;
  setActiveTab: (tab: AppTab) => void;
  hostedProviders?: Partial<Record<string, boolean>>;
}

/**
 * RightChatPanel - 집필 탭 오른쪽 사이드 고도화 AI 어시스턴트 패널
 * 독립 채팅 기능 + 참고 자료(Reference) 가 가 통합된 단일 패널.
 */
export const RightChatPanel: React.FC<RightChatPanelProps> = React.memo(({ 
  language, currentSession, messages, loading, onSend, onAbort, onClear,
  directorReport, hfcpState, suggestions, setSuggestions, pipelineResult,
  setConfig, setActiveTab, hostedProviders = {},
}) => {
  const t = createT(language);
  const isKO = language === 'KO';
  const backendLabel = useStudioBackendLabel(language, hostedProviders);
  const [input, setInput] = useState('');
  const [refOpen, setRefOpen] = useState(true);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages or loading state
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    onSend(input);
    setInput('');
  };

  return (
    <aside className="w-full lg:w-[380px] border-l border-border bg-bg-secondary/30 backdrop-blur-xl flex flex-col h-full animate-in fade-in slide-in-from-right duration-500 overflow-hidden shadow-2xl">
      {/* 1. Header (Sticky) */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-primary/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-accent-purple" />
          <h3
            className="text-[10px] font-black text-text-primary uppercase tracking-widest font-mono leading-tight max-w-[min(100%,240px)]"
            title={backendLabel ? `${t('writingMode.nowWriterBadge')} · ${backendLabel}` : t('writingMode.nowWriterBadge')}
          >
            <span className="block truncate">{t('writingMode.nowWriterBadge')}</span>
            {backendLabel ? (
              <span className="block text-[9px] font-mono text-text-tertiary normal-case tracking-normal truncate mt-0.5">
                · {backendLabel}
              </span>
            ) : null}
          </h3>
        </div>
        <button 
          onClick={onClear}
          className="p-1.5 text-text-tertiary hover:text-accent-red transition-all hover:rotate-12 active:scale-95"
          title={t('ui.clearChat')}
        >
          <RefreshCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/5 pb-6 custom-scrollbar">
        {/* 2. Reference Section (Accordion style) */}
        <div className="border-b border-border bg-bg-primary/20">
          <button 
            onClick={() => setRefOpen(!refOpen)}
            className="w-full px-5 py-3 flex items-center justify-between group hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="w-3.5 h-3.5 text-text-tertiary" />
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-mono">
                {t('panel.reference')}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-text-tertiary transition-transform duration-300 ${refOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {refOpen && (
            <div className="px-5 pb-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
              {/* Characters */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary">
                  <User className="w-3 h-3 text-accent-blue" />
                  {t('panel.chars')}
                </div>
                <div className="pl-4 border-l border-white/5 space-y-1.5">
                  {currentSession.config.characters.length > 0 ? (
                    currentSession.config.characters.map(c => (
                      <div key={c.id} className="text-[10px] text-text-tertiary leading-tight">
                        <span className="font-bold text-text-primary">{c.name}</span>
                        <span className="ml-1 opacity-60">({c.role})</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-text-tertiary italic opacity-40">{t('panel.none')}</p>
                  )}
                </div>
              </div>

              {/* Scene Settings */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary">
                  <Clapperboard className="w-3 h-3 text-accent-amber" />
                  {t('panel.scene')}
                </div>
                <div className="pl-4 border-l border-white/5 space-y-2">
                  {currentSession.config.sceneDirection ? (
                    <div className="space-y-1">
                      {currentSession.config.sceneDirection.hooks?.slice(0, 2).map((h, i) => (
                        <div key={i} className="text-[10px] text-blue-400/80 truncate opacity-90">⚓ {h.desc}</div>
                      ))}
                      {currentSession.config.sceneDirection.cliffhanger && (
                        <div className="text-[10px] text-accent-red/80 truncate opacity-90">🔚 {currentSession.config.sceneDirection.cliffhanger.desc}</div>
                      )}
                    </div>
                  ) : (
                    <button 
                      onClick={() => setActiveTab('rulebook')}
                      className="text-[9px] text-accent-purple px-2 py-1 bg-accent-purple/10 rounded-md hover:bg-accent-purple/20 transition-all font-bold uppercase tracking-tight"
                    >
                      {t('panel.setupDirection')}
                    </button>
                  )}
                </div>
              </div>

              {/* Episode Scene Sheet */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary">
                  <Layers className="w-3 h-3 text-accent-green" />
                  {t('panel.episodeScenes')}
                </div>
                <div className="pl-1">
                  <EpisodeScenePanel
                    lang={language}
                    currentEpisode={currentSession.config.episode}
                    episodeSceneSheets={currentSession.config.episodeSceneSheets ?? []}
                    onSave={(sheet) => {
                      const existing = currentSession.config.episodeSceneSheets ?? [];
                      const filtered = existing.filter(s => s.episode !== sheet.episode);
                      setConfig({ ...currentSession.config, episodeSceneSheets: [...filtered, sheet].sort((a, b) => a.episode - b.episode) });
                    }}
                    onDelete={(ep) => {
                      setConfig({ ...currentSession.config, episodeSceneSheets: (currentSession.config.episodeSceneSheets ?? []).filter(s => s.episode !== ep) });
                    }}
                    onUpdate={(sheet) => {
                      const existing = currentSession.config.episodeSceneSheets ?? [];
                      const filtered = existing.filter(s => s.episode !== sheet.episode);
                      setConfig({ ...currentSession.config, episodeSceneSheets: [...filtered, sheet].sort((a, b) => a.episode - b.episode) });
                    }}
                  />
                </div>
              </div>

              {/* Status HUD (HFCP) */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  hfcpState.verdict === 'engagement' ? 'bg-accent-green shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                  hfcpState.verdict === 'normal_free' ? 'bg-accent-blue shadow-[0_0_8px_rgba(59,130,246,0.5)]' :
                  'bg-accent-red shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                }`} />
                <span className="text-[10px] font-black text-text-secondary font-mono tracking-tighter">
                  {({
                    engagement: t('hfcp.engagement'),
                    normal_free: t('hfcp.normalFree'),
                    normal_analysis: t('hfcp.normalAnalysis'),
                    limited: t('hfcp.limited'),
                    silent: t('hfcp.silent'),
                  } as Record<string, string>)[hfcpState.verdict] || hfcpState.verdict}
                </span>
                <span className="text-[9px] text-text-tertiary ml-auto opacity-50">SCORE: {Math.round(hfcpState.score)}</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Director & Pipeline HUD (Dynamic) */}
        {(directorReport || (pipelineResult && pipelineResult.stages.length > 0)) && (
          <div className="px-5 py-6 border-b border-border bg-accent-purple/5 space-y-4">
            {directorReport && (
              <DirectorPanel report={directorReport} language={language} />
            )}
            {pipelineResult && (
              <PipelineProgress
                stages={pipelineResult.stages}
                finalStatus={pipelineResult.finalStatus}
                language={language}
              />
            )}
          </div>
        )}

        {/* 4. Chat Messages History */}
        <div className="px-5 py-6 space-y-6">
          <div className="flex items-center gap-2 mb-4 px-1">
            <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest font-mono">
              Live Feed
            </span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {messages.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-bg-tertiary/30 border border-white/5 flex items-center justify-center text-lg animate-bounce duration-3000">
                ✨
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-text-primary font-bold">
                  {isKO ? '어시스턴트 대기 중' : 'Assistant Ready'}
                </p>
                <p className="text-[10px] text-text-tertiary italic max-w-[180px] leading-relaxed mx-auto">
                  {isKO ? '생성 중인 소설의 개연성이나 설정을 질문해보세요.' : 'Ask about consistency or settings of your story.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                  <ChatMessage message={msg} language={language} isCompact hostedProviders={hostedProviders} />
                </div>
              ))}
            </div>
          )}

          {/* Suggestions HUD */}
          {suggestions.length > 0 && (
            <div className="pt-4">
              <SuggestionPanel
                suggestions={suggestions}
                onDismiss={(id) => setSuggestions(prev => prev.map(s => s.id === id ? { ...s, dismissed: true, dismissCount: s.dismissCount + 1 } : s))}
                language={language}
              />
            </div>
          )}
          
          <div ref={scrollEndRef} className="h-6" />
        </div>
      </div>

      {/* 5. Footer Input Area (Sticky) */}
      <div className="p-5 bg-bg-primary/60 backdrop-blur-xl border-t border-border shrink-0">
        <div className="relative group bg-bg-secondary/80 border border-border rounded-2xl p-1.5 focus-within:border-accent-purple/40 transition-all shadow-[0_4px_24px_rgba(0,0,0,0.2)] focus-within:shadow-[0_8px_32px_rgba(139,92,246,0.15)]">
          <div className="flex items-end gap-2 px-2 py-1.5">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={loading ? t('engine.thinking') : t('ui.askAnything')}
              className="flex-1 bg-transparent border-none outline-none text-xs text-text-primary placeholder-text-tertiary/60 resize-none max-h-32 leading-relaxed font-sans scrollbar-none py-1"
              rows={1}
              disabled={loading}
            />
            
            {loading ? (
              <button 
                onClick={onAbort}
                className="w-9 h-9 rounded-xl bg-accent-red/90 text-white flex items-center justify-center hover:bg-accent-red transition-colors shrink-0 shadow-lg shadow-accent-red/20"
                title={t('ui.stop')}
              >
                <StopCircle className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button 
                onClick={handleSend}
                disabled={!input.trim()}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                  input.trim() 
                    ? 'bg-accent-purple text-white shadow-lg shadow-accent-purple/20' 
                    : 'bg-bg-tertiary text-text-tertiary opacity-40 cursor-not-allowed'
                }`}
              >
                <Send className={`w-4 h-4 ${input.trim() ? 'animate-in zoom-in duration-300' : ''}`} />
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5 opacity-40">
          <div className="w-1 h-1 rounded-full bg-accent-green animate-pulse" />
          <p className="text-[9px] text-text-tertiary font-mono uppercase tracking-widest font-bold">
            {isKO ? '독립 어시스턴트 프로토콜' : 'Independent Assistant Protocol'}
          </p>
        </div>
      </div>
    </aside>
  );
});
RightChatPanel.displayName = 'RightChatPanel';

