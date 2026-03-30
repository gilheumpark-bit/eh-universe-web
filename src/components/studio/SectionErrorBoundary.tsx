import type { ErrorInfo, ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ============================================================
// SectionErrorBoundary — Thin wrapper around unified ErrorBoundary
// Keeps existing API surface (sectionName, fallbackHeight, onError)
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

export function SectionErrorBoundary({ children, sectionName, fallbackHeight, onError }: Props) {
  return (
    <ErrorBoundary
      variant="section"
      section={sectionName}
      fallbackHeight={fallbackHeight}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
}

export default SectionErrorBoundary;
