'use client';

import React, { Component } from 'react';
import { L4 } from '@/lib/i18n';
import { useLang } from '@/lib/LangContext';
import type { Lang } from '@/lib/LangContext';

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

/** Functional fallback UI — uses useLang() for i18n */
function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { lang } = useLang();

  return (
    <div className="flex flex-col items-center justify-center gap-5 p-12 min-h-[50vh]" role="alert">
      <div className="text-red-400 text-xl font-bold">
        {L4(lang, {
          ko: '문제가 발생했습니다',
          en: 'Something went wrong',
          jp: '問題が発生しました',
          cn: '出现了问题',
        })}
      </div>
      <p className="text-text-tertiary text-sm text-center max-w-md">
        {L4(lang, {
          ko: '예상치 못한 오류가 발생했습니다. 아래 버튼을 눌러 다시 시도하거나, 문제가 지속되면 새로고침해 주세요.',
          en: 'An unexpected error occurred. Try again or refresh the page if the problem persists.',
          jp: '予期しないエラーが発生しました。下のボタンで再試行するか、問題が続く場合はページを更新してください。',
          cn: '发生了意外错误。请点击下方按钮重试，如果问题持续存在，请刷新页面。',
        })}
      </p>
      <pre className="text-gray-300 text-xs bg-black/50 rounded-lg px-4 py-2 max-w-full overflow-auto whitespace-pre-wrap break-all border border-red-500/20">
        {error.message}
      </pre>
      <div className="flex items-center gap-3">
        <button
          onClick={onRetry}
          className="px-6 py-2.5 text-sm font-bold rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:scale-[1.03] hover:shadow-lg hover:shadow-red-500/10 active:scale-[0.97] transition-all duration-200"
        >
          {L4(lang, {
            ko: '다시 시도',
            en: 'Retry',
            jp: '再試行',
            cn: '重试',
          })}
        </button>
        <a
          href="/"
          className="px-6 py-2.5 text-sm font-bold rounded-xl bg-white/5 border border-border text-text-secondary hover:bg-white/10 hover:scale-[1.03] hover:shadow-lg hover:shadow-black/20 active:scale-[0.97] transition-all duration-200"
        >
          {L4(lang, {
            ko: '홈으로',
            en: 'Go Home',
            jp: 'ホームへ',
            cn: '回到首页',
          })}
        </a>
      </div>
    </div>
  );
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

    return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
  }
}

export default RouteErrorBoundary;

// IDENTITY_SEAL: PART-1 | role=route-level error boundary | inputs=children | outputs=error fallback UI
