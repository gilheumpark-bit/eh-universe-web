"use client";

import { useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';
import type { AppLanguage, AppTab, ChatSession, StoryConfig, WritingMode } from '@/lib/studio-types';
import { useCmdPalette } from '@/hooks/useCmdPalette';
import { useRegisterActions } from '@/lib/actions/use-register-actions';
import { useKeyBinding } from '@/lib/keyboard/keyboard-manager';
import { useStudioKeyboard } from '@/hooks/useStudioKeyboard';
import { useUnsavedWarning } from '@/components/studio/UXHelpers';
import type { MoveSessionModalState, StudioShellUiState } from './StudioShell.ui-state';

type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
};

interface UseStudioShellActionRoutingOptions {
  childrenPresent: boolean;
  language: AppLanguage;
  setActiveTab: (tab: AppTab) => void;
  handleTabChange: (tab: AppTab) => void;
  setShowToolbox: Dispatch<SetStateAction<boolean>>;
  setShowSearch: Dispatch<SetStateAction<boolean>>;
  setFocusMode: Dispatch<SetStateAction<boolean>>;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
  setZenMode: Dispatch<SetStateAction<boolean>>;
  setShowShortcuts: Dispatch<SetStateAction<boolean>>;
  setShowApiKeyModal: Dispatch<SetStateAction<boolean>>;
  setShowQuickStartModal: Dispatch<SetStateAction<boolean>>;
  setRightPanelOpen: Dispatch<SetStateAction<boolean>>;
  setEditorFontSize: Dispatch<SetStateAction<number>>;
  setWritingMode: Dispatch<SetStateAction<WritingMode>>;
  dispatchUi: Dispatch<Partial<StudioShellUiState> | ((prev: StudioShellUiState) => Partial<StudioShellUiState>)>;
  confirmState: ConfirmState;
  closeConfirm: () => void;
  currentSession: ChatSession | null | undefined;
  setConfig: (config: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;
  triggerSave: () => Promise<boolean>;
  createNewSession: (tab?: AppTab) => void;
  exportTXT: () => void;
  handleExportEPUB: () => void;
  handlePrint: () => void;
  handleSend: (customPrompt?: string) => void;
  showShortcuts: boolean;
  showApiKeyModal: boolean;
  saveSlotModalOpen: boolean;
  moveModal: MoveSessionModalState;
  showQuickStartModal: boolean;
  showGlobalSearch: boolean;
  renameDialogOpen: boolean;
  zenMode: boolean;
  isGenerating: boolean;
  writingMode: WritingMode;
  editDraft: string;
}

function paletteLang(language: AppLanguage): 'ko' | 'en' | 'ja' | 'zh' {
  if (language === 'KO') return 'ko';
  if (language === 'JP') return 'ja';
  if (language === 'CN') return 'zh';
  return 'en';
}

export function useStudioShellActionRouting({
  childrenPresent,
  language,
  setActiveTab,
  handleTabChange,
  setShowToolbox,
  setShowSearch,
  setFocusMode,
  setIsSidebarOpen,
  setZenMode,
  setShowShortcuts,
  setShowApiKeyModal,
  setShowQuickStartModal,
  setRightPanelOpen,
  setEditorFontSize,
  setWritingMode,
  dispatchUi,
  confirmState,
  closeConfirm,
  currentSession,
  setConfig,
  triggerSave,
  createNewSession,
  exportTXT,
  handleExportEPUB,
  handlePrint,
  handleSend,
  showShortcuts,
  showApiKeyModal,
  saveSlotModalOpen,
  moveModal,
  showQuickStartModal,
  showGlobalSearch,
  renameDialogOpen,
  zenMode,
  isGenerating,
  writingMode,
  editDraft,
}: UseStudioShellActionRoutingOptions) {
  const cmdPalette = useCmdPalette();
  const handleTabChangeRef = useRef<(tab: AppTab) => void>(() => {});
  const handleAiGenerateRef = useRef<() => void>(() => {});
  const handleAiRefineRef = useRef<() => void>(() => {});

  useEffect(() => {
    handleTabChangeRef.current = handleTabChange;
  }, [handleTabChange]);

  const studioActionBindings = useMemo(() => ({
    'studio:tab-world':      () => handleTabChangeRef.current?.('world'),
    'studio:tab-characters': () => handleTabChangeRef.current?.('characters'),
    'studio:tab-direction':  () => handleTabChangeRef.current?.('direction'),
    'studio:tab-writing':    () => handleTabChangeRef.current?.('writing'),
    'studio:tab-style':      () => handleTabChangeRef.current?.('style'),
    'studio:tab-manuscript': () => handleTabChangeRef.current?.('manuscript'),
    'studio:tab-history':    () => handleTabChangeRef.current?.('history'),
    'studio:tab-settings':   () => handleTabChangeRef.current?.('settings'),
    'studio:ai-generate':    () => handleAiGenerateRef.current?.(),
    'studio:ai-refine':      () => handleAiRefineRef.current?.(),
    'studio:toolbox-open':   () => setShowToolbox(previous => !previous),
  }), [setShowToolbox]);

  useRegisterActions({
    palette: cmdPalette,
    bindings: studioActionBindings,
    lang: paletteLang(language),
  });

  const routeLoreguardTab = (id: string) => window.dispatchEvent(new CustomEvent('loreguard:tab', { detail: id }));
  useKeyBinding({ keys: 'ctrl+1', area: 'studio', handler: () => childrenPresent ? routeLoreguardTab('project')   : setActiveTab('world'),       description: 'Project tab' });
  useKeyBinding({ keys: 'ctrl+2', area: 'studio', handler: () => childrenPresent ? routeLoreguardTab('world')     : setActiveTab('world'),       description: 'World tab' });
  useKeyBinding({ keys: 'ctrl+3', area: 'studio', handler: () => childrenPresent ? routeLoreguardTab('character') : setActiveTab('characters'),  description: 'Characters tab' });
  useKeyBinding({ keys: 'ctrl+4', area: 'studio', handler: () => childrenPresent ? routeLoreguardTab('plot')      : setActiveTab('direction'),    description: 'Main scenario tab' });
  useKeyBinding({ keys: 'ctrl+5', area: 'studio', handler: () => childrenPresent ? routeLoreguardTab('scene')     : setActiveTab('writing'),     description: 'Scene sheet tab' });
  useKeyBinding({ keys: 'ctrl+6', area: 'studio', handler: () => childrenPresent ? routeLoreguardTab('direction') : setActiveTab('style'),       description: 'Direction tab' });
  useKeyBinding({ keys: 'ctrl+7', area: 'studio', handler: () => childrenPresent ? routeLoreguardTab('writing')   : setActiveTab('manuscript'),  description: 'Writing tab' });
  useKeyBinding({ keys: 'ctrl+8', area: 'studio', handler: () => childrenPresent ? routeLoreguardTab('revision')  : setActiveTab('history'),     description: 'Revision tab' });
  useKeyBinding({ keys: 'ctrl+9', area: 'studio', handler: () => childrenPresent ? routeLoreguardTab('translate') : setActiveTab('settings'),    description: 'Translation tab' });
  useKeyBinding({ keys: 'ctrl+0', area: 'studio', handler: () => childrenPresent ? routeLoreguardTab('export')    : setActiveTab('settings'),    description: 'Export tab' });

  useEffect(() => {
    if (childrenPresent) return;
    const handleExportTxt = () => exportTXT();
    const handleExportEpub = () => handleExportEPUB();
    const handleSwitchBranch = () => {
      setRightPanelOpen(true);
      window.dispatchEvent(new CustomEvent('noa:alert', {
        detail: { msg: '우측 패널의 평행우주 브랜치 섹션에서 브랜치를 선택할 수 있습니다.', kind: 'info' },
      }));
    };
    window.addEventListener('noa:export-txt', handleExportTxt);
    window.addEventListener('noa:export-epub', handleExportEpub);
    window.addEventListener('noa:switch-branch', handleSwitchBranch);
    return () => {
      window.removeEventListener('noa:export-txt', handleExportTxt);
      window.removeEventListener('noa:export-epub', handleExportEpub);
      window.removeEventListener('noa:switch-branch', handleSwitchBranch);
    };
  }, [childrenPresent, exportTXT, handleExportEPUB, setRightPanelOpen]);

  useStudioKeyboard({
    onTabChange: handleTabChange,
    onToggleSearch: () => setShowSearch(previous => !previous),
    onExportTXT: exportTXT,
    onPrint: handlePrint,
    onNewSession: createNewSession,
    onToggleFocus: () => setFocusMode(previous => !previous),
    onToggleShortcuts: () => setShowShortcuts(previous => !previous),
    onSave: () => {
      void triggerSave().then((saved) => {
        if (saved) {
          window.dispatchEvent(new CustomEvent('noa:alert', {
            detail: { message: language === 'KO' ? '저장 완료' : 'Saved', variant: 'info' },
          }));
        }
      });
    },
    onNewEpisode: () => {
      if (!currentSession) return;
      const nextEpisode = Math.min(currentSession.config.episode + 1, currentSession.config.totalEpisodes);
      setConfig({ ...currentSession.config, episode: nextEpisode });
    },
    onToggleAssistant: () => setRightPanelOpen(previous => !previous),
    onToggleZen: () => setZenMode(previous => !previous),
    onToggleSidebar: () => setIsSidebarOpen(previous => !previous),
    onToggleInspector: () => setRightPanelOpen(previous => !previous),
    onEscape: () => {
      if (zenMode) { setZenMode(false); return; }
      if (showShortcuts) { setShowShortcuts(false); return; }
      if (showApiKeyModal) { setShowApiKeyModal(false); return; }
      if (confirmState.open) { closeConfirm(); return; }
      if (saveSlotModalOpen) { dispatchUi({ saveSlotModalOpen: false }); return; }
      if (moveModal) { dispatchUi({ moveModal: null }); return; }
      if (showQuickStartModal) { setShowQuickStartModal(false); return; }
      if (showGlobalSearch) { dispatchUi({ showGlobalSearch: false, globalSearchQuery: '' }); return; }
      if (renameDialogOpen) { dispatchUi({ renameDialogOpen: false }); return; }
    },
    onGlobalSearch: () => dispatchUi(state => ({ showGlobalSearch: !state.showGlobalSearch })),
    onFontSizeUp: () => setEditorFontSize(size => {
      const nextSize = Math.min(size + 2, 28);
      document.documentElement.style.setProperty('--editor-font-size', `${nextSize}px`);
      return nextSize;
    }),
    onFontSizeDown: () => setEditorFontSize(size => {
      const nextSize = Math.max(size - 2, 12);
      document.documentElement.style.setProperty('--editor-font-size', `${nextSize}px`);
      return nextSize;
    }),
    onToggleSplitView: () => {
      window.dispatchEvent(new CustomEvent('noa:toggle-split-view'));
    },
    disabled: showApiKeyModal || showShortcuts || confirmState.open || saveSlotModalOpen,
  });

  useUnsavedWarning(isGenerating || (writingMode === 'edit' && editDraft.trim().length > 0));

  useEffect(() => {
    handleAiGenerateRef.current = () => {
      handleTabChangeRef.current?.('writing');
      setWritingMode('ai');
      void handleSend();
    };
    handleAiRefineRef.current = () => {
      handleTabChangeRef.current?.('writing');
      setWritingMode('refine');
    };
  }, [handleSend, setWritingMode]);

  return { cmdPalette };
}
