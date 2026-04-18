"use client";

/**
 * WorkspaceTrustDialog — Informed-consent prompt for external resources.
 *
 * Shown before Novel Studio loads a plugin, world JSON, or other
 * artifact from an origin the user has not previously approved. The
 * default action is always "Deny" — the user must explicitly opt in to
 * either per-session trust or persistent trust.
 *
 * @module components/studio/WorkspaceTrustDialog
 */

// ============================================================
// PART 1 — Imports + types + labels
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ShieldAlert, ShieldCheck, ShieldX, ExternalLink, X } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import {
  getTrustLevel,
  trustSource,
  normalizeOrigin,
} from '@/lib/workspace-trust';

export type TrustDialogDecision = 'session' | 'always' | 'deny';

export interface WorkspaceTrustDialogProps {
  open: boolean;
  /** URL being requested. Will be normalized to an origin for display. */
  url: string;
  /**
   * Localized description of what the host wants to do with this origin,
   * e.g. "Install plugin Word Counter v1.2". Shown in the body.
   */
  purpose: string;
  /** Permissions requested — shown as bullet list for informed consent. */
  permissions?: string[];
  language: AppLanguage;
  /** Fires with the user's decision. Caller persists via `trustSource`. */
  onDecide: (decision: TrustDialogDecision) => void;
  /** Fires when the dialog is dismissed (treated as 'deny' by caller). */
  onClose: () => void;
}

