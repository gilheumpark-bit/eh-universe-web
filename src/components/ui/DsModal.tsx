"use client";

// ============================================================
// DsModal — 통합 모달 컴포넌트 (Doc 1 Global P1 — 2026-05-12)
// ============================================================
// Studio blur + Code Studio card + Translation panel 패턴 비통일 해소.
// 단일 컴포넌트로 모달 표준화 — backdrop, shadow, animation, focus trap, Esc 종료.
//
// Spec (Doc 1 권장):
//   - backdrop: rgba(17,16,14,.55) + blur(12px) (IDE 컨텍스트 보존)
//   - shadow: --shadow-luxury
//   - amber CTA (primary)
//   - 4언어 close 라벨
//   - focus trap (Tab 순환, Shift+Tab 역순)
//   - Esc 종료
//   - aria-modal=true, role=dialog
//
// 사용 패턴:
//   <DsModal open={open} onClose={() => setOpen(false)} title="제목" lang="ko">
//     <p>본문 내용</p>
//     <DsModalActions>
//       <DsModalButton variant="ghost" onClick={...}>취소</DsModalButton>
//       <DsModalButton variant="primary" onClick={...}>채택</DsModalButton>
//     </DsModalActions>
//   </DsModal>
//
// [C] SSR-safe (typeof document 가드 + createPortal mount target useState)
// [C] focus trap useFocusTrap 재사용 (기존 hook)
// [G] open false 시 unmount — flash 방지 + memory leak X
// [K] 단일 컴포넌트, 외부 의존성 최소 (L4 + useFocusTrap)

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { L4 } from '@/lib/i18n';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { AppLanguage } from '@/lib/studio-types';

// ============================================================
// PART 1 — Types
// ============================================================

export interface DsModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Accessible label (제목 없는 모달용) */
  ariaLabel?: string;
  language?: AppLanguage;
  /** 너비 — sm 320 / md 480 / lg 640 / xl 800. 기본 md. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 닫기 버튼 표시 (기본 true). false 시 사용자가 명시 ESC/외부 click만으로 닫음. */
  showCloseButton?: boolean;
  /** backdrop click으로 닫기 허용 (기본 true). */
  closeOnBackdropClick?: boolean;
  /** Esc로 닫기 허용 (기본 true). 다른 단축키와 충돌 회피 시 false. */
  closeOnEsc?: boolean;
  children: React.ReactNode;
}

// ============================================================
// PART 2 — Component
// ============================================================

const SIZE_WIDTH: Record<NonNullable<DsModalProps['size']>, number> = {
  sm: 320,
  md: 480,
  lg: 640,
  xl: 800,
};

export function DsModal({
  open,
  onClose,
  title,
  ariaLabel,
  language = 'KO',
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  children,
}: DsModalProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPortalTarget(document.body);
    }
  }, []);

  // Esc 종료
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [open, closeOnEsc, onClose]);

  // body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) onClose();
  }, [closeOnBackdropClick, onClose]);

  if (!portalTarget || !open) return null;

  const closeAriaLabel = L4(language, {
    ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭',
  });

  return createPortal((
    <div
      // Doc 1 권장: rgba(17,16,14,.55) + blur(12px) — IDE 컨텍스트 보존
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal, 1000)' as React.CSSProperties['zIndex'],
        backgroundColor: 'rgba(17, 16, 14, 0.55)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fade-in 220ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ? undefined : ariaLabel}
        aria-labelledby={title ? 'ds-modal-title' : undefined}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: SIZE_WIDTH[size],
          maxHeight: 'calc(100vh - 32px)',
          backgroundColor: 'var(--color-bg-elevated, var(--color-bg-secondary, #1a1816))',
          border: '1px solid var(--color-border, #2f2c26)',
          borderRadius: 24,
          boxShadow: 'var(--shadow-luxury, 0 30px 60px rgba(0,0,0,0.5), 0 15px 25px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.05))',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          animation: 'zoom-in-95 220ms cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
        }}
      >
        {(title || showCloseButton) && (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            {title && (
              <h2
                id="ds-modal-title"
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display, "Cormorant Garamond", "Noto Serif KR", serif)',
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  color: 'var(--color-text-primary, #f4f0ea)',
                }}
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label={closeAriaLabel}
                style={{
                  flexShrink: 0,
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 0,
                  borderRadius: 8,
                  color: 'var(--color-text-tertiary, #948a7c)',
                  cursor: 'pointer',
                  transition: 'color 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary, #f4f0ea)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-tertiary, #948a7c)'; }}
              >
                <X size={20} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  ), portalTarget);
}

// ============================================================
// PART 3 — DsModalActions + DsModalButton (편의 컴포넌트)
// ============================================================

export interface DsModalActionsProps {
  children: React.ReactNode;
}

export function DsModalActions({ children }: DsModalActionsProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        paddingTop: 12,
        borderTop: '1px solid var(--color-border, #2f2c26)',
        marginTop: 4,
      }}
    >
      {children}
    </div>
  );
}

export interface DsModalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  withArrow?: boolean;
}

export function DsModalButton({
  variant = 'primary',
  withArrow = false,
  children,
  ...rest
}: DsModalButtonProps) {
  // Doc 1 권장: amber primary + ghost outline + 화살표 종결
  const variantStyle: React.CSSProperties = variant === 'primary' ? {
    backgroundColor: 'var(--color-accent-amber, #b8955c)',
    color: '#1a1410',
    fontWeight: 600,
  } : variant === 'danger' ? {
    backgroundColor: 'var(--color-accent-red, #c4786d)',
    color: '#1a1410',
    fontWeight: 600,
  } : {
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary, #b5ac9d)',
    border: '1px solid var(--color-border-strong, #3a352c)',
    fontWeight: 500,
  };

  return (
    <button
      type="button"
      style={{
        minHeight: 44,
        padding: '10px 18px',
        borderRadius: 12,
        fontSize: 14,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        border: variant === 'ghost' ? '1px solid var(--color-border-strong, #3a352c)' : 0,
        transition: 'opacity 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        ...variantStyle,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
      {...rest}
    >
      {children}
      {withArrow && <span aria-hidden="true">→</span>}
    </button>
  );
}

// IDENTITY_SEAL: DsModal | role=unified-modal-component | inputs=open+onClose+title+children | outputs=portal modal
