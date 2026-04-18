import { create } from 'zustand';
import type { WritingMode } from '@/lib/studio-types';

interface StudioUIState {
  // Layout & Visibility
  focusMode: boolean;
  setFocusMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  
  showSearch: boolean;
  setShowSearch: (val: boolean | ((prev: boolean) => boolean)) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  
  showShortcuts: boolean;
  setShowShortcuts: (val: boolean | ((prev: boolean) => boolean)) => void;
  
  showGlobalSearch: boolean;
  setShowGlobalSearch: (val: boolean | ((prev: boolean) => boolean)) => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (val: string) => void;

  showApiKeyModal: boolean;
  setShowApiKeyModal: (val: boolean | ((prev: boolean) => boolean)) => void;

  showDashboard: boolean;
  setShowDashboard: (val: boolean | ((prev: boolean) => boolean)) => void;
  
  rightPanelOpen: boolean;
  setRightPanelOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  
  mobileDrawerOpen: boolean;
  setMobileDrawerOpen: (val: boolean | ((prev: boolean) => boolean)) => void;

  // Episode Explorer panel
  episodeExplorerOpen: boolean;
  setEpisodeExplorerOpen: (val: boolean | ((prev: boolean) => boolean)) => void;

  // Core Writing/Drafting state
  writingMode: WritingMode;
  setWritingMode: (val: WritingMode) => void;
  
  editDraft: string;
  setEditDraft: (val: string) => void;
  
  canvasContent: string;
  setCanvasContent: (val: string) => void;
  
  canvasPass: number;
  setCanvasPass: (val: number | ((prev: number) => number)) => void;
  
  promptDirective: string;
  setPromptDirective: (val: string) => void;
}

export const useStudioUIStore = create<StudioUIState>((set) => ({
  focusMode: false,
  setFocusMode: (val) => set((state) => ({ focusMode: typeof val === 'function' ? val(state.focusMode) : val })),
  
  isSidebarOpen: true,
  setIsSidebarOpen: (val) => set((state) => ({ isSidebarOpen: typeof val === 'function' ? val(state.isSidebarOpen) : val })),
  
  showSearch: false,
  setShowSearch: (val) => set((state) => ({ showSearch: typeof val === 'function' ? val(state.showSearch) : val })),
  
  searchQuery: '',
  setSearchQuery: (val) => set({ searchQuery: val }),
  
  showShortcuts: false,
  setShowShortcuts: (val) => set((state) => ({ showShortcuts: typeof val === 'function' ? val(state.showShortcuts) : val })),
  
  showGlobalSearch: false,
  setShowGlobalSearch: (val) => set((state) => ({ showGlobalSearch: typeof val === 'function' ? val(state.showGlobalSearch) : val })),
  
  globalSearchQuery: '',
  setGlobalSearchQuery: (val) => set({ globalSearchQuery: val }),

  showApiKeyModal: false,
  setShowApiKeyModal: (val) => set((state) => ({ showApiKeyModal: typeof val === 'function' ? val(state.showApiKeyModal) : val })),

  showDashboard: false,
  setShowDashboard: (val) => set((state) => ({ showDashboard: typeof val === 'function' ? val(state.showDashboard) : val })),

  rightPanelOpen: false,
  setRightPanelOpen: (val) => set((state) => ({ rightPanelOpen: typeof val === 'function' ? val(state.rightPanelOpen) : val })),

  mobileDrawerOpen: false,
  setMobileDrawerOpen: (val) => set((state) => ({ mobileDrawerOpen: typeof val === 'function' ? val(state.mobileDrawerOpen) : val })),

  episodeExplorerOpen: false,
  setEpisodeExplorerOpen: (val) => set((state) => ({ episodeExplorerOpen: typeof val === 'function' ? val(state.episodeExplorerOpen) : val })),

  writingMode: 'ai',
  setWritingMode: (val) => set({ writingMode: val }),
  
  editDraft: '',
  setEditDraft: (val) => set({ editDraft: val }),
  
  canvasContent: '',
  setCanvasContent: (val) => set({ canvasContent: val }),
  
  canvasPass: 0,
  setCanvasPass: (val) => set((state) => ({ canvasPass: typeof val === 'function' ? val(state.canvasPass) : val })),
  
  promptDirective: '',
  setPromptDirective: (val) => set({ promptDirective: val }),
}));
