import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';

export type LeftPanelType = 'explorer' | 'glossary' | 'history' | 'settings' | 'backup' | 'multilang' | null;
// [2026-05-08 시장 분석 4차 P0] adoption / signoff 추가 — dual workflow.
export type RightPanelType = 'actions' | 'chat' | 'audit' | 'localization' | 'reference' | 'adoption' | 'signoff' | null;
export type BottomPanelType = 'terminal' | 'problems' | null;

interface TranslatorLayoutState {
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  activeLeftPanel: LeftPanelType;
  activeRightPanel: RightPanelType;
  activeBottomPanel: BottomPanelType;
  isBilateralVertical: boolean;
  editorSplitRatio: number; // 0.0 to 1.0, default 0.5
  
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  setActiveLeftPanel: (panel: LeftPanelType) => void;
  setActiveRightPanel: (panel: RightPanelType) => void;
  setActiveBottomPanel: (panel: BottomPanelType) => void;
  setIsBilateralVertical: (isVertical: boolean) => void;
  setEditorSplitRatio: (ratio: number) => void;
}

const TranslatorLayoutContext = createContext<TranslatorLayoutState | null>(null);

const STORAGE_KEY = 'eh_translator_layout_state_v1';
export const TRANSLATOR_LAYOUT_LIMITS = {
  leftMin: 160,
  leftStoredMax: 4600,
  rightMin: 200,
  rightStoredMax: 4600,
  editorSplitMin: 0.12,
  editorSplitMax: 0.88,
} as const;

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

export function clampEditorSplitRatio(value: unknown): number {
  return clampNumber(
    value,
    TRANSLATOR_LAYOUT_LIMITS.editorSplitMin,
    TRANSLATOR_LAYOUT_LIMITS.editorSplitMax,
    0.5,
  );
}

function getViewportAwareSidebarMax(staticMax: number, min: number): number {
  if (typeof window === 'undefined') return staticMax;
  const editorSafetyWidth = Math.min(720, Math.max(360, window.innerWidth * 0.24));
  return Math.max(min, Math.min(staticMax, window.innerWidth - editorSafetyWidth));
}

export function TranslatorLayoutProvider({ children }: { children: ReactNode }) {
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(256);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(380);
  const [activeLeftPanel, setActiveLeftPanel] = useState<LeftPanelType>(null);
  const [activeRightPanel, setActiveRightPanel] = useState<RightPanelType>(null);
  const [activeBottomPanel, setActiveBottomPanel] = useState<BottomPanelType>(null);
  const [isBilateralVertical, setIsBilateralVertical] = useState(false);
  const [editorSplitRatio, setEditorSplitRatio] = useState(0.5);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.leftSidebarWidth) {
          setLeftSidebarWidth(
            clampNumber(
              parsed.leftSidebarWidth,
              TRANSLATOR_LAYOUT_LIMITS.leftMin,
              getViewportAwareSidebarMax(
                TRANSLATOR_LAYOUT_LIMITS.leftStoredMax,
                TRANSLATOR_LAYOUT_LIMITS.leftMin,
              ),
              256,
            ),
          );
        }
        if (parsed.rightSidebarWidth) {
          setRightSidebarWidth(
            clampNumber(
              parsed.rightSidebarWidth,
              TRANSLATOR_LAYOUT_LIMITS.rightMin,
              getViewportAwareSidebarMax(
                TRANSLATOR_LAYOUT_LIMITS.rightStoredMax,
                TRANSLATOR_LAYOUT_LIMITS.rightMin,
              ),
              380,
            ),
          );
        }
        if (parsed.activeLeftPanel !== undefined) setActiveLeftPanel(parsed.activeLeftPanel);
        if (parsed.activeRightPanel !== undefined) setActiveRightPanel(parsed.activeRightPanel);
        if (parsed.activeBottomPanel !== undefined) setActiveBottomPanel(parsed.activeBottomPanel);
        if (parsed.isBilateralVertical !== undefined) setIsBilateralVertical(parsed.isBilateralVertical);
        if (parsed.editorSplitRatio !== undefined) setEditorSplitRatio(clampEditorSplitRatio(parsed.editorSplitRatio));
      }
    } catch {
      // invalid cache
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        leftSidebarWidth,
        rightSidebarWidth,
        activeLeftPanel,
        activeRightPanel,
        activeBottomPanel,
        isBilateralVertical,
        editorSplitRatio
      }));
    }, 500);
    return () => clearTimeout(timeout);
  }, [loaded, leftSidebarWidth, rightSidebarWidth, activeLeftPanel, activeRightPanel, activeBottomPanel, isBilateralVertical, editorSplitRatio]);

  // [수리 L1 — 2026-06-07] rank 4 adversarial: context value 가 매 렌더 새 객체로 생성되어
  // consumer (TranslatorShell.panelBindings 등) 의 useMemo[layout] 가 churn → useRegisterActions
  // 가 매 렌더 unregister/re-register. useState setter 는 stable 이므로 state 값만 deps 로 충분.
  const value = useMemo<TranslatorLayoutState>(() => ({
    leftSidebarWidth,
    rightSidebarWidth,
    activeLeftPanel,
    activeRightPanel,
    activeBottomPanel,
    isBilateralVertical,
    editorSplitRatio,
    setLeftSidebarWidth,
    setRightSidebarWidth,
    setActiveLeftPanel,
    setActiveRightPanel,
    setActiveBottomPanel,
    setIsBilateralVertical,
    setEditorSplitRatio,
  }), [
    leftSidebarWidth,
    rightSidebarWidth,
    activeLeftPanel,
    activeRightPanel,
    activeBottomPanel,
    isBilateralVertical,
    editorSplitRatio,
  ]);

  return (
    <TranslatorLayoutContext.Provider value={value}>
      {children}
    </TranslatorLayoutContext.Provider>
  );
}

export function useTranslatorLayout() {
  const context = useContext(TranslatorLayoutContext);
  if (!context) {
    throw new Error('useTranslatorLayout must be used within a TranslatorLayoutProvider');
  }
  return context;
}
