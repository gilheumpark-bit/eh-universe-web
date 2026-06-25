"use client";

import { useCallback, useReducer, type Dispatch, type SetStateAction } from 'react';
import type { Project } from '@/lib/studio-types';

export type MoveSessionModalState = { sessionId: string; others: Project[] } | null;

export interface StudioShellUiState {
  historyFilter: string;
  historyScope: 'project' | 'all';
  moveModal: MoveSessionModalState;
  rightPanelOpen: boolean;
  mobileDrawerOpen: boolean;
  saveSlotModalOpen: boolean;
  saveSlotName: string;
  showGlobalSearch: boolean;
  globalSearchQuery: string;
  renameDialogOpen: boolean;
}

type StudioShellUiAction = Partial<StudioShellUiState> | ((prev: StudioShellUiState) => Partial<StudioShellUiState>);

const INITIAL_UI_STATE: StudioShellUiState = {
  historyFilter: 'ALL',
  historyScope: 'project',
  moveModal: null,
  rightPanelOpen: false,
  mobileDrawerOpen: false,
  saveSlotModalOpen: false,
  saveSlotName: '',
  showGlobalSearch: false,
  globalSearchQuery: '',
  renameDialogOpen: false,
};

function reduceUiState(state: StudioShellUiState, action: StudioShellUiAction): StudioShellUiState {
  const next = typeof action === 'function' ? action(state) : action;
  return { ...state, ...next };
}

function resolveSetState<T>(value: SetStateAction<T>, previous: T): T {
  return typeof value === 'function'
    ? (value as (prev: T) => T)(previous)
    : value;
}

export interface StudioShellUiApi extends StudioShellUiState {
  dispatchUi: Dispatch<StudioShellUiAction>;
  setHistoryFilter: Dispatch<SetStateAction<string>>;
  setHistoryScope: Dispatch<SetStateAction<'project' | 'all'>>;
  setMoveModal: Dispatch<SetStateAction<MoveSessionModalState>>;
  setRightPanelOpen: Dispatch<SetStateAction<boolean>>;
  setMobileDrawerOpen: Dispatch<SetStateAction<boolean>>;
  setSaveSlotModalOpen: Dispatch<SetStateAction<boolean>>;
  setSaveSlotName: Dispatch<SetStateAction<string>>;
  setShowGlobalSearch: Dispatch<SetStateAction<boolean>>;
  setGlobalSearchQuery: Dispatch<SetStateAction<string>>;
}

export function useStudioShellUiState(): StudioShellUiApi {
  const [uiState, dispatchUi] = useReducer(reduceUiState, INITIAL_UI_STATE);

  const setHistoryFilter = useCallback<Dispatch<SetStateAction<string>>>(
    (value) => dispatchUi((state) => ({ historyFilter: resolveSetState(value, state.historyFilter) })),
    [],
  );
  const setHistoryScope = useCallback<Dispatch<SetStateAction<'project' | 'all'>>>(
    (value) => dispatchUi((state) => ({ historyScope: resolveSetState(value, state.historyScope) })),
    [],
  );
  const setMoveModal = useCallback<Dispatch<SetStateAction<MoveSessionModalState>>>(
    (value) => dispatchUi((state) => ({ moveModal: resolveSetState(value, state.moveModal) })),
    [],
  );
  const setRightPanelOpen = useCallback<Dispatch<SetStateAction<boolean>>>(
    (value) => dispatchUi((state) => ({ rightPanelOpen: resolveSetState(value, state.rightPanelOpen) })),
    [],
  );
  const setMobileDrawerOpen = useCallback<Dispatch<SetStateAction<boolean>>>(
    (value) => dispatchUi((state) => ({ mobileDrawerOpen: resolveSetState(value, state.mobileDrawerOpen) })),
    [],
  );
  const setSaveSlotModalOpen = useCallback<Dispatch<SetStateAction<boolean>>>(
    (value) => dispatchUi((state) => ({ saveSlotModalOpen: resolveSetState(value, state.saveSlotModalOpen) })),
    [],
  );
  const setSaveSlotName = useCallback<Dispatch<SetStateAction<string>>>(
    (value) => dispatchUi((state) => ({ saveSlotName: resolveSetState(value, state.saveSlotName) })),
    [],
  );
  const setShowGlobalSearch = useCallback<Dispatch<SetStateAction<boolean>>>(
    (value) => dispatchUi((state) => ({ showGlobalSearch: resolveSetState(value, state.showGlobalSearch) })),
    [],
  );
  const setGlobalSearchQuery = useCallback<Dispatch<SetStateAction<string>>>(
    (value) => dispatchUi((state) => ({ globalSearchQuery: resolveSetState(value, state.globalSearchQuery) })),
    [],
  );

  return {
    ...uiState,
    dispatchUi,
    setHistoryFilter,
    setHistoryScope,
    setMoveModal,
    setRightPanelOpen,
    setMobileDrawerOpen,
    setSaveSlotModalOpen,
    setSaveSlotName,
    setShowGlobalSearch,
    setGlobalSearchQuery,
  };
}
