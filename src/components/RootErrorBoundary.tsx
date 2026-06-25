"use client";
// ============================================================
// PART 1 — Module Header
// ============================================================
// RootErrorBoundary — Provider tree 외곽 ErrorBoundary.
//
// [P8 루프3/senior-architect, 2026-06-08] 수리:
//   AuthProvider / LangProvider / UnifiedSettingsProvider / UserRoleProvider 중
//   1개라도 throw 하면 전체 앱이 crash. 사용자 fallback UI 부재.
//
// 정책:
//   - componentDidCatch 에서 logger.error 로 structured emission.
//   - fallback UI: 사용자 언어 추정 4언어 메시지 + 새로고침 버튼.
//   - reset() → 1회 재시도 (다음 throw 면 hard fallback).
//   - SSR/CSR 양쪽 호환 (ErrorBoundary 는 client only — "use client").
// ============================================================

import React, { Component, type ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

// ============================================================
// PART 2 — Types
// ============================================================

interface Props {
  children: ReactNode;
  /** 어떤 Provider tree 인지 표식 (logging 용) — 'root' 기본. */
  treeId?: string;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
  retryCount: number;
}

// ============================================================
// PART 3 — Component
// ============================================================

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, retryCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }): void {
    // [H2 2026-06-11] Sentry 송신 — init 전(동의 X / DSN X / dev)에는 SDK no-op.
    try {
      Sentry.captureException(error, {
        tags: { 'eh.context': 'RootErrorBoundary', 'eh.treeId': this.props.treeId ?? 'root' },
      });
    } catch {
      /* 관측 실패는 fallback UI 에 영향 주지 않음 */
    }
    logger.error({
      component: 'RootErrorBoundary',
      event: 'provider_tree_threw',
      meta: {
        treeId: this.props.treeId ?? 'root',
        message: error.message,
        componentStack: errorInfo.componentStack?.slice(0, 2000),
        retryCount: this.state.retryCount,
      },
      error,
    });
  }

  reset = (): void => {
    this.setState((prev) => ({
      hasError: false,
      errorMessage: undefined,
      retryCount: prev.retryCount + 1,
    }));
  };

  reload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // [P8 루프3] 4언어 best-effort — navigator.language 기반. crash 상태이므로
    // LangContext 가 살아있다고 가정 X. document.documentElement.lang 폴백.
    const lang = (() => {
      if (typeof document === 'undefined') return 'en';
      const htmlLang = document.documentElement.lang?.toLowerCase().slice(0, 2);
      if (htmlLang === 'ko' || htmlLang === 'ja' || htmlLang === 'zh' || htmlLang === 'en') return htmlLang;
      const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase().slice(0, 2) : 'en';
      if (nav === 'ko' || nav === 'ja' || nav === 'zh') return nav;
      return 'en';
    })();

    const COPY: Record<string, { title: string; body: string; retry: string; reload: string }> = {
      ko: {
        title: '잠시 멈췄어요',
        body: '앱 시작 중에 문제가 발생했어요. 다시 시도하거나 새로고침 해주세요.',
        retry: '다시 시도',
        reload: '새로고침',
      },
      en: {
        title: 'Something paused',
        body: 'An error occurred while starting the app. Please try again or reload.',
        retry: 'Retry',
        reload: 'Reload',
      },
      ja: {
        title: '一時停止しました',
        body: 'アプリの起動中にエラーが発生しました。再試行するかページを再読み込みしてください。',
        retry: '再試行',
        reload: '再読み込み',
      },
      zh: {
        title: '应用暂停了',
        body: '应用启动时发生错误。请重试或刷新页面。',
        retry: '重试',
        reload: '刷新',
      },
    };
    const t = COPY[lang] ?? COPY.en;

    // 2회 연속 실패 → reset 버튼 숨기고 reload 만 노출.
    const showRetry = this.state.retryCount < 2;

    return (
      <div
        role="alert"
        aria-live="assertive"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#1c1a17',
          color: '#FAFAF8',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>{t.title}</h1>
          <p style={{ fontSize: '0.95rem', color: '#a8a39a', marginBottom: '1.5rem' }}>{t.body}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {showRetry && (
              <button
                type="button"
                onClick={this.reset}
                style={{
                  minHeight: '44px',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #3a3733',
                  background: 'transparent',
                  color: '#FAFAF8',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                {t.retry}
              </button>
            )}
            <button
              type="button"
              onClick={this.reload}
              style={{
                minHeight: '44px',
                padding: '0.5rem 1.25rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: '#d4a017',
                color: '#1a1410',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 700,
              }}
            >
              {t.reload}
            </button>
          </div>
          {this.state.errorMessage && (
            <details style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#6b6660', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer' }}>Technical detail</summary>
              <pre style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.errorMessage.slice(0, 400)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default RootErrorBoundary;

// IDENTITY_SEAL: PART-1..3 | role=root-error-boundary | inputs=children+treeId | outputs=fallback-UI|children
