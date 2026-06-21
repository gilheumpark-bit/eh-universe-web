import type {
  FieldKind,
  FormFieldDefinition,
  FormSectionDefinition,
  LocalizedText,
  ReleaseFormDefinition,
  ReleaseFormId,
} from './jurisdiction-form-pack';

export function lt(ko: string, en: string, ja: string, zh: string): LocalizedText {
  return { ko, en, ja, zh };
}

export function field(
  id: string,
  label: LocalizedText,
  kind: FieldKind,
  required: boolean,
  help: LocalizedText,
): FormFieldDefinition {
  return {
    id,
    label,
    kind,
    required,
    help,
    evidenceKey: `form.${id}`,
  };
}

export function section(
  id: string,
  title: LocalizedText,
  fields: readonly FormFieldDefinition[],
): FormSectionDefinition {
  return { id, title, fields };
}

export function form(
  id: ReleaseFormId,
  title: LocalizedText,
  purpose: LocalizedText,
  sections: readonly FormSectionDefinition[],
): ReleaseFormDefinition {
  return { id, title, purpose, sections };
}
