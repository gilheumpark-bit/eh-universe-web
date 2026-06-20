'use client';

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { X } from 'lucide-react';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export type SlideOverSide = 'left' | 'right';
export type SlideOverWidth = 'narrow' | 'default' | 'wide';

export interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  side?: SlideOverSide;
  width?: SlideOverWidth;
  ariaLabel?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  panelClassName?: string;
  contentClassName?: string;
  closeLabel?: string;
}

// ============================================================
// PART 2 — Style Presets
// ============================================================

const WIDTH_CLASSES: Record<SlideOverWidth, string> = {
  narrow: 'max-w-[360px]',
  default: 'max-w-[480px]',
  wide: 'max-w-[560px]',
};

const SIDE_CLASSES: Record<SlideOverSide, string> = {
  left: 'mr-auto rounded-r-lg border-r',
  right: 'ml-auto rounded-l-lg border-l',
};

function joinClasses(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

// ============================================================
// PART 3 — Component
// ============================================================

export function SlideOver({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  width = 'default',
  ariaLabel = '패널',
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
  panelClassName,
  contentClassName,
  closeLabel = '닫기',
}: SlideOverProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleEscapeClose = useCallback(() => {
    if (closeOnEscape) onCloseRef.current();
  }, [closeOnEscape]);

  const overlayStyle = useMemo<CSSProperties>(() => ({ zIndex: 'var(--z-modal)' }), []);

  useBodyScrollLock(open);
  useFocusTrap(panelRef, open, closeOnEscape ? handleEscapeClose : undefined);

  if (!open) return null;

  return (
    <div
      className={joinClasses('fixed inset-0 flex', className)}
      role="presentation"
      style={overlayStyle}
    >
      <div
        aria-hidden="true"
        data-testid="slide-over-backdrop"
        className="absolute inset-0 h-full w-full cursor-default bg-bg-primary/70 backdrop-blur-sm"
        onMouseDown={() => {
          if (closeOnBackdrop) onCloseRef.current();
        }}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ? undefined : ariaLabel}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        className={joinClasses(
          'relative flex h-full w-full flex-col border-border bg-bg-primary text-text-primary shadow-2xl',
          WIDTH_CLASSES[width],
          SIDE_CLASSES[side],
          panelClassName,
        )}
      >
        <header className="flex min-h-[56px] items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {title && (
              <h2 id={titleId} className="truncate text-sm font-bold text-text-primary">
                {title}
              </h2>
            )}
            {description && (
              <p id={descriptionId} className="mt-1 text-xs leading-relaxed text-text-tertiary">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-border bg-bg-secondary text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            aria-label={closeLabel}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className={joinClasses('min-h-0 flex-1 overflow-y-auto px-4 py-4', contentClassName)}>
          {children}
        </div>

        {footer && (
          <footer className="border-t border-border px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export default SlideOver;
