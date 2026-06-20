"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import type { AppLanguage, ChatSession } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import { toAgentLang } from '@/lib/ai/lang-normalize';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import MobileTabBar from '@/components/studio/MobileTabBar';
import MobileDrawer from '@/components/studio/MobileDrawer';
import MobileSketchImportBanner from '@/components/studio/MobileSketchImportBanner';
import { LastTaskCard } from '@/components/studio/LastTaskCard';
import { CmdPaletteOverlay } from '@/components/studio/CmdPaletteOverlay';
import TokenBudgetToast from '@/components/studio/TokenBudgetToast';
import ContextTrimmedToast from '@/components/studio/ContextTrimmedToast';
import PrismRejectionToast from '@/components/studio/PrismRejectionToast';
import NoaBlockNoticeCard from '@/components/studio/NoaBlockNoticeCard';
import { ZenOverlays } from '@/components/studio/ZenOverlays';
import { ZenTweaksPanel } from '@/components/studio/ZenTweaksPanel';
import { ModalProvider } from '@/lib/modals/modal-manager';
import { StudioConfigProvider, StudioUIProvider } from '@/contexts/StudioContext';
import { StudioProvider, type StudioContextValue } from './StudioContext';
import { RightPanelResizer } from './StudioRightPanel';
import { showAlert } from '@/lib/show-alert';
import type { StudioOverlayManagerProps } from '@/components/studio/StudioOverlayManager';
import type { StudioModalBridgeProps } from '@/components/studio/StudioModalBridge';
import type { RenameDialogProps } from '@/components/studio/RenameDialog';
import type { useStudioMounts } from '@/hooks/useStudioMounts';
import type { useSessionSnapshot } from '@/hooks/useSessionSnapshot';
import type { useCmdPalette } from '@/hooks/useCmdPalette';

const OSDesktop = dynamic(() => import('@/components/studio/OSDesktop'), { ssr: false });
const StudioMainContent = dynamic(() => import('./StudioMainContent'), { ssr: false });
const StudioOverlayManager = dynamic(() => import('@/components/studio/StudioOverlayManager'), { ssr: false });
const MobileStudioView = dynamic(() => import('@/components/studio/MobileStudioView'), { ssr: false });
const RenameDialog = dynamic(() => import('@/components/studio/RenameDialog'), { ssr: false });
const MultiTabBanner = dynamic(() => import('@/components/studio/MultiTabBanner'), { ssr: false });
const StudioMountProviders = dynamic(() => import('@/components/studio/StudioMountProviders'), { ssr: false });
const RecoveryMounts = dynamic(() => import('@/components/loreguard/RecoveryMounts'), { ssr: false });
const MemoPanel = dynamic(() => import('@/components/loreguard/MemoPanel'), { ssr: false });
const NovelIDELauncher = dynamic(() => import('@/components/studio/novel-ide/NovelIDELauncher').then((module) => module.NovelIDELauncher), { ssr: false });
const StudioModalBridge = dynamic(() => import('@/components/studio/StudioModalBridge'), { ssr: false });

type StudioMounts = ReturnType<typeof useStudioMounts>;
type SessionSnapshot = ReturnType<typeof useSessionSnapshot>;
type CmdPalette = ReturnType<typeof useCmdPalette>;
type DesktopProps = React.ComponentProps<typeof OSDesktop>;
type StudioConfigValue = React.ComponentProps<typeof StudioConfigProvider>['value'];
type StudioUiValue = React.ComponentProps<typeof StudioUIProvider>['value'];

export interface StudioShellViewProps {
  children?: React.ReactNode;
  language: AppLanguage;
  isKO: boolean;
  hydrated: boolean;
  isMobile: boolean;
  forceDesktop: boolean;
  activeTab: DesktopProps['activeTab'];
  studioMode: 'guided' | 'free';
  focusMode: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  mobileDrawerOpen: boolean;
  setMobileDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentSession: ChatSession | null | undefined;
  currentProjectId: string | null;
  handleTabChange: DesktopProps['handleTabChange'];
  sessionSnapshot: SessionSnapshot;
  cmdPalette: CmdPalette;
  crossTabNotification: string | null;
  reloadFromStorage: () => void;
  dismissCrossTabNotification: () => void;
  studioMounts: StudioMounts;
  studioConfigValue: StudioConfigValue;
  studioUIValue: StudioUiValue;
  studioContextValue: StudioContextValue;
  overlayProps: StudioOverlayManagerProps;
  modalBridgeProps: StudioModalBridgeProps;
  desktopProps: DesktopProps;
  renameDialogProps: RenameDialogProps;
  zenMode: boolean;
}

