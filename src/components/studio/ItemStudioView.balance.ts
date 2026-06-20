import type { Item, ItemCategory, ItemRarity, Skill } from '@/lib/studio-types';

export function analyzeBalance(items: Item[], skills: Skill[], t: (key: string) => string): {
  rarityDist: Record<ItemRarity, number>;
  categoryDist: Record<ItemCategory, number>;
  skillTypeDist: Record<string, number>;
  warnings: string[];
} {
  const rarityDist = {} as Record<ItemRarity, number>;
  const categoryDist = {} as Record<ItemCategory, number>;
  const skillTypeDist = {} as Record<string, number>;
  const warnings: string[] = [];

  for (const item of items) {
    rarityDist[item.rarity] = (rarityDist[item.rarity] ?? 0) + 1;
    categoryDist[item.category] = (categoryDist[item.category] ?? 0) + 1;
  }
  for (const skill of skills) {
    skillTypeDist[skill.type] = (skillTypeDist[skill.type] ?? 0) + 1;
  }

  const legendary = (rarityDist.legendary ?? 0) + (rarityDist.mythic ?? 0);
  const total = items.length;
  if (total > 0 && legendary / total > 0.3) {
    warnings.push(t('itemStudio.warningLegendary'));
  }
  if (total > 5 && !rarityDist.common) {
    warnings.push(t('itemStudio.warningNoCommon'));
  }
  const ultimates = skillTypeDist.ultimate ?? 0;
  if (ultimates > 3) {
    warnings.push(t('itemStudio.warningUltimates'));
  }
  if (skills.length > 0) {
    const owners = new Set(skills.map((skill) => skill.owner));
    const avgPerChar = skills.length / owners.size;
    if (avgPerChar > 5) {
      warnings.push(t('itemStudio.warningSkillComplexity').replace('${avg}', avgPerChar.toFixed(1)));
    }
  }

  return { rarityDist, categoryDist, skillTypeDist, warnings };
}
