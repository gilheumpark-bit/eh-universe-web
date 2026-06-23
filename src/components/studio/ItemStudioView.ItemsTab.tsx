import React from 'react';
import { ChevronDown, ChevronUp, Package, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppLanguage, AssetPotentialLevel, Item, ItemCategory, ItemLifecycleStatus, ItemRarity } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';
import {
  ASSET_POTENTIAL_CONFIG,
  CATEGORY_CONFIG,
  ITEM_STATUS_CONFIG,
  RARITY_CONFIG,
} from './ItemStudioView.constants';

type StudioT = ReturnType<typeof createT>;
type ItemTierExpanded = Record<string, { t2?: boolean; t3?: boolean }>;

interface ItemStudioItemsTabProps {
  language: AppLanguage;
  t: StudioT;
  items: Item[];
  filteredItems: Item[];
  itemFilter: 'all' | ItemCategory;
  setItemFilter: React.Dispatch<React.SetStateAction<'all' | ItemCategory>>;
  newItem: Partial<Item>;
  setNewItem: React.Dispatch<React.SetStateAction<Partial<Item>>>;
  addItem: () => void;
  tierExpanded: ItemTierExpanded;
  setTierExpanded: React.Dispatch<React.SetStateAction<ItemTierExpanded>>;
  updateItemField: (id: string, field: string, value: string) => void;
  setItems: (fn: (prev: Item[]) => Item[]) => void;
  confirmItemDelete: (onOk: () => void) => void;
}

function bindStudioTone(node: HTMLElement | SVGElement | null, color: string) {
  if (!node) return;
  node.style.setProperty('--studio-tone-color', color);
}

