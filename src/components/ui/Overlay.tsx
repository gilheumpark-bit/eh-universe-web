"use client";

import React, { useCallback, useEffect, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** z-index 클래스 (기본: z-[var(--z-modal)]) */
  zClass?: string;
  /** 배경 클릭으로 닫기 허용 (기본: true) */
  closeOnBackdrop?: boolean;
  /** ESC 키로 닫기 (기본: true) */
  closeOnEsc?: boolean;
  /** focus-trap 활성화 (기본: true) — WCAG 2.1 AA */
  trapFocus?: boolean;
  /** 추가 className */
  className?: string;
}

export function Overlay({
  open,
  onClose,
  children,
  zClass = 'z-[var(--z-modal)]',
  closeOnBackdrop = true,
  closeOnEsc = true,
  trapFocus = true,
  className = '',
}: OverlayProps) {
  // [C] focus-trap — WCAG 2.1 AA focus 순환 + Escape + 이전 focus 복원.
  //     useFocusTrap 내부에서 ESC 핸들링하므로, closeOnEsc 시 중복 방지.
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open && trapFocus, closeOnEsc ? onClose : undefined);

  // useFocusTrap 비활성화 시(trapFocus=false)에도 ESC 동작 보장.
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && closeOnEsc) onClose();
  }, [onClose, closeOnEsc]);

  useEffect(() => {
    if (!open) return;
    // trapFocus 활성화 시 useFocusTrap이 이미 ESC 처리 → 중복 리스너 방지.
    if (trapFocus) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown, trapFocus]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center bg-black/50 backdrop-blur-sm ${className}`}
      onClick={closeOnBackdrop ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div ref={panelRef} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
