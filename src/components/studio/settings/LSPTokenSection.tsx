"use client";
// ============================================================
// LSPTokenSection — Settings UI 토큰 발급/리셋/사용 통계.
// 발급된 토큰은 1회만 표시 — 분실 시 재발급.
// ============================================================

import React, { useState } from 'react';
import { KeyRound, Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';

const STORAGE_KEY = 'lg_lsp_token';

export interface LSPTokenSectionProps {
  language?: 'KO' | 'EN' | 'JP' | 'CN';
}

export const LSPTokenSection: React.FC<LSPTokenSectionProps> = ({ language = 'KO' }) => {
  const isKO = language === 'KO';
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  });
  const [hidden, setHidden] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issue = async () => {
    setIssuing(true);
    setError(null);
    try {
      const res = await fetch('/api/lsp/auth', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const t = data.token as string;
      setToken(t);
      localStorage.setItem(STORAGE_KEY, t);
      setHidden(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown';
      setError(msg);
    } finally {
      setIssuing(false);
    }
  };

  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard denied */
    }
  };

  const masked = token
    ? `${token.slice(0, 10)}${'•'.repeat(20)}${token.slice(-6)}`
    : '';

  return (
    <details className="ds-accordion" open>
      <summary className="cursor-pointer flex items-center gap-2 px-4 py-3">
        <KeyRound className="w-4 h-4 text-accent-purple" />
        <span className="font-bold">{isKO ? 'Loreguard LSP — API 토큰' : 'Loreguard LSP — API Token'}</span>
      </summary>
      <div className="px-4 py-3 space-y-3">
        <p className="text-xs text-text-secondary">
          {isKO
            ? '외부 도구가 작품 데이터를 검증할 수 있는 LSP API 토큰입니다. 발급 후 1회만 표시되며, 분실 시 재발급이 필요합니다.'
            : 'API token for external tools to lint your manuscript via LSP. Shown once at issuance — re-issue if lost.'}
        </p>

        {!token ? (
          <button
            type="button"
            onClick={issue}
            disabled={issuing}
            className="flex items-center gap-2 px-4 py-2 bg-accent-purple/15 text-accent-purple rounded-md hover:bg-accent-purple/25 disabled:opacity-50 transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            {issuing ? (isKO ? '발급 중...' : 'Issuing...') : (isKO ? '토큰 발급' : 'Issue Token')}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-bg-tertiary/40 border border-border rounded-md px-3 py-2">
              <code className="flex-1 text-xs font-mono text-text-primary truncate">
                {hidden ? masked : token}
              </code>
              <button
                type="button"
                onClick={() => setHidden((h) => !h)}
                className="p-1 text-text-tertiary hover:text-text-secondary"
                aria-label={hidden ? (isKO ? '표시' : 'Show') : (isKO ? '숨김' : 'Hide')}
              >
                {hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={copy}
                className="p-1 text-text-tertiary hover:text-accent-purple"
                aria-label={isKO ? '복사' : 'Copy'}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            {copied && (
              <p className="text-[10px] text-accent-green">
                {isKO ? '✓ 클립보드에 복사됨' : '✓ Copied to clipboard'}
              </p>
            )}
            <button
              type="button"
              onClick={issue}
              disabled={issuing}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-bg-tertiary/40 hover:bg-bg-tertiary/60 text-text-secondary rounded-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {isKO ? '재발급' : 'Re-issue'}
            </button>
          </div>
        )}

        {error && (
          <p className="text-xs text-accent-red">
            {isKO ? '에러' : 'Error'}: {error}
          </p>
        )}

        <div className="text-[10px] text-text-tertiary border-t border-border pt-2 space-y-0.5">
          <p>
            <code className="font-mono">POST /api/lsp/lint</code> — {isKO ? '5축 검증' : '5-axis verification'}
          </p>
          <p>
            <code className="font-mono">POST /api/lsp/symbols</code> — {isKO ? 'Symbol Index export' : 'Export symbol index'}
          </p>
          <p>
            <code className="font-mono">POST /api/lsp/auth</code> — {isKO ? '세션 쿠키 설정' : 'Set session cookie'}
          </p>
          <p>
            <code className="font-mono">GET /api/lsp/diagnostics</code> — SSE stream
          </p>
        </div>
      </div>
    </details>
  );
};

export default LSPTokenSection;
