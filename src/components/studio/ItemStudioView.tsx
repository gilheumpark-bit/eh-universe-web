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
  BarChart3, Loader2, Wand2,
} from 'lucide-react';
import { generateItems, generateSkills, generateMagicSystems } from '@/services/geminiService';
import { activeSupportsStructured } from '@/lib/ai-providers';
import { analyzeBalance } from './ItemStudioView.balance';
import {
  getPresetSummary,
  PRESET_ITEMS,
  PRESET_MAGIC_SYSTEMS,
  PRESET_SKILLS,
  type PresetCategory,
  SKILL_TYPES,
} from './ItemStudioView.constants';
import { MagicSystemCard } from './ItemStudioView.MagicSystemCard';
import { ItemStudioBalanceTab } from './ItemStudioView.BalanceTab';
import { ItemStudioItemsTab } from './ItemStudioView.ItemsTab';

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
        <ItemStudioItemsTab
          language={language}
          t={t}
          items={items}
          filteredItems={filteredItems}
          itemFilter={itemFilter}
          setItemFilter={setItemFilter}
          newItem={newItem}
          setNewItem={setNewItem}
          addItem={addItem}
          tierExpanded={tierExpanded}
          setTierExpanded={setTierExpanded}
          updateItemField={updateItemField}
          setItems={setItems}
          confirmItemDelete={confirmItemDelete}
        />
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
        <ItemStudioBalanceTab
          t={t}
          items={items}
          skills={skills}
          magicSystems={magicSystems}
          balance={balance}
        />
      )}
    </div>
  );
};

export default ItemStudioView;
