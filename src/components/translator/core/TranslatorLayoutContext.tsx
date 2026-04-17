import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type LeftPanelType = 'explorer' | 'glossary' | 'history' | 'settings' | 'backup' | 'multilang' | null;
export type RightPanelType = 'actions' | 'chat' | 'audit' | 'reference' | null;
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

export function TranslatorLayoutProvider({ children }: { children: ReactNode }) {
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(256);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(380);
  const [activeLeftPanel, setActiveLeftPanel] = useState<LeftPanelType>('explorer');
  const [activeRightPanel, setActiveRightPanel] = useState<RightPanelType>('actions');
  const [activeBottomPanel, setActiveBottomPanel] = useState<BottomPanelType>(null);
  const [isBilateralVertical, setIsBilateralVertical] = useState(false);
  const [editorSplitRatio, setEditorSplitRatio] = useState(0.5);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.leftSidebarWidth) setLeftSidebarWidth(parsed.leftSidebarWidth);
        if (parsed.rightSidebarWidth) setRightSidebarWidth(parsed.rightSidebarWidth);
        if (parsed.activeLeftPanel !== undefined) setActiveLeftPanel(parsed.activeLeftPanel);
        if (parsed.activeRightPanel !== undefined) setActiveRightPanel(parsed.activeRightPanel);
        if (parsed.activeBottomPanel !== undefined) setActiveBottomPanel(parsed.activeBottomPanel);
        if (parsed.isBilateralVertical !== undefined) setIsBilateralVertical(parsed.isBilateralVertical);
        if (parsed.editorSplitRatio !== undefined) setEditorSplitRatio(parsed.editorSplitRatio);
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

  return (
    <TranslatorLayoutContext.Provider
      value={{
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
      }}
    >
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