function agentLanguage(language: AppLanguage) {
  return toAgentLang(language);
}

function viewLanguage(language: AppLanguage): 'ko' | 'en' | 'ja' | 'zh' {
  if (language === 'KO') return 'ko';
  if (language === 'JP') return 'ja';
  if (language === 'CN') return 'zh';
  return 'en';
}

export function StudioShellView({
  children,
  language,
  isKO,
  hydrated,
  isMobile,
  forceDesktop,
  activeTab,
  studioMode,
  focusMode,
  isSidebarOpen,
  setIsSidebarOpen,
  mobileDrawerOpen,
  setMobileDrawerOpen,
  currentSession,
  currentProjectId,
  handleTabChange,
  sessionSnapshot,
  cmdPalette,
  crossTabNotification,
  reloadFromStorage,
  dismissCrossTabNotification,
  studioMounts,
  studioConfigValue,
  studioUIValue,
  studioContextValue,
  overlayProps,
  modalBridgeProps,
  desktopProps,
  renameDialogProps,
  zenMode,
}: StudioShellViewProps) {
  const translator = createT(language);
  const normalizedLanguage = viewLanguage(language);
  const toastLanguage = agentLanguage(language);

  if (children) {
    return (
      <ErrorBoundary variant="section" language={isKO ? 'KO' : 'EN'}>
        <StudioConfigProvider value={studioConfigValue}>
          <StudioUIProvider value={studioUIValue}>
            <StudioMountProviders language={language} bootRecoveryResult={studioMounts.recovery.result}>
              <ModalProvider>
                <StudioProvider value={studioContextValue}>
                  {children}
                  {studioMounts.journalActive && (
                    <RecoveryMounts multiTab={studioMounts.multiTab} language={language} />
                  )}
                  <MemoPanel language={language} projectId={currentProjectId} />
                  <RightPanelResizer language={language} />
                  <StudioOverlayManager {...overlayProps} />
                  <StudioModalBridge {...modalBridgeProps} />
                </StudioProvider>
                <TokenBudgetToast language={toastLanguage} />
                <ContextTrimmedToast language={toastLanguage} />
                <PrismRejectionToast language={toastLanguage} />
                <NoaBlockNoticeCard language={toastLanguage} />
              </ModalProvider>
            </StudioMountProviders>
          </StudioUIProvider>
        </StudioConfigProvider>
      </ErrorBoundary>
    );
  }

  if (isMobile && !forceDesktop && hydrated) {
    return (
      <ErrorBoundary variant="section" language={isKO ? 'KO' : 'EN'}>
        <MobileStudioView
          language={language}
          onDesktopCTA={() => {
            const desktopUrl = typeof window !== 'undefined' ? `${window.location.origin}/studio` : '';
            if (typeof navigator !== 'undefined' && navigator.share) {
              navigator.share({
                title: '로어가드 · 창작 전문 IDE',
                text: '로어가드 (Loreguard) · 창작 전문 IDE / Creative Process Record (데스크톱에서 열기)',
                url: desktopUrl,
              }).catch(() => { /* user cancelled */ });
            } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
              navigator.clipboard.writeText(desktopUrl)
                .then(() => showAlert(isKO ? '데스크톱 링크가 클립보드에 복사되었습니다' : 'Desktop link copied to clipboard'))
                .catch(() => { /* clipboard denied */ });
            }
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary variant="section" language={isKO ? 'KO' : 'EN'}>
      <StudioConfigProvider value={studioConfigValue}>
        <StudioUIProvider value={studioUIValue}>
          <StudioMountProviders language={language} bootRecoveryResult={studioMounts.recovery.result}>
            <ModalProvider>
              <div className="flex flex-col h-dvh overflow-hidden bg-bg-primary text-text-primary">
                {studioMounts.journalActive && (
                  <MultiTabBanner
                    isLeader={studioMounts.multiTab.isLeader}
                    followerCount={studioMounts.multiTab.followerCount}
                    leaderTabId={studioMounts.multiTab.leaderTabId}
                    conflictCount={studioMounts.multiTab.conflicts.length}
                    language={language}
                    onRequestPromotion={studioMounts.multiTab.requestPromotion}
                  />
                )}
                <div
                  className="flex flex-1 min-h-0 overflow-hidden"
                  data-testid="studio-content"
                >
                  {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />}

                  {crossTabNotification && (
                    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[var(--z-tooltip)] flex items-center gap-3 px-4 py-3 bg-accent-amber/15 border border-accent-amber/30 rounded-xl shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top duration-300" role="alert">
                      <span className="text-xs font-serif text-text-primary">{isKO ? '다른 탭에서 변경됨' : 'Modified in another tab'}</span>
                      <button onClick={() => { reloadFromStorage(); dismissCrossTabNotification(); }} className="px-3 py-1 text-[10px] font-bold bg-accent-amber/20 text-accent-amber rounded-lg hover:bg-accent-amber/30 transition-colors">{isKO ? '새로고침' : 'Refresh'}</button>
                      <button onClick={dismissCrossTabNotification} className="text-text-tertiary hover:text-text-primary transition-colors text-xs" aria-label="Dismiss">&times;</button>
                    </div>
                  )}

                  <MobileTabBar activeTab={activeTab} onTabChange={handleTabChange} language={language} mode={studioMode} />
                  <MobileSketchImportBanner />
                  <LastTaskCard
                    snapshot={sessionSnapshot.lastSnapshot}
                    visible={sessionSnapshot.cardVisible}
                    onDismiss={sessionSnapshot.dismissCard}
                    language={normalizedLanguage}
                  />
                  <CmdPaletteOverlay palette={cmdPalette} language={normalizedLanguage} />

                  <MobileDrawer
                    open={mobileDrawerOpen}
                    onClose={() => setMobileDrawerOpen(false)}
                    title={language === 'KO' ? '참조 컨텍스트' : 'Context Panel'}
                  >
                    {currentSession && (
                      <div className="space-y-3">
                        <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
                          {'📂'} {translator('saveSlot.savedVersions')}
                        </div>
                        <div className="text-[10px] text-text-tertiary">
                          {(currentSession.config.savedSlots || []).length === 0
                            ? (language === 'KO' ? '저장된 슬롯이 없습니다.' : 'No saved slots.')
                            : `${(currentSession.config.savedSlots || []).length} ${language === 'KO' ? '개 저장됨' : 'saved'}`
                          }
                        </div>
                      </div>
                    )}
                  </MobileDrawer>

                  {currentSession && activeTab !== 'writing' && (
                    <button
                      onClick={() => setMobileDrawerOpen(true)}
                      className="fixed bottom-24 right-4 z-30 lg:hidden p-3 min-w-[48px] min-h-[48px] flex items-center justify-center bg-accent-purple text-white rounded-full shadow-lg shadow-accent-purple/30 active:scale-90 transition-transform"
                      aria-label={language === 'KO' ? '참조 컨텍스트 열기' : 'Open context panel'}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    </button>
                  )}

                  <ZenOverlays
                    active={zenMode}
                    language={language}
                    chapter={currentSession?.title || undefined}
                    words={typeof currentSession?.config?.manuscripts?.[0]?.content === 'string'
                      ? currentSession.config.manuscripts[0].content.replace(/\s/g, '').length
                      : undefined}
                  />
                  <ZenTweaksPanel language={language} zenActive={zenMode} />
                  <OSDesktop {...desktopProps} />

                  {!isSidebarOpen && !focusMode && (
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-60 items-center justify-center w-7 h-20 bg-bg-secondary border border-border border-l-0 rounded-r-xl text-text-tertiary hover:text-accent-purple hover:bg-bg-tertiary transition-colors shadow-lg cursor-pointer"
                      title={language === 'KO' ? '사이드바 열기' : 'Open sidebar'}
                    >
                      <span className="text-xs font-bold">{'▶'}</span>
                    </button>
                  )}

                  <StudioProvider value={studioContextValue}>
                    <StudioMainContent>
                      {/* StudioSaveSlotPanel removed. save slots accessible via modal */}
                      {/* StudioWritingAssistantPanel removed - now integrated into WritingTabInline via RightChatPanel */}
                    </StudioMainContent>
                  </StudioProvider>

                  <NovelIDELauncher
                    config={currentSession?.config ?? null}
                    episodes={currentSession?.config?.manuscripts ?? null}
                    projectId={currentProjectId ?? 'unknown'}
                    messages={currentSession?.messages ?? null}
                    language={language}
                  />

                  <RenameDialog {...renameDialogProps} />
                  <StudioOverlayManager {...overlayProps} />
                  <StudioModalBridge {...modalBridgeProps} />
                </div>
              </div>
              <TokenBudgetToast language={toastLanguage} />
              <ContextTrimmedToast language={toastLanguage} />
              <PrismRejectionToast language={toastLanguage} />
              <NoaBlockNoticeCard language={toastLanguage} />
            </ModalProvider>
          </StudioMountProviders>
        </StudioUIProvider>
      </StudioConfigProvider>
    </ErrorBoundary>
  );
}
