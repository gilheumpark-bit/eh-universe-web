"use client";

import React, { createContext, useContext, useReducer, useCallback, useTransition, useMemo } from "react";
import type { OpenFile, PipelineResult } from "@/lib/types";
import type { IDESettings } from "./SettingsPanel";
import { loadSettings } from "./SettingsPanel";
import type { BugScanResult } from "@/lib/bug-finder";

// ── Types ──

export type RightPanel = "chat" | "agent" | "composer" | "collab" | "autopilot" | "ai-workspace" | "none";
export type CenterView = "editor" | "canvas" | "split" | "preview" | "diff-editor";
export type LeftPanel = "files" | "search" | "git" | "outline" | "packages" | "ai" | "quality" | "tools" | "deploy" | "collab" | "settings";

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
  showQuickOpen: boolean;
  settings: IDESettings;
  sidebarVisible: boolean;
  diffData: { original: string; modified: string } | null;
  pipelineResult: PipelineResult | null;
  showProblems: boolean;
  bugScanResult: BugScanResult | null;
  sidebarWidth: number;
  rightWidth: number;
  editorSelection: string;
  cursorLine: number | undefined;
  cursorColumn: number | undefined;
  goToLine: number | null;
  splitFileId: string | null;
  showKeybindings: boolean;
  showSymbolPalette: boolean;
  confirmDelete: { id: string; name: string } | null;
  showOnboarding: boolean;
  showShortcutOverlay: boolean;
  quickAction: { text: string; position: { top: number; left: number }; language: string } | null;
  showDatabase: boolean;
  showAPIKeyConfig: boolean;
  showRecentFiles: boolean;
  showTemplateGallery: boolean;
  useSplitTerminal: boolean;
  showCodeCreator: boolean;
  showDashboard: boolean;
  showProjectSpec: boolean;
  showEvaluation: boolean;
  showDeploy: boolean;
  buildError: { message: string; stack?: string; file?: string; line?: number } | null;
  mountedPanels: Set<string>;
}

// ── Actions ──

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
  | { type: "TOGGLE_CENTER_VIEW"; payload: CenterView }
  | { type: "TOGGLE"; payload: keyof Pick<IDEState, "showTerminal" | "showPipeline" | "showDiff" | "showPalette" | "showSettings" | "showQuickOpen" | "showProblems" | "showDatabase" | "showAPIKeyConfig" | "showRecentFiles" | "showTemplateGallery" | "useSplitTerminal" | "showCodeCreator" | "showDashboard" | "showProjectSpec" | "showEvaluation" | "showDeploy" | "showKeybindings" | "showSymbolPalette" | "showShortcutOverlay" | "sidebarVisible" | "showOnboarding"> }
  | { type: "SET_BOOL"; payload: { key: keyof IDEState; value: boolean } }
  | { type: "SET_SETTINGS"; payload: IDESettings | ((prev: IDESettings) => IDESettings) }
  | { type: "SET_DIFF_DATA"; payload: { original: string; modified: string } | null }
  | { type: "SET_PIPELINE_RESULT"; payload: PipelineResult | null }
  | { type: "SET_BUG_SCAN_RESULT"; payload: BugScanResult | null }
  | { type: "SET_SIDEBAR_WIDTH"; payload: number }
  | { type: "SET_RIGHT_WIDTH"; payload: number }
  | { type: "SET_EDITOR_SELECTION"; payload: string }
  | { type: "SET_CURSOR"; payload: { line?: number; column?: number } }
  | { type: "SET_GO_TO_LINE"; payload: number | null }
  | { type: "SET_SPLIT_FILE_ID"; payload: string | null }
  | { type: "SET_CONFIRM_DELETE"; payload: { id: string; name: string } | null }
  | { type: "SET_QUICK_ACTION"; payload: IDEState["quickAction"] }
  | { type: "SET_BUILD_ERROR"; payload: IDEState["buildError"] }
  | { type: "ADD_MOUNTED_PANEL"; payload: string }
  | { type: "RENAME_OPEN_FILE"; payload: { id: string; name: string; language: string } };

// ── Initial State ──

export function createInitialState(): IDEState {
  return {
    openFiles: [],
    activeFileId: null,
    rightPanel: "chat",
    leftPanel: "files",
    centerView: "editor",
    showTerminal: false,
    showPipeline: false,
    showDiff: false,
    showPalette: false,
    showSettings: false,
    showQuickOpen: false,
    settings: loadSettings(),
    sidebarVisible: true,
    diffData: null,
    pipelineResult: null,
    showProblems: false,
    bugScanResult: null,
    sidebarWidth: 240,
    rightWidth: 360,
    editorSelection: "",
    cursorLine: undefined,
    cursorColumn: undefined,
    goToLine: null,
    splitFileId: null,
    showKeybindings: false,
    showSymbolPalette: false,
    confirmDelete: null,
    showOnboarding: true,
    showShortcutOverlay: false,
    quickAction: null,
    showDatabase: false,
    showAPIKeyConfig: false,
    showRecentFiles: false,
    showTemplateGallery: false,
    useSplitTerminal: false,
    showCodeCreator: false,
    showDashboard: false,
    showProjectSpec: false,
    showEvaluation: false,
    showDeploy: false,
    buildError: null,
    mountedPanels: new Set(),
  };
}

