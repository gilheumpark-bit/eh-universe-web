"use client";

import { useCallback } from 'react';
import type { AppTab, WritingMode } from '@/lib/studio-types';
import { sanitizeLoadedText } from '@/lib/project-sanitize';

interface UseStudioShellTabChangeArgs {
  activeTab: AppTab;
  writingMode: WritingMode;
  editDraft: string;
  currentSessionId: string | null;
  flushPendingDraft: () => boolean;
  setActiveTab: (tab: AppTab) => void;
  setIsSidebarOpen: (open: boolean) => void;
  showConfirm: (options: {
    title: string;
    message: string;
    variant: 'warning';
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
  }) => void;
  closeConfirm: () => void;
  translator: (key: string) => string;
}

export function useStudioShellTabChange({
  activeTab,
  writingMode,
  editDraft,
  currentSessionId,
  flushPendingDraft,
  setActiveTab,
  setIsSidebarOpen,
  showConfirm,
  closeConfirm,
  translator,
}: UseStudioShellTabChangeArgs) {
  return useCallback((tab: AppTab) => {
    const scrollReset = () => {
      setTimeout(() => {
        const scrollContainer = document.querySelector('[data-testid="studio-content"] .overflow-y-auto');
        if (scrollContainer) scrollContainer.scrollTop = 0;
      }, 50);
    };

    if (editDraft && editDraft.trim() && currentSessionId) {
      try {
        localStorage.setItem(`noa_editdraft_${currentSessionId}`, sanitizeLoadedText(editDraft));
      } catch {
        // quota/private mode: the in-memory draft is still kept below.
      }
    }

    const flushed = flushPendingDraft();
    if (!flushed && tab !== activeTab && activeTab === 'writing' && writingMode === 'edit' && editDraft.trim()) {
      showConfirm({
        title: translator('confirm.unsavedEdits'),
        message: translator('confirm.unsavedEditsMsg'),
        variant: 'warning',
        confirmLabel: translator('confirm.switch'),
        cancelLabel: translator('confirm.keepEditing'),
        onConfirm: () => {
          closeConfirm();
          setActiveTab(tab);
          scrollReset();
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        },
      });
      return;
    }

    setActiveTab(tab);
    scrollReset();
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, [
    activeTab,
    closeConfirm,
    currentSessionId,
    editDraft,
    flushPendingDraft,
    setActiveTab,
    setIsSidebarOpen,
    showConfirm,
    translator,
    writingMode,
  ]);
}
