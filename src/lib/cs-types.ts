/* ── File System ── */

export interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: FileNode[];
}

export interface OpenFile {
  id: string;
  name: string;
  content: string;
  language: string;
}

/* ── AI Chat ── */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  codeBlock?: {
    original: string;
    modified: string;
    language: string;
  };
  /** True while the streaming response is inside a code block */
  isStreamingCode?: boolean;
  /** Token usage for this message */
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/* ── CSL Pipeline (canonical types in pipeline/types.ts) ── */

export type { PipelineStage, TeamResult as PipelineStageResult, PipelineResult } from "./pipeline/types";
export type { Finding, Suggestion, TeamStatus, Severity } from "./pipeline/types";

/* ── AI Provider ── */

export type AIProvider = "gemini" | "openai" | "anthropic" | "ollama" | "groq";

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  endpoint?: string;  // for ollama / custom
}

/* ── Settings ── */

export interface IDESettings {
  theme: "dark" | "light";
  fontSize: number;
  tabSize: number;
  wordWrap: "on" | "off";
  minimap: boolean;
  aiProvider: AIConfig;
}
