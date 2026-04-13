"use client";

import React, { useCallback, useEffect } from 'react';

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** z-index 클래스 (기본: z-[200]) */
  zClass?: string;
  /** 배경 클릭으로 닫기 허용 (기본: true) */
  closeOnBackdrop?: boolean;
  /** ESC 키로 닫기 (기본: true) */
  closeOnEsc?: boolean;
  /** 추가 className */
  className?: string;
}

export function Overlay({
  open,
  onClose,
  children,
  zClass = 'z-[200]',
  closeOnBackdrop = true,
  closeOnEsc = true,
  className = '',
}: OverlayProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && closeOnEsc) onClose();
  }, [onClose, closeOnEsc]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center bg-black/50 backdrop-blur-sm ${className}`}
      onClick={closeOnBackdrop ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
