'use client';

import { GlossaryManagerDialog, type GlossaryDialogLang } from './GlossaryManagerDialog';
import { loadLocalGlossary } from '@/lib/translation/project-bridge';

interface TranslatorGlossaryDialogMountProps {
  open: boolean;
  lang: string;
  onClose: () => void;
  onRefreshCount: (count: number) => void;
}

function toGlossaryDialogLang(lang: string): GlossaryDialogLang {
  switch (lang) {
    case 'en':
      return 'EN';
    case 'ja':
      return 'JP';
    case 'zh':
      return 'CN';
    default:
      return 'KO';
  }
}

export function TranslatorGlossaryDialogMount({
  open,
  lang,
  onClose,
  onRefreshCount,
}: TranslatorGlossaryDialogMountProps) {
  const handleClose = () => {
    onClose();

    try {
      onRefreshCount(loadLocalGlossary().length);
    } catch {
      // Local glossary storage is optional; closing the dialog should never block the workspace.
    }
  };

  return (
    <GlossaryManagerDialog
      open={open}
      onClose={handleClose}
      lang={toGlossaryDialogLang(lang)}
    />
  );
}
