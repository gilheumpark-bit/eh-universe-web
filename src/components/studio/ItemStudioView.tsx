// ============================================================
// PART 0 — IMPORTS & TYPES
// ============================================================
import { showAlert } from '@/lib/show-alert';
import React, { useState, useMemo, useCallback } from 'react';
import {
  Item, Skill, MagicSystem, ItemRarity, ItemCategory,
  StoryConfig, AppLanguage, AssetPotentialLevel, ItemLifecycleStatus,
} from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';
import { useStudioUI } from '@/contexts/StudioContext';
import {
  Sword, Sparkles, Zap, ScrollText, Plus, Trash2,
  BarChart3, Loader2, ChevronDown, ChevronUp, Package, Wand2,
} from 'lucide-react';
import { generateItems, generateSkills, generateMagicSystems } from '@/services/geminiService';
import { activeSupportsStructured } from '@/lib/ai-providers';
import { EmptyState } from '@/components/ui/EmptyState';
import { analyzeBalance } from './ItemStudioView.balance';
import {
  ASSET_POTENTIAL_CONFIG,
  CATEGORY_CONFIG,
  getPresetSummary,
  ITEM_STATUS_CONFIG,
  PRESET_ITEMS,
  PRESET_MAGIC_SYSTEMS,
  PRESET_SKILLS,
  type PresetCategory,
  RARITY_CONFIG,
  SKILL_TYPES,
} from './ItemStudioView.constants';
import { MagicSystemCard } from './ItemStudioView.MagicSystemCard';

interface ItemStudioViewProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
}

type SubTab = 'items' | 'skills' | 'magic' | 'balance';

// ============================================================
// PART 3 — MAIN COMPONENT
// ============================================================

