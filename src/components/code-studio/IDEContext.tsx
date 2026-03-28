"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React, { createContext, useContext, useReducer, useCallback, useTransition, useMemo } from "react";
import type { OpenFile, CodeStudioSettings } from "@/lib/code-studio-types";
import { DEFAULT_SETTINGS } from "@/lib/code-studio-types";

export type RightPanel = "chat" | "agent" | "composer" | "collab" | "none";
export type CenterView = "editor" | "canvas" | "split" | "preview" | "diff-editor";
export type LeftPanel = "files" | "search" | "git" | "outline" | "packages" | "deploy" | "settings";

export interface IDEState {
  openFiles: OpenFile[];
  activeFileId: string | null;
  rightPanel: RightPanel;
  leftPanel: LeftPanel;
  centerView: CenterView;
  showTerminal: boolean;
  showPipeline: boolean;
  showDiff: boolean;
  showPalette: boolean;
  showSettings: boolean;
  settings: CodeStudioSettings;
  sidebarVisible: boolean;
  diffData: { original: string; modified: string } | null;
  sidebarWidth: number;
  rightWidth: number;
  editorSelection: string;
  cursorLine: number | undefined;
  cursorColumn: number | undefined;
  showKeybindings: boolean;
  showOnboarding: boolean;
  showAPIKeyConfig: boolean;
  showTemplateGallery: boolean;
  showEvaluation: boolean;
  showDeploy: boolean;
  showProjectSpec: boolean;
  buildError: { message: string; stack?: string; file?: string; line?: number } | null;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=IDEState,RightPanel,CenterView,LeftPanel

// ============================================================
// PART 2 — Actions & Reducer
// ============================================================

export type IDEAction =
  | { type: "SET_OPEN_FILES"; payload: OpenFile[] }
  | { type: "ADD_OPEN_FILE"; payload: OpenFile }
  | { type: "CLOSE_FILE"; payload: string }
  | { type: "UPDATE_FILE_CONTENT"; payload: { id: string; content: string } }
  | { type: "SET_ACTIVE_FILE"; payload: string | null }
  | { type: "SET_RIGHT_PANEL"; payload: RightPanel }
  | { type: "TOGGLE_RIGHT_PANEL"; payload: RightPanel }
  | { type: "SET_LEFT_PANEL"; payload: LeftPanel }
  | { type: "SET_CENTER_VIEW"; payload: CenterView }
  | { type: "TOGGLE"; payload: keyof Pick<IDEState, "showTerminal" | "showPipeline" | "showDiff" | "showPalette" | "showSettings" | "showKeybindings" | "showOnboarding" | "showAPIKeyConfig" | "showTemplateGallery" | "showEvaluation" | "showDeploy" | "showProjectSpec" | "sidebarVisible"> }
  | { type: "SET_BOOL"; payload: { key: keyof IDEState; value: boolean } }
  | { type: "SET_SETTINGS"; payload: CodeStudioSettings | ((prev: CodeStudioSettings) => CodeStudioSettings) }
  | { type: "SET_DIFF_DATA"; payload: { original: string; modified: string } | null }
  | { type: "SET_SIDEBAR_WIDTH"; payload: number }
  | { type: "SET_RIGHT_WIDTH"; payload: number }
  | { type: "SET_EDITOR_SELECTION"; payload: string }
  | { type: "SET_CURSOR"; payload: { line?: number; column?: number } }
  | { type: "SET_BUILD_ERROR"; payload: IDEState["buildError"] };

function loadSettings(): CodeStudioSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem("eh-code-studio-settings");
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

export function createInitialState(): IDEState {
  return {
    openFiles: [], activeFileId: null,
    rightPanel: "chat", leftPanel: "files", centerView: "editor",
    showTerminal: false, showPipeline: false, showDiff: false,
    showPalette: false, showSettings: false,
    settings: loadSettings(), sidebarVisible: true,
    diffData: null, sidebarWidth: 240, rightWidth: 360,
    editorSelection: "", cursorLine: undefined, cursorColumn: undefined,
    showKeybindings: false, showOnboarding: false,
    showAPIKeyConfig: false, showTemplateGallery: false,
    showEvaluation: false, showDeploy: false, showProjectSpec: false,
    buildError: null,
  };
}

export function ideReducer(state: IDEState, action: IDEAction): IDEState {
  switch (action.type) {
    case "SET_OPEN_FILES": return { ...state, openFiles: action.payload };
    case "ADD_OPEN_FILE": return { ...state, openFiles: [...state.openFiles, action.payload] };
    case "CLOSE_FILE": return {
      ...state,
      openFiles: state.openFiles.filter((f) => f.id !== action.payload),
      activeFileId: state.activeFileId === action.payload ? (state.openFiles[0]?.id ?? null) : state.activeFileId,
    };
    case "UPDATE_FILE_CONTENT": return { ...state, openFiles: state.openFiles.map((f) => f.id === action.payload.id ? { ...f, content: action.payload.content } : f) };
    case "SET_ACTIVE_FILE": return { ...state, activeFileId: action.payload };
    case "SET_RIGHT_PANEL": return { ...state, rightPanel: action.payload };
    case "TOGGLE_RIGHT_PANEL": return { ...state, rightPanel: state.rightPanel === action.payload ? "none" : action.payload };
    case "SET_LEFT_PANEL": return { ...state, leftPanel: action.payload };
    case "SET_CENTER_VIEW": return { ...state, centerView: action.payload };
    case "TOGGLE": {
      const key = action.payload;
      const current = state[key];
      if (typeof current !== "boolean") return state;
      return { ...state, [key]: !current };
    }
    case "SET_BOOL": return { ...state, [action.payload.key]: action.payload.value };
    case "SET_SETTINGS": {
      const next = typeof action.payload === "function" ? action.payload(state.settings) : action.payload;
      return { ...state, settings: next };
    }
    case "SET_DIFF_DATA": return { ...state, diffData: action.payload };
    case "SET_SIDEBAR_WIDTH": return { ...state, sidebarWidth: Math.max(150, Math.min(500, action.payload)) };
    case "SET_RIGHT_WIDTH": return { ...state, rightWidth: Math.max(250, Math.min(600, action.payload)) };
    case "SET_EDITOR_SELECTION": return { ...state, editorSelection: action.payload };
    case "SET_CURSOR": return { ...state, cursorLine: action.payload.line, cursorColumn: action.payload.column };
    case "SET_BUILD_ERROR": return { ...state, buildError: action.payload };
    default: return state;
  }
}

// IDENTITY_SEAL: PART-2 | role=Reducer | inputs=IDEState,IDEAction | outputs=IDEState

// ============================================================
// PART 3 — Context Provider
// ============================================================

interface IDEContextValue {
  state: IDEState;
  dispatch: React.Dispatch<IDEAction>;
  closeModal: (key: keyof IDEState) => void;
}

const IDEContext = createContext<IDEContextValue | null>(null);

export function IDEProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(ideReducer, undefined, createInitialState);
  const [, startTransition] = useTransition();

  const closeModal = useCallback(
    (key: keyof IDEState) => {
      startTransition(() => dispatch({ type: "SET_BOOL", payload: { key, value: false } }));
    },
    [startTransition],
  );

  const value = useMemo(() => ({ state, dispatch, closeModal }), [state, dispatch, closeModal]);

  return <IDEContext.Provider value={value}>{children}</IDEContext.Provider>;
}

export function useIDE(): IDEContextValue {
  const ctx = useContext(IDEContext);
  if (!ctx) throw new Error("useIDE must be used within <IDEProvider>");
  return ctx;
}

// IDENTITY_SEAL: PART-3 | role=Context | inputs=children | outputs=IDEContextValue
