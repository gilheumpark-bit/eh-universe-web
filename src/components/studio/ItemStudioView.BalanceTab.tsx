import { BarChart3, Sword, Wand2, Zap } from 'lucide-react';
import { Item, ItemRarity, MagicSystem, Skill } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import { analyzeBalance } from './ItemStudioView.balance';
import { RARITY_CONFIG, SKILL_TYPES } from './ItemStudioView.constants';
import { ProgressFill } from './ProgressFill';

type StudioT = ReturnType<typeof createT>;

interface ItemStudioBalanceTabProps {
  t: StudioT;
  items: Item[];
  skills: Skill[];
  magicSystems: MagicSystem[];
  balance: ReturnType<typeof analyzeBalance>;
}

function bindStudioTone(node: HTMLElement | SVGElement | null, color: string) {
  if (!node) return;
  node.style.setProperty('--studio-tone-color', color);
}

export function ItemStudioBalanceTab({ t, items, skills, magicSystems, balance }: ItemStudioBalanceTabProps) {
  return (
        <div className="space-y-6">
          {items.length === 0 && skills.length === 0 ? (
            <div className="text-center py-16 text-text-tertiary text-sm">
              {t('itemStudio.addItemsOrSkillsFirst')}
            </div>
          ) : (
            <>
              {/* Warnings */}
              {balance.warnings.length > 0 && (
                <div className="bg-bg-secondary border border-border/40 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-accent-blue">{t('itemStudio.balanceWarnings')}</h4>
                  {balance.warnings.map((w, i) => <p key={i} className="text-xs text-accent-blue">{w}</p>)}
                </div>
              )}

              {/* Rarity Distribution */}
              <div className="relative overflow-hidden bg-bg-secondary/60 backdrop-blur-md border border-border/40 p-4 space-y-3 rounded-xl shadow-sm">
                <h4 className="text-xs font-bold">{t('itemStudio.rarityDistribution')}</h4>
                <div className="space-y-2">
                  {(Object.keys(RARITY_CONFIG) as ItemRarity[]).map(r => {
                    const count = balance.rarityDist[r] ?? 0;
                    const pct = items.length > 0 ? (count / items.length) * 100 : 0;
                    return (
                      <div
                        key={r}
                        ref={(node) => bindStudioTone(node, RARITY_CONFIG[r].color)}
                        className="flex items-center gap-3"
                      >
                        <span className="text-[10px] font-bold w-12 studio-tone-text">{t(RARITY_CONFIG[r].tKey)}</span>
                        <div className="flex-1 h-4 bg-bg-primary rounded-full overflow-hidden">
                          <ProgressFill value={pct} className="h-full rounded-full transition-[transform,opacity,background-color,border-color,color] studio-tone-swatch" />
                        </div>
                        <span className="text-[10px] text-text-tertiary w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Skill Type Distribution */}
              {skills.length > 0 && (
                <div className="relative overflow-hidden bg-bg-secondary/60 backdrop-blur-md border border-border/40 p-4 space-y-3 rounded-xl shadow-sm">
                  <h4 className="text-xs font-bold">{t('itemStudio.skillTypeDistribution')}</h4>
                  <div className="flex gap-4">
                    {SKILL_TYPES.map(st => {
                      const count = balance.skillTypeDist[st.value] ?? 0;
                      return (
                        <div key={st.value} className="text-center">
                          <div className="text-2xl font-black">{count}</div>
                          <div className="text-[13px] text-text-tertiary">{t(st.tKey)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: t('itemStudio.totalItems'), value: items.length, icon: Sword },
                  { label: t('itemStudio.totalSkills'), value: skills.length, icon: Zap },
                  { label: t('itemStudio.magicSystems'), value: magicSystems.length, icon: Wand2 },
                  { label: t('itemStudio.warningCount'), value: balance.warnings.length, icon: BarChart3 },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-bg-secondary rounded-xl p-4 text-center">
                    <Icon className="w-5 h-5 mx-auto text-text-tertiary mb-2" />
                    <div className="text-xl font-black">{value}</div>
                    <div className="text-[13px] text-text-tertiary">{label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
  );
}