// ── Reducer ──

export function ideReducer(state: IDEState, action: IDEAction): IDEState {
  switch (action.type) {
    case "SET_OPEN_FILES":
      return { ...state, openFiles: action.payload };
    case "ADD_OPEN_FILE":
      return { ...state, openFiles: [...state.openFiles, action.payload] };
    case "CLOSE_FILE":
      return {
        ...state,
        openFiles: state.openFiles.filter((f) => f.id !== action.payload),
        activeFileId:
          state.activeFileId === action.payload
            ? (state.openFiles.length > 1 ? state.openFiles[0].id : null)
            : state.activeFileId,
      };
    case "UPDATE_FILE_CONTENT":
      return {
        ...state,
        openFiles: state.openFiles.map((f) =>
          f.id === action.payload.id ? { ...f, content: action.payload.content } : f
        ),
      };
    case "RENAME_OPEN_FILE":
      return {
        ...state,
        openFiles: state.openFiles.map((f) =>
          f.id === action.payload.id
            ? { ...f, name: action.payload.name, language: action.payload.language }
            : f
        ),
      };
    case "SET_ACTIVE_FILE":
      return { ...state, activeFileId: action.payload };
    case "SET_RIGHT_PANEL":
      return { ...state, rightPanel: action.payload };
    case "TOGGLE_RIGHT_PANEL":
      return { ...state, rightPanel: state.rightPanel === action.payload ? "none" : action.payload };
    case "SET_LEFT_PANEL":
      return { ...state, leftPanel: action.payload };
    case "SET_CENTER_VIEW":
      return { ...state, centerView: action.payload };
    case "TOGGLE_CENTER_VIEW":
      return { ...state, centerView: state.centerView === action.payload ? "editor" : action.payload };
    case "TOGGLE": {
      const key = action.payload;
      const current = state[key];
      if (typeof current !== "boolean") return state;
      return { ...state, [key]: !current };
    }
    case "SET_BOOL":
      return { ...state, [action.payload.key]: action.payload.value };
    case "SET_SETTINGS": {
      const next = typeof action.payload === "function" ? action.payload(state.settings) : action.payload;
      return { ...state, settings: next };
    }
    case "SET_DIFF_DATA":
      return { ...state, diffData: action.payload };
    case "SET_PIPELINE_RESULT":
      return { ...state, pipelineResult: action.payload };
    case "SET_BUG_SCAN_RESULT":
      return { ...state, bugScanResult: action.payload };
    case "SET_SIDEBAR_WIDTH":
      return { ...state, sidebarWidth: Math.max(150, Math.min(500, action.payload)) };
    case "SET_RIGHT_WIDTH":
      return { ...state, rightWidth: Math.max(250, Math.min(600, action.payload)) };
    case "SET_EDITOR_SELECTION":
      return { ...state, editorSelection: action.payload };
    case "SET_CURSOR":
      return { ...state, cursorLine: action.payload.line, cursorColumn: action.payload.column };
    case "SET_GO_TO_LINE":
      return { ...state, goToLine: action.payload };
    case "SET_SPLIT_FILE_ID":
      return { ...state, splitFileId: action.payload };
    case "SET_CONFIRM_DELETE":
      return { ...state, confirmDelete: action.payload };
    case "SET_QUICK_ACTION":
      return { ...state, quickAction: action.payload };
    case "SET_BUILD_ERROR":
      return { ...state, buildError: action.payload };
    case "ADD_MOUNTED_PANEL": {
      if (state.mountedPanels.has(action.payload)) return state;
      const next = new Set(state.mountedPanels);
      next.add(action.payload);
      return { ...state, mountedPanels: next };
    }
    default:
      return state;
  }
}

// ── Context ──

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
    [startTransition]
  );

  const value = useMemo(() => ({ state, dispatch, closeModal }), [state, dispatch, closeModal]);

  return <IDEContext.Provider value={value}>{children}</IDEContext.Provider>;
}

export function useIDE(): IDEContextValue {
  const ctx = useContext(IDEContext);
  if (!ctx) throw new Error("useIDE must be used within <IDEProvider>");
  return ctx;
}
