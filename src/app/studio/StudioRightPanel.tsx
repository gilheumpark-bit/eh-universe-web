"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ChatSession, AppTab, AppLanguage, ProactiveSuggestion, PipelineStageResult } from '@/lib/studio-types';
import { logger } from '@/lib/logger';
import type { HFCPState as HFCPStateType } from '@/engine/hfcp';

import type { DirectorReport } from '@/engine/director';
import { createT, getStudioTranslations, L4, normalizeAppLanguage } from '@/lib/i18n';
import { useStudioUI } from '@/contexts/StudioContext';
import { upsertSheet, removeSheet } from '@/lib/scene-sheet/helpers';
import { useStudioBackendLabel } from '@/lib/studio-ai-backend-label';
import { INITIAL_CONFIG } from '@/hooks/useProjectManager';
import LoadingSkeleton from '@/components/studio/LoadingSkeleton';

const DynSkeleton = () => <LoadingSkeleton height={120} />;
const TabAssistant = dynamic(() => import('@/components/studio/TabAssistant'), { ssr: false, loading: DynSkeleton });
const EpisodeScenePanel = dynamic(() => import('@/components/studio/EpisodeScenePanel'), { ssr: false, loading: DynSkeleton });
const SuggestionPanel = dynamic(() => import('@/components/studio/SuggestionPanel'), { ssr: false, loading: DynSkeleton });
const PipelineProgress = dynamic(() => import('@/components/studio/PipelineProgress'), { ssr: false, loading: DynSkeleton });
const OutlinePanel = dynamic(() => import('@/components/studio/OutlinePanel'), { ssr: false, loading: DynSkeleton });
// [E 번들] DirectorPanel — 조건부 렌더(감독 리포트 존재 시만), eager 불필요
const DirectorPanel = dynamic(() => import('@/components/studio/DirectorPanel'), { ssr: false, loading: DynSkeleton });

// IDENTITY_SEAL: PART-1 | role=imports | inputs=none | outputs=types+components

// ============================================================
// PART 2 — Props Interfaces
// ============================================================
type HostedAiAvailability = Partial<Record<string, boolean>>;

export interface StudioSaveSlotPanelProps {
  currentSession: ChatSession;
  activeTab: AppTab;
  language: AppLanguage;
  rightPanelOpen: boolean;
  setRightPanelOpen: (fn: (prev: boolean) => boolean) => void;
  writingMode: string;
  showDashboard: boolean;
  updateCurrentSession: (patch: Partial<ChatSession>) => void;
  triggerSave: () => void;
  setSaveSlotModalOpen: (open: boolean) => void;
  setSaveSlotName: (name: string) => void;
}

export interface StudioWritingAssistantPanelProps {
  currentSession: ChatSession;
  language: AppLanguage;
  rightPanelOpen: boolean;
  setRightPanelOpen: (fn: (prev: boolean) => boolean) => void;
  setActiveTab: (tab: AppTab) => void;
  setConfig: (config: ChatSession['config']) => void;
  writingMode: string;
  showDashboard: boolean;
  directorReport: DirectorReport | null;
  hfcpState: HFCPStateType;
  suggestions: ProactiveSuggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<ProactiveSuggestion[]>>;
  pipelineResult: { stages: PipelineStageResult[]; finalStatus: 'completed' | 'failed' | 'partial' | 'running' } | null;
  hostedProviders: HostedAiAvailability;
}

// IDENTITY_SEAL: PART-2 | role=type-definitions | inputs=none | outputs=prop-interfaces

