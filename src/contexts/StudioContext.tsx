'use client';

// ============================================================
// StudioContext — 스튜디오 전역 상태 공유
// prop drilling 제거 목적. 변경 빈도별 2개 Context로 분리.
// ============================================================

import { createContext, useContext } from 'react';
import type { AppLanguage, AppTab, StoryConfig, ChatSession, Project } from '@/lib/studio-types';

// ============================================================
// PART 1 — Config Context (저빈도 변경: 언어, 세션, 설정)
// ============================================================

interface StudioConfigContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  isKO: boolean;
  currentSession: ChatSession | null;
  currentSessionId: string | null;
  currentProjectId: string | null;
  config: StoryConfig | null;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>> | ((update: StoryConfig) => void);
  projects: Project[];
  hasAiAccess: boolean;
  studioMode: 'guided' | 'free';
  setStudioMode: (mode: 'guided' | 'free') => void;
}

const StudioConfigContext = createContext<StudioConfigContextType | null>(null);

export function StudioConfigProvider({ value, children }: { value: StudioConfigContextType; children: React.ReactNode }) {
  return <StudioConfigContext.Provider value={value}>{children}</StudioConfigContext.Provider>;
}

export function useStudioConfig(): StudioConfigContextType {
  const ctx = useContext(StudioConfigContext);
  if (!ctx) throw new Error('useStudioConfig must be used within StudioConfigProvider');
  return ctx;
}

// ============================================================
// PART 2 — UI Context (고빈도 변경: 탭, 모달, UX)
// ============================================================

interface StudioUIContextType {
  activeTab: AppTab;
  handleTabChange: (tab: AppTab) => void;
  showConfirm: (opts: {
    title: string; message: string;
    confirmLabel?: string; cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }) => void;
  closeConfirm: () => void;
  setUxError: (err: { error: unknown; retry?: () => void } | null) => void;
  triggerSave: () => void;
  saveFlash: boolean;
}

const StudioUIContext = createContext<StudioUIContextType | null>(null);

export function StudioUIProvider({ value, children }: { value: StudioUIContextType; children: React.ReactNode }) {
  return <StudioUIContext.Provider value={value}>{children}</StudioUIContext.Provider>;
}

export function useStudioUI(): StudioUIContextType {
  const ctx = useContext(StudioUIContext);
  if (!ctx) throw new Error('useStudioUI must be used within StudioUIProvider');
  return ctx;
}