const ItemStudioView: React.FC<ItemStudioViewProps> = ({ language, config, setConfig }) => {
  const { showConfirm, closeConfirm } = useStudioUI();
  const [subTab, setSubTab] = useState<SubTab>('items');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const t = createT(language);

  /** Shared delete-confirmation helper for item/skill/magic lists */
  const confirmItemDelete = useCallback((onOk: () => void) => {
    showConfirm({
      title: L4(language, { ko: '항목 삭제', en: 'Delete Item', ja: '項目削除', zh: '删除项目' }),
      message: L4(language, {
        ko: '이 항목을 삭제하시겠습니까? 되돌릴 수 없습니다.',
        en: 'Delete this item permanently? This cannot be undone.',
        ja: 'この項目を削除しますか? 元に戻せません。',
        zh: '要永久删除此项目吗? 此操作不可恢复。',
      }),
      variant: 'danger',
      confirmLabel: L4(language, { ko: '삭제', en: 'Delete', ja: '削除', zh: '删除' }),
      cancelLabel: L4(language, { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消' }),
      onConfirm: () => { onOk(); closeConfirm(); },
    });
  }, [language, showConfirm, closeConfirm]);
  const [tierExpanded, setTierExpanded] = useState<Record<string, { t2?: boolean; t3?: boolean }>>({});

  const items = useMemo(() => config.items ?? [], [config.items]);
  const skills = useMemo(() => config.skills ?? [], [config.skills]);
  const magicSystems = config.magicSystems ?? [];

  const setItems = useCallback((fn: (prev: Item[]) => Item[]) =>
    setConfig(prev => ({ ...prev, items: fn(prev.items ?? []) })), [setConfig]);
  const setSkills = useCallback((fn: (prev: Skill[]) => Skill[]) =>
    setConfig(prev => ({ ...prev, skills: fn(prev.skills ?? []) })), [setConfig]);
  const setMagicSystems = useCallback((fn: (prev: MagicSystem[]) => MagicSystem[]) =>
    setConfig(prev => ({ ...prev, magicSystems: fn(prev.magicSystems ?? []) })), [setConfig]);

  // Generic field updater — replaces 14+ individual onChange handlers
  const updateItemField = useCallback((id: string, field: string, value: string) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i)),
  [setItems]);

  // ============================================================
  // PART 3A — ITEM FORM STATE
  // ============================================================
  const [newItem, setNewItem] = useState<Partial<Item>>({
    name: '', category: 'weapon', rarity: 'common', description: '', effect: '', obtainedFrom: '',
    owner: '', status: 'planned', ipPotential: 'none', rightsMemo: '',
  });
  const [itemFilter, setItemFilter] = useState<'all' | ItemCategory>('all');

  const filteredItems = useMemo(() => {
    if (itemFilter === 'all') return items;
    return items.filter(i => i.category === itemFilter);
  }, [items, itemFilter]);

  const addItem = () => {
    if (!newItem.name) return;
    const item: Item = {
      id: `item-${Date.now()}`,
      name: newItem.name ?? '',
      category: (newItem.category ?? 'weapon') as ItemCategory,
      rarity: (newItem.rarity ?? 'common') as ItemRarity,
      description: newItem.description ?? '',
      effect: newItem.effect ?? '',
      obtainedFrom: newItem.obtainedFrom ?? '',
      owner: newItem.owner ?? '',
      status: (newItem.status ?? 'planned') as ItemLifecycleStatus,
      ipPotential: (newItem.ipPotential ?? 'none') as AssetPotentialLevel,
      rightsMemo: newItem.rightsMemo ?? '',
    };
    setItems(prev => [...prev, item]);
    setNewItem({
      name: '', category: 'weapon', rarity: 'common', description: '', effect: '', obtainedFrom: '',
      owner: '', status: 'planned', ipPotential: 'none', rightsMemo: '',
    });
  };

  // ============================================================
  // PART 3B — SKILL FORM STATE
  // ============================================================
  const [newSkill, setNewSkill] = useState<Partial<Skill>>({
    name: '', type: 'active', owner: '', description: '', cost: '', cooldown: '', rank: '',
  });

  const addSkill = () => {
    if (!newSkill.name) return;
    const skill: Skill = {
      id: `skill-${Date.now()}`,
      name: newSkill.name ?? '',
      type: (newSkill.type ?? 'active') as 'active' | 'passive' | 'ultimate',
      owner: newSkill.owner ?? '',
      description: newSkill.description ?? '',
      cost: newSkill.cost ?? '',
      cooldown: newSkill.cooldown ?? '',
      rank: newSkill.rank ?? '',
    };
    setSkills(prev => [...prev, skill]);
    setNewSkill({ name: '', type: 'active', owner: '', description: '', cost: '', cooldown: '', rank: '' });
  };

  // ============================================================
  // PART 3C — MAGIC SYSTEM FORM STATE
  // ============================================================
  const [newMagic, setNewMagic] = useState<Partial<MagicSystem>>({
    name: '', source: '', rules: '', limitations: '',
  });

  const addMagic = () => {
    if (!newMagic.name) return;
    const magic: MagicSystem = {
      id: `magic-${Date.now()}`,
      name: newMagic.name ?? '',
      source: newMagic.source ?? '',
      rules: newMagic.rules ?? '',
      limitations: newMagic.limitations ?? '',
      ranks: [],
    };
    setMagicSystems(prev => [...prev, magic]);
    setNewMagic({ name: '', source: '', rules: '', limitations: '' });
  };

  // ============================================================
  // PART 3D-0 — PRESET LOADER
  // ============================================================
  const loadPreset = (category: PresetCategory) => {
    const existingIds = new Set([
      ...items.map(i => i.id),
      ...skills.map(s => s.id),
      ...magicSystems.map(m => m.id),
    ]);

    if (category === 'all' || category === 'magic') {
      const newMagics = PRESET_MAGIC_SYSTEMS.filter(m => !existingIds.has(m.id));
      if (newMagics.length > 0) setMagicSystems(prev => [...prev, ...newMagics]);
    }
    if (category === 'all' || category === 'skills') {
      const newSkills = PRESET_SKILLS.filter(s => !existingIds.has(s.id));
      if (newSkills.length > 0) setSkills(prev => [...prev, ...newSkills]);
    }
    if (category === 'all' || category === 'items') {
      const newItems = PRESET_ITEMS.filter(i => !existingIds.has(i.id));
      if (newItems.length > 0) setItems(prev => [...prev, ...newItems]);
    }
    setShowPresetMenu(false);
  };

  // ============================================================
  // PART 3D — AI GENERATION (real API call)
  // ============================================================
  const handleAIGenerate = async () => {
    if (!activeSupportsStructured()) {
      showAlert(language === 'KO' ? '현재 설정에서는 구조화 제안을 사용할 수 없습니다. 연결 키나 실행 경로를 확인해 주세요.' : 'The current Noa mode does not support structured suggestions. Check a supported engine or connection key.');
      return;
    }
    if (!config.synopsis) {
      showAlert(t('itemStudio.synopsisRequired'));
      return;
    }
    if (subTab === 'balance') {
      showAlert(language === 'KO' ? '밸런스 탭에서는 제안을 만들 수 없습니다. 아이템·스킬·체계 탭 중 하나를 선택해 주세요.' : 'Cannot generate in balance tab. Select Items, Skills, or Systems tab.');
      return;
    }
    setIsGenerating(true);
    try {
      if (subTab === 'items') {
        const generated = await generateItems(config, language, 3);
        setItems(prev => [...prev, ...generated]);
      } else if (subTab === 'skills') {
        const generated = await generateSkills(config, language, 3);
        setSkills(prev => [...prev, ...generated]);
      } else if (subTab === 'magic') {
        const generated = await generateMagicSystems(config, language, 2);
        setMagicSystems(prev => [...prev, ...generated]);
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      const targetName = subTab === 'skills' ? '스킬' : subTab === 'magic' ? '마법 체계' : '아이템';
      const englishTargetName = subTab === 'skills' ? 'Skill' : subTab === 'magic' ? 'Magic System' : 'Item';
      const msg = ({ KO: `${targetName} 제안을 준비하지 못했습니다${detail ? `: ${detail}` : ''}`, EN: `${englishTargetName} generation failed: ${detail}`, JP: `生成失敗: ${detail}`, CN: `生成失败: ${detail}` })[language];
      showAlert(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // ============================================================
  // PART 4 — SUB-TAB NAV
  // ============================================================
  const subTabs: { key: SubTab; label: string; icon: React.ElementType }[] = [
    { key: 'items', label: t('itemStudio.tabItems'), icon: Sword },
    { key: 'skills', label: t('itemStudio.tabSkills'), icon: Zap },
    { key: 'magic', label: t('itemStudio.tabMagic'), icon: Wand2 },
    { key: 'balance', label: t('itemStudio.tabBalance'), icon: BarChart3 },
  ];

  // ============================================================
  // PART 5 — BALANCE TAB
  // ============================================================
  const balance = useMemo(() => analyzeBalance(items, skills, t), [items, skills, t]);

  // ============================================================
  // PART 6 — RENDER
  // ============================================================
  return (
    <div className="relative max-w-[1400px] mx-auto px-4 py-6 space-y-6 min-h-full rounded-2xl bg-bg-primary border border-border/30">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight">
            {t('itemStudio.title')}
          </h2>
          <p className="text-xs text-text-tertiary mt-1">
            {t('itemStudio.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Preset Loader */}
          <div className="relative">
            <button
              onClick={() => setShowPresetMenu(prev => !prev)}
              className="flex items-center gap-2 px-4 py-2 bg-accent-green/15 text-accent-green border border-accent-green/40 rounded-xl text-xs font-bold hover:bg-accent-green/25 transition-colors"
            >
              <ScrollText className="w-4 h-4" />
              {t('itemStudio.ehPresets')}
            </button>
            {showPresetMenu && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-bg-secondary border border-border rounded-xl shadow-2xl p-2 min-w-[200px]">
                <button onClick={() => loadPreset('all')} className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold hover:bg-bg-tertiary transition-colors">
                  🌐 {t('itemStudio.loadAll')}
                </button>
                <button onClick={() => loadPreset('magic')} className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-bg-tertiary transition-colors">
                  🔮 {`${t('itemStudio.magicSystemsCount')} (${getPresetSummary().magic})`}
                </button>
                <button onClick={() => loadPreset('skills')} className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-bg-tertiary transition-colors">
                  ⚡ {`${t('itemStudio.skillsCount')} (${getPresetSummary().skills})`}
                </button>
                <button onClick={() => loadPreset('items')} className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-bg-tertiary transition-colors">
                  ⚔️ {`${t('itemStudio.itemsCount')} (${getPresetSummary().items})`}
                </button>
                <div className="border-t border-border mt-1 pt-1">
                  <p className="px-3 py-1 text-[9px] text-text-tertiary">
                    {t('itemStudio.presetNote')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Noa Suggest */}
          <button
            onClick={handleAIGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue/15 text-accent-blue border border-accent-blue/40 rounded-xl text-xs font-bold hover:bg-accent-blue/25 transition-[opacity,background-color,border-color,color] disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {L4(language, { ko: '노아 제안', en: 'Noa Suggest', ja: 'ノア提案', zh: '诺亚建议' })}
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex gap-2">
        {subTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-[transform,opacity,background-color,border-color,color] rounded-xl ${
              subTab === key
                ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/40'
                : 'bg-bg-secondary/50 border border-border/50 text-text-secondary hover:text-text-primary hover:border-border'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ====== ITEMS TAB ====== */}
      {subTab === 'items' && (
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
                <div key={item.id} className={`${rCfg.bg} border border-border/50 backdrop-blur-md rounded-xl p-4 space-y-2 rounded-xl transition-[background-color,border-color,box-shadow,color] hover:shadow-md hover:border-border`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CatIcon className="w-4 h-4" style={{ color: rCfg.color }} />
                      <span className="font-bold text-sm">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color: rCfg.color, border: `1px solid ${rCfg.color}40` }}>
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
      )}

      {/* ====== SKILLS TAB ====== */}
      {subTab === 'skills' && (
        <div className="space-y-4">
          {/* Skill Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {skills.map(skill => (
              <div key={skill.id} className="relative overflow-hidden bg-bg-secondary/60 backdrop-blur-md border border-border/40 p-4 space-y-2 rounded-xl shadow-sm transition-[background-color,border-color,box-shadow,color] hover:bg-bg-secondary hover:shadow-md hover:border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${skill.type === 'ultimate' ? 'text-accent-blue' : skill.type === 'passive' ? 'text-green-400' : 'text-accent-blue'}`} />
                    <span className="font-bold text-sm">{skill.name}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-bg-primary text-text-tertiary">
                      {(() => { const st = SKILL_TYPES.find(s => s.value === skill.type); return st ? t(st.tKey) : skill.type; })()}
                    </span>
                  </div>
                      <button
                        onClick={(e) => {
                          const btn = e.currentTarget;
                          confirmItemDelete(() => {
                            btn.classList.add('animate-delete-warning');
                            setTimeout(() => setSkills(prev => prev.filter(s => s.id !== skill.id)), 300);
                          });
                        }}
                        className="p-2.5 rounded-lg text-text-tertiary hover:text-accent-red hover:bg-accent-red/20 transition-colors duration-200 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                </div>
                {skill.owner && <p className="text-[13px] text-text-tertiary">👤 {skill.owner}</p>}
                {skill.description && <p className="text-xs text-text-secondary">{skill.description}</p>}
                <div className="flex gap-3 text-[13px] text-text-tertiary">
                  {skill.cost && <span>💎 {skill.cost}</span>}
                  {skill.cooldown && <span>⏱ {skill.cooldown}</span>}
                  {skill.rank && <span>🏅 {skill.rank}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Add Skill Form */}
          <div className="relative overflow-hidden bg-bg-secondary/60 backdrop-blur-md border border-border/40 p-4 space-y-3 rounded-xl shadow-sm">
            <h4 className="text-xs font-bold">{t('itemStudio.addNewSkill')}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input value={newSkill.name ?? ''} onChange={e => setNewSkill(p => ({ ...p, name: e.target.value }))} placeholder={t('itemStudio.skillNamePlaceholder')} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs" />
              <select value={newSkill.type} onChange={e => setNewSkill(p => ({ ...p, type: e.target.value as Skill['type'] }))} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs">
                {SKILL_TYPES.map(st => <option key={st.value} value={st.value}>{t(st.tKey)}</option>)}
              </select>
              <input value={newSkill.owner ?? ''} onChange={e => setNewSkill(p => ({ ...p, owner: e.target.value }))} placeholder={t('itemStudio.ownerPlaceholder')} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs" />
              <input value={newSkill.rank ?? ''} onChange={e => setNewSkill(p => ({ ...p, rank: e.target.value }))} placeholder={t('itemStudio.rankPlaceholder')} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input value={newSkill.description ?? ''} onChange={e => setNewSkill(p => ({ ...p, description: e.target.value }))} placeholder={t('itemStudio.descriptionPlaceholder')} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs col-span-2" />
              <input value={newSkill.cost ?? ''} onChange={e => setNewSkill(p => ({ ...p, cost: e.target.value }))} placeholder={t('itemStudio.costPlaceholder')} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs" />
              <button onClick={addSkill} disabled={!newSkill.name} className="flex items-center justify-center gap-2 bg-accent-blue/15 text-accent-blue border border-accent-blue/40 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-40 hover:bg-accent-blue/25 transition-[opacity,background-color,border-color,color]">
                <Plus className="w-3.5 h-3.5" /> {t('itemStudio.add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MAGIC SYSTEM TAB ====== */}
      {subTab === 'magic' && (
        <div className="space-y-4">
          {magicSystems.map(magic => (
            <MagicSystemCard
              key={magic.id}
              magic={magic}
              t={t}
              onDelete={() => {
                confirmItemDelete(() => {
                  setMagicSystems(prev => prev.filter(m => m.id !== magic.id));
                });
              }}
              onAddRank={(rank) => setMagicSystems(prev => prev.map(m =>
                m.id === magic.id ? { ...m, ranks: [...m.ranks, rank] } : m
              ))}
              onRemoveRank={(idx) => setMagicSystems(prev => prev.map(m =>
                m.id === magic.id ? { ...m, ranks: m.ranks.filter((_, i) => i !== idx) } : m
              ))}
            />
          ))}

          {/* Add Magic System Form */}
          <div className="relative overflow-hidden bg-bg-secondary/60 backdrop-blur-md border border-border/40 p-4 space-y-3 rounded-xl shadow-sm">
            <h4 className="text-xs font-bold">{t('itemStudio.addMagicSystem')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input value={newMagic.name ?? ''} onChange={e => setNewMagic(p => ({ ...p, name: e.target.value }))} placeholder={t('itemStudio.magicNamePlaceholder')} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs" />
              <input value={newMagic.source ?? ''} onChange={e => setNewMagic(p => ({ ...p, source: e.target.value }))} placeholder={t('itemStudio.magicSourcePlaceholder')} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <textarea value={newMagic.rules ?? ''} onChange={e => setNewMagic(p => ({ ...p, rules: e.target.value }))} placeholder={t('itemStudio.rulesPlaceholder')} rows={2} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs resize-none" />
              <textarea value={newMagic.limitations ?? ''} onChange={e => setNewMagic(p => ({ ...p, limitations: e.target.value }))} placeholder={t('itemStudio.limitationsPlaceholder')} rows={2} className="bg-bg-secondary border border-border/50 rounded-lg px-3 text-text-primary focus:border-accent-blue/50 focus:bg-bg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 py-2 text-xs resize-none" />
            </div>
            <button onClick={addMagic} disabled={!newMagic.name} className="flex items-center gap-2 bg-accent-blue/15 text-accent-blue border border-accent-blue/40 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-40 hover:bg-accent-blue/25 transition-[opacity,background-color,border-color,color]">
              <Plus className="w-3.5 h-3.5" /> {t('itemStudio.add')}
            </button>
          </div>
        </div>
      )}

      {/* ====== BALANCE TAB ====== */}
      {subTab === 'balance' && (
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
                      <div key={r} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold w-12" style={{ color: RARITY_CONFIG[r].color }}>{t(RARITY_CONFIG[r].tKey)}</span>
                        <div className="flex-1 h-4 bg-bg-primary rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-[transform,opacity,background-color,border-color,color]" style={{ width: `${pct}%`, backgroundColor: RARITY_CONFIG[r].color }} />
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
      )}
    </div>
  );
};

export default ItemStudioView;
