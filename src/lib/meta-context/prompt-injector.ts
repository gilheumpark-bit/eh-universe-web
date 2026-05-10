// ============================================================
// prompt-injector.ts — MetaSnapshot → AI prompt prepend 텍스트.
// ============================================================

import type { MetaSnapshot } from './types';

export interface InjectorOptions {
  language: 'KO' | 'EN' | 'JP' | 'CN';
  charCap?: number;
}

const KIND_LABEL_KO: Record<string, string> = {
  company: '회사',
  product: '제품',
  tech: '내부 기술',
  category: '카테고리',
  numeric: '수치',
  date: '날짜',
  hierarchy: '위계',
  rejection: '폐기',
};

const KIND_LABEL_EN: Record<string, string> = {
  company: 'Company',
  product: 'Product',
  tech: 'Internal Tech',
  category: 'Category',
  numeric: 'Numeric',
  date: 'Date',
  hierarchy: 'Hierarchy',
  rejection: 'Rejected',
};

export function buildMetaContextModifier(
  snapshot: MetaSnapshot | null | undefined,
  options: InjectorOptions,
): string {
  if (!snapshot || Object.keys(snapshot.current).length === 0) return '';
  const cap = options.charCap ?? 400;
  const isKO = options.language === 'KO';
  const labels = isKO ? KIND_LABEL_KO : KIND_LABEL_EN;

  // kind 별 그룹
  const grouped: Record<string, string[]> = {};
  for (const def of Object.values(snapshot.current)) {
    const labelKey = labels[def.kind] ?? def.kind;
    if (!grouped[labelKey]) grouped[labelKey] = [];
    const scope = def.scope ? ` (${def.scope})` : '';
    grouped[labelKey].push(`${def.key}=${def.value}${scope}`);
  }

  const lines: string[] = [
    isKO ? '[Meta-Context 누적 — 자동]' : '[Meta-Context — auto]',
  ];
  for (const [label, items] of Object.entries(grouped)) {
    lines.push(`  ${label}: ${items.slice(0, 5).join(', ')}`);
  }

  let result = lines.join('\n');
  if (result.length > cap) result = result.slice(0, cap - 3) + '...';
  return result;
}
