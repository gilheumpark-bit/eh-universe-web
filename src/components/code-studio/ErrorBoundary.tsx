"use client";

// ============================================================
// PART 1 — Error Reporting Utility
// ============================================================

import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, ClipboardCopy } from "lucide-react";

const LOG_KEY = "__eh_code_studio_error_log";

/** Report error to session storage ring buffer (last 50 entries) */
export function reportError(error: Error, context?: string): void {
  const entry = {
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack?.slice(0, 500),
    context: context ?? "ErrorBoundary",
    url: typeof window !== "undefined" ? window.location.href : "",
  };

  try {
    const existing: unknown[] = JSON.parse(sessionStorage.getItem(LOG_KEY) || "[]");
    existing.push(entry);
    if (existing.length > 50) existing.shift();
    sessionStorage.setItem(LOG_KEY, JSON.stringify(existing));
  } catch {
    /* sessionStorage unavailable */
  }

  console.error(`[EH CodeStudio Error] ${entry.context}:`, error);
}

// Global unhandled error capture
if (typeof window !== "undefined") {
  window.addEventListener("error", (e) =>
    reportError(e.error ?? new Error(e.message), "window.onerror"),
  );
  window.addEventListener("unhandledrejection", (e) =>
    reportError(
      e.reason instanceof Error ? e.reason : new Error(String(e.reason)),
      "unhandledrejection",
    ),
  );
}

// IDENTITY_SEAL: PART-1 | role=ErrorReporter | inputs=Error | outputs=sessionStorage-log

// ============================================================
// PART 2 — ErrorBoundary Class Component
// ============================================================

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error): void {
    reportError(error, "ErrorBoundary.componentDidCatch");
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  private handleCopyError = () => {
    const msg = this.state.error?.stack ?? this.state.error?.message ?? "Unknown error";
    navigator.clipboard.writeText(msg).catch(() => {
      /* clipboard unavailable */
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const rawMsg = this.state.error?.message ?? "Unknown error";
      // Sanitize file paths for display
      let sanitized = rawMsg.replace(/(?:[A-Za-z]:)?[/\\][\w./\\-]+/g, "[path]");
      sanitized = sanitized.replace(/\s+at\s+[\w.<>]+\s*\(.*?\)/g, "");
      if (sanitized.length > 200) sanitized = sanitized.slice(0, 200) + "...";

      return (
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center bg-[#0a0e17]">
          <AlertTriangle size={32} className="text-amber-400" />
          <p className="text-sm font-semibold text-text-primary">
            {this.props.fallbackMessage ?? "An error occurred"}
          </p>
          <p className="text-xs text-text-tertiary max-w-md leading-relaxed">
            {sanitized.trim() || "Unknown error"}
          </p>
          {this.state.error?.stack && (
            <details className="text-[10px] text-text-tertiary max-w-lg w-full">
              <summary className="cursor-pointer hover:text-text-primary transition-colors">
                Stack trace
              </summary>
              <pre className="mt-1 p-2 bg-white/5 rounded text-left overflow-x-auto whitespace-pre-wrap break-all">
                {this.state.error.stack.slice(0, 800)}
              </pre>
            </details>
          )}
          <div className="flex gap-2">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors"
            >
              <RotateCcw size={12} /> Retry
            </button>
            <button
              onClick={this.handleCopyError}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white/5 text-text-tertiary rounded hover:bg-white/10 transition-colors"
            >
              <ClipboardCopy size={12} /> Copy Error
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// IDENTITY_SEAL: PART-2 | role=ErrorBoundaryUI | inputs=children | outputs=error-fallback-or-children
