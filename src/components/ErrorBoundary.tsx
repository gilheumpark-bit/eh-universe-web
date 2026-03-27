'use client';

import React, { Component } from 'react';

// ============================================================
// PART 1 — Top-level Error Boundary for route segments
// ============================================================
// Catches uncaught errors in any subtree and shows a user-friendly
// fallback with retry. Logs to console.error for observability.

interface Props {
  children: React.ReactNode;
  /** Section label shown in error UI */
  section?: string;
}

interface State {
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`[RouteErrorBoundary:${this.props.section || 'unknown'}]`, error);
    console.error('[RouteErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center gap-5 p-12 min-h-[50vh]">
        <div className="text-red-400 text-xl font-bold">
          문제가 발생했습니다
        </div>
        <p className="text-gray-400 text-sm text-center max-w-md">
          예상치 못한 오류가 발생했습니다. 아래 버튼을 눌러 다시 시도하거나, 문제가 지속되면 새로고침해 주세요.
        </p>
        <p className="text-gray-500 text-xs text-center max-w-md">
          An unexpected error occurred. Try again or refresh the page if the problem persists.
        </p>
        <pre className="text-gray-300 text-xs bg-black/50 rounded-lg px-4 py-2 max-w-full overflow-auto whitespace-pre-wrap break-all border border-red-500/20">
          {this.state.error.message}
        </pre>
        <button
          onClick={this.handleRetry}
          className="px-6 py-2.5 text-sm font-bold rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
        >
          다시 시도 / Retry
        </button>
      </div>
    );
  }
}

export default RouteErrorBoundary;

// IDENTITY_SEAL: PART-1 | role=route-level error boundary | inputs=children | outputs=error fallback UI