function labels(lang: AppLanguage) {
  return {
    title: L4(lang, {
      ko: '이 출처를 신뢰하시겠습니까?',
      en: 'Trust this source?',
      ja: 'このソースを信頼しますか？',
      zh: '是否信任此来源？',
    }),
    originLabel: L4(lang, { ko: '출처', en: 'Origin', ja: '出所', zh: '来源' }),
    purposeLabel: L4(lang, { ko: '요청 내용', en: 'Purpose', ja: '目的', zh: '目的' }),
    permissionsLabel: L4(lang, { ko: '요청 권한', en: 'Requested Permissions', ja: '要求された権限', zh: '请求权限' }),
    warningTitle: L4(lang, {
      ko: '외부 콘텐츠 실행 경고',
      en: 'External code warning',
      ja: '外部コンテンツ実行の警告',
      zh: '外部内容执行警告',
    }),
    warningBody: L4(lang, {
      ko: '신뢰하지 않는 출처는 원고/설정을 읽거나 수정할 수 있습니다. 확실한 경우에만 허용하세요.',
      en: 'Untrusted sources may read or modify your manuscript and settings. Allow only if you trust the publisher.',
      ja: '信頼されていないソースは原稿や設定を読み取ったり変更したりできます。発行元を信頼できる場合のみ許可してください。',
      zh: '不受信任的来源可能会读取或修改您的稿件和设置。仅在信任发布者时允许。',
    }),
    trustSession: L4(lang, {
      ko: '이번만 허용',
      en: 'Trust This Session',
      ja: '今回のみ許可',
      zh: '仅本次允许',
    }),
    trustAlways: L4(lang, {
      ko: '항상 허용',
      en: 'Trust Always',
      ja: '常に許可',
      zh: '始终允许',
    }),
    deny: L4(lang, {
      ko: '거부',
      en: 'Deny',
      ja: '拒否',
      zh: '拒绝',
    }),
    close: L4(lang, { ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭' }),
    invalidUrl: L4(lang, {
      ko: '유효하지 않은 URL입니다.',
      en: 'Invalid URL.',
      ja: '無効なURLです。',
      zh: '无效的URL。',
    }),
    alreadyTrustedHint: L4(lang, {
      ko: '이 출처는 이미 신뢰되어 있습니다.',
      en: 'This source is already trusted.',
      ja: 'このソースはすでに信頼されています。',
      zh: '此来源已受信任。',
    }),
  };
}

// IDENTITY_SEAL: PART-1 | role=types+i18n | inputs=props,lang | outputs=label bundle

// ============================================================
// PART 2 — Component
// ============================================================

const WorkspaceTrustDialog: React.FC<WorkspaceTrustDialogProps> = ({
  open,
  url,
  purpose,
  permissions,
  language,
  onDecide,
  onClose,
}) => {
  const t = useMemo(() => labels(language), [language]);

  const origin = useMemo(() => normalizeOrigin(url), [url]);
  const invalid = origin.length === 0;
  const existingLevel = useMemo(() => (invalid ? 'unknown' : getTrustLevel(origin)), [origin, invalid]);
  const alreadyTrusted = existingLevel === 'trusted';

  // [C] WCAG 2.1 AA focus-trap — Tab 순환 + 이전 focus 복원.
  //     ESC는 아래 useEffect에서 이미 처리 → onEscape 인자 undefined로 중복 방지.
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, undefined);

  // Esc dismisses with no-decision (caller treats as deny).
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleTrustSession = useCallback(() => {
    if (invalid) return;
    try {
      onDecide('session');
    } catch (err) {
      logger.warn('WorkspaceTrustDialog', 'session decide failed', err);
    }
  }, [invalid, onDecide]);

  const handleTrustAlways = useCallback(() => {
    if (invalid) return;
    try {
      trustSource(origin, purpose);
      onDecide('always');
    } catch (err) {
      logger.warn('WorkspaceTrustDialog', 'always decide failed', err);
    }
  }, [invalid, origin, purpose, onDecide]);

  const handleDeny = useCallback(() => {
    onDecide('deny');
  }, [onDecide]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
      data-testid="wtd-backdrop"
    >
      <div
        ref={panelRef}
        className="relative bg-bg-primary border border-border rounded-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wtd-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-yellow/20 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-accent-yellow" aria-hidden />
            </div>
            <h3 id="wtd-title" className="font-bold text-base text-text-primary">
              {t.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-text-tertiary hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t.close}
            data-testid="wtd-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Origin */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
              {t.originLabel}
            </span>
            <div className="flex items-center gap-2 bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm">
              <ExternalLink className="w-4 h-4 text-text-tertiary flex-shrink-0" aria-hidden />
              <span
                className={`font-mono truncate ${invalid ? 'text-accent-red' : 'text-text-primary'}`}
                data-testid="wtd-origin"
              >
                {invalid ? t.invalidUrl : origin}
              </span>
            </div>
            {alreadyTrusted && (
              <div
                className="flex items-center gap-1.5 text-xs text-accent-green"
                data-testid="wtd-already-trusted"
              >
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
                <span>{t.alreadyTrustedHint}</span>
              </div>
            )}
          </div>

          {/* Purpose */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
              {t.purposeLabel}
            </span>
            <div
              className="bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
              data-testid="wtd-purpose"
            >
              {purpose}
            </div>
          </div>

          {/* Permissions */}
          {permissions && permissions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
                {t.permissionsLabel}
              </span>
              <ul
                className="bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary list-disc list-inside space-y-0.5"
                data-testid="wtd-permissions"
              >
                {permissions.map((p, i) => (
                  <li key={`${p}-${i}`} className="font-mono text-xs">{p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl px-3 py-2.5">
            <ShieldAlert className="w-4 h-4 text-accent-yellow flex-shrink-0 mt-0.5" aria-hidden />
            <div className="text-xs text-text-primary">
              <div className="font-semibold text-accent-yellow">{t.warningTitle}</div>
              <div className="mt-0.5 text-text-secondary">{t.warningBody}</div>
            </div>
          </div>
        </div>

        {/* Footer — buttons ordered: Deny (primary-safe) | Session | Always */}
        <div className="flex flex-wrap items-center justify-end gap-2 p-5 border-t border-border">
          <button
            onClick={handleDeny}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-red/15 hover:bg-accent-red/25 text-accent-red font-semibold text-sm border border-accent-red/30 transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]"
            data-testid="wtd-deny-btn"
          >
            <ShieldX className="w-4 h-4" aria-hidden />
            {t.deny}
          </button>
          <button
            onClick={handleTrustSession}
            disabled={invalid}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-text-primary font-semibold text-sm border border-border transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]"
            data-testid="wtd-session-btn"
          >
            {t.trustSession}
          </button>
          <button
            onClick={handleTrustAlways}
            disabled={invalid}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green/15 hover:bg-accent-green/25 text-accent-green font-semibold text-sm border border-accent-green/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]"
            data-testid="wtd-always-btn"
          >
            <ShieldCheck className="w-4 h-4" aria-hidden />
            {t.trustAlways}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceTrustDialog;

// IDENTITY_SEAL: PART-2 | role=Component | inputs=url,purpose,perms | outputs=React.Element