export function ItemStudioItemsTab({
  language,
  t,
  items,
  filteredItems,
  itemFilter,
  setItemFilter,
  newItem,
  setNewItem,
  addItem,
  tierExpanded,
  setTierExpanded,
  updateItemField,
  setItems,
  confirmItemDelete,
}: ItemStudioItemsTabProps) {
  return (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setItemFilter('all')} aria-pressed={itemFilter === 'all'} className={`px-3 py-2 rounded-lg text-[13px] font-bold border min-h-[44px] ${itemFilter === 'all' ? 'bg-accent-blue/15 text-accent-blue border-accent-blue/40' : 'bg-bg-secondary/50 border-border/50 text-text-secondary hover:text-text-primary hover:border-border'}`}>
              {t('itemStudio.filterAll')} ({items.length})
            </button>
            {(Object.keys(CATEGORY_CONFIG) as ItemCategory[]).map(cat => {
              const count = items.filter(i => i.category === cat).length;
              return (
                <button key={cat} onClick={() => setItemFilter(cat)} aria-pressed={itemFilter === cat} className={`px-3 py-2 rounded-lg text-[13px] font-bold border min-h-[44px] ${itemFilter === cat ? 'bg-accent-blue/15 text-accent-blue border-accent-blue/40' : 'bg-bg-secondary/50 border-border/50 text-text-secondary hover:text-text-primary hover:border-border'}`}>
                  {t(CATEGORY_CONFIG[cat].tKey)} ({count})
                </button>
              );
            })}
          </div>

          {/* Item Cards */}
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={Package}
              title={L4(language, {
                ko: '등록된 아이템이 없습니다',
                en: 'No items registered yet',
                ja: '登録されたアイテムがありません',
                zh: '尚未注册任何物品',
              })}
              description={L4(language, {
                ko: '장비·마법·스킬을 추가하여 풍성한 세계를 만드세요.',
                en: 'Add equipment, magic, and skills to enrich your world.',
                ja: '装備・魔法・スキルを追加して豊かな世界を作りましょう。',
                zh: '添加装备、魔法和技能，打造丰富的世界。',
              })}
              actions={[
                {
                  label: L4(language, {
                    ko: '아이템 추가',
                    en: 'Add item',
                    ja: 'アイテム追加',
                    zh: '添加物品',
                  }),
                  icon: Plus,
                  variant: 'primary',
                  onClick: () => {
                    // [C] "새 아이템 추가" 섹션의 이름 입력 필드로 포커스 이동
                    const nameInput = document.querySelector<HTMLInputElement>(
                      `input[placeholder="${t('itemStudio.namePlaceholder')}"]`,
                    );
                    nameInput?.focus();
                    nameInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  },
                },
              ]}
            />
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems.map(item => {
              const rCfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
              const cCfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.misc;
              const statusCfg = ITEM_STATUS_CONFIG[item.status ?? 'planned'];
              const assetCfg = ASSET_POTENTIAL_CONFIG[item.ipPotential ?? 'none'];
              const CatIcon = cCfg.icon;
              return (
                <div
                  key={item.id}
                  ref={(node) => bindStudioTone(node, rCfg.color)}
                  className={`${rCfg.bg} border border-border/50 backdrop-blur-md rounded-xl p-4 space-y-2 rounded-xl transition-[background-color,border-color,box-shadow,color] hover:shadow-md hover:border-border`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CatIcon className="w-4 h-4 studio-tone-text" />
                      <span className="font-bold text-sm">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full studio-tone-pill">
                        {t(rCfg.tKey)}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.tone}`}>
                        {statusCfg.label}
                      </span>
                      <button
                        onClick={(e) => {
                          const btn = e.currentTarget;
                          confirmItemDelete(() => {
                            btn.classList.add('animate-delete-warning');
                            setTimeout(() => setItems(prev => prev.filter(i => i.id !== item.id)), 300);
                          });
                        }}
                        className="p-2.5 rounded-lg text-text-tertiary hover:text-accent-red hover:bg-accent-red/20 transition-colors duration-200 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {item.description && <p className="text-xs text-text-secondary">{item.description}</p>}
                  {item.effect && <p className="text-[13px] text-accent-blue font-bold tracking-wider relative z-10">✦ {item.effect}</p>}
                  {item.obtainedFrom && <p className="text-[13px] text-text-tertiary">📍 {item.obtainedFrom}</p>}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${assetCfg.tone}`}>
                      {assetCfg.label}
                    </span>
                    {item.owner ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-border/60 text-text-secondary">
                        소유: {item.owner}
                      </span>
                    ) : null}
                    {item.currentLocation ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-border/60 text-text-secondary">
                        위치: {item.currentLocation}
                      </span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-2 border-t border-border/50">
                    <select value={item.status ?? 'planned'} onChange={e => updateItemField(item.id, 'status', e.target.value)}
                      className="w-full bg-bg-secondary border border-border/50 rounded-lg px-2.5 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-[13px] min-h-[44px]">
                      {(Object.keys(ITEM_STATUS_CONFIG) as ItemLifecycleStatus[]).map(status => (
                        <option key={status} value={status}>{ITEM_STATUS_CONFIG[status].label}</option>
                      ))}
                    </select>
                    <select value={item.ipPotential ?? 'none'} onChange={e => updateItemField(item.id, 'ipPotential', e.target.value)}
                      className="w-full bg-bg-secondary border border-border/50 rounded-lg px-2.5 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-[13px] min-h-[44px]">
                      {(Object.keys(ASSET_POTENTIAL_CONFIG) as AssetPotentialLevel[]).map(level => (
                        <option key={level} value={level}>{ASSET_POTENTIAL_CONFIG[level].label}</option>
                      ))}
                    </select>
                    <input value={item.owner ?? ''} onChange={e => updateItemField(item.id, 'owner', e.target.value)}
                      placeholder="소유자" className="w-full bg-bg-secondary border border-border/50 rounded-lg px-2.5 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-[13px] min-h-[44px]" />
                  </div>
                  {/* 1단계 뼈대 필드 */}
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <input value={item.purpose ?? ''} onChange={e => updateItemField(item.id, 'purpose', e.target.value)}
                      placeholder={t('itemStudio.purposePlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg px-2.5 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-[13px] min-h-[44px]" />
                    <input value={item.activationCond ?? ''} onChange={e => updateItemField(item.id, 'activationCond', e.target.value)}
                      placeholder={t('itemStudio.activationCondPlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg px-2.5 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-[13px] min-h-[44px]" />
                    <input value={item.costWeakness ?? ''} onChange={e => updateItemField(item.id, 'costWeakness', e.target.value)}
                      placeholder={t('itemStudio.costWeaknessPlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg px-2.5 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-[13px] min-h-[44px]" />
                    <input value={item.storyFunction ?? ''} onChange={e => updateItemField(item.id, 'storyFunction', e.target.value)}
                      placeholder={t('itemStudio.storyFunctionPlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg px-2.5 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-[13px] min-h-[44px]" />
                    <input value={item.rightsMemo ?? ''} onChange={e => updateItemField(item.id, 'rightsMemo', e.target.value)}
                      placeholder="권리/IP 메모" className="w-full bg-bg-secondary border border-border/50 rounded-lg px-2.5 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-[13px] min-h-[44px]" />
                  </div>
                  {/* 2단계 — 작동 */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setTierExpanded(prev => ({ ...prev, [item.id]: { ...prev[item.id], t2: !prev[item.id]?.t2 } }))}
                      className="text-[9px] font-bold text-text-tertiary cursor-pointer flex items-center gap-1 hover:text-text-primary"
                    >
                      {tierExpanded[item.id]?.t2 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {t('itemStudio.tier2Mechanics')}
                    </button>
                    {tierExpanded[item.id]?.t2 && (
                      <div className="space-y-1.5 pt-1.5">
                        <input value={item.worldConnection ?? ''} onChange={e => updateItemField(item.id, 'worldConnection', e.target.value)}
                          placeholder={t('itemStudio.worldConnectionPlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary px-2.5 py-2 text-[13px] min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50" />
                        <input value={item.misuse ?? ''} onChange={e => updateItemField(item.id, 'misuse', e.target.value)}
                          placeholder={t('itemStudio.misusePlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary px-2.5 py-2 text-[13px] min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50" />
                        <input value={item.lore ?? ''} onChange={e => updateItemField(item.id, 'lore', e.target.value)}
                          placeholder={t('itemStudio.lorePlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary px-2.5 py-2 text-[13px] min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50" />
                        <input value={item.material ?? ''} onChange={e => updateItemField(item.id, 'material', e.target.value)}
                          placeholder={t('itemStudio.materialPlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary px-2.5 py-2 text-[13px] min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50" />
                        <input value={item.craftMethod ?? ''} onChange={e => updateItemField(item.id, 'craftMethod', e.target.value)}
                          placeholder={t('itemStudio.craftMethodPlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary px-2.5 py-2 text-[13px] min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50" />
                        <input value={item.valueRarity ?? ''} onChange={e => updateItemField(item.id, 'valueRarity', e.target.value)}
                          placeholder={t('itemStudio.valueRarityPlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary px-2.5 py-2 text-[13px] min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50" />
                        <input value={item.whoTargets ?? ''} onChange={e => updateItemField(item.id, 'whoTargets', e.target.value)}
                          placeholder={t('itemStudio.whoTargetsPlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary px-2.5 py-2 text-[13px] min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50" />
                      </div>
                    )}
                  </div>
                  {/* 3단계 — 디테일 */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setTierExpanded(prev => ({ ...prev, [item.id]: { ...prev[item.id], t3: !prev[item.id]?.t3 } }))}
                      className="text-[9px] font-bold text-text-tertiary cursor-pointer flex items-center gap-1 hover:text-text-primary"
                    >
                      {tierExpanded[item.id]?.t3 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {t('itemStudio.tier3Detail')}
                    </button>
                    {tierExpanded[item.id]?.t3 && (
                      <div className="space-y-1.5 pt-1.5">
                        <input value={item.itemAppearance ?? ''} onChange={e => updateItemField(item.id, 'itemAppearance', e.target.value)}
                          placeholder={t('itemStudio.appearancePlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary px-2.5 py-2 text-[13px] min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50" />
                        <input value={item.symbolism ?? ''} onChange={e => updateItemField(item.id, 'symbolism', e.target.value)}
                          placeholder={t('itemStudio.symbolismPlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary px-2.5 py-2 text-[13px] min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50" />
                        <input value={item.currentLocation ?? ''} onChange={e => updateItemField(item.id, 'currentLocation', e.target.value)}
                          placeholder={t('itemStudio.currentLocationPlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary px-2.5 py-2 text-[13px] min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50" />
                        <input value={item.ownershipCond ?? ''} onChange={e => updateItemField(item.id, 'ownershipCond', e.target.value)}
                          placeholder={t('itemStudio.ownershipCondPlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary px-2.5 py-2 text-[13px] min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50" />
                        <input value={item.durability ?? ''} onChange={e => updateItemField(item.id, 'durability', e.target.value)}
                          placeholder={t('itemStudio.durabilityPlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary px-2.5 py-2 text-[13px] min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50" />
                        <input value={item.evolution ?? ''} onChange={e => updateItemField(item.id, 'evolution', e.target.value)}
                          placeholder={t('itemStudio.evolutionPlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary px-2.5 py-2 text-[13px] min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50" />
                        <input value={item.maintenance ?? ''} onChange={e => updateItemField(item.id, 'maintenance', e.target.value)}
                          placeholder={t('itemStudio.maintenancePlaceholder')} className="w-full bg-bg-secondary border border-border/50 rounded-lg text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary px-2.5 py-2 text-[13px] min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50" />
                      </div>
                    )}
                  </div>
                  {/* 한 줄 요약 */}
                  {(item.purpose || item.effect) && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-[9px] text-text-tertiary italic leading-relaxed">
                        {t('itemStudio.summaryTemplate')
                          .replace('${name}', item.name)
                          .replace('${purpose}', item.purpose || item.description || '___')
                          .replace('${owner}', item.owner || '___')
                          .replace('${effect}', item.effect || '___')
                          .replace('${cost}', item.costWeakness || '___')
                        }
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Item Form */}
          <div className="relative overflow-hidden bg-bg-secondary/60 backdrop-blur-md border border-border/40 p-4 space-y-3 rounded-xl shadow-sm">
            <h4 className="text-xs font-bold">{t('itemStudio.addNewItem')}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input value={newItem.name ?? ''} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder={t('itemStudio.namePlaceholder')} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs" />
              <select value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value as ItemCategory }))} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs">
                {(Object.keys(CATEGORY_CONFIG) as ItemCategory[]).map(cat => (
                  <option key={cat} value={cat}>{t(CATEGORY_CONFIG[cat].tKey)}</option>
                ))}
              </select>
              <select value={newItem.rarity} onChange={e => setNewItem(p => ({ ...p, rarity: e.target.value as ItemRarity }))} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs">
                {(Object.keys(RARITY_CONFIG) as ItemRarity[]).map(r => (
                  <option key={r} value={r}>{t(RARITY_CONFIG[r].tKey)}</option>
                ))}
              </select>
              <input value={newItem.effect ?? ''} onChange={e => setNewItem(p => ({ ...p, effect: e.target.value }))} placeholder={t('itemStudio.effectPlaceholder')} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input value={newItem.description ?? ''} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} placeholder={t('itemStudio.descriptionPlaceholder')} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs" />
              <input value={newItem.obtainedFrom ?? ''} onChange={e => setNewItem(p => ({ ...p, obtainedFrom: e.target.value }))} placeholder={t('itemStudio.obtainedFromPlaceholder')} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs" />
              <button onClick={addItem} disabled={!newItem.name} className="flex items-center justify-center gap-2 bg-accent-blue/15 text-accent-blue border border-accent-blue/40 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-40 hover:bg-accent-blue/25 transition-[opacity,background-color,border-color,color]">
                <Plus className="w-3.5 h-3.5" /> {t('itemStudio.add')}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input value={newItem.owner ?? ''} onChange={e => setNewItem(p => ({ ...p, owner: e.target.value }))} placeholder="소유자" className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs" />
              <select value={newItem.status} onChange={e => setNewItem(p => ({ ...p, status: e.target.value as ItemLifecycleStatus }))} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs">
                {(Object.keys(ITEM_STATUS_CONFIG) as ItemLifecycleStatus[]).map(status => (
                  <option key={status} value={status}>{ITEM_STATUS_CONFIG[status].label}</option>
                ))}
              </select>
              <select value={newItem.ipPotential} onChange={e => setNewItem(p => ({ ...p, ipPotential: e.target.value as AssetPotentialLevel }))} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs">
                {(Object.keys(ASSET_POTENTIAL_CONFIG) as AssetPotentialLevel[]).map(level => (
                  <option key={level} value={level}>{ASSET_POTENTIAL_CONFIG[level].label}</option>
                ))}
              </select>
              <input value={newItem.rightsMemo ?? ''} onChange={e => setNewItem(p => ({ ...p, rightsMemo: e.target.value }))} placeholder="권리/IP 메모" className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs" />
            </div>
          </div>
        </div>
  );
}
