import React, { Component, ErrorInfo, ReactNode } from 'react';

// ============================================================
// SectionErrorBoundary — 섹션별 경량 에러 바운더리
// ============================================================

interface Props {
  children: ReactNode;
  /** 섹션 이름 (에러 메시지에 표시) */
  sectionName?: string;
  /** 폴백 높이 (기본 120px) */
  fallbackHeight?: number;
  /** 에러 발생 시 콜백 */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[SectionErrorBoundary:${this.props.sectionName || 'unknown'}]`, error, info);
    this.props.onError?.(error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const height = this.props.fallbackHeight ?? 120;
      const section = this.props.sectionName || 'Section';

      return (
        <div
          className="flex flex-col items-center justify-center gap-2 bg-bg-secondary border border-red-500/20 rounded-xl mx-4 my-2"
          style={{ minHeight: `${height}px` }}
          role="alert"
        >
          <div className="text-red-400 text-xs font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider">
            {section} Error
          </div>
          <div className="text-text-tertiary text-[10px] max-w-xs text-center px-4">
            {this.state.error?.message?.slice(0, 120) || 'An unexpected error occurred.'}
          </div>
          <button
            onClick={this.handleReset}
            className="mt-1 px-4 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
            autoFocus
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SectionErrorBoundary;
