import { Circle } from 'lucide-react';
import { getStudioTranslations } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/studio-types';

export function FieldBadge({ required, language }: { required: boolean; language: AppLanguage }) {
  const t = getStudioTranslations(language).resource;
  return (
    <span className={`inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider ml-2 ${required ? 'text-accent-red' : 'text-text-quaternary'}`}>
      <Circle className={`w-2 h-2 ${required ? 'fill-accent-red text-accent-red' : 'fill-none text-text-quaternary'}`} />
      {required ? (t.required ?? 'Required') : (t.optional ?? 'Optional')}
    </span>
  );
}
