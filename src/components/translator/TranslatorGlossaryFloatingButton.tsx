'use client';

import { BookOpen } from 'lucide-react';

interface TranslatorGlossaryFloatingButtonProps {
  langKo: boolean;
  glossaryEntryCount: number;
  onOpen: () => void;
}

export function TranslatorGlossaryFloatingButton({
  langKo,
  glossaryEntryCount,
  onOpen,
}: TranslatorGlossaryFloatingButtonProps) {
  const label = langKo ? '용어집 관리' : 'Glossary manager';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed bottom-4 right-4 z-[var(--z-modal)] inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-border bg-bg-secondary px-3 py-1.5 text-xs text-text-primary shadow-lg transition hover:bg-bg-tertiary focus-visible:ring-2 focus-visible:ring-accent-blue pointer-events-auto"
      aria-label={label}
      title={label}
    >
      <BookOpen className="h-3.5 w-3.5" aria-hidden />
      <span>{langKo ? '용어집' : 'Glossary'}</span>
      <span className="text-[10px] tabular-nums text-text-tertiary">
        ({glossaryEntryCount})
      </span>
    </button>
  );
}
