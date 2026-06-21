'use client';

import type { ComponentProps } from 'react';
import { type TranslatorBackgroundMode } from '@/lib/translator-constants';
import { TranslatorContext, type TranslatorContextState } from './core/TranslatorContext';
import { TranslatorConnectionKeyBanner } from './TranslatorConnectionKeyBanner';
import { TranslatorGlossaryDialogMount } from './TranslatorGlossaryDialogMount';
import { TranslatorGlossaryFloatingButton } from './TranslatorGlossaryFloatingButton';
import { TranslatorModals } from './TranslatorModals';
import { TranslatorShell } from './TranslatorShell';

interface TranslatorAppFrameProps {
  contextValue: TranslatorContextState;
  backgroundMode: TranslatorBackgroundMode;
  showConnectionBanner: boolean;
  lang: string;
  langKo: boolean;
  glossaryEntryCount: number;
  glossaryDialogOpen: boolean;
  modalProps: ComponentProps<typeof TranslatorModals>;
  onOpenConnectionKeys: () => void;
  onDismissConnectionBanner: () => void;
  onOpenGlossaryDialog: () => void;
  onCloseGlossaryDialog: () => void;
  onRefreshGlossaryCount: (count: number) => void;
}

export function TranslatorAppFrame({
  contextValue,
  backgroundMode,
  showConnectionBanner,
  lang,
  langKo,
  glossaryEntryCount,
  glossaryDialogOpen,
  modalProps,
  onOpenConnectionKeys,
  onDismissConnectionBanner,
  onOpenGlossaryDialog,
  onCloseGlossaryDialog,
  onRefreshGlossaryCount,
}: TranslatorAppFrameProps) {
  return (
    <TranslatorContext.Provider value={contextValue}>
      <div className={`flex h-full min-h-0 w-full flex-col overflow-hidden theme-${backgroundMode}`}>
        {showConnectionBanner && (
          <TranslatorConnectionKeyBanner
            langKo={langKo}
            onOpenConnectionKeys={onOpenConnectionKeys}
            onDismiss={onDismissConnectionBanner}
          />
        )}
        <div className="min-h-0 flex-1">
          <TranslatorShell />
        </div>
      </div>
      <TranslatorGlossaryFloatingButton
        langKo={langKo}
        glossaryEntryCount={glossaryEntryCount}
        onOpen={onOpenGlossaryDialog}
      />
      <TranslatorGlossaryDialogMount
        open={glossaryDialogOpen}
        lang={lang}
        onClose={onCloseGlossaryDialog}
        onRefreshCount={onRefreshGlossaryCount}
      />
      <TranslatorModals {...modalProps} />
    </TranslatorContext.Provider>
  );
}