// ============================================================
// PART 3 — Save Slot Panel (right panel for non-writing tabs)
// ============================================================
export function StudioSaveSlotPanel({
  currentSession, activeTab, language, rightPanelOpen, setRightPanelOpen,
  writingMode, showDashboard, updateCurrentSession, triggerSave,
  setSaveSlotModalOpen, setSaveSlotName,
}: StudioSaveSlotPanelProps) {
  const t = createT(language);
  const { showConfirm, closeConfirm } = useStudioUI();

  // Visibility: hide for certain tabs/modes
  const shouldHide =
    activeTab === 'history' || activeTab === 'settings' || activeTab === 'manuscript' ||
    (activeTab === 'writing' && writingMode === 'ai' && !showDashboard);
  if (shouldHide) return null;

  return (
    <aside className={`hidden lg:flex shrink-0 flex-col border-l border-border bg-bg-primary transition-[transform,opacity,background-color,border-color,color] duration-300 ${rightPanelOpen ? 'w-64' : 'w-8'}`}>
      <button onClick={() => setRightPanelOpen(p => !p)} className="w-full py-2 text-[10px] text-text-tertiary hover:text-text-primary transition-colors border-b border-border font-mono">
        {rightPanelOpen ? '\u25B6' : '\u25C0'}
      </button>
      {!rightPanelOpen ? null : (
      <div className="p-4 space-y-3">
        <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest font-mono">
          {'\uD83D\uDCC2'} {t('saveSlot.savedVersions')}
        </div>

        {/* Save current */}
        <button onClick={() => {
          setSaveSlotName('');
          setSaveSlotModalOpen(true);
        }}
          className="w-full py-2 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider hover:opacity-80 transition-opacity active:scale-95">
          {'\uD83D\uDCBE'} {t('saveSlot.saveCurrent')}
        </button>

        {/* Saved slots list */}
        <div className="space-y-1.5">
          {(currentSession.config.savedSlots || [])
            .filter(s => s.tab === activeTab || s.tab === 'all')
            .sort((a, b) => b.timestamp - a.timestamp)
            .map(slot => (
              <div key={slot.id} className="flex items-center gap-2 px-2 py-2 bg-bg-secondary/50 border border-border rounded-lg group hover:border-accent-purple/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-text-primary truncate">{slot.name}</div>
                  <div className="text-[10px] text-text-tertiary">{new Date(slot.timestamp).toLocaleString()}</div>
                </div>
                <button onClick={() => {
                  showConfirm({
                    title: L4(language, { ko: '슬롯 불러오기', en: 'Load Slot', ja: 'スロット読込', zh: '加载存档' }),
                    message: `"${slot.name}"${t('confirm.loadSlotMsg')}`,
                    variant: 'warning',
                    confirmLabel: L4(language, { ko: '불러오기', en: 'Load', ja: '読込', zh: '加载' }),
                    cancelLabel: L4(language, { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消' }),
                    onConfirm: () => {
                      updateCurrentSession({ config: { ...INITIAL_CONFIG, ...slot.data, savedSlots: currentSession.config.savedSlots, manuscripts: currentSession.config.manuscripts } });
                      triggerSave();
                      closeConfirm();
                    },
                  });
                }}
                  className="px-2 py-1 bg-accent-purple/10 text-accent-purple rounded text-[10px] font-bold hover:bg-accent-purple/20 transition-colors opacity-0 group-hover:opacity-100">
                  {t('saveSlot.load')}
                </button>
                <button onClick={() => {
                  updateCurrentSession({
                    config: {
                      ...currentSession.config,
                      savedSlots: (currentSession.config.savedSlots || []).filter(s => s.id !== slot.id),
                    },
                  });
                }}
                  className="text-text-tertiary hover:text-accent-red text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                  {'\u2715'}
                </button>
              </div>
            ))}
          {(currentSession.config.savedSlots || []).filter(s => s.tab === activeTab || s.tab === 'all').length === 0 && (
            <p className="text-[11px] text-text-tertiary italic text-center py-4">
              {t('saveSlot.noSavedVersions')}
            </p>
          )}
        </div>

        {/* All slots across tabs */}
        {(currentSession.config.savedSlots || []).filter(s => s.tab !== activeTab).length > 0 && (
          <details className="group">
            <summary className="text-[11px] text-text-tertiary cursor-pointer hover:text-text-secondary">
              {t('saveSlot.otherTabs')} ({(currentSession.config.savedSlots || []).filter(s => s.tab !== activeTab).length})
            </summary>
            <div className="mt-1 space-y-1">
              {(currentSession.config.savedSlots || []).filter(s => s.tab !== activeTab).map(slot => (
                <div key={slot.id} className="text-[10px] text-text-tertiary px-2 py-1 bg-bg-primary rounded">
                  [{slot.tab}] {slot.name}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
      )}
    </aside>
  );
}

// IDENTITY_SEAL: PART-3 | role=save-slot-panel | inputs=session,config | outputs=JSX

// ============================================================
// PART 4 — Writing Assistant Panel (right panel for writing/ai mode)
// ============================================================
export function StudioWritingAssistantPanel({
  currentSession, language, rightPanelOpen, setRightPanelOpen,
  setActiveTab, setConfig,
  writingMode: _writingMode, showDashboard: _showDashboard,
  directorReport, hfcpState,
  suggestions, setSuggestions,
  pipelineResult, hostedProviders,
}: StudioWritingAssistantPanelProps) {
  const appLanguage = normalizeAppLanguage(language);
  const t = createT(appLanguage);
  const tObj = getStudioTranslations(appLanguage);
  const backendLabel = useStudioBackendLabel(appLanguage, hostedProviders);
  const [showOutline, setShowOutline] = useState(false);

  // Resolve current episode sheet (matches currentSession.config.episode)
  const currentEpisodeSheet = (() => {
    const sheets = currentSession.config.episodeSceneSheets ?? [];
    const ep = currentSession.config.episode ?? 1;
    return sheets.find(s => s.episode === ep) ?? null;
  })();

  // Scene click → scroll to the scene marker in the page (if exists)
  // 1순위: [data-scene-index="N"] 직접 매칭
  // 2순위: 에디터 내부 ProseMirror 단락 N번째 (씬 당 균등 분할)
  const handleSceneClick = useCallback((sceneIndex: number) => {
    try {
      const direct = document.querySelector(`[data-scene-index="${sceneIndex}"]`);
      if (direct instanceof HTMLElement) {
        direct.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      // Fallback — ProseMirror 내부 단락을 씬 개수에 맞춰 분할하여 N번째 씬의 시작 단락으로 이동
      const proseMirror = document.querySelector<HTMLElement>('.novel-editor-wrapper .ProseMirror');
      if (!proseMirror) {
        logger.warn('StudioRightPanel', `scene[${sceneIndex}] not found in DOM`);
        return;
      }
      const paragraphs = proseMirror.querySelectorAll<HTMLElement>('p');
      if (paragraphs.length === 0) return;
      // sceneIndex 0 → 첫 단락, 나머지는 비례
      const ratio = Math.max(0, Math.min(1, sceneIndex / Math.max(1, paragraphs.length - 1)));
      const idx = Math.min(paragraphs.length - 1, Math.floor(ratio * paragraphs.length));
      paragraphs[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      logger.warn('StudioRightPanel', 'scene scroll failed', err);
    }
  }, []);

  // Message click → scroll to the message id
  const handleMessageClick = useCallback((messageId: string) => {
    try {
      const target = document.getElementById(`msg-${messageId}`) ?? document.querySelector(`[data-message-id="${messageId}"]`);
      if (target && 'scrollIntoView' in target) {
        (target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      logger.warn('StudioRightPanel', 'message scroll failed', err);
    }
  }, []);

  // NOTE: visibility check (writing/ai mode, dashboard closed) is done by parent

  return (
    <aside className={`hidden lg:flex shrink-0 flex-col border-l border-border bg-bg-primary transition-[transform,opacity,background-color,border-color,color] duration-300 ${rightPanelOpen ? 'w-80' : 'w-10'}`}>
      {/* Toggle button */}
      <button onClick={() => setRightPanelOpen(p => !p)} className="w-full py-2 text-[10px] text-text-tertiary hover:text-text-primary transition-colors border-b border-border font-mono">
        {rightPanelOpen ? '\u25B6' : '\u25C0'}
      </button>

      {rightPanelOpen && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Outline toggle + panel */}
          <div className="border-b border-border">
            <button
              type="button"
              onClick={() => setShowOutline(p => !p)}
              aria-expanded={showOutline}
              aria-label={L4(language, { ko: '\uC544\uC6C3\uB77C\uC778 \uD328\uB110 \uD1A0\uAE00', en: 'Toggle outline', ja: '\u30A2\u30A6\u30C8\u30E9\u30A4\u30F3\u5207\u66FF', zh: '\u5207\u6362\u5927\u7EB2' })}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-text-tertiary hover:text-text-primary uppercase tracking-widest font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              <span>{'\uD83D\uDDC2\uFE0F'} {L4(language, { ko: '\uC544\uC6C3\uB77C\uC778', en: 'Outline', ja: '\u30A2\u30A6\u30C8\u30E9\u30A4\u30F3', zh: '\u5927\u7EB2' })}</span>
              <span className="text-accent-purple">{showOutline ? '\u25BC' : '\u25B6'}</span>
            </button>
            {showOutline && (
              <div className="max-h-[50vh] overflow-hidden">
                <OutlinePanel
                  currentSession={currentSession}
                  currentSceneSheet={currentEpisodeSheet}
                  language={appLanguage}
                  onSceneClick={handleSceneClick}
                  onMessageClick={handleMessageClick}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Chat history (previous messages excluding latest) */}
          {currentSession.messages.length > 2 && (
            <div className="p-3 border-b border-border max-h-[40vh] overflow-y-auto">
              <div className="text-[9px] font-black text-text-tertiary uppercase tracking-widest font-mono mb-2">
                {'\uD83D\uDCAC'} {L4(appLanguage, { ko: '\uB300\uD654 \uD788\uC2A4\uD1A0\uB9AC', en: 'Chat History', ja: '\u4F1A\u8A71\u5C65\u6B74', zh: '\u5BF9\u8BDD\u5386\u53F2' })} ({currentSession.messages.length - 2})
              </div>
              <div className="space-y-2">
                {currentSession.messages.slice(0, -2).map(msg => (
                  <div key={msg.id} className={`text-[12px] leading-relaxed px-2 py-1.5 rounded-lg ${
                    msg.role === 'user' ? 'bg-bg-tertiary/50 text-zinc-400' : 'text-zinc-500'
                  }`}>
                    <span className="font-bold text-[9px] uppercase">{msg.role === 'user' ? '\uD83E\uDDD1' : '\uD83E\uDD16'}</span>{' '}
                    {msg.content.slice(0, 120)}{msg.content.length > 120 ? '...' : ''}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reference section */}
          <div className="p-4 space-y-3 border-b border-border min-w-0">
            <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest font-mono">
              {t('panel.reference')}
            </div>

            {/* Bridge */}
            <details className="group">
              <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">{'\uD83D\uDCCE'} {t('panel.bridge')}</summary>
              {(() => {
                const prev = currentSession.messages.filter(m => m.role === 'assistant' && m.content).slice(-1)[0];
                const txt = prev?.content.replace(/```(?:json|JSON)?\s*[\s\S]*?```/g, '').replace(/\{\s*\n\s*"(?:grade|metrics|tension|pacing|immersion|eos|active_eh_layer|critique)"[\s\S]*?\n\s*\}/g, '').trim() || '';
                return <p className="mt-1.5 text-[11px] text-text-tertiary pl-4 italic leading-relaxed break-words overflow-hidden">{txt ? txt.slice(-250) : t('panel.none')}</p>;
              })()}
            </details>

            {/* Scene sheet */}
            <details className="group" open={!currentSession.config.sceneDirection}>
              <summary className={`flex items-center gap-1.5 cursor-pointer text-xs font-bold transition-colors ${
                currentSession.config.sceneDirection
                  ? 'text-text-tertiary hover:text-text-secondary'
                  : 'text-accent-amber hover:text-accent-amber/80'
              }`}>{'\uD83C\uDFAC'} {t('panel.scene')} {!currentSession.config.sceneDirection && <span className="text-[11px] ml-1 px-1.5 py-0.5 bg-amber-500/10 rounded text-amber-400">{t('panel.notSet')}</span>}</summary>
              <div className="mt-1.5 pl-4 space-y-1 min-w-0">
                {currentSession.config.sceneDirection?.hooks?.map((h, i) => <div key={i} className="text-[12px] text-accent-blue break-words">{'\uD83E\uDE9D'} {h.desc}</div>)}
                {currentSession.config.sceneDirection?.goguma?.map((g, i) => <div key={i} className={`text-[12px] break-words ${g.type === 'goguma' ? 'text-amber-400' : 'text-cyan-400'}`}>{g.type === 'goguma' ? '\uD83C\uDF60' : '\uD83E\uDD64'} {g.desc}</div>)}
                {currentSession.config.sceneDirection?.cliffhanger && <div className="text-[12px] text-accent-red break-words">{'\uD83D\uDD1A'} {currentSession.config.sceneDirection.cliffhanger.desc}</div>}
                {!currentSession.config.sceneDirection && (
                  <div className="space-y-1.5 p-2 bg-amber-500/5 rounded-lg border border-amber-500/20">
                    <p className="text-[12px] text-accent-amber">{t('panel.sceneWarning')}</p>
                    <button onClick={() => setActiveTab('direction')} className="text-[12px] text-accent-purple hover:underline font-bold">
                      {'\u2192'} {t('panel.setupDirection')}
                    </button>
                  </div>
                )}
              </div>
            </details>

            {/* Episode scene sheets */}
            <details className="group">
              <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">{'\uD83D\uDCCB'} {t('panel.episodeScenes')} ({(currentSession.config.episodeSceneSheets ?? []).length})</summary>
              <div className="mt-1.5 pl-2 min-w-0">
                <EpisodeScenePanel
                  lang={appLanguage}
                  currentEpisode={currentSession.config.episode}
                  episodeSceneSheets={currentSession.config.episodeSceneSheets ?? []}
                  // [2026-05-09] setConfig 직접 호출 3회 → scene-sheet/helpers 사용 (DRY).
                  onSave={(sheet) => setConfig(upsertSheet(currentSession.config, sheet))}
                  onDelete={(ep) => setConfig(removeSheet(currentSession.config, ep))}
                  onUpdate={(sheet) => setConfig(upsertSheet(currentSession.config, sheet))}
                />
              </div>
            </details>

            {/* Characters */}
            <details className="group">
              <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">{'\uD83D\uDC64'} {t('panel.chars')} ({currentSession.config.characters.length})</summary>
              <div className="mt-1.5 pl-4 space-y-1.5 min-w-0">
                {currentSession.config.characters.length > 0 ? currentSession.config.characters.map(c => (
                  <div key={c.id} className="text-[12px] break-words">
                    <span className="font-bold text-text-primary">{c.name}</span> <span className="text-text-tertiary">({c.role})</span>
                    {c.speechStyle && <span className="text-accent-blue ml-1">{'\uD83D\uDDE3\uFE0F'}{c.speechStyle}</span>}
                  </div>
                )) : <p className="text-[12px] text-text-tertiary italic">{t('panel.none')}</p>}
              </div>
            </details>

            {/* Format */}
            <details className="group">
              <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">{'\uD83D\uDCD0'} {t('panel.format')}</summary>
              <div className="mt-1.5 pl-4 grid grid-cols-2 gap-1">
                {(tObj.panel?.formatRulesKO as string[] || []).map((r: string, i: number) => (
                  <div key={i} className="text-[11px] text-text-tertiary"><span className="text-accent-green">{'\u2713'}</span> {r}</div>
                ))}
              </div>
            </details>

            {/* Director feedback */}
            <DirectorPanel report={directorReport} language={appLanguage} />

            {/* Proactive suggestions */}
            {suggestions.length > 0 && (
              <SuggestionPanel
                suggestions={suggestions}
                onDismiss={(id) => setSuggestions(prev => prev.map(s => s.id === id ? { ...s, dismissed: true, dismissCount: s.dismissCount + 1 } : s))}
                language={appLanguage}
              />
            )}

            {/* Pipeline progress */}
            {pipelineResult && (
              <PipelineProgress
                stages={pipelineResult.stages}
                finalStatus={pipelineResult.finalStatus}
                language={appLanguage}
              />
            )}

            {/* Conversation temperature */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-text-tertiary">{'\uD83C\uDF21\uFE0F'}</span>
              <span className={`text-xs font-bold ${
                hfcpState.verdict === 'engagement' ? 'text-accent-green' :
                hfcpState.verdict === 'normal_free' ? 'text-accent-blue' :
                hfcpState.verdict === 'normal_analysis' ? 'text-accent-amber' :
                hfcpState.verdict === 'limited' ? 'text-accent-red' : 'text-text-tertiary'
              }`}>
                {({
                  engagement: t('hfcp.engagement'),
                  normal_free: t('hfcp.normalFree'),
                  normal_analysis: t('hfcp.normalAnalysis'),
                  limited: t('hfcp.limited'),
                  silent: t('hfcp.silent'),
                } as Record<string, string>)[hfcpState.verdict] || hfcpState.verdict}
              </span>
            </div>
          </div>

          {/* 집필 대화 미리보기 */}
          <div className="p-4 space-y-3">
            <div
              className="text-[10px] font-black text-accent-purple uppercase tracking-widest font-mono truncate"
              title={backendLabel ? `${t('writingMode.nowWriterBadge')} · ${backendLabel}` : t('writingMode.nowWriterBadge')}
            >
              {'\uD83D\uDCAC'} {t('panel.aiChat')}
              {backendLabel ? (
                <span className="block text-[9px] text-text-tertiary font-mono normal-case tracking-normal mt-0.5 truncate">
                  · {backendLabel}
                </span>
              ) : null}
            </div>
            <div className="space-y-3 max-h-[40vh] overflow-y-auto">
              {currentSession.messages.filter(m => {
                if (m.role === 'user') {
                  const isGen = m.meta?.hfcpMode === 'generate' || m.content.startsWith('[1\uB2E8\uACC4') || m.content.startsWith('[2\uB2E8\uACC4') || m.content.startsWith('[3\uB2E8\uACC4') || m.content.startsWith('[Pass');
                  return !isGen;
                }
                return false;
              }).length === 0 ? (
                <p className="text-[11px] text-text-tertiary italic text-center py-4">{t('panel.askQuestions')}</p>
              ) : (
                currentSession.messages.filter(m => {
                  if (m.role === 'user' && m.meta?.hfcpMode === 'chat') return true;
                  const idx = currentSession.messages.indexOf(m);
                  if (m.role === 'assistant' && idx > 0) {
                    const prev = currentSession.messages[idx - 1];
                    return prev.meta?.hfcpMode === 'chat';
                  }
                  return false;
                }).slice(-6).map(msg => (
                  <div key={msg.id} className={`text-[11px] leading-relaxed ${msg.role === 'user' ? 'text-accent-purple' : 'text-text-secondary'}`}>
                    <span className="font-bold">{msg.role === 'user' ? '\uB098' : 'NOW'}:</span> {msg.content.slice(0, 200)}{msg.content.length > 200 ? '...' : ''}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* NOW AI Chat */}
          <div className="p-4 border-t border-border">
            <TabAssistant tab="writing" language={appLanguage} config={currentSession.config} hostedProviders={hostedProviders} />
          </div>
        </div>
      )}
    </aside>
  );
}

// IDENTITY_SEAL: PART-4 | role=writing-assistant-panel | inputs=session,config,ai-state | outputs=JSX

// ============================================================
// PART 5 — RightPanelResizer (우측 패널 드래그 리사이즈)
//
// 대상 = loreguard 새 셸의 집필 우측 패널(.eh-app .wr-panel). TabWriting.tsx 는
// QB owner 라 수정 금지 → 폭은 loreguard.css 에서 var(--lg-rpanel-w) 로 변경했고,
// 이 컴포넌트가 그 변수를 .eh-app 루트에 주입한다(자체 mount·StudioShell children 분기).
//
// 자체 구현 (라이브러리 추가 없음):
//   - pointerdown → setPointerCapture → pointermove 로 뷰포트별 clamp 폭 계산
//   - 폭은 noa-lg-rpanel-w 에 영속 (lazy init — 첫 렌더부터 적용, FOUC 없음)
//   - 핸들 = role=separator 고정 위치 바 (left = 100vw − panelWidth) — .wr-panel 좌측 경계
//   - 키보드 리사이즈: ←/→ ±16px, Home/End = min/max (aria-valuenow/min/max·orientation)
//   - .wr-panel 미존재 탭(세계관·캐릭터 등)에서는 핸들 미표시 (MutationObserver 로 추적)
//   - 기존 Ctrl+\ 토글(구 셸 rightPanelOpen)·새 셸 레이아웃 무접촉 — 폭 변수만 건드림
//
// 안전: 모든 리스너/observer/RAF cleanup. SSR 무해(effect 내부에서만 DOM 접근).
// ============================================================

const RPANEL_MIN = 280;
const RPANEL_MAX = 880;
const RPANEL_DEFAULT = 360;
const RPANEL_STORAGE_KEY = 'noa-lg-rpanel-w';
const RPANEL_KEY_STEP = 16;
const RPANEL_HEADER_OFFSET = 62; // .eh-header 높이 (loreguard.css PART 3)

function getRpanelViewportMax(): number {
  if (typeof window === 'undefined') return RPANEL_MAX;
  const viewport = window.innerWidth;
  if (viewport <= 1179) return RPANEL_MIN;
  if (viewport <= 1440) return Math.min(520, Math.max(RPANEL_MIN, Math.floor(viewport * 0.4)));
  if (viewport < 1920) return Math.min(720, Math.max(RPANEL_MIN, Math.floor(viewport * 0.38)));
  return RPANEL_MAX;
}

/** clamp + 정수화 — 저장/적용 단일 경로 */
function clampRpanelWidth(px: number, maxWidth = getRpanelViewportMax()): number {
  if (!Number.isFinite(px)) return RPANEL_DEFAULT;
  return Math.round(Math.min(maxWidth, Math.max(RPANEL_MIN, px)));
}

/** 저장 폭 로드 (storage 불가/파싱 실패 = 기본 360 — 기존 픽셀 보존) */
function readRpanelWidth(): number {
  if (typeof window === 'undefined') return RPANEL_DEFAULT;
  try {
    const raw = window.localStorage.getItem(RPANEL_STORAGE_KEY);
    if (!raw) return RPANEL_DEFAULT;
    const n = Number.parseInt(raw, 10);
    return Number.isNaN(n) ? RPANEL_DEFAULT : clampRpanelWidth(n);
  } catch {
    return RPANEL_DEFAULT;
  }
}

export interface RightPanelResizerProps {
  /** L4 4-언어 라벨용 (aria-label). 미지정 시 KO. */
  language?: AppLanguage;
}

/**
 * RightPanelResizer — 집필 우측 패널(.wr-panel) 드래그/키보드 리사이즈 핸들.
 * 자체 mount(StudioShell children 분기). .wr-panel 이 있는 탭에서만 핸들 표시.
 */
export function RightPanelResizer({ language = 'KO' }: RightPanelResizerProps) {
  // 폭 — lazy init 으로 첫 렌더부터 적용 (FOUC 방지)
  const [width, setWidth] = useState<number>(readRpanelWidth);
  const [viewportMax, setViewportMax] = useState(RPANEL_MAX);
  // .wr-panel 존재 여부 (탭별 — 없으면 핸들 숨김)
  const [panelPresent, setPanelPresent] = useState(false);
  const [dragging, setDragging] = useState(false);
  const gripRef = useRef<HTMLButtonElement | null>(null);
  const ehAppRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateViewportMax = () => {
      const nextMax = getRpanelViewportMax();
      setViewportMax(nextMax);
      setWidth((current) => clampRpanelWidth(current, nextMax));
    };
    updateViewportMax();
    window.addEventListener('resize', updateViewportMax);
    return () => window.removeEventListener('resize', updateViewportMax);
  }, []);

  // .eh-app 루트에 --lg-rpanel-w 주입 (loreguard.css .wr-panel 이 소비) + 저장
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const ehApp = (ehAppRef.current ??= document.querySelector<HTMLElement>('.eh-app'));
    if (ehApp) ehApp.style.setProperty('--lg-rpanel-w', `${width}px`);
    try {
      window.localStorage.setItem(RPANEL_STORAGE_KEY, String(width));
    } catch {
      /* quota / private — 세션 내 상태만 유지 */
    }
  }, [width]);

  // .wr-panel mount/unmount 추적 (탭 전환 시 핸들 표시/숨김) + .eh-app 캐시 무효화
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const check = () => {
      ehAppRef.current = document.querySelector<HTMLElement>('.eh-app');
      const panel = document.querySelector<HTMLElement>('.eh-app .wr-panel');
      const present = !!panel && !panel.classList.contains('is-collapsed');
      setPanelPresent(present);
      // 새로 mount 된 .eh-app 에도 현재 폭 즉시 반영
      if (ehAppRef.current) ehAppRef.current.style.setProperty('--lg-rpanel-w', `${readRpanelWidth()}px`);
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // 드래그 중 body 마커 (텍스트 선택·iframe pointer 차단)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (dragging) document.body.dataset.lgResizing = '1';
    else delete document.body.dataset.lgResizing;
    return () => { if (typeof document !== 'undefined') delete document.body.dataset.lgResizing; };
  }, [dragging]);

  // unmount 시 RAF 취소
  useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  // 포인터 좌표 → 폭 (패널 우측 모서리 = 뷰포트 우단 고정 가정). rAF 코얼레싱.
  const applyFromClientX = useCallback((clientX: number) => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const next = clampRpanelWidth(window.innerWidth - clientX, viewportMax);
      setWidth(next);
    });
  }, [viewportMax]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return; // 주 버튼만
    e.preventDefault();
    setDragging(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 미지원 — capture 없이 진행 */ }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    applyFromClientX(e.clientX);
  }, [dragging, applyFromClientX]);

  const endDrag = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    setDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }, [dragging]);

  // 키보드 리사이즈 — ← 넓힘 / → 좁힘 (패널이 우측이라 직관 일치), Home/End = max/min
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowLeft': next = width + RPANEL_KEY_STEP; break;
      case 'ArrowRight': next = width - RPANEL_KEY_STEP; break;
      case 'Home': next = viewportMax; break;
      case 'End': next = RPANEL_MIN; break;
      default: return;
    }
    e.preventDefault();
    setWidth(clampRpanelWidth(next, viewportMax));
  }, [viewportMax, width]);

  if (!panelPresent) return null;

  const label = L4(language, {
    ko: '우측 패널 너비 조절',
    en: 'Resize right panel',
    ja: '右パネルの幅を調整',
    zh: '调整右面板宽度',
  });

  return (
    <button
      ref={gripRef}
      type="button"
      className="lg-rpanel-grip"
      style={{ left: `calc(100vw - ${width}px)`, top: RPANEL_HEADER_OFFSET }}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={RPANEL_MIN}
      aria-valuemax={viewportMax}
      data-dragging={dragging ? '1' : '0'}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
    />
  );
}

// IDENTITY_SEAL: PART-5 | role=right-panel-resizer | inputs=DOM(.wr-panel),localStorage | outputs=CSS-var+JSX
