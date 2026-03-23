'use client';

import React, { Component, ComponentType } from 'react';

interface Props {
  children: React.ReactNode;
  language?: 'KO' | 'EN';
}

interface State {
  error: Error | null;
}

const TEXT = {
  KO: { title: '문제가 발생했습니다', detail: '오류 상세:', retry: '다시 시도' },
  EN: { title: 'Something went wrong', detail: 'Error details:', retry: 'Try Again' },
} as const;

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    const t = TEXT[this.props.language ?? 'KO'];

    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 bg-bg-secondary rounded-xl min-h-[200px]">
        <h2 className="text-accent-red text-lg font-semibold">{t.title}</h2>
        <p className="text-text-tertiary text-sm">{t.detail}</p>
        <pre className="text-text-primary text-xs font-[family-name:var(--font-mono)] bg-black/30 rounded-md px-4 py-2 max-w-full overflow-auto whitespace-pre-wrap break-all">
          {this.state.error.message}
        </pre>
        <button
          onClick={this.handleReset}
          aria-label={t.retry}
          className="px-4 py-2 text-sm rounded-lg bg-accent-purple/20 text-accent-purple hover:bg-accent-purple/30 transition-colors"
        >
          {t.retry}
        </button>
      </div>
    );
  }
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  language?: 'KO' | 'EN',
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const Wrapped = (props: P) => (
    <ErrorBoundary language={language}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  Wrapped.displayName = `withErrorBoundary(${displayName})`;
  return Wrapped;
}

export default ErrorBoundary;
